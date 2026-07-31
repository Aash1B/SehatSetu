"""Uploaded-audio transcription API response schemas."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse


class TranscriptionSegment(BaseModel):
    """A time-aligned non-empty transcription segment."""

    start: float = Field(ge=0, description="Segment start time in seconds.")
    end: float = Field(ge=0, description="Segment end time in seconds.")
    text: str = Field(min_length=1, description="Recognized text for this segment.")


class TranscriptionData(BaseModel):
    """Local Whisper transcription output."""

    transcript: str = Field(min_length=1, description="Combined recognized speech.")
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
    is_dummy: Literal[False] = False


class TranscriptionResponse(ApiResponse[TranscriptionData]):
    """Standard transcription response."""
