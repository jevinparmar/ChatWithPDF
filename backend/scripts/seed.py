import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.security import get_password_hash
from app.db.database import AsyncSessionLocal
from app.db.models import User
from app.utils.logger import logger


async def seed_users() -> None:
    """Seeds default demo users if they do not exist."""
    users_to_seed = [
        {
            "name": "Alex Johnson",
            "email": "user@test.com",
            "password": "password123",
            "role": "user",
        },
        {
            "name": "Sarah Connor (Admin)",
            "email": "admin@test.com",
            "password": "password123",
            "role": "admin",
        },
    ]

    async with AsyncSessionLocal() as db:
        for u in users_to_seed:
            result = await db.execute(select(User).where(User.email == u["email"].lower()))
            existing = result.scalar_one_or_none()
            if not existing:
                new_user = User(
                    name=u["name"],
                    email=u["email"].lower(),
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                )
                db.add(new_user)
                logger.info(f"Seeded user: {u['email']} (role: {u['role']})")
            else:
                existing.role = u["role"]
                existing.password_hash = get_password_hash(u["password"])
                logger.info(f"User {u['email']} already exists. Role confirmed: {existing.role}")
        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_users())
