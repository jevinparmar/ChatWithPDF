import json
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.action_runner import validate_structured_output
from app.core.modes import MODE_REGISTRY, get_mode, list_modes
from app.db.models import Document


@pytest.mark.asyncio
async def test_modes_registry_endpoint(async_client: AsyncClient):
    """Verifies that GET /api/modes returns the complete dynamic mode registry."""
    response = await async_client.get("/api/modes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

    mode_ids = [m["id"] for m in data]
    assert set(mode_ids) == {"student", "researcher", "business", "legal", "career"}

    # Verify student mode features
    student_mode = next(m for m in data if m["id"] == "student")
    assert student_mode["name"] == "Student"
    action_ids = [a["id"] for a in student_mode["quick_actions"]]
    assert "explain_full" in action_ids
    assert "flashcards" in action_ids
    assert "quiz" in action_ids
    assert "mind_map" in action_ids
    assert "exam_questions" in action_ids

    # Verify legal mode has disclaimer in system prompt
    legal_mode = next(m for m in data if m["id"] == "legal")
    assert "This is an AI summary to help you read the document, not legal advice" in legal_mode["system_prompt"]


@pytest.mark.asyncio
async def test_update_user_default_mode(async_client: AsyncClient, test_user: dict):
    """Verifies PATCH /api/auth/mode updates user's default mode (onboarding modal)."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    # Update mode to 'researcher'
    res = await async_client.patch("/api/auth/mode", json={"mode": "researcher"}, headers=headers)
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["mode"] == "researcher"

    # Verify /api/auth/me reflects the new mode
    me_res = await async_client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["mode"] == "researcher"

    # Reset back to student
    await async_client.patch("/api/auth/mode", json={"mode": "student"}, headers=headers)


@pytest.mark.asyncio
async def test_session_mode_lifecycle(async_client: AsyncClient, test_user: dict):
    """Verifies session mode creation and switching per chat."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    # Create session with legal mode
    res = await async_client.post(
        "/api/chat/sessions",
        json={"title": "Contract Review", "mode": "legal"},
        headers=headers,
    )
    assert res.status_code == 201
    session = res.json()
    assert session["mode"] == "legal"
    session_id = session["id"]

    # Switch session mode to business
    update_res = await async_client.patch(
        f"/api/chat/sessions/{session_id}",
        json={"mode": "business"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["mode"] == "business"

    # List sessions and verify persistence
    list_res = await async_client.get("/api/chat/sessions", headers=headers)
    assert list_res.status_code == 200
    matching = next((s for s in list_res.json() if s["id"] == session_id), None)
    assert matching is not None
    assert matching["mode"] == "business"


def test_structured_output_validation():
    """Verifies Pydantic validation and serialization for structured outputs."""
    # 1. Flashcards
    flashcards_raw = json.dumps({
        "flashcards": [
            {"front": "What is photosynthesis?", "back": "Process by plants to convert light to energy", "location": "Page 3"}
        ]
    })
    res_flash = validate_structured_output("flashcards", "flashcards", flashcards_raw)
    assert res_flash is not None
    assert len(res_flash["flashcards"]) == 1
    assert res_flash["flashcards"][0]["location"] == "Page 3"

    # 2. Quiz
    quiz_raw = json.dumps({
        "title": "Bio Quiz",
        "questions": [
            {
                "question": "What organelle produces ATP?",
                "options": ["Mitochondria", "Nucleus", "Ribosome", "Golgi"],
                "correctIndex": 0,
                "explanation": "Mitochondria is the powerhouse of the cell",
                "location": "Page 5",
            }
        ]
    })
    res_quiz = validate_structured_output("quiz", "quiz", quiz_raw)
    assert res_quiz is not None
    assert res_quiz["questions"][0]["correctIndex"] == 0

    # 3. Risk Badges
    risk_raw = json.dumps({
        "risks": [
            {"clause": "Auto-renewal within 24 hours", "level": "red", "reason": "Extremely short notice period", "location": "Page 12"}
        ]
    })
    res_risk = validate_structured_output("risk_check", "risk_badges", risk_raw)
    assert res_risk is not None
    assert res_risk["risks"][0]["level"] == "red"

    # 4. Invalid JSON handles gracefully
    res_invalid = validate_structured_output("quiz", "quiz", "Not a json")
    assert res_invalid is None


@pytest.mark.asyncio
async def test_action_endpoint_sse(
    async_client: AsyncClient, test_user: dict, db_session: AsyncSession
):
    """Verifies POST /api/chat/action SSE streaming of progress, sources, tokens, and completion."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    # Create dummy document
    doc = Document(
        user_id=uuid.UUID(test_user["id"]),
        file_name="lecture_sample.txt",
        file_path="/tmp/lecture_sample.txt",
        file_size=500,
        page_count=2,
        file_type="txt",
        location_type="page",
        role="notes",
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)

    # Create chat session
    s_res = await async_client.post(
        "/api/chat/sessions",
        json={"title": "Action Test Session", "mode": "student", "documentIds": [str(doc.id)]},
        headers=headers,
    )
    session_id = s_res.json()["id"]

    mock_llm_response = "Here are the top key points from lecture notes: (Page 1)"

    with patch("app.core.action_runner.get_llm_client") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.generate = AsyncMock(return_value=mock_llm_response)
        mock_get_llm.return_value = mock_llm

        res = await async_client.post(
            "/api/chat/action",
            json={
                "sessionId": session_id,
                "actionId": "key_points",
                "documentIds": [str(doc.id)],
                "options": {},
            },
            headers=headers,
        )

        assert res.status_code == 200
        assert "text/event-stream" in res.headers["content-type"]
        body = res.text
        assert "event: sources" in body
        assert "event: done" in body
