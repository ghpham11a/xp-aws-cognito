"""
Google Sign-In provider for token verification.
"""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt, jwk

from app.core.config import Settings, get_settings
from app.services.jwks_service import JWKSService, get_jwks_service

logger = logging.getLogger(__name__)


class GoogleProvider:
    """
    Google Sign-In token verification provider.

    Verifies Google ID tokens against Google's public JWKS.
    """

    VALID_ISSUERS = ("https://accounts.google.com", "accounts.google.com")

    def __init__(self, settings: Settings, jwks_service: JWKSService):
        self.settings = settings
        self.jwks_service = jwks_service

    def _find_key(self, jwks: dict, kid: str):
        """Find a matching key in a JWKS by key ID."""
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return jwk.construct(key)
        return None

    def verify_token(self, id_token: str) -> dict:
        """
        Verify Google ID token and return claims.

        Google ID tokens are JWTs signed with Google's private key.
        Supports multiple client IDs (iOS, Android, Web).
        """
        client_ids = self.settings.google_client_ids
        if not client_ids:
            logger.error("Google client ID not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google client ID not configured",
            )

        try:
            unverified_header = jwt.get_unverified_header(id_token)
            kid = unverified_header.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google token format",
                )

            # Find matching key in Google's JWKS
            jwks = self.jwks_service.get_google_jwks()
            key = self._find_key(jwks, kid)

            if not key:
                # Clear cache and retry (key rotation case)
                self.jwks_service.clear_google_cache()
                jwks = self.jwks_service.get_google_jwks()
                key = self._find_key(jwks, kid)

            if not key:
                logger.warning(f"Google token key not found: {kid}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google token key",
                )

            # Try each client ID (python-jose doesn't support list of audiences)
            claims = None
            last_error = None

            for client_id in client_ids:
                try:
                    claims = jwt.decode(
                        id_token,
                        key.to_pem().decode("utf-8"),
                        algorithms=["RS256"],
                        audience=client_id,
                        options={
                            "verify_at_hash": False,
                            "verify_iss": False,  # Verify manually (multiple issuers)
                        },
                    )
                    break  # Successfully decoded
                except JWTError as e:
                    last_error = e
                    continue

            if claims is None:
                raise last_error or JWTError("No valid audience found")

            # Manually verify issuer
            issuer = claims.get("iss")
            if issuer not in self.VALID_ISSUERS:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google token issuer",
                )

            return claims

        except JWTError as e:
            logger.warning(f"Google JWT validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google token",
            )


def get_google_provider(
    settings: Annotated[Settings, Depends(get_settings)],
    jwks_service: Annotated[JWKSService, Depends(get_jwks_service)],
) -> GoogleProvider:
    """Dependency for Google provider."""
    return GoogleProvider(settings, jwks_service)
