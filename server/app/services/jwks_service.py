"""
JWKS (JSON Web Key Set) service for fetching and caching public keys.
"""

import logging
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class JWKSService:
    """
    Service for fetching and caching JWKS from identity providers.

    Uses LRU cache to minimize network requests while supporting
    cache invalidation for key rotation scenarios.
    """

    APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
    GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
    TIMEOUT = 10.0

    def __init__(self, settings: Settings):
        self.settings = settings

    @staticmethod
    @lru_cache(maxsize=1)
    def _fetch_cognito_jwks(jwks_url: str) -> dict:
        """Fetch Cognito JWKS (cached)."""
        try:
            response = httpx.get(jwks_url, timeout=JWKSService.TIMEOUT)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Failed to fetch Cognito JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )

    @staticmethod
    @lru_cache(maxsize=1)
    def _fetch_apple_jwks() -> dict:
        """Fetch Apple JWKS (cached)."""
        try:
            response = httpx.get(
                JWKSService.APPLE_JWKS_URL, timeout=JWKSService.TIMEOUT
            )
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Failed to fetch Apple JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Apple authentication service unavailable",
            )

    @staticmethod
    @lru_cache(maxsize=1)
    def _fetch_google_jwks() -> dict:
        """Fetch Google JWKS (cached)."""
        try:
            response = httpx.get(
                JWKSService.GOOGLE_JWKS_URL, timeout=JWKSService.TIMEOUT
            )
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Failed to fetch Google JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google authentication service unavailable",
            )

    def get_cognito_jwks(self) -> dict:
        """Get Cognito JWKS (cached)."""
        return self._fetch_cognito_jwks(self.settings.cognito_jwks_url)

    def get_apple_jwks(self) -> dict:
        """Get Apple JWKS (cached)."""
        return self._fetch_apple_jwks()

    def get_google_jwks(self) -> dict:
        """Get Google JWKS (cached)."""
        return self._fetch_google_jwks()

    def clear_cognito_cache(self) -> None:
        """Clear Cognito JWKS cache (for key rotation)."""
        self._fetch_cognito_jwks.cache_clear()

    def clear_apple_cache(self) -> None:
        """Clear Apple JWKS cache (for key rotation)."""
        self._fetch_apple_jwks.cache_clear()

    def clear_google_cache(self) -> None:
        """Clear Google JWKS cache (for key rotation)."""
        self._fetch_google_jwks.cache_clear()


@lru_cache()
def get_jwks_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> JWKSService:
    """Dependency for JWKS service (singleton)."""
    return JWKSService(settings)
