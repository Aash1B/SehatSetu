"""Test-process configuration loaded before application modules."""

import os

# Keep local developer/production secrets in .env from changing API assertions.
os.environ["APP_ENV"] = "testing"
