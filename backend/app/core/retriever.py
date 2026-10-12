from collections import defaultdict
from dataclasses import dataclass
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.embeddings import embedding_service
from app.db.models import Chunk, Document
from app.schemas.chat import SourceItem
from app.utils.logger import logger


@dataclass
class RetrievedChunk:
    chunk_id: int
    document_id: str
    file_name: str
    page_number: int
    chunk_index: int
    content: str
    similarity: float


async def load_all_document_chunks(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_ids: List[uuid.UUID],
) -> List[RetrievedChunk]:
    """Loads ALL chunks for the given documents ordered sequentially by page and chunk index."""
    if not document_ids:
        return []

    stmt = (
        select(Chunk, Document.file_name)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.user_id == user_id)
        .where(Chunk.document_id.in_(document_ids))
        .order_by(Chunk.document_id, Chunk.page_number.asc(), Chunk.chunk_index.asc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    chunks: List[RetrievedChunk] = []
    for chunk, file_name in rows:
        chunks.append(
            RetrievedChunk(
                chunk_id=chunk.id,
                document_id=str(chunk.document_id),
                file_name=file_name,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                similarity=1.0,
            )
        )
    return chunks


async def retrieve_relevant_chunks(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    document_ids: Optional[List[uuid.UUID]] = None,
    top_k: int = settings.TOP_K,
    similarity_threshold: float = settings.SIMILARITY_THRESHOLD,
    include_neighbors: bool = True,
) -> Tuple[List[RetrievedChunk], List[SourceItem]]:
    """
    Performs cosine vector search in PostgreSQL using pgvector <=> operator with top_k=8.
    Expands the matched chunks by including their immediate neighboring chunks (previous and next)
    within the same document to provide full conversational context without mid-sentence cutoffs.
    """
    query_vector = await embedding_service.embed_query(question)

    cosine_dist = Chunk.embedding.cosine_distance(query_vector)
    similarity = (1 - cosine_dist).label("similarity")

    stmt = (
        select(Chunk, Document.file_name, similarity)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.user_id == user_id)
    )

    if document_ids:
        stmt = stmt.where(Chunk.document_id.in_(document_ids))

    stmt = stmt.where((1 - cosine_dist) >= similarity_threshold)
    stmt = stmt.order_by(cosine_dist.asc()).limit(top_k)

    result = await db.execute(stmt)
    rows = result.all()

    # Fallback if strict threshold produces 0 rows: take top matches by cosine distance
    if not rows and document_ids:
        relaxed_stmt = (
            select(Chunk, Document.file_name, similarity)
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.user_id == user_id)
            .where(Chunk.document_id.in_(document_ids))
            .order_by(cosine_dist.asc())
            .limit(top_k)
        )
        res = await db.execute(relaxed_stmt)
        rows = res.all()

        if not rows:
            intro_stmt = (
                select(Chunk, Document.file_name, similarity)
                .join(Document, Chunk.document_id == Document.id)
                .where(Chunk.user_id == user_id)
                .where(Chunk.document_id.in_(document_ids))
                .order_by(Chunk.page_number.asc(), Chunk.chunk_index.asc())
                .limit(top_k)
            )
            res = await db.execute(intro_stmt)
            rows = res.all()

    if not rows:
        return [], []

    # Build sources chips based on actual vector matches
    sources: List[SourceItem] = []
    seen_sources = set()

    doc_neighbor_indices: dict[uuid.UUID, set[int]] = defaultdict(set)
    matched_chunk_map: dict[tuple[uuid.UUID, int], float] = {}

    for chunk, file_name, sim_score in rows:
        sim_val = float(sim_score)
        matched_chunk_map[(chunk.document_id, chunk.chunk_index)] = sim_val

        # Source chips deduplicated by (documentId, page)
        key = (str(chunk.document_id), chunk.page_number)
        if key not in seen_sources:
            seen_sources.add(key)
            snippet = chunk.content[:200].replace("\n", " ").strip()
            if len(chunk.content) > 200:
                snippet += "..."
            sources.append(
                SourceItem(
                    documentId=str(chunk.document_id),
                    fileName=file_name,
                    page=chunk.page_number,
                    snippet=snippet,
                )
            )

        if include_neighbors:
            # Include neighbor indices: previous, current, next
            if chunk.chunk_index > 0:
                doc_neighbor_indices[chunk.document_id].add(chunk.chunk_index - 1)
            doc_neighbor_indices[chunk.document_id].add(chunk.chunk_index)
            doc_neighbor_indices[chunk.document_id].add(chunk.chunk_index + 1)

    # If neighbors requested, fetch all required chunks in sequential order
    if include_neighbors and doc_neighbor_indices:
        neighbor_clauses = []
        for doc_id, indices in doc_neighbor_indices.items():
            neighbor_clauses.append(
                (Chunk.document_id == doc_id) & (Chunk.chunk_index.in_(indices))
            )

        n_stmt = (
            select(Chunk, Document.file_name)
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.user_id == user_id)
            .where(or_(*neighbor_clauses))
            .order_by(Chunk.document_id, Chunk.page_number.asc(), Chunk.chunk_index.asc())
        )
        n_res = await db.execute(n_stmt)
        expanded_rows = n_res.all()

        retrieved: List[RetrievedChunk] = []
        for c, f_name in expanded_rows:
            sim = matched_chunk_map.get((c.document_id, c.chunk_index), 0.8)
            retrieved.append(
                RetrievedChunk(
                    chunk_id=c.id,
                    document_id=str(c.document_id),
                    file_name=f_name,
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    content=c.content,
                    similarity=sim,
                )
            )
        return retrieved, sources

    # Direct non-neighbor mapping
    retrieved = [
        RetrievedChunk(
            chunk_id=c.id,
            document_id=str(c.document_id),
            file_name=f_name,
            page_number=c.page_number,
            chunk_index=c.chunk_index,
            content=c.content,
            similarity=float(sim),
        )
        for c, f_name, sim in rows
    ]
    return retrieved, sources
