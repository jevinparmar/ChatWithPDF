from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSignUpRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    createdAt: Optional[str] = Field(default=None, alias="created_at")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        serialize_by_alias=True,
    )


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
