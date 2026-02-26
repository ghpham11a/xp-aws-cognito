"""
Logging configuration for the application.

Provides JSON logging for production and human-readable logging for development.
"""

import json
import logging
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Format log records as JSON for production."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "path"):
            log_data["path"] = record.path
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "client_ip"):
            log_data["client_ip"] = record.client_ip
        if hasattr(record, "error"):
            log_data["error"] = record.error

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


class DevelopmentFormatter(logging.Formatter):
    """Human-readable format for development."""

    def format(self, record: logging.LogRecord) -> str:
        # Base format
        base = f"{record.levelname:<8} {record.getMessage()}"

        # Add request context if available
        extras = []
        if hasattr(record, "request_id"):
            extras.append(f"req={record.request_id[:8]}")
        if hasattr(record, "method"):
            extras.append(f"{record.method}")
        if hasattr(record, "path"):
            extras.append(f"{record.path}")
        if hasattr(record, "status_code"):
            extras.append(f"status={record.status_code}")
        if hasattr(record, "duration_ms"):
            extras.append(f"{record.duration_ms}ms")

        if extras:
            base = f"{base} [{' '.join(extras)}]"

        return base


def setup_logging(is_production: bool = False, log_level: str = "INFO") -> None:
    """Configure application logging."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)

    # Use appropriate formatter
    if is_production:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(DevelopmentFormatter())

    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
