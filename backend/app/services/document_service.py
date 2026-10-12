import json
import os
from pathlib import Path
import uuid
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embedding_service
from app.core.llm import clean_inline_sources, get_llm_client
from app.core.loader import extract_document_pages_async
from app.core.prompts import (
    DOCUMENT_SUMMARY_PROMPT,
    MAP_REDUCE_COMBINE_PROMPT,
    MAP_REDUCE_SECTION_PROMPT,
)
from app.core.splitter import split_document_pages
from app.db.database import AsyncSessionLocal
from app.db.models import Chunk, Document
from app.utils.file_utils import get_user_storage_path, sanitize_filename, validate_file_upload
from app.utils.logger import logger


async def save_uploaded_document(
    db: AsyncSession,
    user_id: uuid.UUID,
    file: UploadFile,
    role: Optional[str] = None,
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
        role=role,
        page_count=0,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def index_document_background(document_id: uuid.UUID, chunk_size: Optional[int] = None) -> None:
    """Background task: parses document pages, computes chunks + embeddings, and calls LLM for summary."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Background indexing aborted: Document {document_id} not found")
            return

        try:
            logger.info(f"Starting background indexing for document {doc.id} ({doc.file_name}) [chunk_size={chunk_size}]")
            file_path = Path(doc.file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found on disk: {doc.file_path}")

            # 1. Extract pages asynchronously
            pages = await extract_document_pages_async(file_path, doc.file_type)
            doc.page_count = len(pages)
            if pages:
                doc.location_type = pages[0].location_type

            # 2. Split into chunks using custom target chunk size if provided
            effective_chunk_size = chunk_size if chunk_size and 100 <= chunk_size <= 4000 else settings.CHUNK_SIZE
            chunk_items = split_document_pages(pages, chunk_size=effective_chunk_size)
            if not chunk_items:
                logger.warning(f"No text extracted from document {doc.id}")

            # 3. Batch compute embeddings
            texts = [c.content for c in chunk_items]
            embeddings = await embedding_service.embed_batch(texts)

            # 4. Insert chunks into DB with location metadata
            chunks_to_insert = [
                Chunk(
                    document_id=doc.id,
                    user_id=doc.user_id,
                    content=c.content,
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    location_type=c.location_type,
                    location_label=c.location_label,
                    embedding=embeddings[idx],
                )
                for idx, c in enumerate(chunk_items)
            ]
            if chunks_to_insert:
                db.add_all(chunks_to_insert)

            # 5. Generate summary using map-reduce (if > 10 pages) or single pass
            llm = get_llm_client()
            if doc.page_count > 10:
                logger.info(f"Generating map-reduce summary for {doc.file_name} ({doc.page_count} pages)")
                group_summaries = []
                pages_per_group = 10
                for i in range(0, len(pages), pages_per_group):
                    group = pages[i : i + pages_per_group]
                    start_p = group[0].page_number
                    end_p = group[-1].page_number
                    group_text = "\n\n".join(
                        f"[Page {p.page_number}]\n{p.text}" for p in group if p.text.strip()
                    )
                    if not group_text:
                        continue
                    sec_prompt = (
                        f"Document Section (Pages {start_p} to {end_p}):\n\n{group_text}\n\n"
                        f"Summarize the key topics, concepts, definitions, and takeaways of this section:"
                    )
                    sec_res = await llm.generate(
                        system=MAP_REDUCE_SECTION_PROMPT,
                        messages=[{"role": "user", "content": sec_prompt}],
                        max_tokens=1000,
                        temperature=0.1,
                    )
                    group_summaries.append(
                        f"### Section: Pages {start_p}–{end_p}\n{clean_inline_sources(sec_res)}"
                    )

                all_sec_text = "\n\n".join(group_summaries)
                combine_prompt = (
                    f"Section Summaries of {doc.file_name}:\n\n{all_sec_text}\n\n"
                    f"Synthesize into a structured master overview:"
                )
                structured_summary = await llm.generate(
                    system=MAP_REDUCE_COMBINE_PROMPT,
                    messages=[{"role": "user", "content": combine_prompt}],
                    max_tokens=3000,
                    temperature=0.1,
                )
                doc.summary = clean_inline_sources(structured_summary)
                doc.suggested_questions = [
                    f"What are the main topics covered across {doc.file_name}?",
                    "What key framework activities and methodologies are outlined?",
                    "How are procedures and engineering phases implemented?",
                    "What review questions or conclusions are described?",
                ]
            else:
                sample_text = "\n\n".join([f"[Page {p.page_number}]\n{p.text}" for p in pages if p.text.strip()])[:6000]
                if sample_text:
                    response_str = await llm.generate(
                        system=DOCUMENT_SUMMARY_PROMPT,
                        messages=[{"role": "user", "content": f"Document text:\n{sample_text}"}],
                        max_tokens=600,
                    )
                    try:
                        clean_json = response_str.strip()
                        if clean_json.startswith("```"):
                            clean_json = clean_json.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                        parsed = json.loads(clean_json)
                        doc.summary = clean_inline_sources(parsed.get("summary", "Document successfully indexed."))
                        doc.suggested_questions = parsed.get("suggested_questions", [])
                    except Exception as json_err:
                        logger.warning(f"Could not parse LLM summary JSON: {json_err}")
                        doc.summary = clean_inline_sources(response_str)
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

    # Invalidate cached generated_outputs for this document
    try:
        from app.db.models import GeneratedOutput
        doc_id_str = str(document_id)
        stmt_del_cache = select(GeneratedOutput).where(GeneratedOutput.user_id == user_id)
        cache_res = await db.execute(stmt_del_cache)
        for co in cache_res.scalars().all():
            doc_ids_list = co.document_ids or []
            if doc_id_str in doc_ids_list or doc_id_str in (co.document_ids_hash or ""):
                await db.delete(co)
    except Exception as e:
        logger.warning(f"Error invalidating generated_outputs cache: {e}")

    file_path_str = doc.file_path
    await db.delete(doc)
    await db.commit()

    try:
        if file_path_str:
            p = Path(file_path_str)
            if p.exists():
                os.remove(p)
    except Exception as e:
        logger.warning(f"Failed to delete file from disk {file_path_str}: {e}")

    return True


async def update_document_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    role: Optional[str],
) -> Optional[Document]:
    """Updates the role tag (resume, job_description, contract, etc.) of a document."""
    doc = await get_document_by_id(db, user_id, document_id)
    if not doc:
        return None

    doc.role = role
    await db.commit()
    await db.refresh(doc)
    return doc


async def get_document_full_text(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
) -> dict:
    """Returns all chunks formatted with location labels for previewing non-PDF files."""
    doc = await get_document_by_id(db, user_id, document_id)
    if not doc:
        return {}

    stmt = (
        select(Chunk)
        .where(Chunk.document_id == document_id, Chunk.user_id == user_id)
        .order_by(Chunk.page_number.asc(), Chunk.chunk_index.asc())
    )
    result = await db.execute(stmt)
    chunks = result.scalars().all()

    sections = []
    current_label = None
    current_lines = []

    for c in chunks:
        label = c.location_label or f"Page {c.page_number}"
        if label != current_label:
            if current_label is not None:
                sections.append({"label": current_label, "page": c.page_number, "text": "\n\n".join(current_lines)})
            current_label = label
            current_lines = [c.content]
        else:
            current_lines.append(c.content)

    if current_label is not None:
        sections.append({"label": current_label, "page": chunks[-1].page_number if chunks else 1, "text": "\n\n".join(current_lines)})

    return {
        "documentId": str(doc.id),
        "fileName": doc.file_name,
        "fileType": doc.file_type,
        "locationType": doc.location_type or "page",
        "role": doc.role,
        "sections": sections,
    }

