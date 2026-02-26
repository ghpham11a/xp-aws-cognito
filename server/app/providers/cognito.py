"""
AWS Cognito provider for user management and authentication.
"""

import logging
import secrets
import string
from typing import Annotated

import boto3
from botocore.exceptions import ClientError
from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.schemas.auth import AuthTokenResponse

logger = logging.getLogger(__name__)


class CognitoProvider:
    """
    AWS Cognito Identity Provider wrapper.

    Handles user creation, lookup, and token generation.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None

    @property
    def client(self):
        """Lazy initialization of Cognito client."""
        if self._client is None:
            self._client = boto3.client(
                "cognito-idp",
                region_name=self.settings.aws_region,
            )
        return self._client

    @staticmethod
    def _generate_password() -> str:
        """
        Generate a random password meeting Cognito policy requirements.

        Must have uppercase, lowercase, numbers, and symbols.
        """
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = "".join(secrets.choice(alphabet) for _ in range(32))
        # Ensure at least one of each required character type
        return "Aa1!" + password[4:]

    def get_user(self, username: str) -> dict | None:
        """
        Get user by username.

        Returns user attributes or None if not found.
        """
        try:
            response = self.client.admin_get_user(
                UserPoolId=self.settings.cognito_user_pool_id,
                Username=username,
            )
            return response
        except ClientError as e:
            if e.response["Error"]["Code"] == "UserNotFoundException":
                return None
            logger.error(f"Error looking up user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to lookup user",
            )

    def create_user(
        self,
        email: str,
        name: str | None = None,
    ) -> str:
        """
        Create a new Cognito user.

        Returns the username (email).
        """
        username = email
        user_attributes = [
            {"Name": "email", "Value": email},
            {"Name": "email_verified", "Value": "true"},
        ]

        if name:
            user_attributes.append({"Name": "name", "Value": name})

        try:
            self.client.admin_create_user(
                UserPoolId=self.settings.cognito_user_pool_id,
                Username=username,
                UserAttributes=user_attributes,
                MessageAction="SUPPRESS",  # Don't send welcome email
            )

            # Set a random password and confirm the user
            temp_password = self._generate_password()
            self.client.admin_set_user_password(
                UserPoolId=self.settings.cognito_user_pool_id,
                Username=username,
                Password=temp_password,
                Permanent=True,
            )

            logger.info(f"Created new user: {username}")
            return username

        except ClientError as e:
            logger.error(f"Failed to create user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account",
            )

    def get_or_create_user(
        self,
        email: str,
        name: str | None = None,
    ) -> str:
        """
        Get existing user or create new one.

        Returns the Cognito username (email).
        """
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required for sign-in",
            )

        existing_user = self.get_user(email)
        if existing_user:
            logger.info(f"Found existing user: {email}")
            return email

        return self.create_user(email, name)

    def initiate_auth(self, username: str) -> AuthTokenResponse:
        """
        Initiate authentication for a user.

        Uses ADMIN_USER_PASSWORD_AUTH flow with a fresh password.
        Returns Cognito tokens.
        """
        try:
            # Generate and set a new password for auth
            temp_password = self._generate_password()

            self.client.admin_set_user_password(
                UserPoolId=self.settings.cognito_user_pool_id,
                Username=username,
                Password=temp_password,
                Permanent=True,
            )

            response = self.client.admin_initiate_auth(
                UserPoolId=self.settings.cognito_user_pool_id,
                ClientId=self.settings.cognito_client_id,
                AuthFlow="ADMIN_USER_PASSWORD_AUTH",
                AuthParameters={
                    "USERNAME": username,
                    "PASSWORD": temp_password,
                },
            )

            auth_result = response.get("AuthenticationResult", {})

            return AuthTokenResponse(
                id_token=auth_result.get("IdToken", ""),
                access_token=auth_result.get("AccessToken", ""),
                refresh_token=auth_result.get("RefreshToken"),
                expires_in=auth_result.get("ExpiresIn", 3600),
            )

        except ClientError as e:
            logger.error(f"Failed to authenticate user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to authenticate user",
            )


def get_cognito_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> CognitoProvider:
    """Dependency for Cognito provider."""
    return CognitoProvider(settings)
