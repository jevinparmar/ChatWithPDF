import uuid
from dataclasses import dataclass
from typing import List, Optional, Tuple
from sqlalchemy import select
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
    content: str
    similarity: float


async def retrieve_relevant_chunks(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    document_ids: Optional[List[uuid.UUID]] = None,
    top_k: int = settings.TOP_K,
    similarity_threshold: float = settings.SIMILARITY_THRESHOLD,
) -> Tuple[List[RetrievedChunk], List[SourceItem]]:
    """Performs cosine vector search in PostgreSQL using pgvector <=> operator."""
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

    retrieved: List[RetrievedChunk] = []
    sources: List[SourceItem] = []
    seen_sources = set()

    for chunk, file_name, sim_score in rows:
        r = RetrievedChunk(
            chunk_id=chunk.id,
            document_id=str(chunk.document_id),
            file_name=file_name,
            page_number=chunk.page_number,
            content=chunk.content,
            similarity=float(sim_score),
        )
        retrieved.append(r)

        # Deduplicate sources by (document_id, page_number)
        key = (r.document_id, r.page_number)
        if key not in seen_sources:
            seen_sources.add(key)
            snippet = chunk.content[:200].replace("\n", " ").strip()
            if len(chunk.content) > 200:
                snippet += "..."
            sources.append(
                SourceItem(
                    documentId=r.document_id,
                    fileName=r.file_name,
                    page=r.page_number,
                    snippet=snippet,
                )
            )

    return retrieved, sources
