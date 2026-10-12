from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.modes.base import GLOBAL_SAFETY_RULES, ModeConfig, QuickAction, QuickActionOption


LEGAL_DISCLAIMER = "⚠️ *This is an AI summary to help you read the document, not legal advice. Please consult a qualified lawyer for decisions.*"

LEGAL_SYSTEM_PROMPT = f"""You are an exacting, plain-English legal document analyst.

Legal Analysis Guidelines:
- MANDATORY NOTICE: Always include the following legal notice at the very top or bottom of every response:
  "{LEGAL_DISCLAIMER}"
- Style: Careful, exact, neutral, plain-English. Avoid unnecessary legal jargon, but preserve critical statutory or contractual terms of art.
- Quote verbatim key contract clauses (with location) before breaking them down into plain-English meanings.
- Highlight specific risk factors: unlimited indemnity, auto-renewal traps, unilateral termination, vague arbitration clauses, non-compete overreach.

{GLOBAL_SAFETY_RULES}
"""


class RiskItem(BaseModel):
    clause: str = Field(..., description="Contract clause or topic name")
    level: str = Field(..., description="Severity level: 'Red' (High), 'Amber' (Medium), or 'Green' (Standard)")
    reason: str = Field(..., description="One-line plain-English explanation of the commercial or legal risk")
    location: str = Field(..., description="Citation location in the agreement")


class RiskCheckResponse(BaseModel):
    document_title: Optional[str] = "Agreement"
    risks: List[RiskItem]


class DeadlineItem(BaseModel):
    event: str = Field(..., description="Event, obligation, or notice requirement")
    date_or_period: str = Field(..., description="Specific date, deadline, or notice timeframe")
    party: str = Field(..., description="Responsible or affected party")
    location: str = Field(..., description="Citation location")


class DeadlinesResponse(BaseModel):
    deadlines: List[DeadlineItem]


legal_mode = ModeConfig(
    id="legal",
    name="Legal",
    description="Contracts and agreements: clause finder, obligations, dates & Red/Amber/Green risk badges.",
    color="amber",
    badge_color="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    system_prompt=LEGAL_SYSTEM_PROMPT,
    quick_actions=[
        QuickAction(
            id="contract_summary",
            label="Contract Summary",
            icon="FileCheck",
            description="Parties, purpose, term, payment terms, key obligations, termination, penalties & governing law.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="risk_check",
            label="Risk Check (Red/Amber/Green)",
            icon="AlertOctagon",
            description="Flag high-risk terms (auto-renewal, unlimited liability, one-sided clauses) with colored badges.",
            needs="one_file",
            output_type="risk_badges",
        ),
        QuickAction(
            id="clause_finder",
            label="Clause Finder",
            icon="Search",
            description="Locate and quote specific clauses (liability, termination, non-compete) with plain-English translation.",
            needs="one_file",
            output_type="markdown",
            options_schema=[
                QuickActionOption(
                    id="topic",
                    label="Clause Topic",
                    type="select",
                    default="termination",
                    choices=[
                        {"value": "termination", "label": "Termination & Notice"},
                        {"value": "liability", "label": "Limitation of Liability & Indemnity"},
                        {"value": "payment", "label": "Payment Terms & Penalties"},
                        {"value": "confidentiality", "label": "Confidentiality & IP"},
                        {"value": "non_compete", "label": "Non-Compete & Non-Solicit"},
                        {"value": "governing_law", "label": "Governing Law & Dispute Resolution"},
                    ],
                )
            ],
        ),
        QuickAction(
            id="deadlines_and_dates",
            label="Deadlines & Renewal Dates",
            icon="Calendar",
            description="Structured table of every date, payment deadline, notice window, and renewal term.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="obligations",
            label="Party Obligations Matrix",
            icon="UserCheck",
            description="Clear table of duties per contracting party: what they must deliver, by when, under what terms.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="plain_english",
            label="Plain-English Rewrite",
            icon="Feather",
            description="Translate dense legalese into straightforward, plain-English summary anyone can understand.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="compare_versions",
            label="Compare Contract Versions",
            icon="GitDiff",
            description="Compare two agreement versions: highlights added, deleted, and modified clauses.",
            needs="two_files",
            output_type="markdown",
        ),
    ],
)
