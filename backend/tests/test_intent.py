import pytest
from app.core.intent import classify_intent


@pytest.mark.parametrize(
    "question",
    [
        "explain this chapter",
        "explain this PDF",
        "summarize this document",
        "give me an overview",
        "what are the key points of this chapter?",
        "tell me about this document",
        "explain me this pdf",
        "explain",
        "summarize",
        "overview of the whole document",
        "what is this pdf about",
        "table of contents",
        "walk me through this file",
    ],
)
def test_broad_intent_classification(question: str):
    assert classify_intent(question) == "broad"


@pytest.mark.parametrize(
    "question",
    [
        "what is software engineering according to page 5?",
        "what is the definition of software on page 2?",
        "what are the 5 framework activities?",
        "how does deployment work?",
        "who authored this research paper?",
        "what formula is used on page 14?",
    ],
)
def test_specific_intent_classification(question: str):
    assert classify_intent(question) == "specific"
