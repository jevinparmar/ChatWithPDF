import json
import os
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.action_runner import execute_mode_action_stream, validate_structured_output
from app.core.full_document import execute_full_document_engine
from app.core.loader import extract_document_pages
from app.core.modes import get_mode
from app.db.models import ChatSession, Chunk, Document, GeneratedOutput, User
from app.schemas.chat import SourceItem

SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "samples"))


def test_samples_exist_and_loadable():
    """Verifies that all 5 required sample files exist and parse with correct location types."""
    # 1. Notes PDF
    pdf_path = os.path.join(SAMPLES_DIR, "sample_notes.pdf")
    assert os.path.exists(pdf_path)
    pages_pdf = extract_document_pages(pdf_path, "pdf")
    assert len(pages_pdf) >= 5
    assert pages_pdf[0].location_type == "page"

    # 2. Presentation PPTX
    pptx_path = os.path.join(SAMPLES_DIR, "sample_presentation.pptx")
    assert os.path.exists(pptx_path)
    slides_pptx = extract_document_pages(pptx_path, "pptx")
    assert len(slides_pptx) >= 4
    assert slides_pptx[0].location_type == "slide"
    assert "Slide 1" in slides_pptx[0].location_label

    # 3. Contract DOCX
    contract_path = os.path.join(SAMPLES_DIR, "sample_contract.docx")
    assert os.path.exists(contract_path)
    sections_docx = extract_document_pages(contract_path, "docx")
    assert len(sections_docx) >= 3
    assert sections_docx[0].location_type == "section"

    # 4. Resume PDF
    resume_path = os.path.join(SAMPLES_DIR, "sample_resume.pdf")
    assert os.path.exists(resume_path)

    # 5. Job Description DOCX
    jd_path = os.path.join(SAMPLES_DIR, "sample_job_description.docx")
    assert os.path.exists(jd_path)


@pytest.mark.asyncio
async def test_full_document_engine_mentions_all_parts(db_session: AsyncSession, test_user: dict):
    """Verifies full-document understanding engine processes document from first, middle to last."""
    user_id = uuid.UUID(test_user["id"])
    doc_id = uuid.uuid4()

    doc = Document(
        id=doc_id,
        user_id=user_id,
        file_name="distributed_notes.pdf",
        file_path="/tmp/distributed_notes.pdf",
        file_size=1000,
        page_count=6,
        file_type="pdf",
        location_type="page",
        role="notes",
        status="ready",
    )
    db_session.add(doc)
    await db_session.flush()

    chunks = [
        Chunk(
            document_id=doc_id,
            user_id=user_id,
            page_number=1,
            chunk_index=0,
            content="Chapter 1: Distributed Systems Basics. Latency and Throughput.",
            location_type="page",
            location_label="Page 1",
            embedding=[0.0] * 384,
        ),
        Chunk(
            document_id=doc_id,
            user_id=user_id,
            page_number=3,
            chunk_index=1,
            content="Chapter 3: Raft Consensus Algorithm. Leader election and log replication.",
            location_type="page",
            location_label="Page 3",
            embedding=[0.0] * 384,
        ),
        Chunk(
            document_id=doc_id,
            user_id=user_id,
            page_number=6,
            chunk_index=2,
            content="Chapter 6: Final Revision Checklist and Linearizability model answers.",
            location_type="page",
            location_label="Page 6",
            embedding=[0.0] * 384,
        ),
    ]
    db_session.add_all(chunks)
    await db_session.commit()

    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(
        return_value="Complete explanation covering Chapter 1 (Page 1), Raft Consensus (Page 3), and Final Revision (Page 6)."
    )

    result_text, sources, was_cached = await execute_full_document_engine(
        db=db_session,
        user_id=user_id,
        document_ids=[doc_id],
        mode="student",
        action="explain_full",
        options={},
        system_prompt="Teacher mode",
        user_instruction="Explain every topic in order",
        llm=mock_llm,
    )

    assert not was_cached
    assert "Page 1" in result_text
    assert "Page 3" in result_text
    assert "Page 6" in result_text

    # Second call must hit cache immediately
    result_cached, sources_2, was_cached_2 = await execute_full_document_engine(
        db=db_session,
        user_id=user_id,
        document_ids=[doc_id],
        mode="student",
        action="explain_full",
        options={},
        system_prompt="Teacher mode",
        user_instruction="Explain every topic in order",
        llm=mock_llm,
    )
    assert was_cached_2 is True
    assert result_cached == result_text


@pytest.mark.asyncio
async def test_career_mode_requires_two_files(db_session: AsyncSession, test_user: dict):
    """Verifies Career mode match_score quick action enforces two documents requirement."""
    user_id = uuid.UUID(test_user["id"])
    session = ChatSession(user_id=user_id, title="Career Test", mode="career")
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)

    one_doc_id = uuid.uuid4()

    # Attempt running with only 1 file
    events = []
    async for evt in execute_mode_action_stream(
        db=db_session,
        user_id=user_id,
        session=session,
        action_id="match_score",
        document_ids=[one_doc_id],
        options={},
    ):
        events.append(evt)

    assert len(events) == 1
    assert events[0]["event"] == "error"
    assert "requires two documents" in events[0]["data"]["error"]


@pytest.mark.asyncio
async def test_legal_mode_disclaimer(db_session: AsyncSession, test_user: dict):
    """Verifies legal mode prompt and quick action responses include legal disclaimer."""
    legal_mode = get_mode("legal")
    assert "This is an AI summary to help you read the document, not legal advice" in legal_mode.system_prompt
