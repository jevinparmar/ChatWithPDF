import asyncio
from typing import List, Optional
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.utils.logger import logger


class EmbeddingService:
    """Singleton service for generating vector embeddings."""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self) -> None:
        """Loads sentence-transformers model into memory once."""
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded successfully.")

    def embed_query_sync(self, query: str) -> List[float]:
        self.load_model()
        vec = self._model.encode(query, normalize_embeddings=True)
        return vec.tolist()

    def embed_batch_sync(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        self.load_model()
        vecs = self._model.encode(texts, batch_size=32, normalize_embeddings=True)
        return vecs.tolist()

    async def embed_query(self, query: str) -> List[float]:
        """Encodes single query string asynchronously."""
        return await asyncio.to_thread(self.embed_query_sync, query)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Encodes a list of chunk texts asynchronously."""
        return await asyncio.to_thread(self.embed_batch_sync, texts)


embedding_service = EmbeddingService()
