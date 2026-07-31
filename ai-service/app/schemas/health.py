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

    provider: Literal["gemini-vision"] = "gemini-vision"
    available: bool


class HealthData(BaseModel):
    """Service health metadata."""

    status: Literal["healthy"] = "healthy"
    service: str
    version: str
    environment: str
    ffmpeg: FFmpegHealth
    ocr: OCRHealth


class HealthResponse(ApiResponse[HealthData]):
    """Health-check success response."""
