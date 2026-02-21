"""
Authentication router for native social sign-in flows.

Handles token exchange for native Apple/Google Sign-In:
1. Receives identity token from native SDK
2. Verifies token with provider's public keys
3. Creates/links user in Cognito User Pool
4. Returns Cognito tokens for API authentication
"""

import logging
import httpx
from functools import lru_cache
from typing import Annotated

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from jose import jwt, jwk, JWTError

from config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


class AppleAuthRequest(BaseModel):
    identity_token: str
    authorization_code: str
    email: str | None = None
    full_name: str | None = None


class GoogleAuthRequest(BaseModel):
    id_token: str
    email: str | None = None
    full_name: str | None = None


class AuthTokenResponse(BaseModel):
    id_token: str
    access_token: str
    refresh_token: str | None = None
    expires_in: int


@lru_cache(maxsize=1)
def get_apple_jwks() -> dict:
    """Fetch and cache Apple's JWKS for token verification."""
    try:
        response = httpx.get(
            "https://appleid.apple.com/auth/keys",
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch Apple JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Apple authentication service unavailable",
        )


def verify_apple_token(identity_token: str) -> dict:
    """
    Verify Apple identity token and return claims.

    Apple identity tokens are JWTs signed with Apple's private key.
    We verify using Apple's public JWKS.
    """
    settings = get_settings()

    try:
        # Get the key ID from token header
        unverified_header = jwt.get_unverified_header(identity_token)
        kid = unverified_header.get("kid")

        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Apple token format",
            )

        # Find matching key in Apple's JWKS
        jwks = get_apple_jwks()
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = jwk.construct(k)
                break

        if not key:
            # Clear cache and retry (key rotation case)
            get_apple_jwks.cache_clear()
            jwks = get_apple_jwks()
            for k in jwks.get("keys", []):
                if k.get("kid") == kid:
                    key = jwk.construct(k)
                    break

        if not key:
            logger.warning(f"Apple token key not found: {kid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Apple token key",
            )

        # Verify and decode token
        # Apple tokens have issuer "https://appleid.apple.com"
        # Audience should be your app's bundle ID
        claims = jwt.decode(
            identity_token,
            key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            issuer="https://appleid.apple.com",
            audience=settings.apple_bundle_id,
            options={"verify_at_hash": False},
        )

        return claims

    except JWTError as e:
        logger.warning(f"Apple JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Apple token",
        )


@lru_cache(maxsize=1)
def get_google_jwks() -> dict:
    """Fetch and cache Google's JWKS for token verification."""
    try:
        response = httpx.get(
            "https://www.googleapis.com/oauth2/v3/certs",
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch Google JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication service unavailable",
        )


def verify_google_token(id_token_str: str) -> dict:
    """
    Verify Google ID token and return claims.

    Google ID tokens are JWTs signed with Google's private key.
    We verify using Google's public JWKS.
    Supports multiple client IDs (iOS, Android, Web) via comma-separated config.
    """
    settings = get_settings()

    google_client_ids = settings.google_client_ids
    if not google_client_ids:
        logger.error("Google client ID not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google client ID not configured",
        )

    try:
        # Get the key ID from token header
        unverified_header = jwt.get_unverified_header(id_token_str)
        kid = unverified_header.get("kid")

        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token format",
            )

        # Find matching key in Google's JWKS
        jwks = get_google_jwks()
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = jwk.construct(k)
                break

        if not key:
            # Clear cache and retry (key rotation case)
            get_google_jwks.cache_clear()
            jwks = get_google_jwks()
            for k in jwks.get("keys", []):
                if k.get("kid") == kid:
                    key = jwk.construct(k)
                    break

        if not key:
            logger.warning(f"Google token key not found: {kid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token key",
            )

        # Verify and decode token
        # Google tokens have issuer "https://accounts.google.com" or "accounts.google.com"
        # Audience should be one of your app's client IDs (iOS, Android, or Web)
        # python-jose doesn't support list of audiences, so we try each one
        claims = None
        last_error = None

        for client_id in google_client_ids:
            try:
                claims = jwt.decode(
                    id_token_str,
                    key.to_pem().decode("utf-8"),
                    algorithms=["RS256"],
                    audience=client_id,
                    options={
                        "verify_at_hash": False,
                        "verify_iss": False,  # We'll verify manually due to multiple issuers
                    },
                )
                break  # Successfully decoded with this audience
            except JWTError as e:
                last_error = e
                continue  # Try next client ID

        if claims is None:
            raise last_error or JWTError("No valid audience found")

        # Manually verify issuer (Google uses two different issuer values)
        issuer = claims.get("iss")
        if issuer not in ("https://accounts.google.com", "accounts.google.com"):
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


def get_cognito_client():
    """Get Cognito Identity Provider client."""
    settings = get_settings()
    return boto3.client(
        "cognito-idp",
        region_name=settings.aws_region,
    )


def admin_get_or_create_user(
    cognito_client,
    user_pool_id: str,
    apple_sub: str,
    email: str | None,
    full_name: str | None,
) -> str:
    """
    Get existing user or create new one linked to Apple identity.

    Returns the Cognito username.
    """
    # Username format for Apple users
    username = f"apple_{apple_sub}"

    try:
        # Try to get existing user
        cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=username,
        )
        logger.info(f"Found existing Apple user: {username}")
        return username

    except ClientError as e:
        if e.response["Error"]["Code"] != "UserNotFoundException":
            logger.error(f"Error looking up user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to lookup user",
            )

    # User doesn't exist - create new one
    logger.info(f"Creating new Apple user: {username}")

    user_attributes = [
        {"Name": "custom:apple_sub", "Value": apple_sub},
    ]

    if email:
        user_attributes.extend([
            {"Name": "email", "Value": email},
            {"Name": "email_verified", "Value": "true"},
        ])

    if full_name:
        user_attributes.append({"Name": "name", "Value": full_name})

    try:
        cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=username,
            UserAttributes=user_attributes,
            MessageAction="SUPPRESS",  # Don't send welcome email
        )

        # Set a random password and confirm the user
        # (Apple users authenticate via token, not password)
        # Password must meet Cognito policy: uppercase, lowercase, numbers, symbols
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(32))
        # Ensure at least one of each required character type
        temp_password = "Aa1!" + temp_password[4:]

        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=temp_password,
            Permanent=True,
        )

        return username

    except ClientError as e:
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account",
        )


def admin_get_or_create_google_user(
    cognito_client,
    user_pool_id: str,
    google_sub: str,
    email: str | None,
    full_name: str | None,
) -> str:
    """
    Get existing user or create new one linked to Google identity.

    Returns the Cognito username.
    """
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for Google sign-in",
        )

    # Use email as username (Cognito User Pool configured with email as username)
    username = email

    try:
        # Try to get existing user
        cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=username,
        )
        logger.info(f"Found existing Google user: {username}")
        return username

    except ClientError as e:
        if e.response["Error"]["Code"] != "UserNotFoundException":
            logger.error(f"Error looking up user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to lookup user",
            )

    # User doesn't exist - create new one
    logger.info(f"Creating new Google user: {username}")

    user_attributes = [
        {"Name": "email", "Value": email},
        {"Name": "email_verified", "Value": "true"},
    ]

    if full_name:
        user_attributes.append({"Name": "name", "Value": full_name})

    try:
        cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=username,
            UserAttributes=user_attributes,
            MessageAction="SUPPRESS",  # Don't send welcome email
        )

        # Set a random password and confirm the user
        # (Google users authenticate via token, not password)
        # Password must meet Cognito policy: uppercase, lowercase, numbers, symbols
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(32))
        # Ensure at least one of each required character type
        temp_password = "Aa1!" + temp_password[4:]

        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=temp_password,
            Permanent=True,
        )

        return username

    except ClientError as e:
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account",
        )


def admin_initiate_auth(
    cognito_client,
    user_pool_id: str,
    client_id: str,
    username: str,
) -> AuthTokenResponse:
    """
    Initiate auth for the user using ADMIN_NO_SRP_AUTH.

    This requires the Cognito app client to allow ADMIN_NO_SRP_AUTH flow
    and the backend to have admin permissions.
    """
    try:
        # For social sign-in users, we use custom auth or admin auth
        # Since password is random, we use ADMIN_USER_PASSWORD_AUTH
        # with a custom Lambda trigger, OR we can generate tokens directly

        # Alternative: Use admin_initiate_auth with CUSTOM_AUTH
        # For simplicity, we'll generate tokens using a workaround:
        # Create a pre-authenticated session

        # The cleanest approach is to use CUSTOM_AUTH with a Lambda
        # that validates the Apple sub claim. For now, we'll use
        # the token directly approach:

        # Actually, the most production-ready approach without Lambda:
        # Return the Apple identity token as-is since it's already verified,
        # OR use Cognito Identity Pool federation

        # For this implementation, we'll use AdminInitiateAuth with
        # ALLOW_ADMIN_USER_PASSWORD_AUTH enabled on the client

        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(32))
        # Ensure at least one of each required character type
        temp_password = "Aa1!" + temp_password[4:]

        # Reset password to a known value for this auth attempt
        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=temp_password,
            Permanent=True,
        )

        response = cognito_client.admin_initiate_auth(
            UserPoolId=user_pool_id,
            ClientId=client_id,
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


@router.post("/apple", response_model=AuthTokenResponse)
async def apple_sign_in(request: AppleAuthRequest):
    """
    Exchange Apple identity token for Cognito tokens.

    Flow:
    1. Verify Apple identity token using Apple's JWKS
    2. Extract user info (sub, email) from verified claims
    3. Create or get existing Cognito user linked to Apple sub
    4. Generate Cognito tokens for the user
    5. Return tokens for API authentication
    """
    settings = get_settings()

    # Step 1: Verify Apple token
    claims = verify_apple_token(request.identity_token)

    apple_sub = claims.get("sub")
    if not apple_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apple token missing subject claim",
        )

    # Email from token (may not be present after first sign-in)
    email = request.email or claims.get("email")

    # Step 2: Get or create Cognito user
    cognito_client = get_cognito_client()

    username = admin_get_or_create_user(
        cognito_client=cognito_client,
        user_pool_id=settings.cognito_user_pool_id,
        apple_sub=apple_sub,
        email=email,
        full_name=request.full_name,
    )

    # Step 3: Generate Cognito tokens
    tokens = admin_initiate_auth(
        cognito_client=cognito_client,
        user_pool_id=settings.cognito_user_pool_id,
        client_id=settings.cognito_client_id,
        username=username,
    )

    logger.info(f"Apple sign-in successful for user: {username}")

    return tokens


@router.post("/google", response_model=AuthTokenResponse)
async def google_sign_in(request: GoogleAuthRequest):
    """
    Exchange Google ID token for Cognito tokens.

    Flow:
    1. Verify Google ID token using Google's JWKS
    2. Extract user info (sub, email) from verified claims
    3. Create or get existing Cognito user linked to Google sub
    4. Generate Cognito tokens for the user
    5. Return tokens for API authentication
    """
    settings = get_settings()

    # Step 1: Verify Google token
    claims = verify_google_token(request.id_token)

    google_sub = claims.get("sub")
    if not google_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing subject claim",
        )

    # Email from token or request
    email = request.email or claims.get("email")

    # Full name from request or token
    full_name = request.full_name or claims.get("name")

    # Step 2: Get or create Cognito user
    cognito_client = get_cognito_client()

    username = admin_get_or_create_google_user(
        cognito_client=cognito_client,
        user_pool_id=settings.cognito_user_pool_id,
        google_sub=google_sub,
        email=email,
        full_name=full_name,
    )

    # Step 3: Generate Cognito tokens
    tokens = admin_initiate_auth(
        cognito_client=cognito_client,
        user_pool_id=settings.cognito_user_pool_id,
        client_id=settings.cognito_client_id,
        username=username,
    )

    logger.info(f"Google sign-in successful for user: {username}")

    return tokens
