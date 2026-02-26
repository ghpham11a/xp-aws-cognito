"""
Core module - Cross-cutting concerns for the application.

Contains configuration, security, exceptions, logging, and middleware.
"""

from app.core.config import Settings, get_settings
from app.core.middleware import request_id_var

__all__ = [
    "Settings",
    "get_settings",
    "request_id_var",
]
