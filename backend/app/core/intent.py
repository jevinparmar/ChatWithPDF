import re

BROAD_PHRASES = [
    r"\bexplain\b",
    r"\bsummariz(e|ation)\b",
    r"\bsummary\b",
    r"\boverview\b",
    r"\bkey\s+(points|takeaways|concepts|topics)\b",
    r"\bmain\s+(points|topics|ideas|concepts)\b",
    r"\btell\s+me\s+about\b",
    r"\bwalk\s+me\s+through\b",
    r"\bbreak\s+down\b",
    r"\bteach\s+me\b",
    r"\bwhat\s+is\s+this\s+(pdf|document|chapter|book|file|paper)\s+about\b",
    r"\bwhat\s+does\s+this\s+(pdf|document|chapter|book|file|paper)\s+(cover|discuss|say)\b",
    r"\btable\s+of\s+contents\b",
    r"\boutline\b",
    r"\bcore\s+concepts\b",
    r"\ball\s+topics\b",
    r"\bwhole\s+(pdf|document|chapter|book|file)\b",
    r"\bentire\s+(pdf|document|chapter|book|file)\b",
]

DOC_SCOPE_PATTERNS = [
    r"\b(this|the)\s+(chapter|pdf|document|file|paper|book|unit|presentation|slides?)\b",
    r"\beverything\b",
    r"\ball\s+topics\b",
    r"\ball\s+chapters\b",
    r"\bwhole\s+thing\b",
]


def classify_intent(question: str) -> str:
    """
    Classifies a user question as either 'broad' or 'specific'.
    
    Broad questions request general understanding, summaries, overviews,
    or chapter/document-level walkthroughs.
    Specific questions target a particular fact, definition, or topic.
    """
    if not question or not question.strip():
        return "specific"

    cleaned = question.strip().lower()

    # Direct short triggers
    if cleaned in {
        "explain",
        "explain this",
        "explain it",
        "explain please",
        "summarize",
        "summarize this",
        "summarize it",
        "summary",
        "overview",
        "outline",
        "help me understand this",
    }:
        return "broad"

    # Check for document scope references ("this chapter", "this pdf", "the document", etc.)
    has_doc_scope = any(re.search(pat, cleaned) for pat in DOC_SCOPE_PATTERNS)

    # Broad verbs / request types
    has_explain = bool(re.search(r"\bexplain(\s+me)?\b", cleaned))
    has_summarize = bool(re.search(r"\bsummariz(e|ation)\b|\bsummary\b", cleaned))
    has_overview = bool(re.search(r"\boverview\b|\boutline\b|\btable\s+of\s+contents\b", cleaned))
    has_key_points = bool(re.search(r"\b(key|main|core)\s+(points|takeaways|concepts|topics|ideas)\b", cleaned))
    has_tell_me = bool(re.search(r"\btell\s+me\s+about\b|\bwalk\s+me\s+through\b|\bteach\s+me\b|\bbreak\s+down\b", cleaned))
    has_what_about = bool(re.search(r"\bwhat\s+(is|are)\s+(this|the)\s+(pdf|document|chapter|book|unit)\s+about\b", cleaned))

    # If asking to explain/summarize the document/chapter as a whole
    if has_doc_scope and (has_explain or has_summarize or has_overview or has_tell_me or has_key_points or "what" in cleaned):
        return "broad"

    # Summarize / Overview / Key points are almost always broad by nature
    if has_summarize or has_overview or has_key_points or has_what_about:
        return "broad"

    # "tell me about this pdf" / "tell me about this document"
    if has_tell_me and has_doc_scope:
        return "broad"

    # "explain all topics" or "explain everything"
    if has_explain and any(w in cleaned for w in ["all", "everything", "whole", "entire", "contents"]):
        return "broad"

    return "specific"
