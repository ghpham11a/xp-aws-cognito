"""
Message endpoints.

Demo endpoints showing public vs. protected access patterns.
"""

from fastapi import APIRouter

from app.api.deps import TokenClaims
from app.schemas.messages import MessageResponse

router = APIRouter()


@router.get("/public", response_model=MessageResponse)
async def get_public_message() -> MessageResponse:
    """Public message endpoint - no authentication required."""
    return MessageResponse(
        message="Hello! This is a public message.",
        authenticated=False,
    )


@router.get("/private", response_model=MessageResponse)
async def get_private_message(claims: TokenClaims) -> MessageResponse:
    """Private message endpoint - requires authentication."""
    user_email = claims.get("email", "unknown")
    return MessageResponse(
        message=f"Hello {user_email}! This is a private message.",
        authenticated=True,
    )
