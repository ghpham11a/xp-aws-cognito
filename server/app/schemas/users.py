"""
User-related schemas.
"""

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Schema for creating a user."""

    email: str
    name: str | None = None


class UserResponse(BaseModel):
    """Schema for user response."""

    user_id: str
    email: str
    name: str | None
    created_at: str

    class Config:
        from_attributes = True
