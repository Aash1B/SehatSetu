"""Accuracy-oriented transcription configuration and context tests."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from app.api.v1.endpoints.live_transcription import (
    _session_input_language,
    _transcribe_with_context,
)
from app.core.config import Settings
from app.services.live_transcript_session_service import LiveTranscriptSession
from app.services.transcription_service import TranscriptionService


class FakeWhisperModel:
    """Capture faster-whisper arguments and return deterministic speech."""

    def __init__(self) -> None:
        self.kwargs: dict[str, object] = {}

    def transcribe(self, path: str, **kwargs):
        self.kwargs = kwargs
        segment = SimpleNamespace(start=0, end=2, text="medical terms")
        info = SimpleNamespace(
            language=kwargs.get("language") or "en",
            language_probability=0.95,
            duration=2,
        )
        return [segment], info


@pytest.mark.parametrize(
    ("application_language", "whisper_language"),
    [("en", "en"), ("hi", "hi"), ("hi-Latn", "hi")],
)
def test_accuracy_options_and_explicit_language(
    application_language: str, whisper_language: str
) -> None:
    model = FakeWhisperModel()
    service = TranscriptionService(Settings(_env_file=None))
    service._model = model

    result = service.transcribe(
        Path("unused.wav"),
        application_language,
        initial_prompt="patient context",
    )

    assert result.transcript == "medical terms"
    assert model.kwargs["language"] == whisper_language
    assert model.kwargs["beam_size"] == 5
    assert model.kwargs["temperature"] == 0
    assert model.kwargs["condition_on_previous_text"] is True
    assert model.kwargs["initial_prompt"] == "patient context"
    assert model.kwargs["vad_filter"] is True
    assert model.kwargs["vad_parameters"] == {
        "min_speech_duration_ms": 250,
        "min_silence_duration_ms": 500,
    }


def test_previous_context_is_limited_to_last_fifty_words() -> None:
    class ContextService:
        def __init__(self) -> None:
            self.prompt = None

        def transcribe(
            self,
            path: Path,
            language: str,
            initial_prompt: str | None = None,
        ):
            self.prompt = initial_prompt
            return None

    service = ContextService()
    transcript = " ".join(f"word-{index}" for index in range(80))
    _transcribe_with_context(service, Path("unused.wav"), "en", transcript)
    assert service.prompt == " ".join(
        f"word-{index}" for index in range(30, 80)
    )


def test_detected_language_is_preserved_after_first_chunk() -> None:
    session = LiveTranscriptSession(session_id="session", language="auto")
    assert _session_input_language(session) == "auto"
    session.detected_language = "hi"
    assert _session_input_language(session) == "hi"


def test_accuracy_defaults_and_frontend_duration() -> None:
    settings = Settings(_env_file=None)
    assert settings.live_transcript_default_chunk_duration_ms == 10000
    assert settings.live_transcript_min_chunk_duration_ms == 1000
    assert settings.live_transcript_overlap_ms == 750
    page = Path("app/static/live_audio.html").read_text(encoding="utf-8")
    assert '<option value="10000" selected>' in page
    assert '<option value="15000">' in page
    assert '<option value="20000">' in page
