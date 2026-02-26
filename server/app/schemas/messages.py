"""
Message-related schemas.
"""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Schema for message response."""

    message: str
    authenticated: bool
