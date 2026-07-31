"""Transcript cleanup request and response schemas."""

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ApiResponse


class TextCleanupRequest(BaseModel):
    """Raw transcript submitted for conservative cleanup."""

    transcript: str = Field(min_length=1, max_length=20_000)

    @field_validator("transcript")
    @classmethod
    def reject_blank_transcript(cls, value: str) -> str:
        """Reject whitespace-only input and trim surrounding whitespace."""
        normalized = value.strip()
        if not normalized:
            raise ValueError("transcript must not be empty")
        return normalized


class TextCleanupData(BaseModel):
    """Original and normalized transcript text."""

    original_transcript: str
    cleaned_transcript: str


class TextCleanupResponse(ApiResponse[TextCleanupData]):
    """Standard transcript cleanup response."""
