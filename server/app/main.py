import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv

from config import get_settings
from logging_config import setup_logging
from middleware import RequestIDMiddleware, LoggingMiddleware, SecurityHeadersMiddleware
from exceptions import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from routers import users, messages

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
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Include routers
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(messages.router, prefix="/messages", tags=["messages"])

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


app = create_app()
