import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embedding_service
from app.core.llm import get_llm_client
from app.core.rag_chain import execute_rag_flow, plan_rag_response, stream_rag_flow
from app.db.models import Chunk, Document


@pytest.mark.asyncio
async def test_broad_question_on_20_page_document(db_session: AsyncSession, test_user: dict):
    user_id = uuid.UUID(test_user["id"])
    llm = get_llm_client()

    # 1. Create a 20-page document
    doc = Document(
        user_id=user_id,
        file_name="Software_Engineering_Unit_1.pdf",
        file_path="/dummy/Software_Engineering_Unit_1.pdf",
        file_size=102400,
        file_type="pdf",
        page_count=20,
        status="ready",
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)

    # 2. Add realistic chunks for all 20 pages
    # First page: Foundations & Scope
    # Middle page (10/11): Framework Activities & Software Process
    # Last page (20): Review Questions & Practice Exercises
    page_contents = {
        1: "Introduction to Software Engineering and Process Models. Chapter 1: Software and Software Engineering Foundations.",
        5: "Software Characteristics, Evolution, and Legacy Software Management.",
        10: "The Software Process: A process is a collection of activities, actions, and tasks required to build quality software.",
        11: "A generic process framework for software engineering includes five framework activities: Communication, Planning, Modeling, Construction, Deployment.",
        15: "Umbrella activities in the software process: Quality Assurance, Risk Management, and Configuration Management.",
        20: "Chapter Review Questions and Exercises: Explain Software Engineering as a Layered Technology. Discuss prescriptive process models and final conclusions.",
    }

    # Populate all 20 pages
    chunks = []
    texts_to_embed = []
    chunk_meta = []
    for p in range(1, 21):
        content = page_contents.get(p, f"Detailed software engineering principles and design methods for module {p}.")
        texts_to_embed.append(content)
        chunk_meta.append((p, content))

    embeddings = await embedding_service.embed_batch(texts_to_embed)

    for idx, (p, content) in enumerate(chunk_meta):
        chunks.append(
            Chunk(
                document_id=doc.id,
                user_id=user_id,
                content=content,
                page_number=p,
                chunk_index=idx,
                embedding=embeddings[idx],
            )
        )
    db_session.add_all(chunks)
    await db_session.commit()

    # 3. Test Broad Question: "explain me this pdf"
    broad_question = "explain me this pdf"
    plan = await plan_rag_response(
        db=db_session,
        user_id=user_id,
        question=broad_question,
        document_ids=[doc.id],
        llm=llm,
    )

    # Validate Mode 1: Broad + Small Document
    assert plan.mode == "broad_small"
    assert plan.max_tokens == 4000
    assert len(plan.sources) >= 3

    # Generate answer
    answer = await execute_rag_flow(plan, llm)
    assert len(answer) > 200

    # Verify topics from FIRST page, MIDDLE page, and LAST page are all present
    answer_lower = answer.lower()
    # First page topic (Software Engineering / Foundations / Introduction)
    assert any(term in answer_lower for term in ["foundations", "software engineering", "introduction"])
    # Middle page topic (Process / Framework / Planning / Modeling / Deployment)
    assert any(term in answer_lower for term in ["framework", "process", "planning", "modeling", "construction", "deployment"])
    # Last page topic (Review / Questions / Exercises / Conclusion)
    assert any(term in answer_lower for term in ["review", "questions", "exercises", "conclusion"])

    # Ensure NO inline [Source: ...] tags exist in the output text
    assert "[source:" not in answer_lower
    assert "(source:" not in answer_lower

    # 4. Test Streaming works for the broad answer
    stream_tokens = []
    async for token in stream_rag_flow(plan, llm):
        stream_tokens.append(token)
    streamed_text = "".join(stream_tokens)
    assert len(streamed_text) > 200
    assert "[source:" not in streamed_text.lower()


@pytest.mark.asyncio
async def test_specific_question_with_neighbor_chunks(db_session: AsyncSession, test_user: dict):
    user_id = uuid.UUID(test_user["id"])
    llm = get_llm_client()

    doc = Document(
        user_id=user_id,
        file_name="Agile_Handbook.pdf",
        file_path="/dummy/Agile_Handbook.pdf",
        file_size=50000,
        file_type="pdf",
        page_count=5,
        status="ready",
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)

    c0 = "Scrum overview and foundational agile values."
    c1 = "The sprint planning meeting initiates the development cycle where team commits to user stories."
    c2 = "Daily standup meetings keep synchronization high across developers."
    c3 = "Sprint retrospectives allow continuous improvement at end of sprint."

    embeddings = await embedding_service.embed_batch([c0, c1, c2, c3])

    db_session.add_all([
        Chunk(document_id=doc.id, user_id=user_id, content=c0, page_number=1, chunk_index=0, embedding=embeddings[0]),
        Chunk(document_id=doc.id, user_id=user_id, content=c1, page_number=2, chunk_index=1, embedding=embeddings[1]),
        Chunk(document_id=doc.id, user_id=user_id, content=c2, page_number=3, chunk_index=2, embedding=embeddings[2]),
        Chunk(document_id=doc.id, user_id=user_id, content=c3, page_number=4, chunk_index=3, embedding=embeddings[3]),
    ])
    await db_session.commit()

    # Query targeting chunk 1: neighboring chunks 0 and 2 should be included
    specific_question = "What happens during the sprint planning meeting?"
    plan = await plan_rag_response(
        db=db_session,
        user_id=user_id,
        question=specific_question,
        document_ids=[doc.id],
        llm=llm,
    )

    assert plan.mode == "specific"
    assert plan.max_tokens == 2000

    # Verify context sent to model includes the target and neighboring chunks
    context_text = plan.messages[0]["content"]
    assert "sprint planning" in context_text.lower()
    assert "scrum overview" in context_text.lower() or "standup" in context_text.lower()

    answer = await execute_rag_flow(plan, llm)
    assert len(answer) > 30
    assert "[source:" not in answer.lower()
