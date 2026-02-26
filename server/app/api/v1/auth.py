"""
Authentication endpoints.

Handles native social sign-in token exchange flows.
"""

import json
import logging
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Form
from fastapi.responses import HTMLResponse

from app.api.deps import AuthService, get_auth_service
from app.schemas.auth import AppleAuthRequest, AuthTokenResponse, GoogleAuthRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/apple", response_model=AuthTokenResponse)
async def apple_sign_in(
    request: AppleAuthRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthTokenResponse:
    """
    Exchange Apple identity token for Cognito tokens.

    Flow:
    1. Verify Apple identity token using Apple's JWKS
    2. Extract user info (sub, email) from verified claims
    3. Create or get existing Cognito user
    4. Generate Cognito tokens for the user
    5. Return tokens for API authentication
    """
    return await auth_service.exchange_apple_token(request)


@router.post("/google", response_model=AuthTokenResponse)
async def google_sign_in(
    request: GoogleAuthRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthTokenResponse:
    """
    Exchange Google ID token for Cognito tokens.

    Flow:
    1. Verify Google ID token using Google's JWKS
    2. Extract user info (sub, email) from verified claims
    3. Create or get existing Cognito user
    4. Generate Cognito tokens for the user
    5. Return tokens for API authentication
    """
    return await auth_service.exchange_google_token(request)


@router.post("/apple/callback", response_class=HTMLResponse)
async def apple_callback(
    code: str = Form(None),
    id_token: str = Form(None),
    state: str = Form(None),
    user: str = Form(None),
    error: str = Form(None),
) -> HTMLResponse:
    """
    OAuth callback for Apple Sign-In (form_post response mode).

    Apple POSTs the authorization response to this endpoint.
    We then redirect to the mobile app using a custom URL scheme.

    This is the production-standard approach for mobile OAuth:
    1. Mobile app opens Apple auth in browser/Custom Tab
    2. Apple redirects to this backend callback
    3. Backend redirects to app's custom scheme with tokens
    4. App receives tokens and completes sign-in
    """
    logger.info(
        f"Apple callback received - code: {bool(code)}, "
        f"id_token: {bool(id_token)}, error: {error}"
    )

    # Build redirect URL to mobile app
    app_scheme = "awscognito"
    app_path = "apple-callback"

    params = {}
    if error:
        params["error"] = error
    else:
        if id_token:
            params["id_token"] = id_token
        if code:
            params["code"] = code
        if user:
            # Parse user JSON to extract email and name
            try:
                user_data = json.loads(user)
                if "email" in user_data:
                    params["email"] = user_data["email"]
                if "name" in user_data:
                    name_parts = []
                    if user_data["name"].get("firstName"):
                        name_parts.append(user_data["name"]["firstName"])
                    if user_data["name"].get("lastName"):
                        name_parts.append(user_data["name"]["lastName"])
                    if name_parts:
                        params["name"] = " ".join(name_parts)
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.warning(f"Failed to parse Apple user data: {e}")

    redirect_url = f"{app_scheme}://{app_path}?{urlencode(params)}"
    logger.info(f"Redirecting to app: {redirect_url[:100]}...")

    # Return HTML that redirects to the app
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="0;url={redirect_url}">
        <title>Redirecting...</title>
        <script>
            window.location.href = "{redirect_url}";
        </script>
    </head>
    <body>
        <p>Redirecting to app...</p>
        <p>If you are not redirected, <a href="{redirect_url}">click here</a>.</p>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)
