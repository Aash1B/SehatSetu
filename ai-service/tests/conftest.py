"""Test-process configuration loaded before application modules."""

import os
import pytest
from fastapi.testclient import TestClient

# Keep local developer/production secrets in .env from changing API assertions.
os.environ["APP_ENV"] = "testing"


@pytest.fixture
def client():
    """Shared API client for integration tests without dependency overrides."""
    from app.main import app
    with TestClient(app) as test_client:
        yield test_client
