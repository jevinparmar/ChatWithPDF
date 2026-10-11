import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_validation_and_user_isolation(
    async_client: AsyncClient,
    test_user: dict,
    test_user_b: dict,
):
    token_a = test_user["token"]
    token_b = test_user_b["token"]

    # 1. Invalid extension upload fails
    invalid_file = io.BytesIO(b"binary executable payload")
    res_invalid = await async_client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("malicious.exe", invalid_file, "application/octet-stream")},
    )
    assert res_invalid.status_code == 400
    assert "Unsupported file format" in res_invalid.json()["detail"]

    # 2. Valid upload by User A
    valid_txt = io.BytesIO(b"Quarterly financial disclosures. Gross margins grew by 18% in Q3.")
    res_upload = await async_client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("report_q3.txt", valid_txt, "text/plain")},
    )
    assert res_upload.status_code == 201
    doc_data = res_upload.json()
    doc_id = doc_data["id"]
    assert doc_data["name"] == "report_q3.txt"
    assert doc_data["status"] in ("processing", "ready")

    # 3. User A can view their document
    res_get_a = await async_client.get(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_get_a.status_code == 200

    # 4. User B cannot view User A's document (User Isolation -> 404)
    res_get_b = await async_client.get(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_get_b.status_code == 404
    assert res_get_b.json()["detail"] == "Document not found"

    # 5. User B cannot access file of User A's document
    res_file_b = await async_client.get(
        f"/api/documents/{doc_id}/file",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_file_b.status_code == 404

    # 6. User A deletes document
    res_del_a = await async_client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_del_a.status_code == 200

    # 7. Document is deleted
    res_after_del = await async_client.get(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_after_del.status_code == 404
