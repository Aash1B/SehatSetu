"""Consultation summary API request and response schemas."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import ApiResponse

MIN_TRANSCRIPT_LENGTH = 10
MAX_TRANSCRIPT_LENGTH = 20_000


class SummaryVitalSigns(BaseModel):
    """Vital signs supplied as grounding context."""

    model_config = ConfigDict(extra="allow")

    blood_pressure: str | None = None
    temperature: str | None = None
    heart_rate: str | None = None
    weight: str | None = None
    height: str | None = None


class SummaryMedicalEntities(BaseModel):
    """Optional Day 4 entities used to ground summary generation."""

    model_config = ConfigDict(extra="allow")

    symptoms: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    medications: list[dict[str, Any]] = Field(default_factory=list)
    duration: list[str] = Field(default_factory=list)
    vital_signs: SummaryVitalSigns = Field(default_factory=SummaryVitalSigns)
    procedures: list[str] = Field(default_factory=list)


class ConsultationSummaryRequest(BaseModel):
    """Transcript and optional extracted entities to summarize."""

    transcript: str = Field(
        min_length=MIN_TRANSCRIPT_LENGTH,
        max_length=MAX_TRANSCRIPT_LENGTH,
        description="Consultation transcript to summarize.",
        examples=[
            (
                "Patient has had fever for three days and complains of "
                "headache. Blood pressure is 140/90. Allergic to penicillin."
            )
        ],
    )
    medical_entities: SummaryMedicalEntities | None = Field(
        default=None,
        description="Optional structured entities extracted by the Day 4 API.",
    )
    language: str = Field(default="auto", examples=["auto"])
    output_language: str | None = Field(default=None, examples=["en"])

    @field_validator("transcript")
    @classmethod
    def validate_transcript(cls, value: str) -> str:
        """Trim and reject effectively empty or very short transcripts."""
        normalized = value.strip()
        if len(normalized) < MIN_TRANSCRIPT_LENGTH:
            raise ValueError(
                "transcript must contain at least 10 non-whitespace characters"
            )
        return normalized


class GeneratedSummaryData(BaseModel):
    """Concise generated consultation summary."""

    summary: str = Field(
        min_length=10,
        max_length=4_000,
        description="Clinically grounded consultation summary.",
    )
    chief_complaint: str | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    history_of_present_illness: str | None = Field(
        default=None, exclude_if=lambda value: value is None
    )
    allergies: list[str] = Field(
        default_factory=list, exclude_if=lambda value: not value
    )
    vital_signs: dict[str, str] = Field(
        default_factory=dict, exclude_if=lambda value: not value
    )
    doctor_advice: list[str] = Field(
        default_factory=list, exclude_if=lambda value: not value
    )
    clinical_summary: str | None = Field(
        default=None, exclude_if=lambda value: value is None
    )


class ConsultationSummaryData(BaseModel):
    """Deprecated deterministic Day 2 response retained for compatibility."""

    chief_complaint: str
    symptoms: list[str]
    medical_history: list[str]
    allergies: list[str]
    doctor_advice: list[str]
    follow_up: str | None = None
    is_dummy: Literal[True] = True


class ConsultationSummaryResponse(
    ApiResponse[GeneratedSummaryData | ConsultationSummaryData]
):
    """Standard consultation summary response."""
