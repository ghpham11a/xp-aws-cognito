"""
Common schemas used across the API.
"""

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Individual validation error detail."""

    field: str
    message: str
    type: str


class ErrorResponse(BaseModel):
    """Standard error response format."""

    code: int
    message: str
    request_id: str
    details: list[ErrorDetail] | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    environment: str
