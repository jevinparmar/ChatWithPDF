import json
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_lifecycle_streaming_and_feedback(
    async_client: AsyncClient,
    test_user: dict,
    test_admin: dict,
):
    token = test_user["token"]
    admin_token = test_admin["token"]

    # 1. Create chat session
    res_session = await async_client.post(
        "/api/chat/sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Test conversation", "documentIds": []},
    )
    assert res_session.status_code == 201
    session_data = res_session.json()
    session_id = session_data["id"]
    assert session_data["title"] == "Test conversation"

    # 2. Rename session
    res_rename = await async_client.patch(
        f"/api/chat/sessions/{session_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Updated Research Chat"},
    )
    assert res_rename.status_code == 200
    assert res_rename.json()["title"] == "Updated Research Chat"

    # 3. Non-streaming chat request
    chat_payload = {
        "sessionId": session_id,
        "question": "What is the policy on annual leave?",
        "documentIds": [],
    }
    res_chat = await async_client.post(
        "/api/chat",
        headers={"Authorization": f"Bearer {token}"},
        json=chat_payload,
    )
    assert res_chat.status_code == 200
    chat_data = res_chat.json()
    assert "messageId" in chat_data
    assert "answer" in chat_data
    assert "sources" in chat_data
    message_id = chat_data["messageId"]

    # 4. Check messages endpoint
    res_msgs = await async_client.get(
        f"/api/chat/sessions/{session_id}/messages",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_msgs.status_code == 200
    msgs = res_msgs.json()
    assert len(msgs) >= 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"

    # 5. Streaming chat request (SSE)
    stream_payload = {
        "sessionId": session_id,
        "question": "Provide additional clarification on remote work guidelines.",
        "documentIds": [],
    }
    res_stream = await async_client.post(
        "/api/chat/stream",
        headers={"Authorization": f"Bearer {token}"},
        json=stream_payload,
    )
    assert res_stream.status_code == 200
    assert "text/event-stream" in res_stream.headers.get("content-type", "")

    stream_body = res_stream.text
    assert "event: sources" in stream_body
    assert "event: token" in stream_body
    assert "event: done" in stream_body

    # 6. Submit feedback
    res_feedback = await async_client.post(
        "/api/chat/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"messageId": message_id, "rating": "up", "comment": "Great accurate response"},
    )
    assert res_feedback.status_code == 200
    assert res_feedback.json()["success"] is True

    # 7. Admin stats access
    # Regular user fails with 403
    res_admin_user = await async_client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_admin_user.status_code == 403

    # Admin user succeeds with 200
    res_admin = await async_client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    admin_data = res_admin.json()
    assert "totalUsers" in admin_data
    assert "totalDocuments" in admin_data
    assert "questionsPerDay" in admin_data
    assert "feedbackBreakdown" in admin_data
