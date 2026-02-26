"""
FastAPI application entry point.

Uses app factory pattern for flexible configuration.
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import setup_logging
from app.core.middleware import (
    LoggingMiddleware,
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
)

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    settings = get_settings()

    # Startup
    setup_logging(is_production=settings.is_production)
    logger.info(
        f"Starting {settings.api_title} v{settings.api_version} "
        f"(environment={settings.environment})"
    )

    # Validate configuration
    try:
        settings.validate_required()
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down application")


def create_app() -> FastAPI:
    """
    Application factory.

    Creates and configures the FastAPI application with all middleware,
    exception handlers, and routers.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    # Add middleware (order matters - first added = outermost)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    # Exception handlers
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Include API router
    app.include_router(api_router)

    # Health check endpoints
    @app.get("/", tags=["health"])
    def root():
        """Root endpoint - basic status check."""
        return {"status": "ok"}

    @app.get("/health", tags=["health"])
    def health_check():
        """Health check endpoint for load balancers and monitoring."""
        return {
            "status": "healthy",
            "version": settings.api_version,
            "environment": settings.environment,
        }

    return app


# Create application instance
# Run with: uvicorn app.main:app --host 0.0.0.0 --port 6969 --reload
app = create_app()
