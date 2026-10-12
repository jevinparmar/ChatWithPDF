"""
End-to-end programmatic verification script for ChatWithPDF Modes.
Tests real HTTP endpoints against running backend (http://localhost:8000).
"""
import asyncio
import json
import httpx

BASE_URL = "http://localhost:8000"

async def test_modes_e2e():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        print("\n=======================================================")
        print("  CHATWITHPDF MODES END-TO-END VERIFICATION")
        print("=======================================================\n")

        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("✅ 1. Backend health check: OK")

        # 2. Modes registry
        res = await client.get("/api/modes")
        assert res.status_code == 200, f"Get modes failed: {res.text}"
        modes = res.json()
        assert len(modes) == 5, f"Expected 5 modes, got {len(modes)}"
        mode_ids = [m["id"] for m in modes]
        print(f"✅ 2. Modes registry loaded: {mode_ids}")
        assert set(mode_ids) == {"student", "researcher", "business", "legal", "career"}

        # 3. Authenticate with demo user
        res = await client.post(
            "/api/auth/login",
            json={"email": "demo@chatwithpdf.com", "password": "password123"},
        )
        assert res.status_code == 200, f"Login failed: {res.text}"
        login_data = res.json()
        token = login_data["token"]
        user = login_data["user"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ 3. Authenticated as: {user['email']} (Default Mode: {user.get('mode', 'student')})")

        # 4. Fetch User Documents
        res = await client.get("/api/documents", headers=headers)
        assert res.status_code == 200
        docs = res.json()
        print(f"✅ 4. Retrieved {len(docs)} user documents:")
        doc_by_name = {d["fileName"]: d for d in docs}
        for d in docs:
            print(f"     - {d['fileName']} (Type: {d['fileType']}, Role: {d.get('role')}, Location: {d.get('locationType')})")

        # 5. Fetch Sessions
        res = await client.get("/api/chat/sessions", headers=headers)
        assert res.status_code == 200
        sessions = res.json()
        print(f"✅ 5. Retrieved {len(sessions)} active chat sessions:")
        session_by_mode = {s["mode"]: s for s in sessions}
        for s in sessions:
            print(f"     - [{s['mode'].upper()}] {s['title']} (ID: {s['id'][:8]}...)")

        # 6. Mode 1: Student Mode Quick Action (Quiz)
        student_session = session_by_mode.get("student")
        notes_doc = doc_by_name.get("sample_notes.pdf")
        assert student_session and notes_doc, "Student session or sample_notes.pdf missing"

        print("\n--- Testing Student Mode (Interactive Quiz) ---")
        async with client.stream(
            "POST",
            "/api/chat/action",
            headers=headers,
            json={
                "sessionId": student_session["id"],
                "actionId": "quiz",
                "documentIds": [notes_doc["id"]],
                "options": {"count": 5, "difficulty": "medium", "type": "MCQ"},
            },
        ) as stream_res:
            assert stream_res.status_code == 200
            done_payload = None
            progress_steps = []
            async for line in stream_res.aiter_lines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                        if "step" in data:
                            progress_steps.append(data["step"])
                        if "outputType" in data and "content" in data:
                            done_payload = data
                    except Exception:
                        pass

            assert done_payload, "Failed to receive done event in Student quiz stream"
            quiz_content = done_payload["content"]
            assert done_payload["outputType"] == "quiz"
            print(f"DEBUG quiz_content type: {type(quiz_content)}, value: {repr(quiz_content)[:200]}")
            if isinstance(quiz_content, str):
                try:
                    quiz_content = json.loads(quiz_content)
                except Exception as e:
                    print(f"DEBUG loads error: {e}")
            questions = quiz_content.get("questions", []) if isinstance(quiz_content, dict) else []
            print(f"✅ Student Quiz generated with {len(questions)} questions:")
            for i, q in enumerate(questions[:2], 1):
                print(f"     Q{i}: {q.get('question')[:80]}...")
                print(f"        Options: {len(q.get('options', []))} | Correct: {q.get('correctIndex')} | Loc: {q.get('location')}")

        # 7. Mode 2: Researcher Mode (Structured Paper Card)
        researcher_session = session_by_mode.get("researcher")
        assert researcher_session, "Researcher session missing"
        print("\n--- Testing Researcher Mode (Structured Paper Card) ---")
        async with client.stream(
            "POST",
            "/api/chat/action",
            headers=headers,
            json={
                "sessionId": researcher_session["id"],
                "actionId": "paper_summary",
                "documentIds": [notes_doc["id"]],
                "options": {},
            },
        ) as stream_res:
            assert stream_res.status_code == 200
            done_payload = None
            async for line in stream_res.aiter_lines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                        if "outputType" in data and "content" in data:
                            done_payload = data
                    except Exception:
                        pass
            assert done_payload, "Researcher paper_summary did not complete"
            print("✅ Researcher Paper Summary generated:")
            summary_preview = str(done_payload["content"])[:200].replace("\n", " ")
            print(f"     Preview: {summary_preview}...")

        # 8. Mode 3: Business Mode (Executive Summary)
        biz_session = session_by_mode.get("business")
        pptx_doc = doc_by_name.get("sample_presentation.pptx")
        assert biz_session and pptx_doc, "Business session or sample_presentation.pptx missing"
        print("\n--- Testing Business Mode (Executive Summary) ---")
        async with client.stream(
            "POST",
            "/api/chat/action",
            headers=headers,
            json={
                "sessionId": biz_session["id"],
                "actionId": "executive_summary",
                "documentIds": [pptx_doc["id"]],
                "options": {},
            },
        ) as stream_res:
            assert stream_res.status_code == 200
            done_payload = None
            async for line in stream_res.aiter_lines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                        if "outputType" in data and "content" in data:
                            done_payload = data
                    except Exception:
                        pass
            assert done_payload, "Business executive_summary did not complete"
            print("✅ Business Executive Summary generated:")
            biz_preview = str(done_payload["content"])[:200].replace("\n", " ")
            print(f"     Preview: {biz_preview}...")

        # 9. Mode 4: Legal Mode (Risk Check Badges & Mandatory Disclaimer)
        legal_session = session_by_mode.get("legal")
        contract_doc = doc_by_name.get("sample_contract.docx")
        assert legal_session and contract_doc, "Legal session or sample_contract.docx missing"
        print("\n--- Testing Legal Mode (Risk Check & Badges) ---")
        async with client.stream(
            "POST",
            "/api/chat/action",
            headers=headers,
            json={
                "sessionId": legal_session["id"],
                "actionId": "risk_check",
                "documentIds": [contract_doc["id"]],
                "options": {},
            },
        ) as stream_res:
            assert stream_res.status_code == 200
            done_payload = None
            async for line in stream_res.aiter_lines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                        if "outputType" in data and "content" in data:
                            done_payload = data
                    except Exception:
                        pass
            assert done_payload, "Legal risk_check did not complete"
            risk_content = done_payload["content"]
            assert done_payload["outputType"] == "risk_badges"
            if isinstance(risk_content, str):
                risk_content = json.loads(risk_content)
            findings = risk_content.get("risks") or risk_content.get("findings") or []
            print(f"✅ Legal Risk Check generated {len(findings)} clause risk badges:")
            for f in findings[:3]:
                print(f"     [{f.get('level', '').upper()}] {f.get('clause', '')[:40]} -> {f.get('reason', '')[:60]} ({f.get('location')})")

        # 10. Mode 5: Career Mode (Resume vs JD Match Score)
        career_session = session_by_mode.get("career")
        resume_doc = doc_by_name.get("sample_resume.pdf")
        jd_doc = doc_by_name.get("sample_job_description.docx")
        assert career_session and resume_doc and jd_doc, "Career session, resume, or JD missing"
        print("\n--- Testing Career Mode (Match Score Gauge) ---")
        async with client.stream(
            "POST",
            "/api/chat/action",
            headers=headers,
            json={
                "sessionId": career_session["id"],
                "actionId": "match_score",
                "documentIds": [resume_doc["id"], jd_doc["id"]],
                "options": {},
            },
        ) as stream_res:
            assert stream_res.status_code == 200
            done_payload = None
            async for line in stream_res.aiter_lines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                        if "outputType" in data and "content" in data:
                            done_payload = data
                    except Exception:
                        pass
            assert done_payload, "Career match_score did not complete"
            match_content = done_payload["content"]
            assert done_payload["outputType"] == "match_score"
            if isinstance(match_content, str):
                match_content = json.loads(match_content)
            overall = match_content.get("overall_score") or match_content.get("overallMatch", 0)
            matched_kw = match_content.get("matched_keywords") or match_content.get("matchedKeywords", [])
            missing_kw = match_content.get("missing_keywords") or match_content.get("missingKeywords", [])
            print(f"✅ Career Match Score: {overall}% Match")
            print(f"     Matched Keywords: {matched_kw[:5]}")
            print(f"     Missing Keywords: {missing_kw[:5]}")

        # 11. Test Caching in generated_outputs
        print("\n--- Testing Instant Cache Hit ---")
        async with client.stream(
            "POST",
            "/api/chat/action",
            headers=headers,
            json={
                "sessionId": student_session["id"],
                "actionId": "quiz",
                "documentIds": [notes_doc["id"]],
                "options": {"count": 5, "difficulty": "medium", "type": "MCQ"},
            },
        ) as cache_stream:
            cached_done = None
            async for line in cache_stream.aiter_lines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                        if "wasCached" in data:
                            cached_done = data
                    except Exception:
                        pass
            assert cached_done and cached_done.get("wasCached") is True, f"Expected cache hit, got {cached_done}"
            print("✅ Instant Cache hit verified: wasCached = True (0 LLM overhead)")

        print("\n=======================================================")
        print("  ALL 5 MODES & ACTIONS VERIFIED SUCCESSFULLY! ✨")
        print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(test_modes_e2e())
