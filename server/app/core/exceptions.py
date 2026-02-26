"""
Exception handling for the application.

Provides consistent error response formatting and logging.
"""

import logging

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.middleware import request_id_var

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base exception for application-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class AuthenticationError(AppException):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(AppException):
    """Authorization failed."""

    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(AppException):
    """Resource not found."""

    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", status_code=status.HTTP_404_NOT_FOUND)


class ValidationError(AppException):
    """Validation failed."""

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(
            message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class ExternalServiceError(AppException):
    """External service unavailable."""

    def __init__(self, service: str = "External service"):
        super().__init__(
            f"{service} unavailable",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def _build_error_response(
    status_code: int,
    message: str,
    request_id: str,
    details: list | dict | None = None,
) -> dict:
    """Build consistent error response structure."""
    error = {
        "code": status_code,
        "message": message,
        "request_id": request_id,
    }
    if details:
        error["details"] = details
    return {"error": error}


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions with consistent format."""
    request_id = request_id_var.get()

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_response(exc.status_code, exc.detail, request_id),
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application-specific exceptions."""
    request_id = request_id_var.get()

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_response(
            exc.status_code, exc.message, request_id, exc.details
        ),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle validation errors with details."""
    request_id = request_id_var.get()

    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        "Validation error",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "errors": errors,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_build_error_response(422, "Validation failed", request_id, errors),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    request_id = request_id_var.get()

    logger.error(
        "Unhandled exception",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "error": str(exc),
        },
        exc_info=True,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_build_error_response(500, "Internal server error", request_id),
    )
