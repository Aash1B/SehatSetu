"""Tests for service health and standardized HTTP errors."""

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.ffmpeg import FFmpegStatus
from app.main import app

client = TestClient(app)
settings = get_settings()


def test_health_check_returns_service_health(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.v1.endpoints.health.get_ffmpeg_status",
        lambda _: FFmpegStatus(
            available=True,
            configured_path="ffmpeg",
            path=r"C:\tools\ffmpeg.exe",
            version="7.1",
            path_detection="SUCCESS",
        ),
    )
    response = client.get(f"{settings.api_v1_prefix}/health")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "AI service is healthy"
    assert body["data"]["status"] == "healthy"
    assert body["data"]["service"] == settings.app_name
    assert body["data"]["ffmpeg"] == {
        "available": True,
        "path": r"C:\tools\ffmpeg.exe",
        "version": "7.1",
        "reason": None,
        "searched_locations": [],
    }
    assert body["data"]["ocr"]["provider"] == "gemini-vision"
    assert isinstance(body["data"]["ocr"]["available"], bool)


def test_unknown_route_returns_standard_error() -> None:
    response = client.get("/route-that-does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert {
        key: value for key, value in body.items() if key != "meta"
    } == {
        "success": False,
        "message": "Not Found",
        "error": {"code": "NOT_FOUND", "details": {}},
    }
    assert body["meta"]["request_id"]
    assert body["meta"]["processing_time_ms"] >= 0


def test_request_id_is_propagated_to_success_and_error() -> None:
    request_id = "audit-request-123"
    success = client.get(
        f"{settings.api_v1_prefix}/health",
        headers={"X-Request-ID": request_id},
    )
    error = client.get(
        "/route-that-does-not-exist",
        headers={"X-Request-ID": request_id},
    )
    assert success.headers["X-Request-ID"] == request_id
    assert success.json()["meta"]["request_id"] == request_id
    assert error.json()["meta"]["request_id"] == request_id


def test_documentation_and_openapi_are_available() -> None:
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
