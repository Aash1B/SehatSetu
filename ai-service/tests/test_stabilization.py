"""Regression tests for Day 1–5 stabilization features."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.transcription import TranscriptionData, TranscriptionSegment
from app.services.ner_service import MedicalNERService
from app.services.summary_service import SummaryService
from app.services.text_cleanup_service import TextCleanupService
from app.services.transcription_service import get_transcription_service


class BrowserAudioService:
    """Return deterministic metadata for uploaded browser audio."""

    def transcribe(self, audio_path: Path, language: str) -> TranscriptionData:
        assert audio_path.exists()
        return TranscriptionData(
            transcript="Patient reports fever.",
            detected_language="en" if language == "auto" else language,
            language_probability=0.91,
            duration_seconds=2.4,
            audio_duration_seconds=2.4,
            segments=[
                TranscriptionSegment(
                    start=0,
                    end=2.4,
                    text="Patient reports fever.",
                )
            ],
            model="tiny",
        )


@pytest.fixture
def client():
    """Provide an isolated FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("filename", "mime_type"),
    [
        ("sample.wav", "audio/wav"),
        ("sample.mp3", "audio/mpeg"),
        ("browser-recording.webm", "audio/webm"),
        ("browser-recording.webm", "audio/webm;codecs=opus"),
        ("browser-recording.ogg", "audio/ogg"),
        ("browser-recording.ogg", "audio/ogg;codecs=opus"),
        ("browser-recording.m4a", "audio/mp4"),
    ],
)
def test_supported_audio_formats_and_metadata(
    client: TestClient, filename: str, mime_type: str
) -> None:
    app.dependency_overrides[get_transcription_service] = BrowserAudioService
    response = client.post(
        "/api/v1/transcribe",
        files={"file": (filename, b"mock-audio-content", mime_type)},
        data={
            "language": "auto",
            "include_segments": "true",
            "task": "transcribe",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["audio_duration_seconds"] == 2.4
    assert data["processing_time_seconds"] is not None
    assert data["language_probability"] == 0.91
    assert len(data["segments"]) == 1


def test_unsupported_browser_audio_mime_type_has_consistent_error(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/transcribe",
        files={
            "file": (
                "browser-recording.webm",
                b"mock-audio-content",
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 415
    body = response.json()
    assert body["success"] is False
    assert body["message"] == "Unsupported audio MIME type"
    assert body["error"]["code"] == "UNSUPPORTED_MIME_TYPE"
    assert body["error"]["details"] == "application/octet-stream"


def test_segments_can_be_omitted(client: TestClient) -> None:
    app.dependency_overrides[get_transcription_service] = BrowserAudioService
    response = client.post(
        "/api/v1/transcribe",
        files={"file": ("sample.webm", b"mock-audio", "audio/webm")},
        data={"include_segments": "false"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["segments"] == []


def test_live_audio_page_and_assets_are_served(client: TestClient) -> None:
    page = client.get("/live-audio")
    script = client.get("/static/live_audio.js")
    stylesheet = client.get("/static/live_audio.css")

    assert page.status_code == script.status_code == stylesheet.status_code == 200
    assert "/api/v1/transcribe" in script.text
    assert "MediaRecorder" in script.text
    assert "/static/live_audio.js" in page.text


def test_transcript_cleanup_normalizes_measurements() -> None:
    cleaned = TextCleanupService().clean(
        "  patient takes 500mg   and bp 140 by 90  "
    )
    assert cleaned == "Patient takes 500 mg and blood pressure 140/90."


def test_cleanup_endpoint_uses_standard_envelope(client: TestClient) -> None:
    response = client.post(
        "/api/v1/clean-transcript",
        json={"transcript": "patient takes 500mg"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["cleaned_transcript"] == (
        "Patient takes 500 mg."
    )


def test_enriched_entities_cover_negation_deduplication_and_linking() -> None:
    service = MedicalNERService(classifier=lambda _: [])
    data = service.extract(
        "Patient has no fever but headache for three days. Headache persists. "
        "Paracetamol 500mg twice daily for three days."
    )
    assert data.symptoms == ["headache"]
    fever = next(item for item in data.symptom_details if item.name == "fever")
    headache = next(
        item for item in data.symptom_details if item.name == "headache"
    )
    assert fever.negated is True
    assert headache.negated is False
    assert headache.duration == "three days"
    assert len([item for item in data.symptoms if item == "headache"]) == 1
    assert data.medications[0].dosage == "500 mg"
    assert data.medications[0].frequency == "twice daily"
    assert data.medications[0].duration == "three days"


def test_no_known_allergies_and_hinglish_terms() -> None:
    data = MedicalNERService(classifier=lambda _: []).extract(
        "Patient has bukhar and khansi for two days with no known allergies."
    )
    assert data.symptoms == ["fever", "cough"]
    assert data.allergies == []


def test_vital_sign_normalization() -> None:
    data = MedicalNERService(classifier=lambda _: []).extract(
        "BP is 140 by 90, temperature 101 F, and heart rate 80 bpm."
    )
    assert data.vital_signs.blood_pressure == "140/90"
    assert data.vital_signs.temperature == "101°F"
    assert data.vital_signs.heart_rate == "80 bpm"


def test_structured_summary_and_text_fallback() -> None:
    class StructuredProvider:
        def generate_consultation_summary(self, *_: object) -> str:
            return (
                '{"chief_complaint":"Fever","history_of_present_illness":'
                '"Fever for three days.","allergies":["Penicillin"],'
                '"vital_signs":{"blood_pressure":"140/90"},'
                '"doctor_advice":["Rest"],'
                '"clinical_summary":"Fever has been present for three days."}'
            )

    structured = SummaryService(StructuredProvider()).generate("x" * 10)
    assert structured.summary == "Fever has been present for three days."
    assert structured.vital_signs["blood_pressure"] == "140/90"

    class TextProvider:
        def generate_consultation_summary(self, *_: object) -> str:
            return "The patient reports fever for three days."

    fallback = SummaryService(TextProvider()).generate("x" * 10)
    assert fallback.summary == "The patient reports fever for three days."
