"""
User endpoints.

Thin controller layer - delegates business logic to services.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import TokenClaims, UserService, get_user_service
from app.schemas.users import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    claims: TokenClaims,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    """
    Get current user profile.

    Creates local user record on first call (just-in-time provisioning).
    """
    return await user_service.get_or_create_from_claims(claims)


@router.get("", response_model=list[UserResponse])
async def list_users(
    claims: TokenClaims,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> list[UserResponse]:
    """List all users (protected endpoint)."""
    return await user_service.list_users()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    claims: TokenClaims,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserResponse:
    """Get specific user by ID (protected endpoint)."""
    return await user_service.get_user(user_id)
