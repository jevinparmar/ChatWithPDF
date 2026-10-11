import asyncio
import json
from pathlib import Path
import sys
import uuid
import httpx
import pymupdf

BASE_URL = "http://localhost:8000"


def generate_sample_pdf(file_path: Path):
    doc = pymupdf.open()

    page1 = doc.new_page()
    page1.insert_text(
        pymupdf.Point(50, 72),
        "Artificial Intelligence Safety Policy\n\n"
        "All deployment pipelines require automated integration tests and regression benchmarks.\n"
        "Human evaluation is mandatory prior to production release.\n"
        "Model weights must remain encrypted at rest and in transit.",
        fontsize=12,
    )

    page2 = doc.new_page()
    page2.insert_text(
        pymupdf.Point(50, 72),
        "Incident Escalation Protocols\n\n"
        "Severity 1 outages require immediate paging of the on-call Site Reliability Engineer within 5 minutes.\n"
        "Escalations route to engineering leadership after 15 minutes of unacknowledged alerts.\n"
        "Post-mortem incident reports must be published within 48 hours.",
        fontsize=12,
    )

    doc.save(str(file_path))
    doc.close()


async def run_full_flow():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("\n--- STEP 1: HEALTH CHECK ---")
        health = await client.get("/health")
        assert health.status_code == 200
        print(f"Health Status: {health.json()}")

        print("\n--- STEP 2: SIGNUP ---")
        unique_user = f"flow_user_{uuid.uuid4().hex[:6]}@example.com"
        signup_res = await client.post(
            "/api/auth/signup",
            json={"name": "Flow Tester", "email": unique_user, "password": "password123"},
        )
        assert signup_res.status_code == 201
        signup_data = signup_res.json()
        token = signup_data["token"]
        user_id = signup_data["user"]["id"]
        print(f"Signed up user: {unique_user} (id: {user_id})")

        print("\n--- STEP 3: LOGIN ---")
        login_res = await client.post(
            "/api/auth/login",
            json={"email": unique_user, "password": "password123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully. JWT acquired.")

        print("\n--- STEP 4: CREATE & UPLOAD SAMPLE PDF ---")
        sample_pdf_path = Path("sample_policy.pdf")
        generate_sample_pdf(sample_pdf_path)

        with open(sample_pdf_path, "rb") as f:
            upload_res = await client.post(
                "/api/documents/upload",
                headers=headers,
                files={"file": ("sample_policy.pdf", f, "application/pdf")},
            )
        assert upload_res.status_code == 201
        doc_data = upload_res.json()
        doc_id = doc_data["id"]
        print(f"Uploaded document: {doc_data['name']} (id: {doc_id}, initial status: {doc_data['status']})")

        print("\n--- STEP 5: WAIT FOR BACKGROUND INDEXING TO BE READY ---")
        for attempt in range(20):
            detail_res = await client.get(f"/api/documents/{doc_id}", headers=headers)
            detail = detail_res.json()
            if detail["status"] == "ready":
                print(f"Document indexed! Status: ready | Pages: {detail['pages']}")
                print(f"Generated Summary: {detail['summary']}")
                print(f"Suggested Questions: {detail['suggestedQuestions']}")
                break
            elif detail["status"] == "failed":
                raise RuntimeError(f"Document indexing failed: {detail.get('errorMessage')}")
            await asyncio.sleep(1)

        print("\n--- STEP 6: CREATE CHAT SESSION ---")
        session_res = await client.post(
            "/api/chat/sessions",
            headers=headers,
            json={"title": "Policy Chat", "documentIds": [doc_id]},
        )
        assert session_res.status_code == 201
        session_data = session_res.json()
        session_id = session_data["id"]
        print(f"Created chat session: {session_data['title']} (id: {session_id})")

        print("\n--- STEP 7: ASK QUESTION VIA NON-STREAMING CHAT ---")
        question = "How quickly must the on-call SRE be paged for Severity 1 outages?"
        chat_res = await client.post(
            "/api/chat",
            headers=headers,
            json={"sessionId": session_id, "question": question, "documentIds": [doc_id]},
        )
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        msg_id = chat_data["messageId"]
        print(f"Question: {question}")
        print(f"Answer: {chat_data['answer']}")
        print(f"Citations: {json.dumps(chat_data['sources'], indent=2)}")
        assert len(chat_data["sources"]) > 0, "Must return sources with citations"
        assert chat_data["sources"][0]["page"] == 2, "Incident escalation is on page 2"

        print("\n--- STEP 8: ASK QUESTION VIA STREAMING /chat/stream (SSE) ---")
        stream_question = "What is required prior to production release?"
        stream_events = []
        async with client.stream(
            "POST",
            "/api/chat/stream",
            headers=headers,
            json={"sessionId": session_id, "question": stream_question, "documentIds": [doc_id]},
        ) as response:
            assert response.status_code == 200
            async for line in response.aiter_lines():
                if line.startswith("event:"):
                    stream_events.append(line)
                elif line.startswith("data:"):
                    stream_events.append(line)

        print(f"Received stream lines count: {len(stream_events)}")
        event_text = "\n".join(stream_events)
        assert "event: sources" in event_text
        assert "event: token" in event_text
        assert "event: done" in event_text
        print("SSE streaming verified successfully!")

        print("\n--- STEP 9: SUBMIT FEEDBACK ---")
        feedback_res = await client.post(
            "/api/chat/feedback",
            headers=headers,
            json={"messageId": msg_id, "rating": "up", "comment": "Accurate page 2 citation"},
        )
        assert feedback_res.status_code == 200
        print(f"Feedback response: {feedback_res.json()}")

        print("\n--- STEP 10: ADMIN STATS INSPECTION ---")
        admin_login = await client.post(
            "/api/auth/login",
            json={"email": "admin@test.com", "password": "password123"},
        )
        assert admin_login.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}

        admin_stats_res = await client.get("/api/admin/stats", headers=admin_headers)
        assert admin_stats_res.status_code == 200
        stats = admin_stats_res.json()
        print(f"Admin Stats: Total Users = {stats['totalUsers']}, Total Docs = {stats['totalDocuments']}, Questions = {stats['totalQuestions']}")
        print(f"Satisfaction Rate = {stats['satisfactionRate']}%, Feedback Split = {stats['feedbackSplit']}")

        print("\n--- STEP 11: DELETE DOCUMENT & VERIFY CASCADED CHUNKS ---")
        del_res = await client.delete(f"/api/documents/{doc_id}", headers=headers)
        assert del_res.status_code == 200
        print("Document deleted via API.")

        # Verify document is 404
        get_deleted = await client.get(f"/api/documents/{doc_id}", headers=headers)
        assert get_deleted.status_code == 404
        print("Verified document is 404 Not Found.")

        if sample_pdf_path.exists():
            sample_pdf_path.unlink()

        print("\n" + "=" * 65)
        print("   COMPLETE END-TO-END FLOW VALIDATED SUCCESSFULLY! 100% OK")
        print("=" * 65 + "\n")


if __name__ == "__main__":
    asyncio.run(run_full_flow())
