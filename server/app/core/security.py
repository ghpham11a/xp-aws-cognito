"""
Security utilities for JWT verification.

Handles token verification against Cognito and Google JWKS.
"""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt, jwk

from app.core.config import Settings, get_settings
from app.services.jwks_service import JWKSService, get_jwks_service

logger = logging.getLogger(__name__)

# HTTP Bearer scheme for token extraction
bearer_scheme = HTTPBearer()


class JWTVerifier:
    """
    JWT verification service.

    Verifies tokens from multiple issuers (Cognito, Google) using their respective JWKS.
    """

    def __init__(self, settings: Settings, jwks_service: JWKSService):
        self.settings = settings
        self.jwks_service = jwks_service

    def _find_key(self, jwks: dict, kid: str):
        """Find a matching key in a JWKS by key ID."""
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return jwk.construct(key)
        return None

    def _verify_cognito_token(self, token: str, kid: str) -> dict:
        """Verify a Cognito JWT token."""
        jwks = self.jwks_service.get_cognito_jwks()
        key = self._find_key(jwks, kid)

        if not key:
            # Clear cache and retry (key rotation case)
            self.jwks_service.clear_cognito_cache()
            jwks = self.jwks_service.get_cognito_jwks()
            key = self._find_key(jwks, kid)

        if not key:
            logger.warning(f"Cognito token key not found: {kid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token key",
            )

        return jwt.decode(
            token,
            key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            audience=self.settings.cognito_client_id,
            issuer=self.settings.cognito_issuer,
            options={"verify_at_hash": False},
        )

    def _verify_google_token(self, token: str, kid: str) -> dict:
        """Verify a Google JWT token."""
        if not self.settings.google_client_id:
            logger.error("Google client ID not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google authentication not configured",
            )

        jwks = self.jwks_service.get_google_jwks()
        key = self._find_key(jwks, kid)

        if not key:
            self.jwks_service.clear_google_cache()
            jwks = self.jwks_service.get_google_jwks()
            key = self._find_key(jwks, kid)

        if not key:
            logger.warning(f"Google token key not found: {kid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token key",
            )

        return jwt.decode(
            token,
            key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            audience=self.settings.google_client_id,
            issuer="https://accounts.google.com",
        )

    def verify(self, token: str) -> dict:
        """
        Verify JWT token from Cognito or Google and return claims.

        Detects the issuer from unverified claims to route to the correct verifier.
        """
        try:
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token format",
                )

            # Peek at the issuer to determine which provider to validate against
            unverified_claims = jwt.get_unverified_claims(token)
            issuer = unverified_claims.get("iss", "")

            if issuer == "https://accounts.google.com":
                return self._verify_google_token(token, kid)

            # Default to Cognito validation
            if not self.settings.cognito_user_pool_id or not self.settings.cognito_client_id:
                logger.error("Cognito not configured")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication not configured",
                )

            return self._verify_cognito_token(token, kid)

        except JWTError as e:
            logger.warning(f"JWT validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )


def get_jwt_verifier(
    settings: Annotated[Settings, Depends(get_settings)],
    jwks_service: Annotated[JWKSService, Depends(get_jwks_service)],
) -> JWTVerifier:
    """Dependency for JWT verifier."""
    return JWTVerifier(settings, jwks_service)


def verify_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    jwt_verifier: Annotated[JWTVerifier, Depends(get_jwt_verifier)],
) -> dict:
    """
    FastAPI dependency for token verification.

    Extracts Bearer token from Authorization header and verifies it.
    Returns the verified claims dictionary.
    """
    return jwt_verifier.verify(credentials.credentials)


# Type alias for dependency injection
TokenClaims = Annotated[dict, Depends(verify_token)]
