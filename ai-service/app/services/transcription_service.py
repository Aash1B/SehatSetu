"""Lazy, local faster-whisper transcription service."""

from pathlib import Path
import re
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
from app.services.transcription_safety_service import (
    analyze_repetition,
    candidate_quality,
    correction_candidates,
    safety_signature,
)
from app.services.transliteration_service import transliteration_service

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
        quality_warnings: list[str] = []
        second_pass_used = False
        candidate_comparison: dict[str, float | str | bool | None] | None = None
        if probability is not None and probability < self.settings.whisper_language_detection_threshold:
            warnings.append("uncertain_language")
            quality_warnings.append("LOW_LANGUAGE_CONFIDENCE")
        if any((segment.no_speech_probability or 0) > self.settings.whisper_no_speech_threshold for segment in segments):
            warnings.append("low_confidence_segments")
        first_score = self._quality_score(segments, probability)
        duration_value = float(duration) if duration is not None else None
        repetition = analyze_repetition(
            transcript,
            duration_value,
            [(item.start, item.end) for item in segments],
            word_run=self.settings.whisper_repetition_word_run,
            phrase_repeats=self.settings.whisper_repetition_phrase_repeats,
            max_words_per_second=self.settings.whisper_max_words_per_audio_second,
            numeric_run=self.settings.whisper_repeated_numeric_run,
        )
        if repetition.detected:
            quality_warnings.extend(["REPETITION_DETECTED", "POSSIBLE_TRANSCRIPT_HALLUCINATION"])
            for index in repetition.affected_segment_indexes:
                if index < len(segments): segments[index].warnings.append("REPETITION_DETECTED")
        if self.settings.whisper_second_pass_enabled and self._needs_second_pass(
            transcript, segments, probability, duration_value
        ):
            try:
                detected = str(getattr(info, "language", language or "en"))
                second_raw, second_info = model.transcribe(
                    str(audio_path), language=detected if detected in {"en", "hi"} else language,
                    task=task, beam_size=max(5, self.settings.whisper_beam_size),
                    best_of=max(5, self.settings.whisper_best_of), temperature=0,
                    condition_on_previous_text=False,
                    initial_prompt=(prompt or "") + " Preserve every negation, medicine, number, dosage, and unit exactly.",
                    word_timestamps=self.settings.whisper_word_timestamps,
                    no_speech_threshold=self.settings.whisper_no_speech_threshold,
                    log_prob_threshold=self.settings.whisper_log_prob_threshold,
                    compression_ratio_threshold=self.settings.whisper_compression_ratio_threshold,
                    vad_filter=self.settings.vad_enabled,
                    vad_parameters={"min_speech_duration_ms":self.settings.vad_min_speech_duration_ms,"min_silence_duration_ms":self.settings.vad_min_silence_duration_ms},
                )
                second_segments = [TranscriptionSegment(start=float(item.start), end=float(item.end), text=value, confidence=(max(0.0,min(1.0,2.718281828 ** float(item.avg_logprob))) if getattr(item,"avg_logprob",None) is not None else None), no_speech_probability=getattr(item,"no_speech_prob",None)) for item in second_raw if (value := str(item.text).strip())]
                second_text = " ".join(item.text for item in second_segments).strip()
                second_score = self._quality_score(second_segments, getattr(second_info,"language_probability",probability))
                first_quality=candidate_quality(transcript,self._average_confidence(segments),probability or .5,duration_value)
                second_quality=candidate_quality(second_text,self._average_confidence(second_segments),getattr(second_info,"language_probability",probability) or .5,duration_value)
                choose_second=bool(second_text and second_quality > first_quality)
                first_signature=safety_signature(transcript); second_signature=safety_signature(second_text)
                candidate_comparison = {"first_quality_score":first_score,"second_quality_score":second_score,"selected":"second" if choose_second else "first","safety_content_agreed":first_signature==second_signature}
                second_pass_used = True
                quality_warnings.append("SECOND_PASS_USED")
                if repetition.detected: quality_warnings.append("REPETITION_RECOVERY_USED")
                if self._numbers(transcript) != self._numbers(second_text): quality_warnings.append("NUMBER_TRANSCRIPTION_DISAGREEMENT")
                if self._dosages(transcript) != self._dosages(second_text): quality_warnings.append("DOSAGE_TRANSCRIPTION_DISAGREEMENT")
                if self._negations(transcript) != self._negations(second_text): quality_warnings.append("NEGATION_REQUIRES_REVIEW")
                if choose_second:
                    transcript, segments, first_score = second_text, second_segments, second_score
                selected_repetition=analyze_repetition(transcript,duration_value)
                if selected_repetition.detected: quality_warnings.append("TRANSCRIPT_REQUIRES_REVIEW")
            except Exception:
                logger.warning("Optional second transcription pass failed; preserving pass one", exc_info=True)
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
            second_pass_used=second_pass_used,
            quality_score=first_score,
            quality_warnings=list(dict.fromkeys(quality_warnings)),
            candidate_comparison=candidate_comparison,
            candidate_disagreement=({"negation":self._negations(transcript)!=self._negations(second_text),"numbers":self._numbers(transcript)!=self._numbers(second_text),"dosage":self._dosages(transcript)!=self._dosages(second_text)} if second_pass_used else None),
            corrections_applied=correction_candidates(transcript,self.settings.whisper_correction_confidence_threshold),
            native_transcript=transcript if str(getattr(info, "language", "")) == "hi" else None,
            romanized_transcript=(transliteration_service.romanize_hindi(transcript) if requested_language == "hi-Latn" else None),
            output_script="Latin" if requested_language == "hi-Latn" else ("Devanagari" if str(getattr(info,"language","")) == "hi" else "Latin"),
            language_confidence=probability,
        )

    def _needs_second_pass(self, text: str, segments: list[TranscriptionSegment], probability: float | None, duration: float | None = None) -> bool:
        confidences=[item.confidence for item in segments if item.confidence is not None]
        repeated=analyze_repetition(text,duration).detected
        suspicious_medicine=bool(correction_candidates(text,self.settings.whisper_correction_confidence_threshold))
        short=bool(duration and duration >= 5 and len(text.split()) < max(2,int(duration*.25)))
        return bool((probability is not None and probability < self.settings.whisper_language_detection_threshold) or (confidences and sum(confidences)/len(confidences) < 0.43) or repeated or suspicious_medicine or short)

    @staticmethod
    def _average_confidence(segments: list[TranscriptionSegment]) -> float:
        values=[item.confidence for item in segments if item.confidence is not None]
        return sum(values)/len(values) if values else .5

    @staticmethod
    def _quality_score(segments: list[TranscriptionSegment], probability: float | None) -> float:
        values=[item.confidence for item in segments if item.confidence is not None]
        acoustic=sum(values)/len(values) if values else 0.7
        return round(max(0.0,min(1.0,0.8*acoustic+0.2*(probability if probability is not None else 0.5))),4)

    @staticmethod
    def _numbers(text: str) -> tuple[str,...]: return tuple(re.findall(r"\b\d+(?:\.\d+)?(?:/\d+)?\b",text))
    @staticmethod
    def _dosages(text: str) -> tuple[str,...]: return tuple(re.findall(r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|milligrams?|micrograms?)\b",text,re.I))
    @staticmethod
    def _negations(text: str) -> tuple[str,...]: return tuple(re.findall(r"\b(?:no|not|denies?|without|nahi)\b",text,re.I))
    @classmethod
    def _safety_signature(cls,text: str) -> tuple[tuple[str,...],tuple[str,...],tuple[str,...]]: return cls._numbers(text),cls._dosages(text),cls._negations(text)


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
