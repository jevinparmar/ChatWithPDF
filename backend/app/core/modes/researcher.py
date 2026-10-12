from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.modes.base import GLOBAL_SAFETY_RULES, ModeConfig, QuickAction


RESEARCHER_SYSTEM_PROMPT = f"""You are a rigorous, objective academic research assistant and peer reviewer.

Research Guidelines:
- Writing style: Precise, neutral, scholarly, and analytical.
- Carefully qualify certainty: avoid unsupported generalizations; distinguish between correlation, empirical demonstration, and authors' hypotheses.
- When multiple documents are analyzed, explicitly distinguish which claim, method, or result originates from which specific paper using compact citations like (PaperName, Page 4) or (FileA, Slide 6).
- Format comparisons as markdown matrices/tables with consistent evaluation dimensions.
- Preserve technical definitions, benchmark datasets, baseline comparisons, and statistical metrics (p-values, F1-scores, accuracy, latency).

{GLOBAL_SAFETY_RULES}
"""


class PaperSummaryCard(BaseModel):
    objective: str = Field(..., description="Primary research objective and problem formulation")
    method: str = Field(..., description="Methodology, theoretical framework, and architecture")
    dataset: str = Field(..., description="Datasets, corpus, or experimental environment")
    key_results: str = Field(..., description="Key empirical findings and performance metrics")
    limitations: str = Field(..., description="Known constraints, failure modes, or threats to validity")
    future_work: str = Field(..., description="Suggested future research avenues")


class FindingItem(BaseModel):
    claim: str = Field(..., description="Empirical claim or hypothesis")
    evidence: str = Field(..., description="Direct supporting evidence or data from paper")
    location: str = Field(..., description="Citation location, e.g. Page 5")


class FindingsExtractionResponse(BaseModel):
    paper_title: str
    findings: List[FindingItem]


researcher_mode = ModeConfig(
    id="researcher",
    name="Researcher",
    description="Precise academic analysis, paper summaries, literature reviews & cross-paper comparisons.",
    color="teal",
    badge_color="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    system_prompt=RESEARCHER_SYSTEM_PROMPT,
    quick_actions=[
        QuickAction(
            id="paper_summary",
            label="Paper Summary Card",
            icon="FileSpreadsheet",
            description="Structured academic card: Objective, Method, Dataset, Key Results, Limitations & Future Work.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="compare_papers",
            label="Compare Papers",
            icon="Columns",
            description="Comparative matrix (problem, method, data, metrics, results, limitations) plus synthesis.",
            needs="many_files",
            output_type="comparison",
        ),
        QuickAction(
            id="find_agreements_and_gaps",
            label="Agreements & Research Gaps",
            icon="GitCompare",
            description="Analyze points of consensus, contradictions, and unexplored research gaps across papers.",
            needs="many_files",
            output_type="markdown",
        ),
        QuickAction(
            id="literature_review",
            label="Draft Literature Review",
            icon="BookMarked",
            description="Thematically organized draft review with rigorous (File, Page) citations.",
            needs="many_files",
            output_type="markdown",
        ),
        QuickAction(
            id="extract_findings",
            label="Extract Key Findings",
            icon="ListChecks",
            description="Tabular extraction of claims, statistical evidence, and page citations.",
            needs="one_file",
            output_type="markdown",
        ),
    ],
)
