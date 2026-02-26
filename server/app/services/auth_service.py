"""
Authentication service for social sign-in flows.
"""

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.providers.apple import AppleProvider, get_apple_provider
from app.providers.cognito import CognitoProvider, get_cognito_provider
from app.providers.google import GoogleProvider, get_google_provider
from app.schemas.auth import AppleAuthRequest, AuthTokenResponse, GoogleAuthRequest

logger = logging.getLogger(__name__)


class AuthService:
    """
    Service for authentication operations.

    Handles token exchange flows for native social sign-in (Apple/Google).
    """

    def __init__(
        self,
        cognito: CognitoProvider,
        apple: AppleProvider,
        google: GoogleProvider,
    ):
        self.cognito = cognito
        self.apple = apple
        self.google = google

    async def exchange_apple_token(
        self, request: AppleAuthRequest
    ) -> AuthTokenResponse:
        """
        Exchange Apple identity token for Cognito tokens.

        Flow:
        1. Verify Apple identity token using Apple's JWKS
        2. Extract user info (sub, email) from verified claims
        3. Create or get existing Cognito user
        4. Generate Cognito tokens for the user
        """
        # Verify Apple token
        claims = self.apple.verify_token(request.identity_token)

        apple_sub = claims.get("sub")
        if not apple_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apple token missing subject claim",
            )

        # Email from request or token (may not be present after first sign-in)
        email = request.email or claims.get("email")

        # Get or create Cognito user
        username = self.cognito.get_or_create_user(
            email=email,
            name=request.full_name,
        )

        # Generate Cognito tokens
        tokens = self.cognito.initiate_auth(username)

        logger.info(f"Apple sign-in successful for user: {username}")
        return tokens

    async def exchange_google_token(
        self, request: GoogleAuthRequest
    ) -> AuthTokenResponse:
        """
        Exchange Google ID token for Cognito tokens.

        Flow:
        1. Verify Google ID token using Google's JWKS
        2. Extract user info (sub, email) from verified claims
        3. Create or get existing Cognito user
        4. Generate Cognito tokens for the user
        """
        # Verify Google token
        claims = self.google.verify_token(request.id_token)

        google_sub = claims.get("sub")
        if not google_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token missing subject claim",
            )

        # Email from request or token
        email = request.email or claims.get("email")
        full_name = request.full_name or claims.get("name")

        # Get or create Cognito user
        username = self.cognito.get_or_create_user(
            email=email,
            name=full_name,
        )

        # Generate Cognito tokens
        tokens = self.cognito.initiate_auth(username)

        logger.info(f"Google sign-in successful for user: {username}")
        return tokens


def get_auth_service(
    cognito: Annotated[CognitoProvider, Depends(get_cognito_provider)],
    apple: Annotated[AppleProvider, Depends(get_apple_provider)],
    google: Annotated[GoogleProvider, Depends(get_google_provider)],
) -> AuthService:
    """Dependency for auth service."""
    return AuthService(cognito, apple, google)
