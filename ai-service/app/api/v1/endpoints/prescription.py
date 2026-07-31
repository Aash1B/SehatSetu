"""Doctor-reviewed AI prescription draft endpoint."""

import asyncio
import time
from fastapi import APIRouter, Depends, status

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.core.request_context import get_request_id
from app.schemas.common import ErrorResponse
from app.schemas.prescription import PrescriptionRequest, PrescriptionResponse
from app.schemas.summarize import SummarizeResponse
from app.services.prescription_service import (
    PrescriptionService,
    get_prescription_service,
)
from app.services.summarize_service import (
    SummarizeService,
    get_summarize_service,
)

router = APIRouter(tags=["Prescription"])
logger = get_logger(__name__)


@router.post(
    "/generate-prescription",
    response_model=PrescriptionResponse | SummarizeResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Generate a doctor-reviewed prescription draft",
    description=(
        "Uses Gemini to prepare structured medication suggestions for doctor "
        "consideration. It does not diagnose or replace clinical judgement."
    ),
    responses={
        200: {
            "description": "Validated draft generated.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Prescription draft generated successfully",
                        "data": {
                            "medications": [
                                {
                                    "medicine": "Paracetamol",
                                    "dosage": "500 mg",
                                    "frequency": "Twice daily",
                                    "route": "Oral",
                                    "duration": "5 days",
                                    "instructions": "Take after meals",
                                }
                            ],
                            "warnings": [
                                "Review allergy history before prescribing."
                            ],
                            "requires_doctor_review": True,
                            "disclaimer": (
                                "AI-generated draft. Doctor approval required."
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
async def generate_prescription(
    request: PrescriptionRequest,
    service: PrescriptionService = Depends(get_prescription_service),
    summarize_service: SummarizeService = Depends(get_summarize_service),
) -> PrescriptionResponse | SummarizeResponse:
    """Generate a safe draft while retaining the deprecated Day 2 request."""
    if request.legacy_input:
        request_id = get_request_id()
        draft, limited = await asyncio.to_thread(
            summarize_service.generate,
            request.summary,
            request_id,
        )
        return SummarizeResponse(
            message=(
                "Dummy prescription draft generated"
                if draft.is_dummy
                else (
                    "Prescription draft generated with limited extracted "
                    "information"
                    if limited
                    else "Prescription draft generated"
                )
            ),
            data=draft,
        )

    request_id = get_request_id()
    started = time.perf_counter()
    logger.info(
        "Prescription generation started request_id=%s summary_length=%d",
        request_id,
        len(request.summary),
    )
    try:
        data = await service.generate(request)
        logger.info(
            "Prescription generation completed request_id=%s medications=%d "
            "gemini_success=true duration_ms=%.2f",
            request_id,
            len(data.medications),
            (time.perf_counter() - started) * 1000,
        )
        return PrescriptionResponse(
            message="Prescription draft generated successfully",
            data=data,
        )
    except AppException:
        logger.warning(
            "Prescription generation failed request_id=%s gemini_success=false",
            request_id,
        )
        raise
    except Exception as exc:
        logger.exception(
            "Prescription generation failed request_id=%s", request_id,
            exc_info=exc,
        )
        raise AppException(
            "Prescription generation is currently unavailable",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="PRESCRIPTION_GENERATION_FAILED",
        ) from exc
