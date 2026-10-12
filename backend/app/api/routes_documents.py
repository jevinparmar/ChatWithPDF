from pathlib import Path
from typing import Annotated, List, Optional, Union
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.db.models import Document, User
from app.schemas.document import DocumentDeleteResponse, DocumentResponse, DocumentUpdateRole
from app.services.document_service import (
    delete_document,
    get_document_by_id,
    get_document_full_text,
    get_user_documents,
    index_document_background,
    save_uploaded_document,
    update_document_role,
)

router = APIRouter(prefix="/documents", tags=["Documents"])


def serialize_document(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        name=doc.file_name,
        fileName=doc.file_name,
        size=doc.file_size,
        fileSize=doc.file_size,
        type=doc.file_type,
        fileType=doc.file_type,
        locationType=doc.location_type or "page",
        role=doc.role,
        pages=doc.page_count,
        pageCount=doc.page_count,
        status=doc.status,
        errorMessage=doc.error_message,
        summary=doc.summary,
        topics=[doc.file_type.upper(), f"{doc.page_count} Pages", "Ingested"],
        suggestedQuestions=doc.suggested_questions or [],
        createdAt=doc.created_at.isoformat() if doc.created_at else "",
        url=f"/api/documents/{doc.id}/file",
    )


@router.post("/upload", response_model=Union[DocumentResponse, List[DocumentResponse]], status_code=status.HTTP_201_CREATED)
async def upload_documents(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(None),
    files: List[UploadFile] = File(None),
    role: Optional[str] = Form(None),
    chunk_size: Optional[int] = Form(None),
):
    """Uploads one or more documents, validates, and initiates background indexing."""
    items_to_process: List[UploadFile] = []
    if file:
        items_to_process.append(file)
    if files:
        items_to_process.extend(files)

    if not items_to_process:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided for upload",
        )

    saved_docs: List[DocumentResponse] = []
    for f in items_to_process:
        doc = await save_uploaded_document(db, current_user.id, f, role=role)
        background_tasks.add_task(index_document_background, doc.id, chunk_size=chunk_size)
        saved_docs.append(serialize_document(doc))

    if len(saved_docs) == 1 and file is not None and not files:
        return saved_docs[0]
    return saved_docs


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[DocumentResponse]:
    """Lists all documents owned by current authenticated user."""
    docs = await get_user_documents(db, current_user.id)
    return [serialize_document(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentResponse:
    """Retrieves single document detail."""
    doc = await get_document_by_id(db, current_user.id, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return serialize_document(doc)


@router.patch("/{document_id}/role", response_model=DocumentResponse)
async def update_doc_role_endpoint(
    document_id: uuid.UUID,
    payload: DocumentUpdateRole,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentResponse:
    """Updates the role of a document (resume, job_description, contract, paper, notes, other)."""
    doc = await update_document_role(db, current_user.id, document_id, payload.role)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return serialize_document(doc)


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retrieves parsed full text and sections of a document for viewer display."""
    content = await get_document_full_text(db, current_user.id, document_id)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return content


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Serves raw document file (owner only)."""
    doc = await get_document_by_id(db, current_user.id, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file missing from disk",
        )

    ext = doc.file_type.lower()
    media_map = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv",
        "txt": "text/plain",
        "md": "text/markdown",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
    }
    media_type = media_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=doc.file_name,
    )


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document_endpoint(
    document_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentDeleteResponse:
    """Deletes document and its chunks from database and disk."""
    success = await delete_document(db, current_user.id, document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return DocumentDeleteResponse(success=True, message="Document deleted successfully")

