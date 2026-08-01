"""Doctor-reviewed AI diet recommendation schemas."""

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


class DietRecommendationRequest(BaseModel):
    """Consultation context for a practical diet recommendation."""

    summary: str = Field(
        validation_alias=AliasChoices("summary", "condition"),
        min_length=1,
        max_length=20_000,
        examples=["Patient has hypertension and needs practical diet guidance."],
    )
    medical_entities: dict[str, Any] = Field(default_factory=dict)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    dietary_preference: str | None = Field(default=None, max_length=100)
    language: str = "auto"
    output_language: str | None = None
    dietary_preferences: list[str] = Field(default_factory=list, max_length=20)
    allergies: list[str] = Field(default_factory=list, max_length=50)
    legacy_input: bool = Field(default=False, exclude=True)

    @model_validator(mode="before")
    @classmethod
    def detect_legacy_input(cls, value: Any) -> Any:
        """Mark the former condition request shape for compatibility."""
        if isinstance(value, dict) and "condition" in value and "summary" not in value:
            return {**value, "legacy_input": True}
        return value

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str) -> str:
        """Trim the summary and reject whitespace-only input."""
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("summary must not be empty")
        return normalized


class DietStructuredOutput(BaseModel):
    """Strict schema supplied to Gemini for native structured output."""

    model_config = ConfigDict(extra="forbid")

    recommended_foods: list[str] = Field(default_factory=list)
    foods_to_limit: list[str] = Field(default_factory=list)
    foods_to_avoid: list[str] = Field(default_factory=list)
    hydration: str = Field(default="", max_length=500)
    meal_guidance: list[str] = Field(default_factory=list)
    condition_specific_notes: list[str] = Field(default_factory=list)
    warning_signs: list[str] = Field(default_factory=list)
    lifestyle_recommendations: list[str] = Field(default_factory=list)
    recommended_vitamins: list["NutrientRecommendation"] = Field(
        default_factory=list
    )
    recommended_minerals: list["NutrientRecommendation"] = Field(
        default_factory=list
    )
    notes: list[str] = Field(default_factory=list)
    requires_doctor_review: bool = True
    disclaimer: str = "AI-generated diet recommendation. Doctor review required."


class NutrientRecommendation(BaseModel):
    """Food-first nutrient guidance without claiming deficiency."""

    name: str = ""
    reason: str = ""
    food_sources: list[str] = Field(default_factory=list)
    supplementation_note: str = ""


class DietRecommendationData(DietStructuredOutput):
    """Public data contract with deprecated Day 2 compatibility fields."""

    requires_doctor_review: Literal[True] = True
    language: LanguageMetadata | None = None
    condition: str | None = None
    general_advice: list[str] | None = None
    is_dummy: Literal[True] | None = None


class DietRecommendationResponse(ApiResponse[DietRecommendationData]):
    """Standard diet-recommendation response."""
