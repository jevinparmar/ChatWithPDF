import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import get_llm_client, BaseLLMClient, OpenAICompatibleClient, AnthropicClient
from app.core.retriever import retrieve_relevant_chunks
from app.core.embeddings import embedding_service
from app.db.models import Chunk, Document


@pytest.mark.asyncio
async def test_llm_client_routing_and_fallback():
    """Verify get_llm_client routes to the expected client or falls back cleanly."""
    models_to_test = ["gpt-4o", "claude-3-5-sonnet", "llama-3-70b"]
    for m in models_to_test:
        client = get_llm_client(m)
        assert client is not None
        assert isinstance(client, BaseLLMClient)
        
        # Test generation without crashing
        res = await client.generate(
            system="You are an expert tutor.",
            messages=[{"role": "user", "content": "Explain vector indexing"}],
            max_tokens=150,
        )
        assert isinstance(res, str)
        assert len(res) > 0


@pytest.mark.asyncio
async def test_hybrid_dense_and_bm25_retrieval(
    db_session: AsyncSession,
    test_user: dict,
):
    """Verify hybrid search fuses dense embeddings with PostgreSQL full text search."""
    user_id = uuid.UUID(test_user["id"])

    doc = Document(
        user_id=user_id,
        file_name="distributed_systems.pdf",
        file_path="/dummy/distributed_systems.pdf",
        file_size=2048,
        file_type="pdf",
        page_count=3,
        status="ready",
    )
    db_session.add(doc)
    await db_session.flush()

    text_raft = "The Raft consensus algorithm is designed to be easy to understand compared to Paxos."
    text_vector_clocks = "Vector clocks are used in distributed architectures for generating a partial ordering of events."
    text_cooking = "Bake the artisanal sourdough bread at 220 degrees Celsius for forty minutes."

    embeddings = await embedding_service.embed_batch([text_raft, text_vector_clocks, text_cooking])

    c1 = Chunk(
        document_id=doc.id,
        user_id=user_id,
        content=text_raft,
        page_number=1,
        chunk_index=0,
        embedding=embeddings[0],
    )
    c2 = Chunk(
        document_id=doc.id,
        user_id=user_id,
        content=text_vector_clocks,
        page_number=2,
        chunk_index=1,
        embedding=embeddings[1],
    )
    c3 = Chunk(
        document_id=doc.id,
        user_id=user_id,
        content=text_cooking,
        page_number=3,
        chunk_index=2,
        embedding=embeddings[2],
    )
    db_session.add_all([c1, c2, c3])
    await db_session.commit()

    # Query matching Raft consensus with hybrid search enabled
    chunks, sources = await retrieve_relevant_chunks(
        db=db_session,
        user_id=user_id,
        question="How does Raft consensus algorithm operate?",
        top_k=2,
        hybrid_search=True,
    )

    assert len(chunks) > 0
    assert any("Raft consensus" in c.content for c in chunks)
    assert len(sources) > 0
    assert sources[0].fileName == "distributed_systems.pdf"


@pytest.mark.asyncio
async def test_chat_endpoint_with_custom_rag_settings(
    async_client: AsyncClient,
    test_user: dict,
):
    """Verify /api/chat accepts model, topK, and hybridSearch parameters."""
    token = test_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create session
    session_res = await async_client.post(
        "/api/chat/sessions",
        json={"title": "RAG Settings Test"},
        headers=headers,
    )
    assert session_res.status_code == 201
    session_id = session_res.json()["id"]

    # Send message with RAG settings
    chat_res = await async_client.post(
        "/api/chat",
        json={
            "sessionId": session_id,
            "message": "Give me an overview of our test document",
            "model": "llama-3-70b",
            "topK": 5,
            "hybridSearch": True,
        },
        headers=headers,
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "response" in data
    assert "messageId" in data
