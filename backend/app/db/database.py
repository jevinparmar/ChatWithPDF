from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import settings
from app.utils.logger import logger

from sqlalchemy.pool import NullPool

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db_extensions() -> None:
    """Ensures vector extension and updated mode/location schema exist in PostgreSQL."""
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            logger.info("pgvector extension initialized or already present.")
            
            statements = [
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'page';",
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS role VARCHAR(50);",
                "ALTER TABLE chunks ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'page';",
                "ALTER TABLE chunks ADD COLUMN IF NOT EXISTS location_label VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'student';",
                "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'student';",
                """CREATE TABLE IF NOT EXISTS generated_outputs (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    document_ids_hash VARCHAR(64) NOT NULL,
                    mode VARCHAR(50) NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    options JSONB DEFAULT '{}'::jsonb,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );""",
                """CREATE INDEX IF NOT EXISTS idx_generated_outputs_lookup 
                    ON generated_outputs(user_id, document_ids_hash, mode, action);""",
                "ALTER TABLE generated_outputs ADD COLUMN IF NOT EXISTS document_ids JSONB DEFAULT '[]'::jsonb;",
            ]
            for stmt in statements:
                await conn.execute(text(stmt))
            logger.info("Database schema initialized with mode and universal file support.")
        except Exception as e:
            logger.error(f"Failed to initialize database extensions/schema: {e}")
            raise
