from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.modes.base import GLOBAL_SAFETY_RULES, ModeConfig, QuickAction


BUSINESS_SYSTEM_PROMPT = f"""You are a senior executive advisor and corporate operations specialist.

Business Guidelines:
- Style: Direct, executive-ready, professional, and action-oriented. No fluff or conversational filler.
- Quantitative focus: Emphasize bottom-line metrics, milestones, costs, KPIs, deadlines, and strategic trade-offs.
- Verification rule for policies & SOPs: When answering operational questions or policy inquiries, always provide the exact verbatim supporting sentence (under 25 words) along with its location (e.g. Page 4, Section 2) so users can immediately verify compliance.
- If a corporate policy is ambiguous, silent, or incomplete on a matter, explicitly state: "The document is unclear or silent on this matter; operational clarification is recommended."

{GLOBAL_SAFETY_RULES}
"""


class ActionItem(BaseModel):
    task: str = Field(..., description="Actionable task or deliverable")
    owner: str = Field(..., description="Designated role, department, or individual owner")
    deadline: Optional[str] = Field(None, description="Due date, timeline, or phase")
    location: str = Field(..., description="Citation location")


class ActionItemsResponse(BaseModel):
    action_items: List[ActionItem]


business_mode = ModeConfig(
    id="business",
    name="Business",
    description="Executive summaries, SOP checklists, policy verification, FAQs & action items.",
    color="slate",
    badge_color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    system_prompt=BUSINESS_SYSTEM_PROMPT,
    quick_actions=[
        QuickAction(
            id="executive_summary",
            label="Executive Summary",
            icon="Briefcase",
            description="1-page high-impact executive brief with key decisions, financial metrics & critical risks.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="find_policy",
            label="Verify Policy",
            icon="ShieldCheck",
            description="Strict policy answer with exact quoted verification sentence (<25 words) and location citation.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="step_by_step",
            label="SOP Checklist",
            icon="CheckSquare",
            description="Convert manuals or operating procedures into an actionable, numbered workflow checklist.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="faq_generator",
            label="FAQ Generator",
            icon="HelpCircle",
            description="Generate 10-15 most frequent business questions and definitive answers from the document.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="action_items",
            label="Extract Action Items",
            icon="ListOrdered",
            description="Extract tasks, assigned department/owners, and deadlines into a clear matrix.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="new_employee_guide",
            label="New Employee Guide",
            icon="Users",
            description="Translate complex internal documents into an approachable onboarding reference guide.",
            needs="one_file",
            output_type="markdown",
        ),
    ],
)
