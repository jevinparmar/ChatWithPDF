import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_and_login_flow(async_client: AsyncClient):
    unique_email = f"signup_{uuid.uuid4().hex[:8]}@example.com"

    # 1. Signup
    signup_payload = {
        "name": "New Tester",
        "email": unique_email,
        "password": "strongpassword123",
    }
    signup_res = await async_client.post("/api/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert "token" in signup_data
    assert signup_data["user"]["email"] == unique_email

    # 2. Duplicate signup should fail with 400
    dup_res = await async_client.post("/api/auth/signup", json=signup_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Login with correct password
    login_payload = {
        "email": unique_email,
        "password": "strongpassword123",
    }
    login_res = await async_client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    token = login_data["token"]
    assert token

    # 4. Login with bad password fails with 401
    bad_login_res = await async_client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "wrong_password"},
    )
    assert bad_login_res.status_code == 401

    # 5. Access /auth/me with Bearer token
    me_res = await async_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == unique_email
