"""
Main API router aggregating all route modules.
"""

from fastapi import APIRouter

from app.api.v1 import auth, messages, users

api_router = APIRouter()

# Include all v1 routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
