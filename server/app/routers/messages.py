import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routers.users import verify_token

router = APIRouter()
logger = logging.getLogger(__name__)


class MessageResponse(BaseModel):
    message: str
    authenticated: bool


# Type alias for dependency injection
TokenClaims = Annotated[dict, Depends(verify_token)]


@router.get("/public", response_model=MessageResponse)
async def get_public_message():
    """Public message endpoint - no authentication required."""
    return MessageResponse(
        message="Hello! This is a public message.",
        authenticated=False,
    )


@router.get("/private", response_model=MessageResponse)
async def get_private_message(claims: TokenClaims):
    """Private message endpoint - requires authentication."""
    user_email = claims.get("email", "unknown")
    return MessageResponse(
        message=f"Hello {user_email}! This is a private message.",
        authenticated=True,
    )
