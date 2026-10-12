from collections import defaultdict
from dataclasses import dataclass
import re
from typing import AsyncIterator, List, Optional, Tuple
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.intent import classify_intent
from app.core.llm import BaseLLMClient, clean_inline_sources, get_llm_client
from app.core.prompts import (
    MAP_REDUCE_COMBINE_PROMPT,
    MAP_REDUCE_SECTION_PROMPT,
    REWRITE_QUESTION_SYSTEM_PROMPT,
    SPECIFIC_RAG_SYSTEM_PROMPT,
    TEACHER_SYSTEM_PROMPT,
)
from app.core.retriever import (
    RetrievedChunk,
    load_all_document_chunks,
    retrieve_relevant_chunks,
)
from app.db.models import Document, Message
from app.schemas.chat import SourceItem
from app.utils.logger import logger


@dataclass
class RAGPlan:
    """Encapsulates the selected RAG mode and prompt configuration."""
    mode: str  # "broad_small", "broad_large", or "specific"
    system_prompt: str
    messages: List[dict]
    sources: List[SourceItem]
    max_tokens: int
    temperature: float = 0.1


async def rewrite_followup_question(
    question: str,
    history: List[Message],
    llm: BaseLLMClient,
) -> str:
    """Uses LLM to rewrite a followup question into a standalone question using last 6 messages."""
    if not history or not getattr(llm, "is_configured", True):
        return question

    recent_history = history[-6:]
    history_formatted = "\n".join(
        f"{m.role.capitalize()}: {m.content}" for m in recent_history
    )

    prompt = (
        f"Conversation History:\n{history_formatted}\n\n"
        f"Latest User Query: {question}\n\n"
        f"Standalone Question:"
    )

    try:
        rewritten = await llm.generate(
            system=REWRITE_QUESTION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            temperature=0.0,
        )
        cleaned = rewritten.strip()
        if "Conversation History:" in cleaned or "Latest User Query:" in cleaned:
            return question
        return cleaned if cleaned else question
    except Exception:
        return question


async def generate_map_reduce_summary(
    all_chunks: List[RetrievedChunk],
    llm: BaseLLMClient,
    pages_per_group: int = 10,
) -> str:
    """
    Executes map-reduce summarization on large documents:
    1. Splits chunks into page groups of ~10 pages.
    2. Summarizes each group.
    3. Combines group summaries into one structured master explanation.
    """
    # Group chunks by page number
    page_to_text: dict[int, list[str]] = defaultdict(list)
    for c in all_chunks:
        page_to_text[c.page_number].append(c.content)

    sorted_pages = sorted(page_to_text.keys())
    if not sorted_pages:
        return "No text available for summarization."

    # Split into groups of ~10 pages
    group_summaries: List[str] = []
    for i in range(0, len(sorted_pages), pages_per_group):
        group_pages = sorted_pages[i : i + pages_per_group]
        start_p, end_p = group_pages[0], group_pages[-1]

        group_content_parts = []
        for p in group_pages:
            group_content_parts.append(f"[Page {p}]\n" + "\n".join(page_to_text[p]))
        group_text = "\n\n".join(group_content_parts)

        section_prompt = (
            f"Document Section (Pages {start_p} to {end_p}):\n\n{group_text}\n\n"
            f"Please summarize the key concepts, definitions, and takeaways of this section:"
        )

        section_summary = await llm.generate(
            system=MAP_REDUCE_SECTION_PROMPT,
            messages=[{"role": "user", "content": section_prompt}],
            max_tokens=1000,
            temperature=0.1,
        )
        group_summaries.append(
            f"### Section: Pages {start_p}–{end_p}\n{clean_inline_sources(section_summary)}"
        )

    # Combine all group summaries
    all_summaries_text = "\n\n".join(group_summaries)
    combine_prompt = (
        f"Individual Section Summaries:\n\n{all_summaries_text}\n\n"
        f"Please synthesize these into one comprehensive, unified document explanation with headings and key takeaways:"
    )

    master_summary = await llm.generate(
        system=MAP_REDUCE_COMBINE_PROMPT,
        messages=[{"role": "user", "content": combine_prompt}],
        max_tokens=3000,
        temperature=0.1,
    )
    return clean_inline_sources(master_summary)


async def plan_rag_response(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    document_ids: Optional[List[uuid.UUID]] = None,
    llm: Optional[BaseLLMClient] = None,
) -> RAGPlan:
    """
    Evaluates intent and document scope, returning a RAGPlan configured for one of three modes:
    1. Broad + small document (< 80,000 estimated tokens): loads all chunks with [Page N] markers and teacher prompt.
    2. Broad + large document (>= 80,000 tokens): map-reduce summary generation / reuse.
    3. Specific question: targeted RAG with TOP_K=8 and neighboring chunk expansion.
    """
    llm_client = llm or get_llm_client()
    intent = classify_intent(question)
    logger.info(f"Classified query '{question[:60]}' intent as: {intent}")

    # Resolve target document IDs
    target_docs = list(document_ids) if document_ids else []
    if not target_docs:
        # If none explicitly provided, query user's documents
        res = await db.execute(
            select(Document.id).where(Document.user_id == user_id).limit(10)
        )
        target_docs = [row[0] for row in res.all()]

    if intent == "broad" and target_docs:
        # Load ALL chunks sequentially
        all_chunks = await load_all_document_chunks(db, user_id, target_docs)
        total_chars = sum(len(c.content) for c in all_chunks)
        estimated_tokens = total_chars // 4
        logger.info(
            f"Broad query on {len(target_docs)} docs: {len(all_chunks)} chunks, "
            f"~{total_chars} chars, ~{estimated_tokens} estimated tokens"
        )

        # Build representative sources across document (first, middle, last, etc.)
        sources: List[SourceItem] = []
        if all_chunks:
            page_map: dict[tuple[str, int], RetrievedChunk] = {}
            for c in all_chunks:
                key = (c.document_id, c.page_number)
                if key not in page_map:
                    page_map[key] = c

            sorted_keys = sorted(page_map.keys(), key=lambda k: k[1])
            # Sample up to 8 representative pages evenly
            if len(sorted_keys) <= 8:
                selected_keys = sorted_keys
            else:
                indices = [0, len(sorted_keys) // 4, len(sorted_keys) // 2, (3 * len(sorted_keys)) // 4, len(sorted_keys) - 1]
                selected_keys = [sorted_keys[idx] for idx in sorted(set(indices))]

            for k in selected_keys:
                c = page_map[k]
                snippet = c.content[:200].replace("\n", " ").strip()
                if len(c.content) > 200:
                    snippet += "..."
                sources.append(
                    SourceItem(
                        documentId=c.document_id,
                        fileName=c.file_name,
                        page=c.page_number,
                        snippet=snippet,
                    )
                )

        # Mode 1: Broad + Small Document (< 80,000 estimated tokens)
        if estimated_tokens < 80000:
            doc_page_texts: dict[tuple[str, int], list[str]] = defaultdict(list)
            for c in all_chunks:
                doc_page_texts[(c.file_name, c.page_number)].append(c.content)

            full_text_blocks = []
            for (file_name, page_num), parts in doc_page_texts.items():
                page_text = "\n".join(parts)
                full_text_blocks.append(f"[Page {page_num}]\n{page_text}")

            full_text = "\n\n".join(full_text_blocks)
            user_content = (
                f"Document Text:\n{full_text}\n\n"
                f"Question: {question}\n\n"
                f"Please explain every topic in order with headings, definitions, examples, and key takeaways:"
            )

            return RAGPlan(
                mode="broad_small",
                system_prompt=TEACHER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
                sources=sources,
                max_tokens=4000,
                temperature=0.2,
            )

        # Mode 2: Broad + Large Document (Map-Reduce)
        # Check if stored comprehensive summary is available in DB
        res_docs = await db.execute(
            select(Document).where(Document.id.in_(target_docs), Document.user_id == user_id)
        )
        loaded_docs = res_docs.scalars().all()

        combined_doc_summaries = []
        for d in loaded_docs:
            # If doc.summary exists and is a full structured summary (> 300 chars), reuse it
            if d.summary and len(d.summary) > 300:
                combined_doc_summaries.append(f"## {d.file_name}\n{d.summary}")
            else:
                # Generate map-reduce on-the-fly and save to doc.summary
                doc_chunks = [c for c in all_chunks if c.document_id == str(d.id)]
                if doc_chunks:
                    mr_summary = await generate_map_reduce_summary(doc_chunks, llm_client)
                    d.summary = mr_summary
                    combined_doc_summaries.append(f"## {d.file_name}\n{mr_summary}")

        await db.commit()

        summaries_text = "\n\n".join(combined_doc_summaries)
        user_content = (
            f"Comprehensive Document Summaries & Architecture:\n{summaries_text}\n\n"
            f"Question: {question}\n\n"
            f"Please teach and explain the complete document using the master summary above:"
        )

        return RAGPlan(
            mode="broad_large",
            system_prompt=TEACHER_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
            sources=sources,
            max_tokens=4000,
            temperature=0.2,
        )

    # Mode 3: Specific Question (Normal RAG with TOP_K=8 and Neighboring Chunks)
    chunks, sources = await retrieve_relevant_chunks(
        db=db,
        user_id=user_id,
        question=question,
        document_ids=target_docs if target_docs else None,
        top_k=8,
        include_neighbors=True,
    )

    if not chunks:
        context_str = "No relevant context found."
    else:
        context_blocks = []
        for c in chunks:
            # Notice: no [Source: ...] header in chunk text to prevent model echo
            context_blocks.append(f"Page {c.page_number} ({c.file_name}):\n{c.content}")
        context_str = "\n\n---\n\n".join(context_blocks)

    user_content = f"Context:\n{context_str}\n\nQuestion: {question}\n\nAnswer in your own words:"
    return RAGPlan(
        mode="specific",
        system_prompt=SPECIFIC_RAG_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
        sources=sources,
        max_tokens=2000,
        temperature=0.1,
    )


async def execute_rag_flow(
    plan: RAGPlan,
    llm: BaseLLMClient,
) -> str:
    """Executes non-streaming response generation and cleans any inline citations."""
    answer = await llm.generate(
        system=plan.system_prompt,
        messages=plan.messages,
        max_tokens=plan.max_tokens,
        temperature=plan.temperature,
    )
    return clean_inline_sources(answer.strip())


async def stream_rag_flow(
    plan: RAGPlan,
    llm: BaseLLMClient,
) -> AsyncIterator[str]:
    """Yields streaming response tokens for any of the 3 RAG modes."""
    async for token in llm.stream(
        system=plan.system_prompt,
        messages=plan.messages,
        max_tokens=plan.max_tokens,
        temperature=plan.temperature,
    ):
        yield token


# Backward-compatible helper functions
def build_rag_prompt(
    question: str,
    chunks: List[RetrievedChunk],
) -> Tuple[str, List[dict]]:
    """Builds prompt for legacy callers."""
    if not chunks:
        context_str = "No relevant context found."
    else:
        context_blocks = [f"Page {c.page_number} ({c.file_name}):\n{c.content}" for c in chunks]
        context_str = "\n\n---\n\n".join(context_blocks)

    user_content = f"Context:\n{context_str}\n\nQuestion: {question}\n\nAnswer:"
    return SPECIFIC_RAG_SYSTEM_PROMPT, [{"role": "user", "content": user_content}]


async def execute_rag_chain(
    question: str,
    chunks: List[RetrievedChunk],
    llm: BaseLLMClient,
) -> str:
    """Legacy wrapper executing single-turn answer generation."""
    system, messages = build_rag_prompt(question, chunks)
    answer = await llm.generate(system=system, messages=messages, max_tokens=2000, temperature=0.1)
    return clean_inline_sources(answer.strip())


async def stream_rag_chain(
    question: str,
    chunks: List[RetrievedChunk],
    llm: BaseLLMClient,
) -> AsyncIterator[str]:
    """Legacy wrapper yielding tokens."""
    system, messages = build_rag_prompt(question, chunks)
    async for token in llm.stream(system=system, messages=messages, max_tokens=2000, temperature=0.1):
        yield token
