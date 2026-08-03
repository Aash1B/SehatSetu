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

    model_config = ConfigDict(json_schema_extra={"examples": [{"conditions": ["type 2 diabetes", "vitamin D deficiency"], "symptoms": ["fatigue"], "medications": ["metformin"], "allergies": [], "age": 45, "gender": "male", "dietary_preference": "vegetarian", "lab_values": [{"name": "vitamin D", "value": 14, "unit": "ng/mL"}]}]})

    summary: str = Field(
        default="",
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
    conditions: list[str] = Field(default_factory=list, max_length=50)
    symptoms: list[str] = Field(default_factory=list, max_length=50)
    medications: list[str] = Field(default_factory=list, max_length=50)
    lab_values: list["LabValue"] = Field(default_factory=list, max_length=100)
    legacy_input: bool = Field(default=False, exclude=True)

    @model_validator(mode="before")
    @classmethod
    def detect_legacy_input(cls, value: Any) -> Any:
        """Mark the former condition request shape for compatibility."""
        if isinstance(value, dict) and "condition" in value and "summary" not in value:
            return {**value, "legacy_input": True}
        return value

    @model_validator(mode="after")
    def require_clinical_context(self) -> "DietRecommendationRequest":
        if not self.summary and not self.conditions and not self.symptoms:
            raise ValueError("Provide summary, conditions, or symptoms")
        if not self.summary:
            self.summary = "; ".join([*self.conditions, *self.symptoms])
        return self

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, value: str) -> str:
        """Trim the summary and reject whitespace-only input."""
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("summary must not be empty")
        return normalized


class LabValue(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    value: float | str
    unit: str = Field(default="", max_length=50)


class DietStrategy(BaseModel):
    diet_type: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    reasoning: list[str] = Field(default_factory=list)


class ProteinRecommendation(BaseModel):
    recommended: bool = True
    strategy: str = "moderate-protein"
    food_sources: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)


class GlycemicGuidance(BaseModel):
    low_gi_recommended: bool = False
    preferred_carbohydrates: list[str] = Field(default_factory=list)
    foods_to_limit: list[str] = Field(default_factory=list)
    meal_pairing_tips: list[str] = Field(default_factory=list)


class SampleMealPlan(BaseModel):
    early_morning: list[str] = Field(default_factory=list)
    breakfast: list[str] = Field(default_factory=list)
    mid_morning: list[str] = Field(default_factory=list)
    lunch: list[str] = Field(default_factory=list)
    evening_snack: list[str] = Field(default_factory=list)
    dinner: list[str] = Field(default_factory=list)
    bedtime: list[str] = Field(default_factory=list)


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
    supplement_note: str = ""
    priority: str = "medium"
    evidence: list[str] = Field(default_factory=list)


class DietRecommendationData(DietStructuredOutput):
    """Public data contract with deprecated Day 2 compatibility fields."""

    requires_doctor_review: Literal[True] = True
    language: LanguageMetadata | None = None
    condition: str | None = None
    general_advice: list[str] | None = None
    is_dummy: Literal[True] | None = None
    diet_strategy: DietStrategy = Field(default_factory=DietStrategy)
    vitamins: list[NutrientRecommendation] = Field(default_factory=list)
    minerals: list[NutrientRecommendation] = Field(default_factory=list)
    protein_recommendation: ProteinRecommendation = Field(default_factory=ProteinRecommendation)
    glycemic_guidance: GlycemicGuidance = Field(default_factory=GlycemicGuidance)
    sample_meal_plan: SampleMealPlan = Field(default_factory=SampleMealPlan)
    warnings: list[str] = Field(default_factory=list)


class DietRecommendationResponse(ApiResponse[DietRecommendationData]):
    """Standard diet-recommendation response."""
