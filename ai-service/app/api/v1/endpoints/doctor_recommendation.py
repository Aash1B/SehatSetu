"""Doctor specialization recommendation endpoint."""

import time
from fastapi import APIRouter, Depends, status

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.core.request_context import get_request_id
from app.schemas.common import ErrorResponse
from app.schemas.doctor_recommendation import (
    DoctorRecommendationRequest,
    DoctorRecommendationResponse,
)
from app.services.doctor_recommendation_service import (
    DoctorRecommendationService,
    get_doctor_recommendation_service,
)

router = APIRouter(tags=["Doctor Recommendation"])
logger = get_logger(__name__)

NORMAL_EXAMPLE = {
    "success": True,
    "message": "Doctor specialization recommended successfully",
    "data": {
        "recommended_doctor_category": "ENT Specialist (Ear, Nose & Throat)",
        "matched_symptoms": [
            "ear pain",
            "difficulty hearing",
            "blocked nose",
        ],
        "reason": (
            "The reported symptoms are mainly related to the ear, nose and throat."
        ),
        "urgency": "normal",
        "confidence": 0.91,
        "alternative_categories": ["General Physician"],
        "recommendation_source": "symptom_rules",
        "emergency_warning": None,
        "disclaimer": (
            "This is a doctor-category recommendation and not a medical diagnosis."
        ),
    },
}

EMERGENCY_EXAMPLE = {
    "success": True,
    "message": "Doctor specialization recommended successfully",
    "data": {
        "recommended_doctor_category": "General Physician",
        "matched_symptoms": ["severe chest pain", "difficulty breathing"],
        "reason": (
            "The reported warning signs may require immediate medical "
            "assessment. This recommendation is not a diagnosis."
        ),
        "urgency": "emergency",
        "confidence": 0.96,
        "alternative_categories": [],
        "recommendation_source": "emergency_rules",
        "emergency_warning": (
            "Seek immediate emergency medical assistance. Do not wait to book "
            "a regular appointment."
        ),
        "disclaimer": "This is not a medical diagnosis.",
        "emergency_detected": True,
        "emergency_instruction": (
            "Call 112 immediately and visit the nearest suitable emergency facility."
        ),
        "nearby_hospitals": [
            {
                "raw": {
                    "googlePlaceId": "place-123",
                    "name": "City Heart and Emergency Hospital",
                    "distance": 1800,
                    "businessStatus": "OPERATIONAL",
                    "openNow": True,
                },
                "hospital_type": "speciality",
                "specialities": ["cardiology"],
                "classification_source": "keyword_rule",
                "classification_confidence": 0.82,
                "emergency_suitability_score": 100.0,
                "recommendation_reason": "Emergency suitability considers reported open now, emergency or trauma indicator, inferred speciality relevance to the reported condition, distance 1800 metres, operational listing.",
                "warnings": [
                    "Classification is inferred from listing information and is not verified."
                ],
            }
        ],
        "hospital_classification_notice": (
            "Hospital ownership and specialities may be inferred from names and listing metadata; "
            "verify them with the hospital or an authoritative source before non-emergency decisions."
        ),
    },
}


@router.post(
    "/recommend-doctor",
    response_model=DoctorRecommendationResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Recommend a doctor specialization",
    description=(
        "Runs deterministic emergency detection before any optional AI provider, then returns up to three ranked specialties. "
        "Optional raw Google Places hospitals are cautiously classified and ranked for emergency suitability. "
        "Emergencies explicitly direct the patient to immediate in-person care. It does not diagnose, name individual doctors, "
        "check availability, confirm hospital metadata, or book appointments. Human review is required."
    ),
    responses={
        200: {
            "description": "Specialization recommendation generated.",
            "content": {
                "application/json": {
                    "examples": {
                        "normal": {"value": NORMAL_EXAMPLE},
                        "emergency": {"value": EMERGENCY_EXAMPLE},
                    }
                }
            },
        },
        422: {"model": ErrorResponse, "description": "Invalid request."},
        500: {
            "model": ErrorResponse,
            "description": "Recommendation failed safely.",
        },
    },
)
async def recommend_doctor(
    request: DoctorRecommendationRequest,
    service: DoctorRecommendationService = Depends(
        get_doctor_recommendation_service
    ),
) -> DoctorRecommendationResponse:
    """Validate patient input and return only a specialization recommendation."""
    request_id = get_request_id()
    started_at = time.perf_counter()
    logger.info("Doctor recommendation started request_id=%s", request_id)
    try:
        recommendation = await service.recommend(request)
        logger.info(
            "Doctor recommendation completed request_id=%s specialization=%s "
            "urgency=%s confidence=%.2f source=%s duration_ms=%.2f",
            request_id,
            recommendation.recommended_doctor_category.value,
            recommendation.urgency.value,
            recommendation.confidence,
            recommendation.recommendation_source.value,
            (time.perf_counter() - started_at) * 1000,
        )
        return DoctorRecommendationResponse(
            message="Doctor specialization recommended successfully",
            data=recommendation,
        )
    except AppException:
        raise
    except Exception as exc:
        logger.exception(
            "Doctor recommendation failed request_id=%s", request_id, exc_info=exc
        )
        raise AppException(
            "Doctor recommendation is currently unavailable",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="DOCTOR_RECOMMENDATION_FAILED",
        ) from exc
