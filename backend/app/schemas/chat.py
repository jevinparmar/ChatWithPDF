from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SourceItem(BaseModel):
    documentId: str
    fileName: str
    page: int
    snippet: str

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New conversation"
    documentIds: List[str] = Field(default_factory=list)


class ChatSessionRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class ChatSessionResponse(BaseModel):
    id: str
    title: str
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
    sources: Optional[List[SourceItem]] = None
    feedback: Optional[str] = None
    createdAt: str = Field(..., alias="created_at")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class ChatRequest(BaseModel):
    sessionId: str
    question: str = Field(..., min_length=1)
    documentIds: List[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    messageId: str
    answer: str
    sources: List[SourceItem]
    userMessage: Optional[ChatMessageResponse] = None
    assistantMessage: Optional[ChatMessageResponse] = None


class FeedbackRequest(BaseModel):
    messageId: str
    rating: str = Field(..., pattern="^(up|down)$")
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    success: bool = True
    message: str = "Feedback submitted"
