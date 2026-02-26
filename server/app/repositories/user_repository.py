"""
User repository for data persistence.

Currently uses JSON file storage, but can be swapped for a database.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Protocol

import aiofiles
import aiofiles.os
from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class UserRepositoryProtocol(Protocol):
    """Protocol defining the user repository interface."""

    async def get_by_id(self, user_id: str) -> dict | None:
        """Get user by ID."""
        ...

    async def get_by_email(self, email: str) -> dict | None:
        """Get user by email."""
        ...

    async def create(self, user_data: dict) -> dict:
        """Create a new user."""
        ...

    async def list_all(self) -> list[dict]:
        """List all users."""
        ...


class UserRepository:
    """
    JSON file-based user repository.

    Stores users in a JSON file. For production, replace with
    a database-backed implementation (PostgreSQL, DynamoDB, etc.).
    """

    def __init__(self, data_dir: Path):
        self.users_file = data_dir / "users.json"

    async def _load(self) -> list[dict]:
        """Load users from JSON file."""
        if not await aiofiles.os.path.exists(self.users_file):
            return []

        try:
            async with aiofiles.open(self.users_file, "r") as f:
                content = await f.read()
                return json.loads(content) if content else []
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load users file: {e}")
            return []

    async def _save(self, users: list[dict]) -> None:
        """Save users to JSON file."""
        try:
            # Ensure directory exists
            self.users_file.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(self.users_file, "w") as f:
                await f.write(json.dumps(users, indent=2))
        except IOError as e:
            logger.error(f"Failed to save users file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save user data",
            )

    async def get_by_id(self, user_id: str) -> dict | None:
        """Get user by ID."""
        users = await self._load()
        for user in users:
            if user["user_id"] == user_id:
                return user
        return None

    async def get_by_email(self, email: str) -> dict | None:
        """Get user by email."""
        users = await self._load()
        for user in users:
            if user.get("email") == email:
                return user
        return None

    async def create(self, user_data: dict) -> dict:
        """Create a new user."""
        users = await self._load()

        # Add timestamp
        user = {
            **user_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        users.append(user)
        await self._save(users)

        return user

    async def list_all(self) -> list[dict]:
        """List all users."""
        return await self._load()


def get_user_repository(
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserRepository:
    """Dependency for user repository."""
    return UserRepository(settings.data_dir)
