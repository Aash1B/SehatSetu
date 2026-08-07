"""Health endpoint schemas."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse


class FFmpegHealth(BaseModel):
    """Verified FFmpeg runtime status."""

    available: bool
    path: str | None = None
    version: str | None = None
    reason: str | None = None
    searched_locations: list[str] = Field(default_factory=list)


class OCRHealth(BaseModel):
    """Configured OCR provider availability."""

    provider: str = "gemini-vision"
    available: bool
    mode: str = "gemini-only"
    local_available: bool = False
    fallback_available: bool = False
    installed: bool = False
    path: str | None = None
    version: str | None = None
    availability: str = "missing"
    languages: list[str] = Field(default_factory=list)


class WhisperHealth(BaseModel):
    """Non-sensitive model configuration and lazy-load state."""

    model: str
    device: str
    compute_type: str
    loaded: bool
    ready: bool


class HealthData(BaseModel):
    """Service health metadata."""

    status: Literal["healthy"] = "healthy"
    service: str
    version: str
    environment: str
    ffmpeg: FFmpegHealth
    ocr: OCRHealth
    whisper: WhisperHealth
    transcription_ready: bool
    summary_provider_ready: bool


class HealthResponse(ApiResponse[HealthData]):
    """Health-check success response."""
