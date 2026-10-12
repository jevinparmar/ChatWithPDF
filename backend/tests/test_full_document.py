import asyncio
from typing import List
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.full_document import (
    compute_document_ids_hash,
    execute_full_document_engine,
    get_cached_output,
    rebuild_full_text_with_locations,
    save_cached_output,
)
from app.core.llm import BaseLLMClient
from app.core.retriever import RetrievedChunk
from app.db.models import Chunk, Document, GeneratedOutput, User


class MockLLM(BaseLLMClient):
    def __init__(self):
        self.call_count = 0
        self.last_prompt = ""

    async def generate(self, system: str, messages: list, max_tokens: int = 1000, temperature: float = 0.0) -> str:
        self.call_count += 1
        self.last_prompt = messages[-1]["content"]
        if "Master Section Summaries" in self.last_prompt:
            return "Synthesized Master Explanation across all 25 sections (Page 1) (Page 25)."
        return f"Explanation for section: {messages[-1]['content'][:80]}"

    async def stream(self, system: str, messages: list, max_tokens: int = 1000, temperature: float = 0.0):
        yield "Mock streamed response"


@pytest.mark.asyncio
async def test_compute_document_ids_hash():
    id1 = uuid.uuid4()
    id2 = uuid.uuid4()
    h1 = compute_document_ids_hash([id1, id2])
    h2 = compute_document_ids_hash([id2, id1])  # Order-independent
    assert h1 == h2
    assert len(h1) == 64


@pytest.mark.asyncio
async def test_rebuild_full_text_with_locations():
    chunks = [
        RetrievedChunk(
            chunk_id=1,
            document_id="doc1",
            file_name="Lecture.pptx",
            page_number=1,
            chunk_index=0,
            content="Introduction slide content.",
            similarity=1.0,
            location_type="slide",
            location_label="Slide 1",
        ),
        RetrievedChunk(
            chunk_id=2,
            document_id="doc1",
            file_name="Lecture.pptx",
            page_number=2,
            chunk_index=1,
            content="Deep Learning Architecture.",
            similarity=1.0,
            location_type="slide",
            location_label="Slide 2",
        ),
    ]
    full_text, units, sources = rebuild_full_text_with_locations(chunks)
    assert "[Lecture.pptx - Slide 1]" in full_text
    assert "[Lecture.pptx - Slide 2]" in full_text
    assert len(units) == 2
    assert len(sources) == 2
    assert sources[0].locationLabel == "Slide 1"


@pytest.mark.asyncio
async def test_full_document_engine_single_pass_and_caching(db_session: AsyncSession, test_user: dict):
    user_id = uuid.UUID(test_user["id"])
    doc_id = uuid.uuid4()

    # Create document and chunks in DB
    doc = Document(
        id=doc_id,
        user_id=user_id,
        file_name="Notes.docx",
        file_path="/tmp/fake_notes.docx",
        file_size=1024,
        file_type="docx",
        location_type="section",
        page_count=2,
        status="ready",
    )
    db_session.add(doc)
    c1 = Chunk(
        document_id=doc_id,
        user_id=user_id,
        page_number=1,
        chunk_index=0,
        content="Overview of software design principles.",
        location_type="section",
        location_label="Section: Overview",
        embedding=[0.1] * 384,
    )
    c2 = Chunk(
        document_id=doc_id,
        user_id=user_id,
        page_number=2,
        chunk_index=1,
        content="Detailed SOLID principles discussion.",
        location_type="section",
        location_label="Section: SOLID",
        embedding=[0.1] * 384,
    )
    db_session.add_all([c1, c2])
    await db_session.commit()

    mock_llm = MockLLM()
    progress_updates = []

    async def on_progress(p):
        progress_updates.append(p)

    # 1. First run: cache miss, single-pass LLM
    res, sources, was_cached = await execute_full_document_engine(
        db=db_session,
        user_id=user_id,
        document_ids=[doc_id],
        mode="student",
        action="explain_full",
        options={"level": "simple"},
        system_prompt="You are a friendly teacher.",
        user_instruction="Explain the whole document.",
        llm=mock_llm,
        progress_callback=on_progress,
    )
    assert was_cached is False
    assert mock_llm.call_count == 1
    assert "Overview of software design" in mock_llm.last_prompt
    assert len(sources) >= 1

    # 2. Second run with same options: cache hit!
    res2, sources2, was_cached2 = await execute_full_document_engine(
        db=db_session,
        user_id=user_id,
        document_ids=[doc_id],
        mode="student",
        action="explain_full",
        options={"level": "simple"},
        system_prompt="You are a friendly teacher.",
        user_instruction="Explain the whole document.",
        llm=mock_llm,
        progress_callback=on_progress,
    )
    assert was_cached2 is True
    # LLM call_count should not increase!
    assert mock_llm.call_count == 1
    assert res2 == res


@pytest.mark.asyncio
async def test_full_document_engine_map_reduce_large(db_session: AsyncSession, test_user: dict):
    user_id = uuid.UUID(test_user["id"])
    doc_id = uuid.uuid4()

    doc = Document(
        id=doc_id,
        user_id=user_id,
        file_name="HeavyBook.pdf",
        file_path="/tmp/fake_heavy.pdf",
        file_size=500000,
        file_type="pdf",
        location_type="page",
        page_count=25,
        status="ready",
    )
    db_session.add(doc)

    # Create 25 pages, each with > 14,000 chars so total > 350,000 chars (> 80k tokens)
    large_chunks = []
    for i in range(1, 26):
        c = Chunk(
            document_id=doc_id,
            user_id=user_id,
            page_number=i,
            chunk_index=i - 1,
            content=f"Page {i} comprehensive content. " * 600,  # ~18,000 chars per page
            location_type="page",
            location_label=f"Page {i}",
            embedding=[0.1] * 384,
        )
        large_chunks.append(c)

    db_session.add_all(large_chunks)
    await db_session.commit()

    mock_llm = MockLLM()
    progress_updates = []

    async def on_progress(p):
        progress_updates.append(p)

    res, sources, was_cached = await execute_full_document_engine(
        db=db_session,
        user_id=user_id,
        document_ids=[doc_id],
        mode="student",
        action="explain_full",
        options={"level": "exam"},
        system_prompt="You are a friendly teacher.",
        user_instruction="Explain the whole book.",
        llm=mock_llm,
        progress_callback=on_progress,
    )

    assert was_cached is False
    # Map-reduce: 25 pages grouped by 10 => 3 section groups (1-10, 11-20, 21-25) + 1 master combine = 4 LLM calls!
    assert mock_llm.call_count == 4
    assert len(progress_updates) >= 3
    # Check that progress messages were sent
    assert any("1-10 of 25" in p["step"] for p in progress_updates)
    assert any("Synthesizing" in p["step"] for p in progress_updates)
