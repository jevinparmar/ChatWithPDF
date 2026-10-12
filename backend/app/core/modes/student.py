from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.modes.base import GLOBAL_SAFETY_RULES, ModeConfig, QuickAction, QuickActionOption


STUDENT_SYSTEM_PROMPT = f"""You are an enthusiastic, warm, and exceptionally clear teacher and tutor.
Your goal is to help students truly understand concepts without confusion.

Teaching Guidelines:
- Explain in simple, everyday words with short sentences.
- Define every technical or difficult term the very first time it appears.
- Use intuitive, real-life analogies and everyday examples to make abstract ideas click.
- Never blindly copy sentences from the uploaded files; always synthesize and re-explain in friendly teaching language.
- Break down complex topics into clear, digestible, sequential steps.
- Adapt explanations to the requested reading level:
  * "Very simple": explain as if to a bright 10-year-old child (analogies, basic terms).
  * "Simple" (default): college / high school student level, crisp and conceptual.
  * "Detailed": exam-ready, comprehensive with formulas, technical nuances, and definitions.
- Language: Reply in the same language the student asks in (English, Hindi, Hinglish, or Gujarati).

{GLOBAL_SAFETY_RULES}
"""

FULL_EXPLANATION_PROMPT = """When explaining this document, cover EVERY topic in sequential order without skipping sections, slides, or chapters.
Structure your complete explanation exactly as follows:

1. ## What this file is about
(2-3 simple, friendly lines summarizing the core theme)

2. ## Topic-by-Topic Breakdown
For EACH topic or chapter in the document:
### [Topic Name] (Location)
- **Simple Explanation:** (Clear teaching in easy-to-understand words)
- **Real-Life Example / Analogy:** (Everyday analogy that makes it immediately relatable)
- **💡 Remember this:** (Memorable 1-line key takeaway)

3. ## Important Terms (Glossary)
| Term | Simple Meaning | Context / Location |
|---|---|---|
(Include every key technical term defined simply)

4. ## Key Takeaways
(5 to 8 crisp bullet points summarizing the core concepts)

5. ## Check Yourself! 🎯
(3 short self-assessment questions with brief answer keys)
"""


# Pydantic models for structured outputs
class FlashcardItem(BaseModel):
    front: str = Field(..., description="Concept question or prompt on the front of the flashcard")
    back: str = Field(..., description="Clear, concise explanation on the back")
    location: str = Field(..., description="Citation location, e.g. Page 3 or Slide 5")


class FlashcardsResponse(BaseModel):
    flashcards: List[FlashcardItem]


class QuizQuestionItem(BaseModel):
    question: str = Field(..., description="The quiz question text")
    options: List[str] = Field(..., min_length=2, max_length=4, description="List of 2 to 4 answer choices")
    correctIndex: int = Field(..., description="0-indexed integer of the correct option")
    explanation: str = Field(..., description="Why this answer is correct and others are incorrect")
    location: str = Field(..., description="Citation location in the document")


class QuizResponse(BaseModel):
    title: str = Field(default="Document Quiz")
    questions: List[QuizQuestionItem]


class MindMapNode(BaseModel):
    name: str = Field(..., description="Topic or subtopic name")
    location: Optional[str] = Field(None, description="Location citation")
    children: Optional[List["MindMapNode"]] = Field(default=None, description="Subtopics")


MindMapNode.model_rebuild()


class MindMapResponse(BaseModel):
    title: str = Field(..., description="Root document title")
    children: List[MindMapNode] = Field(..., description="Main chapters or themes")


student_mode = ModeConfig(
    id="student",
    name="Student",
    description="Learn with a friendly teacher. Analogies, simple words, quizzes, flashcards & notes.",
    color="indigo",
    badge_color="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    system_prompt=STUDENT_SYSTEM_PROMPT,
    quick_actions=[
        QuickAction(
            id="explain_full",
            label="Explain Full File",
            icon="BookOpen",
            description="Comprehensive topic-by-topic teaching with analogies, glossary, and self-test.",
            needs="one_file",
            output_type="markdown",
            options_schema=[
                QuickActionOption(
                    id="level",
                    label="Reading Level",
                    type="select",
                    default="simple",
                    choices=[
                        {"value": "very_simple", "label": "Very Simple (10-year-old)"},
                        {"value": "simple", "label": "Simple (College student)"},
                        {"value": "detailed", "label": "Detailed (Exam-ready)"},
                    ],
                )
            ],
        ),
        QuickAction(
            id="short_notes",
            label="Short Revision Notes",
            icon="FileText",
            description="Concise revision notes with bullet points and a 'Last-Minute Revision' box.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="key_points",
            label="Key Points",
            icon="CheckCircle",
            description="Top takeaways and vital points extracted from the document.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="flashcards",
            label="Flashcards",
            icon="Layers",
            description="Interactive flip cards to test and memorize key concepts.",
            needs="one_file",
            output_type="flashcards",
        ),
        QuickAction(
            id="quiz",
            label="Practice Quiz",
            icon="HelpCircle",
            description="Interactive question-by-question quiz with instant explanations and score tracker.",
            needs="one_file",
            output_type="quiz",
            options_schema=[
                QuickActionOption(
                    id="count",
                    label="Number of Questions",
                    type="select",
                    default="5",
                    choices=[
                        {"value": "5", "label": "5 Questions"},
                        {"value": "10", "label": "10 Questions"},
                        {"value": "15", "label": "15 Questions"},
                    ],
                ),
                QuickActionOption(
                    id="difficulty",
                    label="Difficulty",
                    type="select",
                    default="medium",
                    choices=[
                        {"value": "easy", "label": "Easy"},
                        {"value": "medium", "label": "Medium"},
                        {"value": "hard", "label": "Hard"},
                    ],
                ),
                QuickActionOption(
                    id="type",
                    label="Question Format",
                    type="select",
                    default="mcq",
                    choices=[
                        {"value": "mcq", "label": "Multiple Choice (MCQ)"},
                        {"value": "true_false", "label": "True / False"},
                        {"value": "mixed", "label": "Mixed Format"},
                    ],
                ),
            ],
        ),
        QuickAction(
            id="exam_questions",
            label="Exam Questions & Answers",
            icon="GraduationCap",
            description="Likely 2-mark, 5-mark, and 10-mark university exam questions with model answers.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="mind_map",
            label="Mind Map Outline",
            icon="Network",
            description="Hierarchical interactive visual tree outline of topics and subtopics.",
            needs="one_file",
            output_type="mind_map",
        ),
        QuickAction(
            id="eli10",
            label="Explain Like I'm 10",
            icon="Smile",
            description="Super-simplified analogy explanation suited for beginners.",
            needs="one_file",
            output_type="markdown",
        ),
        QuickAction(
            id="explain_simpler",
            label="Explain Simpler",
            icon="Sparkles",
            description="Re-explain the previous answer using even simpler words and analogies.",
            needs="one_file",
            output_type="markdown",
        ),
    ],
)
