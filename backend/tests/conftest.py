import asyncio
import os
import sys
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.deps import get_db
from app.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.database import init_db_extensions
from app.db.models import User
from app.main import app

test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    asyncio.run(init_db_extensions())
    yield


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> dict:
    email = "testuser_a@example.com"
    result = await db_session.execute(User.__table__.select().where(User.email == email))
    user = result.first()
    if not user:
        new_user = User(
            name="Test User A",
            email=email,
            password_hash=get_password_hash("password123"),
            role="user",
        )
        db_session.add(new_user)
        await db_session.commit()
        await db_session.refresh(new_user)
        user_id = str(new_user.id)
    else:
        user_id = str(user.id)

    token = create_access_token({"sub": user_id, "email": email})
    return {"id": user_id, "email": email, "token": token}


@pytest_asyncio.fixture
async def test_user_b(db_session: AsyncSession) -> dict:
    email = "testuser_b@example.com"
    result = await db_session.execute(User.__table__.select().where(User.email == email))
    user = result.first()
    if not user:
        new_user = User(
            name="Test User B",
            email=email,
            password_hash=get_password_hash("password123"),
            role="user",
        )
        db_session.add(new_user)
        await db_session.commit()
        await db_session.refresh(new_user)
        user_id = str(new_user.id)
    else:
        user_id = str(user.id)

    token = create_access_token({"sub": user_id, "email": email})
    return {"id": user_id, "email": email, "token": token}


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> dict:
    email = "admin_test@example.com"
    result = await db_session.execute(User.__table__.select().where(User.email == email))
    user = result.first()
    if not user:
        new_user = User(
            name="Admin Tester",
            email=email,
            password_hash=get_password_hash("password123"),
            role="admin",
        )
        db_session.add(new_user)
        await db_session.commit()
        await db_session.refresh(new_user)
        user_id = str(new_user.id)
    else:
        user_id = str(user.id)

    token = create_access_token({"sub": user_id, "email": email})
    return {"id": user_id, "email": email, "token": token}
