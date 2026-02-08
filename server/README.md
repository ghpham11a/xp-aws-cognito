# FastAPI + AWS Cognito Integration

This server demonstrates JWT-based authentication with AWS Cognito, supporting both public and protected endpoints.

## Configuration

### Environment Variables

Create a `.env` file:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:** The Cognito App Client must be a "Public client" without a client secret.

### Dependencies

```
pip install python-jose[cryptography] httpx fastapi
```

## How JWT Validation Works

1. Client authenticates with Cognito (via Amplify, hosted UI, etc.)
2. Client sends ID token in `Authorization: Bearer <token>` header
3. Server fetches Cognito's public keys (JWKS) from:
   ```
   https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json
   ```
4. Server validates: signature, expiration, issuer, and audience

## Core Authentication Code

### Token Verification Dependency

```python
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, JWTError
import httpx

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_cognito_jwks() -> dict:
    """Fetch and cache Cognito JWKS."""
    jwks_url = (
        f"https://cognito-idp.{AWS_REGION}.amazonaws.com/"
        f"{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    )
    response = httpx.get(jwks_url, timeout=10.0)
    response.raise_for_status()
    return response.json()


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify JWT token and return claims."""
    token = credentials.credentials

    try:
        # Get key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find matching key in JWKS
        jwks = get_cognito_jwks()
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = jwk.construct(k)
                break

        if not key:
            # Clear cache and retry (handles key rotation)
            get_cognito_jwks.cache_clear()
            jwks = get_cognito_jwks()
            for k in jwks.get("keys", []):
                if k.get("kid") == kid:
                    key = jwk.construct(k)
                    break

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token key",
            )

        # Verify and decode token
        issuer = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
        claims = jwt.decode(
            token,
            key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            audience=COGNITO_CLIENT_ID,
            issuer=issuer,
            options={
                # Disable at_hash verification for federated providers (Google/Apple)
                "verify_at_hash": False,
            },
        )
        return claims

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
```

## Creating Endpoints

### Type Alias for Clean Syntax

```python
from typing import Annotated

TokenClaims = Annotated[dict, Depends(verify_token)]
```

### Public Endpoint (No Auth)

```python
@router.get("/public")
async def get_public_data():
    """Anyone can access this."""
    return {"message": "Hello, world!"}
```

### Protected Endpoint (Auth Required)

```python
@router.get("/private")
async def get_private_data(claims: TokenClaims):
    """Only authenticated users can access this."""
    user_id = claims["sub"]
    email = claims.get("email", "unknown")
    return {"message": f"Hello, {email}!", "user_id": user_id}
```

### Optional Auth (Public with Extra Data for Logged-in Users)

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

optional_security = HTTPBearer(auto_error=False)

def verify_token_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
) -> dict | None:
    """Returns claims if valid token provided, None otherwise."""
    if credentials is None:
        return None
    try:
        return verify_token(credentials)
    except HTTPException:
        return None

OptionalClaims = Annotated[dict | None, Depends(verify_token_optional)]

@router.get("/feed")
async def get_feed(claims: OptionalClaims):
    """Public feed, but logged-in users see personalized content."""
    if claims:
        return {"feed": "personalized", "user": claims.get("email")}
    return {"feed": "generic"}
```

## Available JWT Claims

Standard Cognito claims in the ID token:

| Claim | Description |
|-------|-------------|
| `sub` | Unique user ID (UUID) |
| `email` | User's email address |
| `email_verified` | Boolean |
| `cognito:username` | Username in Cognito |
| `cognito:groups` | List of groups user belongs to |
| `iss` | Issuer URL |
| `aud` | Client ID (audience) |
| `exp` | Expiration timestamp |
| `iat` | Issued-at timestamp |

For federated users (Google/Apple):
| Claim | Description |
|-------|-------------|
| `identities` | Array of linked identity providers |
| `at_hash` | Access token hash (ignored in validation) |

## Role-Based Access Control

Use Cognito groups for authorization:

```python
def require_admin(claims: TokenClaims):
    """Dependency that requires admin group membership."""
    groups = claims.get("cognito:groups", [])
    if "admin" not in groups:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return claims

AdminClaims = Annotated[dict, Depends(require_admin)]

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, claims: AdminClaims):
    """Only admins can delete users."""
    # ... delete logic
```

## Running the Server

```bash
cd server/app
uvicorn main:app --port 6969 --reload
```

## Testing with curl

```bash
# Public endpoint
curl http://localhost:6969/messages/public

# Protected endpoint (get token from your frontend)
TOKEN="eyJraWQiOi..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:6969/messages/private
```
