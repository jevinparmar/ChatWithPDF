from collections import defaultdict
from dataclasses import dataclass
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, or_, select
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
    location_type: str = "page"
    location_label: Optional[str] = None


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
                location_type=chunk.location_type or "page",
                location_label=chunk.location_label or f"Page {chunk.page_number}",
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
    hybrid_search: bool = False,
) -> Tuple[List[RetrievedChunk], List[SourceItem]]:
    """
    Retrieves most relevant chunks using:
    1. Dense Vector Search: pgvector cosine distance (<=>) with HNSW indexing.
    2. Optional Sparse Keyword Search (Hybrid): PostgreSQL ts_rank_cd full-text search.
    3. Reciprocal Rank Fusion (RRF) to merge dense & sparse ranks if hybrid is enabled.
    4. Adjacent neighbor expansion to provide coherent context without sentence cutoffs.
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
    dense_rows = result.all()

    # Fallback if strict threshold produces 0 rows: take top matches by cosine distance
    if not dense_rows and document_ids:
        relaxed_stmt = (
            select(Chunk, Document.file_name, similarity)
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.user_id == user_id)
            .where(Chunk.document_id.in_(document_ids))
            .order_by(cosine_dist.asc())
            .limit(top_k)
        )
        res = await db.execute(relaxed_stmt)
        dense_rows = res.all()

        if not dense_rows:
            intro_stmt = (
                select(Chunk, Document.file_name, similarity)
                .join(Document, Chunk.document_id == Document.id)
                .where(Chunk.user_id == user_id)
                .where(Chunk.document_id.in_(document_ids))
                .order_by(Chunk.page_number.asc(), Chunk.chunk_index.asc())
                .limit(top_k)
            )
            res = await db.execute(intro_stmt)
            dense_rows = res.all()

    # 2. Sparse Keyword Search (Hybrid BM25 / ts_rank)
    keyword_rows = []
    if hybrid_search and question.strip():
        try:
            ts_query = func.plainto_tsquery("english", question)
            ts_vector = func.to_tsvector("english", Chunk.content)
            ts_rank = func.ts_rank_cd(ts_vector, ts_query).label("ts_rank")
            kw_stmt = (
                select(Chunk, Document.file_name, ts_rank)
                .join(Document, Chunk.document_id == Document.id)
                .where(Chunk.user_id == user_id)
                .where(ts_vector.op("@@")(ts_query))
            )
            if document_ids:
                kw_stmt = kw_stmt.where(Chunk.document_id.in_(document_ids))
            kw_stmt = kw_stmt.order_by(ts_rank.desc()).limit(top_k)
            kw_res = await db.execute(kw_stmt)
            keyword_rows = kw_res.all()
        except Exception as e:
            logger.warning(f"Keyword search in hybrid mode failed: {e}")

    # 3. Reciprocal Rank Fusion (RRF)
    if hybrid_search and keyword_rows:
        rrf_scores: dict[int, float] = defaultdict(float)
        chunk_lookup: dict[int, Tuple[Chunk, str, float]] = {}

        for rank, (c, fname, sim) in enumerate(dense_rows, 1):
            rrf_scores[c.id] += 1.0 / (60 + rank)
            chunk_lookup[c.id] = (c, fname, float(sim))

        for rank, (c, fname, rank_score) in enumerate(keyword_rows, 1):
            rrf_scores[c.id] += 1.0 / (60 + rank)
            if c.id not in chunk_lookup:
                chunk_lookup[c.id] = (c, fname, float(rank_score))

        sorted_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)[:top_k]
        rows = [chunk_lookup[cid] for cid in sorted_ids]
    else:
        rows = dense_rows

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
            loc_type = chunk.location_type or "page"
            loc_label = chunk.location_label or (
                f"Slide {chunk.page_number}" if loc_type == "slide"
                else f"Sheet {chunk.page_number}" if loc_type == "sheet"
                else f"Page {chunk.page_number}"
            )
            sources.append(
                SourceItem(
                    documentId=str(chunk.document_id),
                    fileName=file_name,
                    page=chunk.page_number,
                    locationType=loc_type,
                    locationLabel=loc_label,
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
                    location_type=c.location_type or "page",
                    location_label=c.location_label or f"Page {c.page_number}",
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
            location_type=c.location_type or "page",
            location_label=c.location_label or f"Page {c.page_number}",
        )
        for c, f_name, sim in rows
    ]
    return retrieved, sources
