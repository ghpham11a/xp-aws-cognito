"""
Apple Sign-In provider for token verification.
"""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt, jwk

from app.core.config import Settings, get_settings
from app.services.jwks_service import JWKSService, get_jwks_service

logger = logging.getLogger(__name__)


class AppleProvider:
    """
    Apple Sign-In token verification provider.

    Verifies Apple identity tokens against Apple's public JWKS.
    """

    ISSUER = "https://appleid.apple.com"

    def __init__(self, settings: Settings, jwks_service: JWKSService):
        self.settings = settings
        self.jwks_service = jwks_service

    def _find_key(self, jwks: dict, kid: str):
        """Find a matching key in a JWKS by key ID."""
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return jwk.construct(key)
        return None

    def verify_token(self, identity_token: str) -> dict:
        """
        Verify Apple identity token and return claims.

        Apple identity tokens are JWTs signed with Apple's private key.
        Supports multiple audience values (iOS bundle ID + Services ID).
        """
        bundle_ids = self.settings.apple_bundle_ids
        if not bundle_ids:
            logger.error("Apple bundle ID not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Apple bundle ID not configured",
            )

        try:
            unverified_header = jwt.get_unverified_header(identity_token)
            kid = unverified_header.get("kid")

            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Apple token format",
                )

            # Find matching key in Apple's JWKS
            jwks = self.jwks_service.get_apple_jwks()
            key = self._find_key(jwks, kid)

            if not key:
                # Clear cache and retry (key rotation case)
                self.jwks_service.clear_apple_cache()
                jwks = self.jwks_service.get_apple_jwks()
                key = self._find_key(jwks, kid)

            if not key:
                logger.warning(f"Apple token key not found: {kid}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Apple token key",
                )

            # Try each bundle ID (python-jose doesn't support list of audiences)
            claims = None
            last_error = None

            for bundle_id in bundle_ids:
                try:
                    claims = jwt.decode(
                        identity_token,
                        key.to_pem().decode("utf-8"),
                        algorithms=["RS256"],
                        issuer=self.ISSUER,
                        audience=bundle_id,
                        options={"verify_at_hash": False},
                    )
                    break  # Successfully decoded
                except JWTError as e:
                    last_error = e
                    continue

            if claims is None:
                raise last_error or JWTError("No valid audience found")

            return claims

        except JWTError as e:
            logger.warning(f"Apple JWT validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Apple token",
            )


def get_apple_provider(
    settings: Annotated[Settings, Depends(get_settings)],
    jwks_service: Annotated[JWKSService, Depends(get_jwks_service)],
) -> AppleProvider:
    """Dependency for Apple provider."""
    return AppleProvider(settings, jwks_service)
