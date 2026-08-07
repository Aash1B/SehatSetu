"""Schemas for controlled doctor-category recommendations."""

from enum import Enum

from typing import Any
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.doctor_category_rules import DoctorCategory
from app.schemas.common import ApiResponse
from app.schemas.hospital import EnrichedHospital, RawHospital

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
    URGENT = "urgent"
    ROUTINE = "routine"
    INSUFFICIENT_INFORMATION = "insufficient_information"


class RecommendationSource(str, Enum):
    """Controlled recommendation engines exposed by the API."""

    EMERGENCY_RULES = "emergency_rules"
    SYMPTOM_RULES = "symptom_rules"
    GEMINI = "gemini"
    GENERAL_FALLBACK = "general_fallback"


class DoctorRecommendationRequest(BaseModel):
    """Patient information used only for doctor-category routing."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"chief_complaint": "chest pain and difficulty breathing", "symptoms": ["chest pain", "shortness of breath"], "known_conditions": [], "age": 55, "gender": "male", "symptom_duration": "20 minutes", "severity": "severe", "additional_notes": "", "nearby_hospitals": [{"googlePlaceId": "place-123", "name": "City Heart and Emergency Hospital", "formattedAddress": "MG Road, Pune", "distance": 1800, "rating": 4.2, "userRatingCount": 420, "businessStatus": "OPERATIONAL", "openNow": True}]}]})

    issue: str = Field(default="", validation_alias=AliasChoices("issue", "chief_complaint"), max_length=MAX_ISSUE_LENGTH)
    symptoms: list[str] = Field(default_factory=list, max_length=MAX_SYMPTOMS)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    language: str = Field(default="auto", examples=["auto"])
    output_language: str | None = Field(default=None, examples=["en"])
    known_conditions: list[str] = Field(default_factory=list, max_length=50)
    symptom_duration: str | None = Field(default=None, max_length=100)
    severity: str | None = Field(default=None, max_length=50)
    additional_notes: str = Field(default="", max_length=4_000)
    advanced_input: bool = Field(default=False, exclude=True)
    nearby_hospitals: list[RawHospital] = Field(default_factory=list, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def detect_advanced_input(cls, value: Any) -> Any:
        if isinstance(value, dict) and "chief_complaint" in value and "issue" not in value:
            return {**value, "advanced_input": True}
        return value

    @field_validator("issue")
    @classmethod
    def normalize_issue(cls, value: str) -> str:
        """Trim whitespace and reject an empty issue."""
        normalized = " ".join(value.split())
        return normalized

    @model_validator(mode="after")
    def require_information(self) -> "DoctorRecommendationRequest":
        if not self.issue and not self.advanced_input:
            raise ValueError("issue must not be empty")
        return self

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
    emergency_detected: bool = False
    emergency_message: str = ""
    recommended_specialties: list["SpecialtyRecommendation"] = Field(default_factory=list, max_length=3)
    primary_recommendation: dict = Field(default_factory=dict)
    reasoning: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    requires_human_review: bool = True
    emergency_instruction: str = ""
    nearby_hospitals: list[EnrichedHospital] = Field(default_factory=list)
    hospital_classification_notice: str = ""


class SpecialtyRecommendation(BaseModel):
    specialty: str
    priority: int = Field(ge=1, le=3)
    reason: str
    recommended_timeframe: str


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
