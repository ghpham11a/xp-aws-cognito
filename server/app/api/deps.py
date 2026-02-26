"""
Shared API dependencies.

Re-exports commonly used dependencies for cleaner imports in routes.
"""

from app.core.config import Settings, get_settings
from app.core.security import TokenClaims, verify_token
from app.providers.apple import AppleProvider, get_apple_provider
from app.providers.cognito import CognitoProvider, get_cognito_provider
from app.providers.google import GoogleProvider, get_google_provider
from app.repositories.user_repository import UserRepository, get_user_repository
from app.services.auth_service import AuthService, get_auth_service
from app.services.jwks_service import JWKSService, get_jwks_service
from app.services.user_service import UserService, get_user_service

__all__ = [
    # Config
    "Settings",
    "get_settings",
    # Security
    "TokenClaims",
    "verify_token",
    # Services
    "AuthService",
    "get_auth_service",
    "JWKSService",
    "get_jwks_service",
    "UserService",
    "get_user_service",
    # Providers
    "AppleProvider",
    "get_apple_provider",
    "CognitoProvider",
    "get_cognito_provider",
    "GoogleProvider",
    "get_google_provider",
    # Repositories
    "UserRepository",
    "get_user_repository",
]
