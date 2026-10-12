from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class SourceItem(BaseModel):
    documentId: str
    fileName: str
    page: int
    locationType: Optional[str] = "page"
    locationLabel: Optional[str] = None
    snippet: str

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New conversation"
    mode: Optional[str] = "student"
    documentIds: List[str] = Field(default_factory=list)


class ChatSessionRename(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    mode: Optional[str] = Field(None, pattern="^(student|researcher|business|legal|career)$")


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    mode: Optional[str] = "student"
    documentIds: List[str] = Field(default_factory=list)
    createdAt: str = Field(..., alias="created_at")
    updatedAt: str = Field(..., alias="updated_at")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    outputType: Optional[str] = "markdown"
    actionId: Optional[str] = None
    sources: Optional[List[SourceItem]] = None
    feedback: Optional[str] = None
    createdAt: str = Field(..., alias="created_at")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class ChatRequest(BaseModel):
    sessionId: str
    question: Optional[str] = None
    message: Optional[str] = None
    documentIds: List[str] = Field(default_factory=list)
    model: Optional[str] = None  # gpt-4o | claude-3-5-sonnet | llama-3-70b
    topK: Optional[int] = None
    hybridSearch: Optional[bool] = None

    @model_validator(mode="after")
    def validate_question_or_message(self):
        if not self.question and self.message:
            self.question = self.message
        if not self.question or not self.question.strip():
            raise ValueError("question or message is required")
        return self


class ChatActionRequest(BaseModel):
    sessionId: str
    actionId: str
    documentIds: List[str] = Field(default_factory=list)
    options: dict = Field(default_factory=dict)
    model: Optional[str] = None
    topK: Optional[int] = None
    hybridSearch: Optional[bool] = None


class ChatResponse(BaseModel):
    messageId: str
    answer: str
    sources: List[SourceItem]
    userMessage: Optional[ChatMessageResponse] = None
    assistantMessage: Optional[ChatMessageResponse] = None
    response: Optional[str] = None

    @model_validator(mode="after")
    def populate_response(self):
        if not self.response and self.answer:
            self.response = self.answer
        return self


class FeedbackRequest(BaseModel):
    messageId: str
    rating: str = Field(..., pattern="^(up|down)$")
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    success: bool = True
    message: str = "Feedback submitted"
