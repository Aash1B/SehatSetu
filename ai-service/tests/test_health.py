"""Tests for service health and standardized HTTP errors."""

from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings, get_settings
from app.core.ffmpeg import FFmpegStatus
from app.main import app
from app.services.ocr.providers import detect_tesseract

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
    runtime = detect_tesseract(settings.tesseract_path)
    assert body["data"]["ocr"]["provider"] == ("tesseract" if runtime.installed else "gemini-vision")
    assert body["data"]["ocr"]["languages"] == list(runtime.languages)
    assert isinstance(body["data"]["ocr"]["available"], bool)


def test_render_liveness_get_is_public(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "internal_api_key", SecretStr("test-internal-key"))

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_render_liveness_head_is_public(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "internal_api_key", SecretStr("test-internal-key"))

    response = client.head("/healthz")

    assert response.status_code == 200


def test_versioned_health_requires_internal_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "internal_api_key", SecretStr("test-internal-key"))

    response = client.get(f"{settings.api_v1_prefix}/health")

    assert response.status_code == 401


def test_versioned_health_accepts_internal_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "internal_api_key", SecretStr("test-internal-key"))

    response = client.get(
        f"{settings.api_v1_prefix}/health",
        headers={"X-Internal-API-Key": "test-internal-key"},
    )

    assert response.status_code == 200


def test_versioned_health_rejects_invalid_internal_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "internal_api_key", SecretStr("test-internal-key"))

    response = client.get(
        f"{settings.api_v1_prefix}/health",
        headers={"X-Internal-API-Key": "incorrect-key"},
    )

    assert response.status_code == 401


def test_readiness_is_protected_and_does_not_leak_paths(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "internal_api_key", SecretStr("test-internal-key"))

    assert client.get("/readiness").status_code == 401


def test_openapi_security_only_marks_versioned_routes() -> None:
    schema = app.openapi()

    assert "/healthz" not in schema["paths"]
    assert schema["paths"]["/"]["get"].get("security") is None
    assert schema["paths"][f"{settings.api_v1_prefix}/health"]["get"][
        "security"
    ] == [{"InternalApiKey": []}]


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


def test_deployment_profile_aliases_load_without_changing_primary_names() -> None:
    configured = Settings(
        _env_file=None,
        enable_second_pass_transcription=False,
        long_audio_max_duration_seconds=1800,
        long_audio_chunk_seconds=300,
        long_audio_overlap_seconds=3,
    )

    assert configured.whisper_second_pass_enabled is False
    assert configured.audio_max_duration_seconds == 1800
    assert configured.audio_chunk_duration_seconds == 300
    assert configured.audio_chunk_overlap_seconds == 3
