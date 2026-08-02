"""Uploaded-audio transcription API response schemas."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse


class TranscriptionSegment(BaseModel):
    """A time-aligned non-empty transcription segment."""

    start: float = Field(ge=0, description="Segment start time in seconds.")
    end: float = Field(ge=0, description="Segment end time in seconds.")
    text: str = Field(min_length=1, description="Recognized text for this segment.")
    confidence: float | None = Field(default=None, ge=0, le=1)
    no_speech_probability: float | None = Field(default=None, ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)


class TranscriptionCorrection(BaseModel):
    """Non-destructive candidate correction requiring clinical review."""

    original_text: str
    corrected_candidate: str
    confidence: float = Field(ge=0, le=1)
    reason: str
    requires_review: bool = True


class TranscriptionData(BaseModel):
    """Local Whisper transcription output."""

    transcript: str = Field(min_length=1, description="Combined recognized speech.")
    raw_transcript: str | None = None
    cleaned_transcript: str | None = None
    requested_language: str = "auto"
    fallback_detection_used: bool = False
    detected_language: str = Field(description="Detected or requested language code.")
    language_probability: float | None = Field(
        default=None, ge=0, le=1, description="Whisper language confidence."
    )
    duration_seconds: float | None = Field(
        default=None, ge=0, description="Audio duration reported by Whisper."
    )
    audio_duration_seconds: float | None = Field(
        default=None,
        ge=0,
        description="Preferred audio-duration field; mirrors duration_seconds.",
    )
    processing_time_seconds: float | None = Field(
        default=None, ge=0, description="Server-side transcription processing time."
    )
    segments: list[TranscriptionSegment]
    model: str = Field(description="Configured local Whisper model.")
    segment_count: int = Field(default=0, ge=0)
    warnings: list[str] = Field(default_factory=list)
    second_pass_used: bool = False
    quality_score: float | None = Field(default=None, ge=0, le=1)
    quality_warnings: list[str] = Field(default_factory=list)
    candidate_comparison: dict[str, float | str | bool | None] | None = None
    candidate_disagreement: dict[str, bool] | None = None
    corrections_applied: list[TranscriptionCorrection] = Field(default_factory=list)
    native_transcript: str | None = None
    romanized_transcript: str | None = None
    output_script: str | None = None
    language_confidence: float | None = Field(default=None, ge=0, le=1)
    is_dummy: Literal[False] = False


class TranscriptionResponse(ApiResponse[TranscriptionData]):
    """Standard transcription response."""
