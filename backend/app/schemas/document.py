from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    id: str
    name: str
    fileName: str
    size: int
    fileSize: int
    type: str
    fileType: str
    locationType: Optional[str] = "page"
    role: Optional[str] = None
    pages: int = 0
    pageCount: int = 0
    status: str
    errorMessage: Optional[str] = None
    summary: Optional[str] = None
    topics: Optional[List[str]] = None
    suggestedQuestions: Optional[List[str]] = None
    createdAt: str
    url: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class DocumentUpdateRole(BaseModel):
    role: Optional[str] = Field(None, pattern="^(resume|job_description|contract|paper|notes|other)?$")


class DocumentDeleteResponse(BaseModel):
    success: bool = True
    message: str = "Document deleted successfully"

