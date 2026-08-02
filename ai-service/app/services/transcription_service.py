"""Lazy, local faster-whisper transcription service."""

from pathlib import Path
from threading import Lock
from typing import Any

from fastapi import status

from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.transcription import TranscriptionData, TranscriptionSegment
from app.core.languages import SUPPORTED_LANGUAGES
from app.services.medical_vocabulary_service import get_medical_vocabulary_service
from app.services.text_cleanup_service import get_text_cleanup_service

logger = get_logger(__name__)


class TranscriptionService:
    """Load one Whisper model lazily and transcribe local temporary files."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model: Any | None = None
        self._model_lock = Lock()
        self._initialization_error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def is_ready(self) -> bool:
        return self._initialization_error is None

    def _get_model(self) -> Any:
        """Return the cached model, loading it on first inference."""
        if self._model is not None:
            return self._model

        with self._model_lock:
            if self._model is not None:
                return self._model
            try:
                from faster_whisper import WhisperModel

                logger.info(
                    "Loading local Whisper model model=%s device=%s compute_type=%s",
                    self.settings.whisper_model_size,
                    self.settings.whisper_device,
                    self.settings.whisper_compute_type,
                )
                self._model = WhisperModel(
                    self.settings.whisper_model_size,
                    device=self.settings.whisper_device,
                    compute_type=self.settings.whisper_compute_type,
                    cpu_threads=self.settings.whisper_cpu_threads,
                    num_workers=self.settings.whisper_num_workers,
                )
                logger.info(
                    "Local Whisper model loaded model=%s",
                    self.settings.whisper_model_size,
                )
            except Exception as exc:
                self._initialization_error = type(exc).__name__
                logger.exception(
                    "Whisper model load failed model=%s",
                    self.settings.whisper_model_size,
                )
                raise AppException(
                    "The transcription model is currently unavailable",
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    code="MODEL_LOAD_FAILED",
                ) from exc
        return self._model

    def transcribe(
        self,
        audio_path: Path,
        language_hint: str,
        task: str = "transcribe",
        initial_prompt: str | None = None,
    ) -> TranscriptionData:
        """Run blocking local inference and normalize its result."""
        model = self._get_model()
        language = (
            None
            if language_hint == "auto"
            else SUPPORTED_LANGUAGES.get(
                language_hint,
                SUPPORTED_LANGUAGES["en"],
            ).whisper_code
        )
        requested_language = language_hint or "auto"
        prompt = initial_prompt or (
            get_medical_vocabulary_service().initial_prompt()
            if self.settings.whisper_medical_prompt_enabled else None
        )

        try:
            raw_segments, info = model.transcribe(
                str(audio_path),
                language=language,
                task=task,
                beam_size=self.settings.whisper_beam_size,
                best_of=self.settings.whisper_best_of,
                temperature=self.settings.whisper_temperature,
                condition_on_previous_text=(
                    self.settings.whisper_condition_on_previous_text
                ),
                initial_prompt=prompt,
                word_timestamps=self.settings.whisper_word_timestamps,
                no_speech_threshold=self.settings.whisper_no_speech_threshold,
                log_prob_threshold=self.settings.whisper_log_prob_threshold,
                compression_ratio_threshold=self.settings.whisper_compression_ratio_threshold,
                vad_filter=self.settings.vad_enabled,
                vad_parameters={
                    "min_speech_duration_ms": (
                        self.settings.vad_min_speech_duration_ms
                    ),
                    "min_silence_duration_ms": (
                        self.settings.vad_min_silence_duration_ms
                    ),
                },
            )
            segments = [
                TranscriptionSegment(
                    start=float(segment.start),
                    end=float(segment.end),
                    text=text,
                    confidence=(
                        max(0.0, min(1.0, 2.718281828 ** float(segment.avg_logprob)))
                        if getattr(segment, "avg_logprob", None) is not None else None
                    ),
                    no_speech_probability=getattr(segment, "no_speech_prob", None),
                )
                for segment in raw_segments
                if (text := str(segment.text).strip())
            ]
        except AppException:
            raise
        except Exception as exc:
            logger.warning(
                "Whisper could not decode or transcribe the uploaded audio",
                exc_info=True,
            )
            raise AppException(
                "The uploaded audio could not be read or transcribed",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="INVALID_AUDIO_FILE",
            ) from exc

        segments.sort(key=lambda segment: (segment.start, segment.end))
        transcript = " ".join(segment.text for segment in segments).strip()
        if not transcript:
            raise AppException(
                "No recognizable speech was detected in the audio",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="NO_SPEECH_DETECTED",
            )

        duration = getattr(info, "duration", None)
        logger.info(
            "Transcription completed language=%s segment_count=%d "
            "duration_seconds=%s",
            getattr(info, "language", language or "unknown"),
            len(segments),
            duration,
        )
        warnings: list[str] = []
        probability = getattr(info, "language_probability", None)
        if probability is not None and probability < self.settings.whisper_language_detection_threshold:
            warnings.append("uncertain_language")
        if any((segment.no_speech_probability or 0) > self.settings.whisper_no_speech_threshold for segment in segments):
            warnings.append("low_confidence_segments")
        cleaned = get_text_cleanup_service().clean(transcript)
        return TranscriptionData(
            transcript=transcript,
            raw_transcript=transcript,
            cleaned_transcript=cleaned,
            requested_language=requested_language,
            fallback_detection_used=language is None,
            detected_language=str(getattr(info, "language", language or "unknown")),
            language_probability=probability,
            duration_seconds=duration,
            audio_duration_seconds=duration,
            segments=segments,
            model=self.settings.whisper_model_size,
            segment_count=len(segments),
            warnings=warnings,
        )


_transcription_service: TranscriptionService | None = None
_service_lock = Lock()


def get_transcription_service() -> TranscriptionService:
    """Return the process-wide service without loading its model."""
    global _transcription_service
    if _transcription_service is None:
        with _service_lock:
            if _transcription_service is None:
                _transcription_service = TranscriptionService(get_settings())
    return _transcription_service
