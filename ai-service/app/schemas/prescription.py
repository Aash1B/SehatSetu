"""Doctor-reviewed AI prescription draft schemas."""

from typing import Any, Literal

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.schemas.common import ApiResponse
from app.schemas.language import LanguageMetadata


class PrescriptionRequest(BaseModel):
    """Consultation context for a doctor-reviewed prescription draft."""

    summary: str = Field(
        validation_alias=AliasChoices("summary", "transcript"),
        min_length=10,
        max_length=20_000,
        examples=["Patient reports fever and body ache for two days."],
    )
    medical_entities: dict[str, Any] = Field(default_factory=dict)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    language: str = "auto"
    output_language: str | None = None
    legacy_input: bool = Field(default=False, exclude=True)

    @model_validator(mode="before")
    @classmethod
    def detect_legacy_input(cls, value: Any) -> Any:
        """Mark the former transcript request shape for compatibility."""
        if isinstance(value, dict) and "transcript" in value and "summary" not in value:
            return {**value, "legacy_input": True}
        return value

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str) -> str:
        """Trim and reject effectively short summaries."""
        normalized = " ".join(value.split())
        if len(normalized) < 10:
            raise ValueError("summary must contain at least 10 characters")
        return normalized


class PrescriptionMedication(BaseModel):
    """A complete medication suggestion for doctor consideration."""

    model_config = ConfigDict(extra="forbid")

    medicine: str = Field(min_length=1, max_length=200)
    generic_name: str = Field(default="", max_length=200)
    dosage: str | None = Field(default=None, min_length=1, max_length=100)
    frequency: str | None = Field(default=None, min_length=1, max_length=100)
    route: str | None = Field(default=None, min_length=1, max_length=100)
    duration: str | None = Field(default=None, min_length=1, max_length=100)
    instructions: str | None = Field(default=None, min_length=1, max_length=500)
    contraindication_warnings: list[str] = Field(default_factory=list)
    allergy_warnings: list[str] = Field(default_factory=list)

    @field_validator(
        "medicine", "dosage", "frequency", "route", "duration", "instructions"
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        """Strip medication fields and reject whitespace-only content."""
        if value is None:
            return None
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("medication fields must not be empty")
        return normalized


class PrescriptionStructuredOutput(BaseModel):
    """Strict schema supplied to Gemini for native structured output."""

    model_config = ConfigDict(extra="forbid")

    identified_issues: list[str] = Field(default_factory=list)
    identified_symptoms: list[str] = Field(default_factory=list)
    medications: list[PrescriptionMedication] = Field(default_factory=list)
    recommended_lab_tests: list["LabTestItem"] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    diet_and_lifestyle_guidance: list[str] = Field(default_factory=list)
    follow_up_advice: list[str] = Field(default_factory=list)
    requires_doctor_confirmation: bool = True
    requires_doctor_review: bool = True
    disclaimer: str = "AI-generated draft. Doctor approval required."


class LabTestItem(BaseModel):
    """A clinically justified test suggestion for doctor review."""

    test_name: str = Field(min_length=1, max_length=200)
    reason: str = Field(min_length=1, max_length=500)
    priority: str = Field(default="routine", max_length=50)


class PrescriptionData(PrescriptionStructuredOutput):
    """Public data contract with deprecated Day 2 compatibility fields."""

    requires_doctor_review: Literal[True] = True
    language: LanguageMetadata | None = None
    # Deprecated Day 2 compatibility fields.
    diagnosis: str | None = None
    instructions: list[str] | None = None
    requires_doctor_confirmation: Literal[True] | None = None
    is_dummy: Literal[True] | None = None


class PrescriptionResponse(ApiResponse[PrescriptionData]):
    """Standard prescription-draft response."""
