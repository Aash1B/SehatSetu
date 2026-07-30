"""Schemas for controlled doctor-category recommendations."""

from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.core.doctor_category_rules import DoctorCategory
from app.schemas.common import ApiResponse

MAX_ISSUE_LENGTH = 2_000
MAX_SYMPTOMS = 30
RECOMMENDATION_DISCLAIMER = (
    "This is a doctor-category recommendation and not a medical diagnosis."
)


class Urgency(str, Enum):
    """Controlled urgency levels."""

    NORMAL = "normal"
    PRIORITY = "priority"
    EMERGENCY = "emergency"


class RecommendationSource(str, Enum):
    """Controlled recommendation engines exposed by the API."""

    EMERGENCY_RULES = "emergency_rules"
    SYMPTOM_RULES = "symptom_rules"
    GEMINI = "gemini"
    GENERAL_FALLBACK = "general_fallback"


class DoctorRecommendationRequest(BaseModel):
    """Patient information used only for doctor-category routing."""

    issue: str = Field(min_length=1, max_length=MAX_ISSUE_LENGTH)
    symptoms: list[str] = Field(default_factory=list, max_length=MAX_SYMPTOMS)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    language: str = Field(default="auto", examples=["auto"])
    output_language: str | None = Field(default=None, examples=["en"])

    @field_validator("issue")
    @classmethod
    def normalize_issue(cls, value: str) -> str:
        """Trim whitespace and reject an empty issue."""
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("issue must not be empty")
        return normalized

    @field_validator("symptoms")
    @classmethod
    def normalize_symptoms(cls, values: list[str]) -> list[str]:
        """Normalize and deduplicate symptoms."""
        normalized = [" ".join(value.lower().strip().split()) for value in values]
        return list(dict.fromkeys(value for value in normalized if value))

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, value: str | None) -> str | None:
        """Normalize optional gender without using it as a requirement."""
        if value is None:
            return None
        return " ".join(value.strip().split()) or None


class DoctorRecommendationData(BaseModel):
    """Validated recommendation returned to the NestJS backend."""

    recommended_doctor_category: DoctorCategory
    matched_symptoms: list[str]
    reason: str
    urgency: Urgency
    confidence: float = Field(ge=0, le=1)
    alternative_categories: list[DoctorCategory]
    recommendation_source: RecommendationSource
    emergency_warning: str | None = None
    disclaimer: str = RECOMMENDATION_DISCLAIMER


class GeminiDoctorRecommendation(BaseModel):
    """Strict structured payload accepted from Gemini."""

    recommended_doctor_category: DoctorCategory
    alternative_categories: list[DoctorCategory] = Field(
        default_factory=list, max_length=2
    )
    matched_symptoms: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=1, max_length=500)
    urgency: Urgency
    confidence: float = Field(ge=0, le=1)


class DoctorRecommendationResponse(ApiResponse[DoctorRecommendationData]):
    """Standard response envelope for doctor-category routing."""
