import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embedding_service
from app.core.retriever import retrieve_relevant_chunks
from app.db.models import Chunk, Document


@pytest.mark.asyncio
async def test_retriever_cosine_similarity_and_user_scoping(
    db_session: AsyncSession,
    test_user: dict,
    test_user_b: dict,
):
    user_a_id = uuid.UUID(test_user["id"])
    user_b_id = uuid.UUID(test_user_b["id"])

    # Create dummy document for user A
    doc_a = Document(
        user_id=user_a_id,
        file_name="ai_handbook.pdf",
        file_path="/dummy/ai_handbook.pdf",
        file_size=1024,
        file_type="pdf",
        page_count=2,
        status="ready",
    )
    db_session.add(doc_a)
    await db_session.flush()

    # Create chunks for User A
    text_1 = "Deep learning models frequently utilize the Adam optimizer to calibrate learning rate during backpropagation."
    text_2 = "A culinary guide on making French onion soup with caramelized onions and gruyere cheese."

    embeddings = await embedding_service.embed_batch([text_1, text_2])

    chunk_1 = Chunk(
        document_id=doc_a.id,
        user_id=user_a_id,
        content=text_1,
        page_number=1,
        chunk_index=0,
        embedding=embeddings[0],
    )
    chunk_2 = Chunk(
        document_id=doc_a.id,
        user_id=user_a_id,
        content=text_2,
        page_number=2,
        chunk_index=1,
        embedding=embeddings[1],
    )
    db_session.add_all([chunk_1, chunk_2])
    await db_session.commit()

    # User A searches for optimizer
    query = "What optimizer is recommended for backpropagation in deep learning?"
    retrieved_a, sources_a = await retrieve_relevant_chunks(
        db=db_session,
        user_id=user_a_id,
        question=query,
        top_k=2,
        similarity_threshold=0.2,
    )

    assert len(retrieved_a) > 0, "Should retrieve at least one chunk for User A"
    top_chunk = retrieved_a[0]
    assert "Adam optimizer" in top_chunk.content
    assert top_chunk.page_number == 1
    assert len(sources_a) > 0
    assert sources_a[0].fileName == "ai_handbook.pdf"

    # User B searches with identical query -> must return 0 chunks (Strict user scoping)
    retrieved_b, sources_b = await retrieve_relevant_chunks(
        db=db_session,
        user_id=user_b_id,
        question=query,
        top_k=2,
        similarity_threshold=0.2,
    )
    assert len(retrieved_b) == 0, "User B should never see User A's chunks"
    assert len(sources_b) == 0
