import json
import os
from pathlib import Path
import uuid
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embedding_service
from app.core.llm import get_llm_client
from app.core.loader import extract_document_pages_async
from app.core.prompts import DOCUMENT_SUMMARY_PROMPT
from app.core.splitter import split_document_pages
from app.db.database import AsyncSessionLocal
from app.db.models import Chunk, Document
from app.utils.file_utils import get_user_storage_path, sanitize_filename, validate_file_upload
from app.utils.logger import logger


async def save_uploaded_document(
    db: AsyncSession,
    user_id: uuid.UUID,
    file: UploadFile,
) -> Document:
    """Validates and saves uploaded file to disk and inserts initial Document DB record."""
    file_type = validate_file_upload(file)
    safe_name = sanitize_filename(file.filename or "document")
    ext = Path(file.filename or "").suffix.lower()

    storage_path, _ = get_user_storage_path(user_id, ext)

    # Stream write to disk
    contents = await file.read()
    file_size = len(contents)
    with open(storage_path, "wb") as f:
        f.write(contents)

    doc = Document(
        user_id=user_id,
        file_name=safe_name,
        file_path=str(storage_path),
        file_size=file_size,
        file_type=file_type,
        page_count=0,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def index_document_background(document_id: uuid.UUID) -> None:
    """Background task: parses document pages, computes chunks + embeddings, and calls LLM for summary."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Background indexing aborted: Document {document_id} not found")
            return

        try:
            logger.info(f"Starting background indexing for document {doc.id} ({doc.file_name})")
            file_path = Path(doc.file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found on disk: {doc.file_path}")

            # 1. Extract pages asynchronously
            pages = await extract_document_pages_async(file_path, doc.file_type)
            doc.page_count = len(pages)

            # 2. Split into chunks
            chunk_items = split_document_pages(pages)
            if not chunk_items:
                logger.warning(f"No text extracted from document {doc.id}")

            # 3. Batch compute embeddings
            texts = [c.content for c in chunk_items]
            embeddings = await embedding_service.embed_batch(texts)

            # 4. Insert chunks into DB
            chunks_to_insert = [
                Chunk(
                    document_id=doc.id,
                    user_id=doc.user_id,
                    content=c.content,
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    embedding=embeddings[idx],
                )
                for idx, c in enumerate(chunk_items)
            ]
            if chunks_to_insert:
                db.add_all(chunks_to_insert)

            # 5. Generate summary and suggested questions using LLM
            sample_text = "\n\n".join([p.text for p in pages[:4] if p.text.strip()])[:3500]
            if sample_text:
                llm = get_llm_client()
                response_str = await llm.generate(
                    system=DOCUMENT_SUMMARY_PROMPT,
                    messages=[{"role": "user", "content": f"Document text:\n{sample_text}"}],
                    max_tokens=512,
                )
                try:
                    # Clean potential markdown fences
                    clean_json = response_str.strip()
                    if clean_json.startswith("```"):
                        clean_json = clean_json.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    parsed = json.loads(clean_json)
                    doc.summary = parsed.get("summary", "Document successfully indexed.")
                    doc.suggested_questions = parsed.get("suggested_questions", [])
                except Exception as json_err:
                    logger.warning(f"Could not parse LLM summary JSON: {json_err}")
                    doc.summary = f"Summary for {doc.file_name}: Extracted {doc.page_count} pages and {len(chunk_items)} semantic chunks ready for retrieval."
                    doc.suggested_questions = [
                        f"What are the main topics in {doc.file_name}?",
                        "What are the key conclusions?",
                    ]
            else:
                doc.summary = f"Document {doc.file_name} indexed with {doc.page_count} pages."
                doc.suggested_questions = []

            doc.status = "ready"
            doc.error_message = None
            await db.commit()
            logger.info(f"Indexing completed for document {doc.id}. Status: ready")

        except Exception as e:
            logger.exception(f"Indexing failed for document {document_id}: {e}")
            doc.status = "failed"
            doc.error_message = str(e)
            await db.commit()


async def get_user_documents(db: AsyncSession, user_id: uuid.UUID) -> List[Document]:
    """Retrieves all documents owned by user, sorted newest first."""
    result = await db.execute(
        select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def get_document_by_id(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
) -> Optional[Document]:
    """Retrieves a single document by ID scoped by owner user_id."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def delete_document(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
) -> bool:
    """Deletes document row from DB (cascade deletes chunks) and removes file from disk."""
    doc = await get_document_by_id(db, user_id, document_id)
    if not doc:
        return False

    file_path = Path(doc.file_path)
    await db.delete(doc)
    await db.commit()

    try:
        if file_path.exists():
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to delete file from disk {file_path}: {e}")

    return True
