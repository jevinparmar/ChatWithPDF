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
    mode: str = "student",
    top_k: Optional[int] = None,
    hybrid_search: Optional[bool] = None,
) -> RAGPlan:
    """
    Evaluates intent and document scope, returning a RAGPlan configured for one of three modes:
    1. Broad + small document (< 80,000 estimated tokens): loads all chunks with [Page N] markers and teacher prompt.
    2. Broad + large document (>= 80,000 tokens): map-reduce summary generation / reuse.
    3. Specific question: targeted RAG with TOP_K=8 and neighboring chunk expansion.
    """
    from app.core.modes import get_mode
    mode_config = get_mode(mode)
    llm_client = llm or get_llm_client()
    # Resolve target document IDs
    target_docs = list(document_ids) if document_ids else []

    # =========================================================================
    # 1. PURE CHATBOT MODE (NO DOCUMENTS SELECTED)
    # When no document is selected, act as a full-featured conversational AI chatbot.
    # Answer any question, write code, explain concepts, chat casually, etc.
    # =========================================================================
    if not target_docs:
        logger.info(f"No document selected. Running pure Chatbot Mode for user {user_id}: '{question[:60]}'")
        chatbot_system = (
            f"You are a versatile, friendly, and highly intelligent AI conversational chatbot operating in {mode_config.name} mode.\n"
            f"The user has not selected any document, so you are acting as a general-purpose AI chatbot.\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Answer ANY question the user asks: general knowledge, programming and technical debugging, mathematical calculations, creative writing, advice, and conversation.\n"
            f"2. Explain everything thoroughly with clarity, structure, and intuitive examples.\n"
            f"3. Do NOT mention or complain that no documents were selected or attached. Simply provide a direct, outstanding answer.\n"
            f"4. Adapt to the user's language (English, Hindi, Hinglish, Gujarati, etc.).\n"
            f"5. Use beautiful GitHub-flavored markdown with clear headings, bullet points, and code blocks."
        )
        user_content = (
            f"User Query:\n{question}\n\n"
            f"Please provide a complete, well-explained, and helpful answer:"
        )
        return RAGPlan(
            mode="chatbot",
            system_prompt=chatbot_system,
            messages=[{"role": "user", "content": user_content}],
            sources=[],
            max_tokens=3000,
            temperature=0.7,
        )

    # =========================================================================
    # 2. DOCUMENT RAG MODE (USER SELECTED SPECIFIC DOCUMENT(S))
    # Ground answers in the selected document(s), explain concepts from it,
    # and provide verifiable citations.
    # =========================================================================
    intent = classify_intent(question)
    logger.info(f"Classified query '{question[:60]}' intent as: {intent} on {len(target_docs)} selected doc(s) in mode: {mode}")

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
                loc_type = c.location_type or "page"
                loc_label = c.location_label or (
                    f"Slide {c.page_number}" if loc_type == "slide"
                    else f"Sheet {c.page_number}" if loc_type == "sheet"
                    else f"Page {c.page_number}"
                )
                sources.append(
                    SourceItem(
                        documentId=c.document_id,
                        fileName=c.file_name,
                        page=c.page_number,
                        locationType=loc_type,
                        locationLabel=loc_label,
                        snippet=snippet,
                    )
                )

        # Mode 1: Broad + Small Document (< 80,000 estimated tokens)
        if estimated_tokens < 80000:
            from app.core.full_document import rebuild_full_text_with_locations
            full_text, _, rebuilt_sources = rebuild_full_text_with_locations(all_chunks)
            if rebuilt_sources:
                sources = rebuilt_sources

            user_content = (
                f"Document Text:\n{full_text}\n\n"
                f"Question: {question}\n\n"
                f"Please explain thoroughly according to your mode style with headings, definitions, examples, and key takeaways:"
            )

            return RAGPlan(
                mode="broad_small",
                system_prompt=mode_config.system_prompt,
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

    chosen_top_k = top_k if top_k is not None and top_k > 0 else mode_config.retrieval_settings.get("top_k", settings.TOP_K)
    chosen_hybrid = bool(hybrid_search) if hybrid_search is not None else False

    # Mode 3: Specific Question (Normal RAG with dynamic TOP_K and optional Hybrid search)
    chunks, sources = await retrieve_relevant_chunks(
        db=db,
        user_id=user_id,
        question=question,
        document_ids=target_docs if target_docs else None,
        top_k=chosen_top_k,
        include_neighbors=True,
        hybrid_search=chosen_hybrid,
    )

    if chunks:
        context_blocks = []
        for c in chunks:
            loc_label = c.location_label or f"Page {c.page_number}"
            context_blocks.append(f"{loc_label} ({c.file_name}):\n{c.content}")
        context_str = "\n\n---\n\n".join(context_blocks)
        user_content = (
            f"Context from Selected Document(s):\n{context_str}\n\n"
            f"Question: {question}\n\n"
            f"Please provide a comprehensive, well-explained answer based on the selected document content above. "
            f"Explain concepts clearly in your own words, break down technical points, provide intuitive examples, "
            f"and reference the appropriate locations (e.g. Page X, Slide Y)."
        )
    else:
        user_content = (
            f"Question: {question}\n\n"
            f"Note: The user selected document(s), but no directly matching passage was found in the file for this question.\n"
            f"Explain what the document covers if relevant, and then answer the question thoroughly using your general knowledge so the user is never left without an answer."
        )

    return RAGPlan(
        mode="specific",
        system_prompt=mode_config.system_prompt,
        messages=[{"role": "user", "content": user_content}],
        sources=sources,
        max_tokens=2500,
        temperature=0.2,
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
    if chunks:
        context_blocks = [f"Page {c.page_number} ({c.file_name}):\n{c.content}" for c in chunks]
        context_str = "\n\n---\n\n".join(context_blocks)
        user_content = f"Context:\n{context_str}\n\nQuestion: {question}\n\nAnswer in your own words:"
    else:
        user_content = f"Question: {question}\n\nAnswer helpfully and thoroughly in your own words:"
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
