"""
Authentication-related schemas.
"""

from pydantic import BaseModel


class AppleAuthRequest(BaseModel):
    """Request for Apple Sign-In token exchange."""

    identity_token: str
    authorization_code: str
    email: str | None = None
    full_name: str | None = None


class GoogleAuthRequest(BaseModel):
    """Request for Google Sign-In token exchange."""

    id_token: str
    email: str | None = None
    full_name: str | None = None


class AuthTokenResponse(BaseModel):
    """Response containing authentication tokens."""

    id_token: str
    access_token: str
    refresh_token: str | None = None
    expires_in: int
