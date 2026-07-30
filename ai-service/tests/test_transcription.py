"""Tests for secure uploaded-audio transcription without loading Whisper."""

import time
from pathlib import Path

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.api.v1.endpoints import transcription as transcription_endpoint
from app.core.exceptions import AppException
from app.main import app
from app.schemas.transcription import TranscriptionData, TranscriptionSegment
from app.services.transcription_service import get_transcription_service

API_URL = "/api/v1/transcribe"


class SuccessfulService:
    """Record temporary paths and return a fixed successful result."""

    def __init__(self) -> None:
        self.paths: list[Path] = []

    def transcribe(
        self, audio_path: Path, language_hint: str
    ) -> TranscriptionData:
        assert audio_path.exists()
        self.paths.append(audio_path)
        return TranscriptionData(
            transcript="The patient reports fever.",
            detected_language="en" if language_hint == "auto" else language_hint,
            language_probability=0.98,
            duration_seconds=4.2,
            segments=[
                TranscriptionSegment(
                    start=0.0,
                    end=4.2,
                    text="The patient reports fever.",
                )
            ],
            model="tiny",
        )


class FailingService:
    """Raise a safe application failure after recording the temp path."""

    def __init__(self, exception: AppException) -> None:
        self.exception = exception
        self.paths: list[Path] = []

    def transcribe(self, audio_path: Path, _: str) -> TranscriptionData:
        assert audio_path.exists()
        self.paths.append(audio_path)
        raise self.exception


class SlowService:
    """Run longer than the configured test timeout."""

    def transcribe(self, _: Path, __: str) -> TranscriptionData:
        time.sleep(0.05)
        raise AssertionError("Timed-out result must not be used")


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Use an isolated temporary upload directory for every test."""
    monkeypatch.setattr(
        transcription_endpoint.settings, "temp_audio_dir", tmp_path / "audio"
    )
    monkeypatch.setattr(
        transcription_endpoint.settings, "max_audio_size_mb", 20
    )
    monkeypatch.setattr(
        transcription_endpoint.settings, "transcription_timeout_seconds", 120
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def upload(
    client: TestClient,
    *,
    filename: str = "consultation.wav",
    content: bytes = b"mock-wave-audio",
    content_type: str = "audio/wav",
    language_hint: str = "auto",
):
    """Submit a multipart transcription request."""
    return client.post(
        API_URL,
        files={"file": (filename, content, content_type)},
        data={"language_hint": language_hint},
    )


def assert_standard_error(response, expected_status: int, code: str) -> None:
    assert response.status_code == expected_status
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == code


def test_valid_upload_returns_real_contract_and_removes_temp_file(
    client: TestClient,
) -> None:
    service = SuccessfulService()
    app.dependency_overrides[get_transcription_service] = lambda: service

    response = upload(client)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["is_dummy"] is False
    assert data["transcript"] == "The patient reports fever."
    assert data["detected_language"] == "en"
    assert len(data["segments"]) == 1
    assert service.paths and not service.paths[0].exists()


@pytest.mark.parametrize(
    ("filename", "content_type", "expected_code"),
    [
        ("consultation.txt", "audio/wav", "UNSUPPORTED_FILE_EXTENSION"),
        ("consultation.wav", "text/plain", "UNSUPPORTED_MIME_TYPE"),
        ("../consultation.wav", "audio/wav", "UNSAFE_FILENAME"),
        ("folder\\consultation.wav", "audio/wav", "UNSAFE_FILENAME"),
    ],
)
def test_invalid_file_metadata_is_rejected(
    client: TestClient,
    filename: str,
    content_type: str,
    expected_code: str,
) -> None:
    response = upload(
        client,
        filename=filename,
        content_type=content_type,
    )
    expected_status = 400 if expected_code == "UNSAFE_FILENAME" else 415
    assert_standard_error(response, expected_status, expected_code)


def test_empty_file_is_rejected_and_removed(client: TestClient) -> None:
    response = upload(client, content=b"")

    assert_standard_error(response, 422, "EMPTY_AUDIO_FILE")
    temp_directory = transcription_endpoint.settings.temp_audio_dir
    assert not list(temp_directory.glob("*"))


def test_oversized_file_is_rejected_and_removed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        transcription_endpoint.settings, "max_audio_size_mb", 0.000001
    )

    response = upload(client, content=b"too-large")

    assert_standard_error(response, 413, "AUDIO_FILE_TOO_LARGE")
    temp_directory = transcription_endpoint.settings.temp_audio_dir
    assert not list(temp_directory.glob("*"))


def test_invalid_language_hint_uses_standard_validation_error(
    client: TestClient,
) -> None:
    response = upload(client, language_hint="fr")

    assert_standard_error(response, 422, "UNSUPPORTED_LANGUAGE")


def test_missing_file_uses_standard_validation_error(client: TestClient) -> None:
    response = client.post(API_URL, data={"language_hint": "auto"})

    assert_standard_error(response, 422, "VALIDATION_ERROR")


@pytest.mark.parametrize(
    ("exception", "expected_status", "expected_code"),
    [
        (
            AppException(
                "No recognizable speech was detected in the audio",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="NO_SPEECH_DETECTED",
            ),
            422,
            "NO_SPEECH_DETECTED",
        ),
        (
            AppException(
                "The transcription model is currently unavailable",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="MODEL_LOAD_FAILED",
            ),
            503,
            "MODEL_LOAD_FAILED",
        ),
    ],
)
def test_service_failures_are_safe_and_remove_temp_file(
    client: TestClient,
    exception: AppException,
    expected_status: int,
    expected_code: str,
) -> None:
    service = FailingService(exception)
    app.dependency_overrides[get_transcription_service] = lambda: service

    response = upload(client)

    assert_standard_error(response, expected_status, expected_code)
    assert service.paths and not service.paths[0].exists()
    assert "traceback" not in response.text.lower()


def test_timeout_returns_safe_error_and_removes_temp_file(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    app.dependency_overrides[get_transcription_service] = SlowService
    monkeypatch.setattr(
        transcription_endpoint.settings, "transcription_timeout_seconds", 0.001
    )

    response = upload(client)

    assert_standard_error(response, 504, "TRANSCRIPTION_TIMEOUT")
    temp_directory = transcription_endpoint.settings.temp_audio_dir
    assert not list(temp_directory.glob("*"))
