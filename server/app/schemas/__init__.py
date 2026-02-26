"""
Pydantic schemas for API request/response models.
"""

from app.schemas.auth import (
    AppleAuthRequest,
    AuthTokenResponse,
    GoogleAuthRequest,
)
from app.schemas.common import ErrorDetail, ErrorResponse, HealthResponse
from app.schemas.messages import MessageResponse
from app.schemas.users import UserCreate, UserResponse

__all__ = [
    # Auth
    "AppleAuthRequest",
    "GoogleAuthRequest",
    "AuthTokenResponse",
    # Users
    "UserResponse",
    "UserCreate",
    # Messages
    "MessageResponse",
    # Common
    "ErrorResponse",
    "ErrorDetail",
    "HealthResponse",
]
