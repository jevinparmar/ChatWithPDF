from typing import Dict, List, Optional

from app.core.modes.base import ModeConfig, QuickAction
from app.core.modes.business import business_mode
from app.core.modes.career import career_mode
from app.core.modes.legal import legal_mode
from app.core.modes.researcher import researcher_mode
from app.core.modes.student import student_mode

MODES_LIST = [
    student_mode,
    researcher_mode,
    business_mode,
    legal_mode,
    career_mode,
]

MODE_REGISTRY: Dict[str, ModeConfig] = {m.id: m for m in MODES_LIST}


def get_mode(mode_id: Optional[str]) -> ModeConfig:
    """Returns the ModeConfig for the specified ID, defaulting to Student mode."""
    if not mode_id:
        return student_mode
    return MODE_REGISTRY.get(mode_id.lower(), student_mode)


def list_modes() -> List[dict]:
    """Returns the serialized modes registry for the frontend."""
    return [m.model_dump() for m in MODES_LIST]


__all__ = [
    "ModeConfig",
    "QuickAction",
    "MODE_REGISTRY",
    "get_mode",
    "list_modes",
    "student_mode",
    "researcher_mode",
    "business_mode",
    "legal_mode",
    "career_mode",
]
