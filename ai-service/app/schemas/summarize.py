"""NER-backed prescription draft contracts for raw transcripts."""

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings
from app.schemas.common import ApiResponse

settings = get_settings()


class SummarizeRequest(BaseModel):
    """Raw consultation transcript requiring internal entity extraction."""

    transcript: str = Field(
        min_length=1,
        max_length=settings.summarize_max_transcript_length,
        examples=[
            (
                "Patient has hypertension, severe chest pain and takes "
                "Metformin 500 mg twice daily. CBC was advised."
            )
        ],
    )

    @field_validator("transcript")
    @classmethod
    def normalize_transcript(cls, value: str) -> str:
        """Trim the transcript and reject whitespace-only content."""
        normalized = value.strip()
        if not normalized:
            raise ValueError("transcript must not be empty")
        return normalized


class MedicationDraft(BaseModel):
    """Medication details found explicitly in the transcript."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    dosage: str | None = None
    frequency: str | None = None
    route: str | None = None
    duration: str | None = None


class WarningItem(BaseModel):
    """Deterministic safety or extraction warning."""

    code: str
    message: str


class PrescriptionDraft(BaseModel):
    """Non-autonomous structured draft requiring doctor confirmation."""

    identified_issues: list[str] = Field(default_factory=list)
    identified_symptoms: list[str] = Field(default_factory=list)
    medications: list[MedicationDraft] = Field(default_factory=list)
    recommended_lab_tests: list[str] = Field(default_factory=list)
    vitals: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    warnings: list[WarningItem] = Field(default_factory=list)
    diagnosis: str = "Draft diagnosis pending doctor review"
    instructions: list[str] = Field(
        default_factory=lambda: [
            "Review and confirm all extracted information before issuing a "
            "prescription."
        ]
    )
    requires_doctor_review: bool = True
    requires_doctor_confirmation: bool = True
    disclaimer: str = "AI-generated draft. Doctor approval required."
    is_dummy: bool = False


class SummarizeResponse(ApiResponse[PrescriptionDraft]):
    """Standard raw-transcript prescription-draft response."""
