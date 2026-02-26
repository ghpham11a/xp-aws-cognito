"""
External service providers.

Wraps interactions with external services like Cognito, Apple, and Google.
"""

from app.providers.apple import AppleProvider
from app.providers.cognito import CognitoProvider
from app.providers.google import GoogleProvider

__all__ = [
    "AppleProvider",
    "CognitoProvider",
    "GoogleProvider",
]
