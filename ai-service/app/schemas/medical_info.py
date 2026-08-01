"""Medical entity extraction request and response schemas."""

from typing import Any

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)
from pydantic.json_schema import SkipJsonSchema

from app.schemas.common import ApiResponse

MIN_TRANSCRIPT_LENGTH = 10
MAX_TRANSCRIPT_LENGTH = 10_000


class MedicalInfoRequest(BaseModel):
    """A consultation transcript submitted for entity extraction."""

    model_config = ConfigDict(populate_by_name=True)

    transcript: str = Field(
        validation_alias=AliasChoices("transcript", "text"),
        min_length=MIN_TRANSCRIPT_LENGTH,
        max_length=MAX_TRANSCRIPT_LENGTH,
        description="Medical consultation transcript to analyze.",
        examples=[
            (
                "The patient has fever for three days, blood pressure 140/90, "
                "is allergic to penicillin and takes paracetamol 500 mg twice daily."
            )
        ],
    )
    legacy_text_input: SkipJsonSchema[bool] = Field(default=False, exclude=True)
    language: str = Field(default="auto", examples=["auto"])
    output_language: str | None = Field(default=None, examples=["en"])

    @model_validator(mode="before")
    @classmethod
    def mark_legacy_input(cls, value: Any) -> Any:
        """Track requests using the deprecated Day 2 property."""
        if isinstance(value, dict) and "text" in value and "transcript" not in value:
            value = {**value, "legacy_text_input": True}
        return value

    @field_validator("transcript")
    @classmethod
    def validate_transcript(cls, value: str) -> str:
        """Trim input and reject transcripts made primarily of whitespace."""
        normalized = value.strip()
        if len(normalized) < MIN_TRANSCRIPT_LENGTH:
            raise ValueError(
                "transcript must contain at least 10 non-whitespace characters"
            )
        return normalized


class MedicationMention(BaseModel):
    """A medication mention and its nearby structured instructions."""

    name: str = Field(description="Medication name found in the transcript.")
    normalized_name: str | None = None
    strength: str | None = None
    dose: str | None = None
    unit: str | None = None
    dosage: str | None = Field(
        default=None, description="Dosage stated near the medication."
    )
    frequency: str | None = Field(
        default=None, description="Frequency stated near the medication."
    )
    duration: str | None = Field(
        default=None, description="Duration stated near the medication."
    )
    route: str | None = None
    instruction: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source_text: str | None = None


class SymptomMention(BaseModel):
    """Enriched symptom mention alongside the backward-compatible name list."""

    name: str
    duration: str | None = None
    negated: bool = False
    confidence: float | None = Field(default=None, ge=0, le=1)


class VitalSigns(BaseModel):
    """Structured vital signs found in the transcript."""

    blood_pressure: str | None = None
    temperature: str | None = None
    heart_rate: str | None = None
    weight: str | None = None
    height: str | None = None
    oxygen_saturation: str | None = None
    blood_sugar: str | None = None


class VitalSign(BaseModel):
    """Deprecated Day 2 vital-sign representation."""

    name: str
    value: str


class MedicalInfoData(BaseModel):
    """Structured entities extracted from a medical transcript."""

    symptoms: list[str] = Field(default_factory=list)
    symptom_details: list[SymptomMention] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    suspected_conditions: list[str] = Field(default_factory=list)
    negated_findings: list[str] = Field(default_factory=list)
    historical_conditions: list[str] = Field(default_factory=list)
    family_history: list[str] = Field(default_factory=list)
    lab_tests: list[str] = Field(default_factory=list)
    doctor_instructions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    medications: list[MedicationMention] = Field(default_factory=list)
    duration: list[str] = Field(default_factory=list)
    vital_signs: VitalSigns | list[VitalSign] = Field(
        default_factory=VitalSigns,
        description=(
            "Keyed vital signs. Legacy `text` requests receive the deprecated "
            "Day 2 list representation."
        ),
    )
    procedures: list[str] = Field(default_factory=list)
    # Compatibility fields retained for Day 2 clients.
    durations: list[str] = Field(default_factory=list)
    legacy_vital_signs: list[VitalSign] = Field(default_factory=list)
    is_dummy: bool = Field(default=False)


class MedicalInfoResponse(ApiResponse[MedicalInfoData]):
    """Standard medical entity extraction response."""
