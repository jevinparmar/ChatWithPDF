from abc import ABC, abstractmethod
import asyncio
import json
import re
from typing import Any, AsyncIterator, Dict, List, Optional
import anthropic

from app.config import settings
from app.utils.logger import logger


class BaseLLMClient(ABC):
    """Abstract interface for LLM providers (Anthropic, OpenAI, etc.)."""

    @abstractmethod
    async def generate(
        self,
        system: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> str:
        """Generates a complete response non-streaming."""
        pass

    @abstractmethod
    async def stream(
        self,
        system: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> AsyncIterator[str]:
        """Streams response tokens as an async generator."""
        pass


class AnthropicClient(BaseLLMClient):
    """Anthropic Claude LLM client implementation."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key.strip() if api_key else ""
        self.model = model
        self.is_configured = bool(self.api_key and not self.api_key.startswith("mock_") and not self.api_key.startswith("your_key"))
        if self.is_configured:
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
        else:
            self._client = None

    async def generate(
        self,
        system: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> str:
        if self.is_configured and self._client:
            try:
                kwargs: Dict[str, Any] = {
                    "model": self.model,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": messages,  # type: ignore
                }
                if temperature is not None:
                    kwargs["extra_body"] = {"temperature": temperature}
                response = await self._client.messages.create(**kwargs)
                if response.content and len(response.content) > 0:
                    first_block = response.content[0]
                    if hasattr(first_block, "text"):
                        return first_block.text
                return ""
            except Exception as e:
                logger.error(f"Anthropic API call failed: {e}. Falling back to fallback response.")

        return self._generate_fallback(system, messages)

    async def stream(
        self,
        system: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> AsyncIterator[str]:
        if self.is_configured and self._client:
            try:
                kwargs: Dict[str, Any] = {
                    "model": self.model,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": messages,  # type: ignore
                }
                if temperature is not None:
                    kwargs["extra_body"] = {"temperature": temperature}
                async with self._client.messages.stream(**kwargs) as stream:
                    async for text in stream.text_stream:
                        yield text
                return
            except Exception as e:
                logger.error(f"Anthropic stream call failed: {e}. Falling back to fallback stream.")

        full_answer = self._generate_fallback(system, messages)
        words = full_answer.split(" ")
        for i, word in enumerate(words):
            yield word if i == 0 else f" {word}"
            await asyncio.sleep(0.01)

    def _generate_fallback(self, system: str, messages: List[Dict[str, str]]) -> str:
        """Deterministic context-aware fallback when external API key is absent or unreachable."""
        last_msg = messages[-1]["content"] if messages else ""

        # Summary prompt fallback
        if "summary" in system.lower() or "suggested questions" in system.lower():
            lines = [line.strip() for line in last_msg.split("\n") if line.strip()]
            snippet = lines[0] if lines else "Document content"
            return json.dumps({
                "summary": f"This document contains comprehensive information regarding {snippet[:120]}. It covers key definitions, procedures, and findings.",
                "suggested_questions": [
                    "What are the main objectives of this document?",
                    "What key requirements are outlined in the text?",
                    "How are procedures and policies implemented?",
                    "What conclusions or next steps are described?",
                ],
            })

        # Query rewrite fallback
        if "rewrite" in system.lower():
            return last_msg

        # RAG Answer fallback
        if "Context:\n" in last_msg:
            parts = last_msg.split("Context:\n")
            query_part = parts[0].strip()
            context_part = parts[1].strip() if len(parts) > 1 else ""

            if not context_part or "No relevant context found" in context_part:
                return "I couldn't find this in your documents."

            # Find source headers like [Source: filename, page N]
            source_match = re.search(r"\[Source:\s*([^,\]]+),\s*page\s*(\d+)\]", context_part)
            citation = source_match.group(0) if source_match else ""

            # Extract first sentence or snippet from context
            clean_context = re.sub(r"\[Source:[^\]]+\]", "", context_part).strip()
            first_sent = clean_context.split(".")[0].strip() if clean_context else ""

            if citation:
                return f"Based on the provided documents: {first_sent}. {citation}"
            return f"Based on the provided documents: {first_sent}."

        return "I couldn't find this in your documents."


_llm_instance: Optional[BaseLLMClient] = None


def get_llm_client() -> BaseLLMClient:
    """Returns singleton LLM client instance."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = AnthropicClient(
            api_key=settings.ANTHROPIC_API_KEY,
            model=settings.LLM_MODEL,
        )
    return _llm_instance
