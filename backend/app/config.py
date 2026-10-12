import os
from pathlib import Path
from typing import List, Optional, Union
from urllib.parse import quote_plus
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment and .env."""

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "chatwithpdf"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DATABASE_URL: Optional[str] = None

    SECRET_KEY: str = "default_secret_key_change_me_super_secret_jwt_key_at_least_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: Optional[str] = None
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"

    LLM_MODEL: str = "claude-3-5-sonnet-20241022"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 8
    SIMILARITY_THRESHOLD: float = 0.15
    MAX_UPLOAD_MB: int = 20

    CORS_ORIGINS: Union[List[str], str] = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
    UPLOAD_DIR: Path = Path("data/uploads")

    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_CHAT: str = "20/minute"

    @model_validator(mode="after")
    def assemble_db_url(self) -> "Settings":
        if not self.DATABASE_URL:
            user = quote_plus(str(self.DB_USER))
            password = quote_plus(str(self.DB_PASSWORD))
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{user}:{password}@"
                f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            )
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [i.strip() for i in self.CORS_ORIGINS.split(",") if i.strip()]

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
