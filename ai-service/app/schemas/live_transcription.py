"""Live browser audio chunk response schemas."""

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse


class LiveTranscriptionData(BaseModel):
    session_id: str
    chunk_id: str
    sequence_number: int = Field(ge=0)
    chunk_transcript: str
    merged_transcript: str
    speech_detected: bool
    detected_language: str
    language_confidence: float | None = Field(default=None, ge=0, le=1)
    processing_time_ms: float = Field(ge=0)
    is_final: bool
    accepted_chunk_index: int | None = None
    expected_next_chunk: int | None = None
    partial_transcript: str = ""
    finalized_transcript: str | None = None
    needs_more_audio: bool = False
    warnings: list[str] = Field(default_factory=list)


class LiveTranscriptionResponse(ApiResponse[LiveTranscriptionData]):
    """Standard live-chunk transcription response."""
