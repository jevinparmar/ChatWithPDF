import asyncio
import json
import re
from typing import AsyncIterator, List, Optional, Tuple, Union
import uuid

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.full_document import execute_full_document_engine
from app.core.llm import BaseLLMClient, clean_inline_sources, get_llm_client
from app.core.modes import get_mode
from app.core.modes.career import ImproveResumeResponse, MatchScoreResponse
from app.core.modes.legal import RiskCheckResponse
from app.core.modes.student import (
    FULL_EXPLANATION_PROMPT,
    FlashcardsResponse,
    MindMapResponse,
    QuizResponse,
)
from app.db.models import ChatSession, Document, GeneratedOutput, Message
from app.schemas.chat import SourceItem
from app.utils.logger import logger

HEAVY_ACTIONS = {
    "explain_full",
    "quiz",
    "flashcards",
    "mind_map",
    "compare_papers",
    "literature_review",
    "contract_summary",
    "compare_versions",
    "match_score",
    "improve_resume",
}
DAILY_HEAVY_LIMIT = 50


async def get_daily_heavy_usage(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Calculates number of heavy action executions today (UTC)."""
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = select(func.count(GeneratedOutput.id)).where(
            GeneratedOutput.user_id == user_id,
            GeneratedOutput.created_at >= today_start,
        )
        res = await db.execute(stmt)
        return res.scalar() or 0
    except Exception as e:
        logger.warning(f"Error querying daily usage: {e}")
        return 0


ACTION_PROMPTS = {
    # STUDENT
    ("student", "explain_full"): FULL_EXPLANATION_PROMPT,
    ("student", "short_notes"): (
        "Create concise, high-impact revision notes for this document. Use clear headings and bullets.\n"
        "At the bottom, include a highlighted '⚡ Last-Minute Exam Revision' box with the top 5 absolute must-know facts."
    ),
    ("student", "key_points"): (
        "Extract the top key points, core formulas/principles, and crucial takeaways from this document in ranked order."
    ),
    ("student", "flashcards"): (
        "Generate a set of 8-12 high-yield flashcards testing key concepts, definitions, and applications.\n"
        "Return STRICT JSON only matching this schema:\n"
        "{\n"
        '  "flashcards": [\n'
        '    {"front": "Question/Prompt", "back": "Clear concise answer", "location": "Page X or Slide Y"}\n'
        "  ]\n"
        "}"
    ),
    ("student", "quiz"): (
        "Generate an interactive quiz based on this document with options {options}.\n"
        "Return STRICT JSON only matching this schema:\n"
        "{\n"
        '  "title": "Quiz Title",\n'
        '  "questions": [\n'
        "    {\n"
        '      "question": "Question text",\n'
        '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '      "correctIndex": 0,\n'
        '      "explanation": "Clear explanation of why this answer is correct",\n'
        '      "location": "Page X or Slide Y"\n'
        "    }\n"
        "  ]\n"
        "}"
    ),
    ("student", "exam_questions"): (
        "Create likely university exam questions based on this document suited for Indian university exam patterns:\n"
        "1. **2-Mark Questions (Short definition / concept questions with model 2-3 line answers)**\n"
        "2. **5-Mark Questions (Conceptual explanation with diagram description / bullet points)**\n"
        "3. **10-Mark Questions (Comprehensive long-form essay / system design questions with full model structure)**\n"
        "Include location citations (Page/Slide) for each question."
    ),
    ("student", "mind_map"): (
        "Generate a hierarchical mind map outline of the topics, subtopics, and concepts in this document.\n"
        "Return STRICT JSON only matching this schema:\n"
        "{\n"
        '  "title": "Document Core Theme",\n'
        '  "children": [\n'
        '    {"name": "Main Topic 1", "location": "Page 1", "children": [{"name": "Subtopic A", "location": "Page 2"}]}\n'
        "  ]\n"
        "}"
    ),
    ("student", "eli10"): (
        "Explain the core ideas of this document as if explaining to a 10-year-old child.\n"
        "Use vivid, playful everyday analogies (e.g. video games, sports, cooking, bicycles), avoid all jargon, and keep it inspiring and fun!"
    ),
    ("student", "explain_simpler"): (
        "Re-explain this material in even simpler, more accessible language with additional practical examples."
    ),

    # RESEARCHER
    ("researcher", "paper_summary"): (
        "Synthesize this academic paper into a structured academic card with the following sections:\n"
        "1. **Objective & Problem Statement**\n"
        "2. **Theoretical Framework & Methodology**\n"
        "3. **Datasets & Experimental Benchmarks**\n"
        "4. **Key Empirical Results & Metrics**\n"
        "5. **Identified Limitations & Threats to Validity**\n"
        "6. **Proposed Future Work**"
    ),
    ("researcher", "compare_papers"): (
        "Compare the selected papers across core dimensions:\n"
        "1. Create a markdown comparison table with papers as columns and aspects as rows:\n"
        "   - Research Problem / Goal\n"
        "   - Proposed Method / Architecture\n"
        "   - Datasets / Baselines\n"
        "   - Evaluation Metrics\n"
        "   - Primary Results\n"
        "   - Limitations\n"
        "2. Follow with a comparative synthesis discussing which approach is most effective and why."
    ),
    ("researcher", "find_agreements_and_gaps"): (
        "Analyze where these papers agree, where their empirical findings or methodologies conflict/disagree, and what research gaps remain unexplored."
    ),
    ("researcher", "literature_review"): (
        "Synthesize a draft academic literature review organizing the selected works by overarching themes.\n"
        "Use rigorous scholarly synthesis with exact citations formatted as (PaperFileName, Page X)."
    ),
    ("researcher", "extract_findings"): (
        "Extract all key scientific findings and empirical claims into a markdown table with columns:\n"
        "| Claim / Finding | Evidence & Metric | Paper & Location |"
    ),

    # BUSINESS
    ("business", "executive_summary"): (
        "Draft a high-impact, 1-page Executive Summary for corporate leadership.\n"
        "Include:\n"
        "- **Strategic Context & Core Objectives**\n"
        "- **Key Operational Decisions & Milestones**\n"
        "- **Financial & Resource Impact**\n"
        "- **Top Commercial / Operational Risks & Recommended Mitigations**"
    ),
    ("business", "find_policy"): (
        "Examine the document to clarify the corporate policy or compliance rule.\n"
        "Provide: (1) Definitive answer, (2) The exact supporting verbatim sentence (under 25 words) with location, (3) Operational implications."
    ),
    ("business", "step_by_step"): (
        "Convert the document's procedures into an operational numbered checklist with prerequisite conditions, sequential steps, and success verification criteria."
    ),
    ("business", "faq_generator"): (
        "Generate 10 to 15 practical business FAQs with concise, definitive answers and location citations based on this document."
    ),
    ("business", "action_items"): (
        "Extract all tasks and action items into a clean markdown table with columns:\n"
        "| Task Description | Designated Owner / Department | Target Timeline / Deadline | Citation Location |"
    ),
    ("business", "new_employee_guide"): (
        "Translate this corporate document into a friendly, professional New Employee Onboarding Reference Guide."
    ),

    # LEGAL
    ("legal", "contract_summary"): (
        "Analyze this legal agreement and produce a structured contract summary:\n"
        "1. **Contracting Parties & Effective Date**\n"
        "2. **Core Purpose / Scope of Services**\n"
        "3. **Term & Renewal Provisions**\n"
        "4. **Payment Terms, Milestones & Penalties**\n"
        "5. **Mutual & Unilateral Obligations**\n"
        "6. **Termination Rights & Notice Periods**\n"
        "7. **Indemnity, Liability Limits & Governing Law**"
    ),
    ("legal", "risk_check"): (
        "Audit this contract for commercial and legal risks.\n"
        "Flag each risk as 'Red' (High Risk, e.g. unlimited liability, automatic renewal, one-sided indemnity), 'Amber' (Medium Risk / Vague terms), or 'Green' (Standard commercial term).\n"
        "Return STRICT JSON only matching this schema:\n"
        "{\n"
        '  "document_title": "Agreement Title",\n'
        '  "risks": [\n'
        '    {"clause": "Clause Name", "level": "Red", "reason": "Plain-English risk explanation", "location": "Section X or Page Y"}\n'
        "  ]\n"
        "}"
    ),
    ("legal", "clause_finder"): (
        "Locate all contract provisions relating to '{options}'.\n"
        "For each provision, quote the exact clause verbatim with its location citation, then provide a plain-English translation of its practical effect."
    ),
    ("legal", "deadlines_and_dates"): (
        "Extract every date, deadline, notice period, and renewal window into a markdown table with columns:\n"
        "| Event / Obligation | Date / Window | Responsible Party | Section / Page |"
    ),
    ("legal", "obligations"): (
        "Create an obligations matrix itemizing the mandatory duties of each contracting party."
    ),
    ("legal", "plain_english"): (
        "Rewrite the key provisions of this contract into straightforward plain-English that any business owner or consumer can read without legal ambiguity."
    ),
    ("legal", "compare_versions"): (
        "Compare the two agreement versions and categorize all changes into: (1) Added Clauses, (2) Deleted Clauses, and (3) Modified Terms with legal impact."
    ),

    # CAREER
    ("career", "match_score"): (
        "Compare the Candidate Resume against the Job Description.\n"
        "Evaluate the candidate across: Skills, Experience, Education, and Keywords.\n"
        "Return STRICT JSON only matching this schema:\n"
        "{\n"
        '  "overall_score": 85,\n'
        '  "headline": "Strong candidate match for senior backend engineering",\n'
        '  "breakdown": [\n'
        '    {"category": "Technical Skills", "score": 90, "notes": "Matches Python, FastAPI, PostgreSQL"},\n'
        '    {"category": "Relevant Experience", "score": 80, "notes": "Has 4 years vs 5 years required"}\n'
        "  ],\n"
        '  "matched_keywords": ["FastAPI", "Python", "SQL", "Docker"],\n'
        '  "missing_keywords": ["Kubernetes", "AWS Lambda"],\n'
        '  "recommendations": ["Highlight cloud deployments", "Emphasize team leadership"]\n'
        "}"
    ),
    ("career", "improve_resume"): (
        "Audit the candidate's resume bullet points against the target job requirements.\n"
        "Identify 4-8 weak, passive, or task-oriented bullets and rewrite them into high-impact accomplishment bullets with strong action verbs and measurable outcomes.\n"
        "Present each as Before & After with an explanation of why the rewrite strengthens the candidate's ATS rank."
    ),
    ("career", "tailored_summary"): (
        "Write a tailored, high-converting professional summary paragraph (3-4 sentences) aligning the candidate's actual background directly with the target job."
    ),
    ("career", "cover_letter"): (
        "Draft a compelling, professional cover letter for the target role utilizing ONLY verified achievements, skills, and background from the resume."
    ),
    ("career", "interview_prep"): (
        "Generate top interview prep questions tailored specifically to this Job Description, with recommended answers drawing upon the candidate's resume:\n"
        "1. **'Tell me about yourself' (Tailored elevator pitch)**\n"
        "2. **3 Core Technical Questions with suggested answers based on candidate background**\n"
        "3. **2 Behavioral / STAR method questions with candidate experience examples**"
    ),
    ("career", "skill_gap"): (
        "Analyze the gap between the Job Description requirements and the candidate resume. Group missing skills into 'Must-Have' and 'Nice-to-Have' with a recommended learning roadmap."
    ),
}


def clean_json_string(text: str) -> str:
    """Extracts JSON substring from markdown fences or text."""
    s = text.strip()
    if s.startswith("```"):
        # Remove opening ```json or ```
        parts = s.split("\n", 1)
        if len(parts) > 1:
            s = parts[1]
        # Remove closing ```
        if "```" in s:
            s = s.rsplit("```", 1)[0]
    return s.strip()


def validate_structured_output(action_id: str, output_type: str, raw_text: str) -> Optional[dict]:
    """Validates raw text against Pydantic schema for structured actions."""
    clean = clean_json_string(raw_text)
    try:
        data = json.loads(clean)
    except Exception:
        return None

    try:
        if output_type == "flashcards":
            val = FlashcardsResponse.model_validate(data)
            return val.model_dump()
        elif output_type == "quiz":
            val = QuizResponse.model_validate(data)
            return val.model_dump()
        elif output_type == "mind_map":
            val = MindMapResponse.model_validate(data)
            return val.model_dump()
        elif output_type == "risk_badges":
            val = RiskCheckResponse.model_validate(data)
            return val.model_dump()
        elif output_type == "match_score":
            val = MatchScoreResponse.model_validate(data)
            return val.model_dump()
        return data
    except Exception as e:
        logger.warning(f"Pydantic validation failed for {action_id}: {e}")
        return None


async def execute_mode_action_stream(
    db: AsyncSession,
    user_id: uuid.UUID,
    session: ChatSession,
    action_id: str,
    document_ids: List[uuid.UUID],
    options: dict,
    llm: Optional[BaseLLMClient] = None,
) -> AsyncIterator[dict]:
    """
    Executes a quick action for the session's active mode and yields SSE event dictionaries:
    - {'event': 'progress', 'data': {'step': ...}}
    - {'event': 'sources', 'data': [...]}
    - {'event': 'token', 'data': {'text': ...}}
    - {'event': 'done', 'data': {'content': ..., 'outputType': ..., 'messageId': ...}}
    - {'event': 'error', 'data': {'error': ...}}
    """
    if llm is None:
        llm = get_llm_client()

    mode_cfg = get_mode(session.mode)
    action = next((a for a in mode_cfg.quick_actions if a.id == action_id), None)
    if not action:
        yield {"event": "error", "data": {"error": f"Unknown action '{action_id}' for mode '{mode_cfg.id}'"}}
        return

    # Check file requirements
    if action.needs in ("one_file", "many_files") and not document_ids:
        yield {"event": "error", "data": {"error": "Please select at least one document to run this action."}}
        return
    if action.needs == "two_files" and len(document_ids) < 2:
        yield {"event": "error", "data": {"error": "This action requires two documents selected (e.g. Resume & Job Description)."}}
        return

    # Daily limit check for heavy actions
    used_today = await get_daily_heavy_usage(db, user_id)
    if action_id in HEAVY_ACTIONS and used_today >= DAILY_HEAVY_LIMIT:
        yield {
            "event": "error",
            "data": {
                "error": f"Daily limit of {DAILY_HEAVY_LIMIT} heavy AI operations reached for today. Resets at 00:00 UTC."
            },
        }
        return

    remaining_today = max(0, DAILY_HEAVY_LIMIT - used_today - 1)
    yield {
        "event": "usage",
        "data": {
            "action": action_id,
            "usedToday": used_today,
            "dailyLimit": DAILY_HEAVY_LIMIT,
            "remaining": remaining_today,
        },
    }

    instruction_template = ACTION_PROMPTS.get((mode_cfg.id, action_id))
    if not instruction_template:
        instruction_template = f"Execute the '{action.label}' analysis on this document."

    opts_str = json.dumps(options) if options else ""
    user_instruction = instruction_template.replace("{options}", opts_str)

    # Progress queue
    progress_queue: asyncio.Queue[dict] = asyncio.Queue()

    async def on_progress(p: dict):
        await progress_queue.put(p)

    async def runner():
        return await execute_full_document_engine(
            db=db,
            user_id=user_id,
            document_ids=document_ids,
            mode=mode_cfg.id,
            action=action_id,
            options=options,
            system_prompt=mode_cfg.system_prompt,
            user_instruction=user_instruction,
            llm=llm,
            progress_callback=on_progress,
        )

    task = asyncio.create_task(runner())

    while not task.done():
        try:
            progress_item = await asyncio.wait_for(progress_queue.get(), timeout=0.1)
            yield {"event": "progress", "data": progress_item}
        except asyncio.TimeoutError:
            await asyncio.sleep(0.05)

    try:
        raw_result, sources, was_cached = await task
    except Exception as e:
        logger.error(f"Error executing mode action {action_id}: {e}")
        yield {"event": "error", "data": {"error": str(e)}}
        return

    # Yield remaining progress
    while not progress_queue.empty():
        progress_item = progress_queue.get_nowait()
        yield {"event": "progress", "data": progress_item}

    # Yield sources
    yield {"event": "sources", "data": [s.model_dump() for s in sources]}

    # Structured Output Validation & Single Retry
    final_content = raw_result
    if action.output_type in ("quiz", "flashcards", "mind_map", "risk_badges", "match_score"):
        raw_str = json.dumps(raw_result) if isinstance(raw_result, (dict, list)) else str(raw_result)
        validated = validate_structured_output(action_id, action.output_type, raw_str)

        if validated is None:
            logger.warning(f"Invalid JSON for {action_id}. Retrying once with strict correction prompt...")
            yield {"event": "progress", "data": {"step": "Validating structured JSON format..."}}

            retry_prompt = (
                f"The previous output had invalid JSON syntax. Please output ONLY raw valid JSON matching the requested schema.\n"
                f"Document text snippet:\n{raw_str[:3000]}\n"
            )
            retry_res = await llm.generate(
                system="You are a strict JSON generator. Output valid JSON only, without markdown code fences or conversational text.",
                messages=[{"role": "user", "content": retry_prompt}],
                max_tokens=3000,
                temperature=0.0,
            )
            validated = validate_structured_output(action_id, action.output_type, retry_res)

        final_content = validated if validated is not None else raw_result

    # Save to session messages
    content_to_save = json.dumps(final_content) if isinstance(final_content, (dict, list)) else str(final_content)
    try:
        user_msg = Message(
            session_id=session.id,
            role="user",
            content=f"Run action: {action.label}",
        )
        assistant_msg = Message(
            session_id=session.id,
            role="assistant",
            content=content_to_save,
            sources=[s.model_dump() for s in sources],
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)
        msg_id = str(assistant_msg.id)
    except Exception as e:
        logger.warning(f"Failed to save action message turn: {e}")
        msg_id = str(uuid.uuid4())

    # Stream final tokens or payload
    if isinstance(final_content, str):
        # Stream chunks
        chunk_size = 40
        for i in range(0, len(final_content), chunk_size):
            token_slice = final_content[i : i + chunk_size]
            yield {"event": "token", "data": {"text": token_slice, "token": token_slice}}
            await asyncio.sleep(0.01)

    yield {
        "event": "done",
        "data": {
            "content": final_content,
            "outputType": action.output_type,
            "messageId": msg_id,
            "wasCached": was_cached,
            "remainingToday": remaining_today,
        },
    }
