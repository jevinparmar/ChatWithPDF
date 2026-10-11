from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class QuestionsPerDayItem(BaseModel):
    date: str
    questions: int


class FeedbackSplit(BaseModel):
    up: int = 0
    down: int = 0


class FeedbackBreakdownItem(BaseModel):
    name: str
    value: int
    color: str


class RecentUserItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    documents: int
    questions: int
    joined: str


class DownvotedAnswerItem(BaseModel):
    id: str
    userEmail: str
    question: str
    answer: str
    reason: str
    date: str
    documentName: str


class AdminStatsResponse(BaseModel):
    totalUsers: int
    totalDocuments: int
    totalQuestions: int
    questionsToday: int
    avgResponseMs: float
    satisfactionRate: float
    questionsPerDay: List[QuestionsPerDayItem]
    feedbackSplit: FeedbackSplit
    feedbackBreakdown: List[FeedbackBreakdownItem]
    recentUsers: List[RecentUserItem]
    downvotedAnswers: List[DownvotedAnswerItem]

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )
