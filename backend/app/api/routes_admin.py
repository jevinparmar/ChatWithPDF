from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.db.models import User
from app.schemas.admin import AdminStatsResponse
from app.services.admin_service import get_system_admin_stats

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminStatsResponse:
    """Admin-only endpoint returning system analytics, usage trends, and downvoted answer logs."""
    return await get_system_admin_stats(db)
