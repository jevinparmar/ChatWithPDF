from typing import List
from fastapi import APIRouter

from app.core.modes import list_modes

router = APIRouter(prefix="/modes", tags=["Modes"])


@router.get("", response_model=List[dict])
async def get_modes_registry() -> List[dict]:
    """Returns the registered modes and their quick actions for dynamic frontend rendering."""
    return list_modes()
