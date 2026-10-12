from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.modes.base import GLOBAL_SAFETY_RULES, ModeConfig, QuickAction


CAREER_SYSTEM_PROMPT = f"""You are an elite career coach, talent scout, and professional resume strategist.

Career Guidelines:
- Goal: Maximize the candidate's interview conversion rate against specific Job Descriptions.
- Authenticity Rule: NEVER invent or hallucinate candidate experience, credentials, companies, or quantitative numbers. If a metric or result is missing from a bullet point rewrite, insert clear placeholders like [add number]% or [add metric].
- Structure resume improvements as clear side-by-side Before & After comparisons with active action verbs (e.g. Architected, Accelerated, Spearheaded).
- Ground cover letters and interview prep answers strictly in verifiable facts present on the resume.

{GLOBAL_SAFETY_RULES}
"""


class MatchBreakdown(BaseModel):
    category: str = Field(..., description="Category: e.g. Skills, Experience, Education, Keywords")
    score: int = Field(..., ge=0, le=100, description="Category percentage score")
    notes: str = Field(..., description="Summary observation for this category")


class MatchScoreResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100, description="Overall match percentage (0-100)")
    headline: str = Field(..., description="One-line summary evaluation")
    breakdown: List[MatchBreakdown] = Field(..., description="Score breakdown by category")
    matched_keywords: List[str] = Field(..., description="Keywords successfully matched")
    missing_keywords: List[str] = Field(..., description="Critical keywords missing from candidate resume")
    recommendations: List[str] = Field(..., description="Top 3 immediate improvement steps")


class ResumeBulletRewrite(BaseModel):
    original: str = Field(..., description="Original weak or passive bullet point")
    improved: str = Field(..., description="Transformed bullet point using action verbs and placeholders like [add metric]")
    reason: str = Field(..., description="Why this transformation improves ATS ranking and impact")


class ImproveResumeResponse(BaseModel):
    rewrites: List[ResumeBulletRewrite]


career_mode = ModeConfig(
    id="career",
    name="Career",
    description="Resume optimization, JD match scores, bullet point rewrites & interview preparation.",
    color="pink",
    badge_color="bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    system_prompt=CAREER_SYSTEM_PROMPT,
    quick_actions=[
        QuickAction(
            id="match_score",
            label="Resume vs JD Match Score",
            icon="Target",
            description="Percentage match gauge with breakdown (skills, experience, keywords), matched & missing terms.",
            needs="two_files",
            output_type="match_score",
        ),
        QuickAction(
            id="improve_resume",
            label="Transform Resume Bullets",
            icon="TrendingUp",
            description="Before vs After side-by-side bullet point rewrites into high-impact achievement statements.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="tailored_summary",
            label="Tailored Professional Summary",
            icon="Award",
            description="A compelling, customized resume summary paragraph aligned with target JD requirements.",
            needs="two_files",
            output_type="markdown",
        ),
        QuickAction(
            id="cover_letter",
            label="Tailored Cover Letter",
            icon="Mail",
            description="Crisp, persuasive cover letter matching job requirements using only facts from candidate resume.",
            needs="two_files",
            output_type="markdown",
        ),
        QuickAction(
            id="interview_prep",
            label="Targeted Interview Prep",
            icon="MessageSquareText",
            description="Anticipated technical, behavioral, and 'Tell me about yourself' questions with suggested answers.",
            needs="two_files",
            output_type="markdown",
        ),
        QuickAction(
            id="skill_gap",
            label="Skill Gap & Learning Roadmap",
            icon="GitFork",
            description="Prioritized list of missing required vs preferred skills with a suggested learning order.",
            needs="two_files",
            output_type="markdown",
        ),
    ],
)
