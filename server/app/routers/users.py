import json
import logging
import aiofiles
import aiofiles.os
import httpx
from pathlib import Path
from datetime import datetime, timezone
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, jwk, JWTError

from config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

security = HTTPBearer()

# Path to store users JSON file
USERS_FILE = Path(__file__).parent.parent / "data" / "users.json"


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str | None
    created_at: str


class UserCreate(BaseModel):
    email: str
    name: str | None = None


@lru_cache(maxsize=1)
def get_cognito_jwks() -> dict:
    """Fetch and cache Cognito JWKS (JSON Web Key Set) for token verification."""
    settings = get_settings()
    jwks_url = (
        f"https://cognito-idp.{settings.aws_region}.amazonaws.com/"
        f"{settings.cognito_user_pool_id}/.well-known/jwks.json"
    )

    try:
        response = httpx.get(jwks_url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


@lru_cache(maxsize=1)
def get_google_jwks() -> dict:
    """Fetch and cache Google JWKS for token verification."""
    try:
        response = httpx.get(
            "https://www.googleapis.com/oauth2/v3/certs", timeout=10.0
        )
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch Google JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


def _find_key_in_jwks(jwks: dict, kid: str):
    """Find a matching key in a JWKS by key ID."""
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            return jwk.construct(k)
    return None


def _verify_cognito_token(token: str, kid: str) -> dict:
    """Verify a Cognito JWT token."""
    settings = get_settings()

    key = _find_key_in_jwks(get_cognito_jwks(), kid)
    if not key:
        # Clear cache and retry once (key rotation case)
        get_cognito_jwks.cache_clear()
        key = _find_key_in_jwks(get_cognito_jwks(), kid)

    if not key:
        logger.warning(f"Cognito token key not found: {kid}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token key",
        )

    issuer = (
        f"https://cognito-idp.{settings.aws_region}.amazonaws.com/"
        f"{settings.cognito_user_pool_id}"
    )
    return jwt.decode(
        token,
        key.to_pem().decode("utf-8"),
        algorithms=["RS256"],
        audience=settings.cognito_client_id,
        issuer=issuer,
        options={"verify_at_hash": False},
    )


def _verify_google_token(token: str, kid: str) -> dict:
    """Verify a Google JWT token."""
    settings = get_settings()

    if not settings.google_client_id:
        logger.error("Google client ID not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication not configured",
        )

    key = _find_key_in_jwks(get_google_jwks(), kid)
    if not key:
        get_google_jwks.cache_clear()
        key = _find_key_in_jwks(get_google_jwks(), kid)

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
        audience=settings.google_client_id,
        issuer="https://accounts.google.com",
    )


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify JWT token from Cognito or Google and return claims."""
    settings = get_settings()
    token = credentials.credentials

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
            return _verify_google_token(token, kid)

        # Default to Cognito validation
        if not settings.cognito_user_pool_id or not settings.cognito_client_id:
            logger.error("Cognito not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication not configured",
            )

        return _verify_cognito_token(token, kid)

    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def load_users() -> list[dict]:
    """Load users from JSON file asynchronously."""
    if not await aiofiles.os.path.exists(USERS_FILE):
        return []

    try:
        async with aiofiles.open(USERS_FILE, "r") as f:
            content = await f.read()
            return json.loads(content) if content else []
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Failed to load users file: {e}")
        return []


async def save_users(users: list[dict]) -> None:
    """Save users to JSON file asynchronously."""
    try:
        # Ensure directory exists
        USERS_FILE.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(USERS_FILE, "w") as f:
            await f.write(json.dumps(users, indent=2))
    except IOError as e:
        logger.error(f"Failed to save users file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save user data",
        )


async def get_or_create_user(claims: dict) -> dict:
    """Get existing user or create from JWT claims (just-in-time provisioning)."""
    user_id = claims["sub"]
    users = await load_users()

    # Check if user already exists
    for user in users:
        if user["user_id"] == user_id:
            return user

    # User doesn't exist locally - create from JWT claims
    user_data = {
        "user_id": user_id,
        "email": claims.get("email", ""),
        "name": claims.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    users.append(user_data)
    await save_users(users)

    logger.info(f"Created new user: {user_id}")
    return user_data


# Type alias for dependency injection
TokenClaims = Annotated[dict, Depends(verify_token)]


@router.get("/me", response_model=UserResponse)
async def get_current_user(claims: TokenClaims):
    """
    Get current user profile. Creates local user record on first call.

    This implements just-in-time provisioning: when a user authenticates
    via Cognito and calls this endpoint, we verify their JWT and create
    a local record if it doesn't exist.
    """
    user = await get_or_create_user(claims)
    return user


@router.get("", response_model=list[UserResponse])
async def list_users(claims: TokenClaims):
    """List all users (protected endpoint)."""
    users = await load_users()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, claims: TokenClaims):
    """Get specific user by ID (protected endpoint)."""
    users = await load_users()
    for user in users:
        if user["user_id"] == user_id:
            return user

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found",
    )
