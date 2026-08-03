"""Diet recommendation orchestration using validated Gemini output."""

import asyncio
from functools import lru_cache

from app.core.config import get_settings
from app.prompts.diet_prompt import DIET_SYSTEM_INSTRUCTION, build_diet_prompt
from app.schemas.diet import (
    DietRecommendationData,
    DietRecommendationRequest,
    DietStructuredOutput,
)
from app.services.gemini_service import GeminiService
from app.services.language_service import language_service
from app.services.nutrition.recommendation_service import NutritionRecommendationService


class DietService:
    """Generate practical, doctor-reviewed dietary guidance."""

    def __init__(self, gemini_service: GeminiService) -> None:
        self._gemini_service = gemini_service

    async def generate(
        self, request: DietRecommendationRequest
    ) -> DietRecommendationData:
        """Generate and safety-stamp a validated recommendation."""
        if request.conditions or request.symptoms or request.lab_values or request.medications:
            return await NutritionRecommendationService().generate(request)
        language = language_service.resolve(
            request.summary, request.language, request.output_language
        )
        structured = await asyncio.to_thread(
            self._gemini_service.generate_gemini_response,
            prompt=build_diet_prompt(
                request.summary,
                request.medical_entities,
                age=request.age,
                gender=request.gender,
                dietary_preference=request.dietary_preference,
                allergies=request.allergies,
                output_language=language.output,
            ),
            system_instruction=DIET_SYSTEM_INSTRUCTION,
            response_model=DietStructuredOutput,
            max_output_tokens=1200,
        )
        result = DietRecommendationData.model_validate(structured.model_dump())
        for field in (
            "recommended_foods",
            "foods_to_limit",
            "foods_to_avoid",
            "meal_guidance",
            "lifestyle_recommendations",
            "notes",
        ):
            values = getattr(result, field)
            setattr(
                result,
                field,
                list(
                    dict.fromkeys(value.strip() for value in values if value.strip())
                ),
            )
        result.requires_doctor_review = True
        result.disclaimer = (
            "AI-generated diet recommendation. Doctor review required."
        )
        result.language = language
        return result


@lru_cache
def get_diet_service() -> DietService:
    """Return a shared service and reusable lazy Gemini client."""
    return DietService(GeminiService(get_settings()))
