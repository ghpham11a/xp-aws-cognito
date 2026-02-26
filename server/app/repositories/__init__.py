"""
Data access repositories.
"""

from app.repositories.user_repository import UserRepository, get_user_repository

__all__ = [
    "UserRepository",
    "get_user_repository",
]
