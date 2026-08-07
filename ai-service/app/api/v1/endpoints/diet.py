"""Doctor-reviewed AI diet recommendation endpoint."""

import time
from fastapi import APIRouter, Depends, status

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.core.request_context import get_request_id
from app.schemas.common import ErrorResponse
from app.schemas.diet import DietRecommendationRequest, DietRecommendationResponse
from app.services.diet_service import DietService, get_diet_service
from app.services.dummy_contracts import create_dummy_diet_recommendation

router = APIRouter(tags=["Diet Recommendation"])
logger = get_logger(__name__)


@router.post(
    "/diet-recommendation",
    response_model=DietRecommendationResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Generate a doctor-reviewed diet recommendation",
    description=(
        "Generates food-first dietary, vitamin, mineral, protein, glycaemic, and meal-plan guidance. "
        "Advanced structured inputs use deterministic medical safety rules; legacy summaries retain the provider-backed flow. "
        "No supplement dose is prescribed and doctor or dietitian approval is always required."
    ),
    responses={
        200: {
            "description": "Validated diet guidance generated.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Diet recommendation generated successfully",
                        "data": {
                            "recommended_foods": [
                                "Oats",
                                "Boiled vegetables",
                                "Fresh fruits",
                            ],
                            "foods_to_limit": ["Salt"],
                            "foods_to_avoid": ["Sugary drinks"],
                            "hydration": "Drink water regularly as advised.",
                            "meal_guidance": ["Eat smaller frequent meals."],
                            "notes": ["Follow the doctor's advice."],
                            "requires_doctor_review": True,
                            "disclaimer": (
                                "AI-generated diet recommendation. "
                                "Doctor approval required."
                            ),
                        },
                    }
                }
            },
        },
        422: {"model": ErrorResponse, "description": "Invalid request."},
        502: {"model": ErrorResponse, "description": "Invalid Gemini response."},
        504: {"model": ErrorResponse, "description": "Gemini timeout."},
    },
)
async def diet_recommendation(
    request: DietRecommendationRequest,
    service: DietService = Depends(get_diet_service),
) -> DietRecommendationResponse:
    """Generate validated guidance while retaining the deprecated request."""
    if request.legacy_input:
        return DietRecommendationResponse(
            message="Dummy diet recommendation generated",
            data=create_dummy_diet_recommendation(request),
        )

    request_id = get_request_id()
    started = time.perf_counter()
    logger.info(
        "Diet generation started request_id=%s summary_length=%d",
        request_id,
        len(request.summary),
    )
    try:
        data = await service.generate(request)
        logger.info(
            "Diet generation completed request_id=%s gemini_success=true "
            "duration_ms=%.2f",
            request_id,
            (time.perf_counter() - started) * 1000,
        )
        return DietRecommendationResponse(
            message="Diet recommendation generated successfully",
            data=data,
        )
    except AppException:
        logger.warning(
            "Diet generation failed request_id=%s gemini_success=false",
            request_id,
        )
        raise
    except Exception as exc:
        logger.exception(
            "Diet generation failed request_id=%s", request_id, exc_info=exc
        )
        raise AppException(
            "Diet recommendation is currently unavailable",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="DIET_GENERATION_FAILED",
        ) from exc
