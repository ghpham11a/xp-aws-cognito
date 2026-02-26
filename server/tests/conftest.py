"""
Pytest configuration and fixtures.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def app():
    """Create a test application instance."""
    return create_app()


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_settings(monkeypatch):
    """Mock settings for testing."""
    monkeypatch.setenv("COGNITO_USER_POOL_ID", "test-pool-id")
    monkeypatch.setenv("COGNITO_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("ENVIRONMENT", "test")
