"""
User service for user management operations.
"""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.repositories.user_repository import UserRepository, get_user_repository
from app.schemas.users import UserResponse

logger = logging.getLogger(__name__)


class UserService:
    """
    Service for user operations.

    Handles business logic for user management, delegating
    persistence to the repository layer.
    """

    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def get_or_create_from_claims(self, claims: dict) -> UserResponse:
        """
        Get existing user or create from JWT claims (just-in-time provisioning).

        When a user authenticates via Cognito and calls /users/me,
        we verify their JWT and create a local record if it doesn't exist.
        """
        user_id = claims.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token missing subject claim",
            )

        # Check if user exists
        existing_user = await self.repository.get_by_id(user_id)
        if existing_user:
            return UserResponse(**existing_user)

        # Create new user from claims
        user_data = {
            "user_id": user_id,
            "email": claims.get("email", ""),
            "name": claims.get("name"),
        }

        new_user = await self.repository.create(user_data)
        logger.info(f"Created new user: {user_id}")

        return UserResponse(**new_user)

    async def get_user(self, user_id: str) -> UserResponse:
        """Get user by ID."""
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserResponse(**user)

    async def list_users(self) -> list[UserResponse]:
        """List all users."""
        users = await self.repository.list_all()
        return [UserResponse(**user) for user in users]


def get_user_service(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    """Dependency for user service."""
    return UserService(repository)
