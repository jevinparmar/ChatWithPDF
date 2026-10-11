from typing import AsyncIterator, List, Tuple
from app.core.llm import BaseLLMClient, get_llm_client
from app.core.prompts import RAG_SYSTEM_PROMPT, REWRITE_QUESTION_SYSTEM_PROMPT
from app.core.retriever import RetrievedChunk
from app.db.models import Message
from app.schemas.chat import SourceItem


async def rewrite_followup_question(
    question: str,
    history: List[Message],
    llm: BaseLLMClient,
) -> str:
    """Uses LLM to rewrite a followup question into a standalone question using last 6 messages."""
    if not history:
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

    rewritten = await llm.generate(
        system=REWRITE_QUESTION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
        temperature=0.0,
    )
    cleaned = rewritten.strip()
    return cleaned if cleaned else question


def build_rag_prompt(
    question: str,
    chunks: List[RetrievedChunk],
) -> Tuple[str, List[dict]]:
    """Builds system prompt and formatted user message with context chunks."""
    if not chunks:
        context_str = "No relevant context found."
    else:
        context_blocks = []
        for c in chunks:
            context_blocks.append(f"[Source: {c.file_name}, page {c.page_number}]\n{c.content}")
        context_str = "\n\n".join(context_blocks)

    user_content = f"Question: {question}\n\nContext:\n{context_str}\n\nAnswer:"
    messages = [{"role": "user", "content": user_content}]
    return RAG_SYSTEM_PROMPT, messages


async def execute_rag_chain(
    question: str,
    chunks: List[RetrievedChunk],
    llm: BaseLLMClient,
) -> str:
    """Executes non-streaming RAG answer generation."""
    system, messages = build_rag_prompt(question, chunks)
    answer = await llm.generate(system=system, messages=messages, max_tokens=1024, temperature=0.1)
    return answer.strip()


async def stream_rag_chain(
    question: str,
    chunks: List[RetrievedChunk],
    llm: BaseLLMClient,
) -> AsyncIterator[str]:
    """Yields streaming response tokens for RAG answer generation."""
    system, messages = build_rag_prompt(question, chunks)
    async for token in llm.stream(system=system, messages=messages, max_tokens=1024, temperature=0.1):
        yield token
