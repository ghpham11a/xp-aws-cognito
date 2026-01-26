import os
import json
import httpx
from pathlib import Path
from datetime import datetime
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, jwk, JWTError

router = APIRouter()

security = HTTPBearer()

# Path to store users JSON file
USERS_FILE = Path(__file__).parent.parent / "data" / "users.json"


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str | None
    created_at: str


@lru_cache()
def get_cognito_jwks():
    """Fetch and cache Cognito JWKS (JSON Web Key Set) for token verification."""
    region = os.getenv("AWS_REGION", "us-east-1")
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    jwks_url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"

    response = httpx.get(jwks_url)
    response.raise_for_status()
    return response.json()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token from Cognito and return claims."""
    token = credentials.credentials

    region = os.getenv("AWS_REGION", "us-east-1")
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    client_id = os.getenv("COGNITO_CLIENT_ID")

    if not user_pool_id or not client_id:
        raise HTTPException(status_code=500, detail="Cognito not configured")

    try:
        # Get the key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header["kid"]

        # Find matching key in JWKS
        jwks = get_cognito_jwks()
        key = None
        for k in jwks["keys"]:
            if k["kid"] == kid:
                key = jwk.construct(k)
                break

        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        # Verify and decode token
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
        claims = jwt.decode(
            token,
            key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            audience=client_id,
            issuer=issuer,
        )

        return claims

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def load_users() -> list[dict]:
    if not USERS_FILE.exists():
        return []
    with open(USERS_FILE, "r") as f:
        return json.load(f)


def save_users(users: list[dict]) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


def get_or_create_user(claims: dict) -> dict:
    """Get existing user or create from JWT claims (just-in-time provisioning)."""
    user_id = claims["sub"]
    users = load_users()

    # Check if user already exists
    for user in users:
        if user["user_id"] == user_id:
            return user

    # User doesn't exist locally - create from JWT claims
    user_data = {
        "user_id": user_id,
        "email": claims.get("email", ""),
        "name": claims.get("name"),
        "created_at": datetime.utcnow().isoformat(),
    }

    users.append(user_data)
    save_users(users)

    return user_data


@router.get("/me", response_model=UserResponse)
async def get_current_user(claims: dict = Depends(verify_token)):
    """
    Get current user profile. Creates local user record on first call.

    This implements just-in-time provisioning: when a user authenticates
    via Cognito and calls this endpoint, we verify their JWT and create
    a local record if it doesn't exist.
    """
    user = get_or_create_user(claims)
    return user


@router.get("", response_model=list[UserResponse])
async def list_users(claims: dict = Depends(verify_token)):
    """List all users (protected endpoint)."""
    users = load_users()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, claims: dict = Depends(verify_token)):
    """Get specific user by ID (protected endpoint)."""
    users = load_users()
    for user in users:
        if user["user_id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")


# =============================================================================
# NOTE: Alternative approach using AWS Cognito Lambda Triggers
# =============================================================================
# Instead of just-in-time provisioning, you can use Cognito's "Post Confirmation"
# Lambda trigger. This Lambda fires automatically when a user confirms their
# account (after email verification).
#
# Benefits:
# - User record created immediately upon signup confirmation
# - No need for JWT validation logic in your app
# - Can capture additional signup data
#
# Setup:
# 1. Create a Lambda function that writes to your database/JSON
# 2. In Cognito Console → User Pool → Triggers → Post Confirmation
# 3. Select your Lambda function
#
# The Lambda receives an event with user attributes:
# {
#     "userName": "user-sub-id",
#     "request": {
#         "userAttributes": {
#             "sub": "xxx",
#             "email": "user@example.com",
#             "email_verified": "true",
#             ...
#         }
#     }
# }
# =============================================================================
