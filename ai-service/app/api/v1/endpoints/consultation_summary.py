"""Consultation summary generation endpoint."""

from fastapi import APIRouter, Depends, status

from app.core.logging import get_logger
from app.schemas.common import ErrorResponse
from app.schemas.consultation_summary import (
    ConsultationSummaryRequest,
    ConsultationSummaryResponse,
)
from app.services.dummy_contracts import create_dummy_summary
from app.services.summary_service import SummaryService, get_summary_service
from app.services.language_service import language_service

router = APIRouter(tags=["Consultation Summary"])
logger = get_logger(__name__)

REQUEST_EXAMPLE = {
    "transcript": (
        "Patient has had fever for three days and complains of headache. "
        "Blood pressure is 140/90. Allergic to penicillin."
    ),
    "medical_entities": {
        "symptoms": ["fever", "headache"],
        "duration": ["three days"],
        "allergies": ["penicillin"],
        "vital_signs": {"blood_pressure": "140/90"},
    },
}
RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Summary generated successfully",
    "data": {
        "summary": (
            "The patient presented with fever and headache for three days. "
            "Blood pressure measured 140/90. The patient is allergic to "
            "penicillin."
        )
    },
}


@router.post(
    "/generate-summary",
    response_model=ConsultationSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate consultation summary",
    description=(
        "Uses Google Gemini to produce a concise summary grounded "
        "only in the transcript and optional Day 4 medical entities. "
        "Transcript-only Day 2 requests retain their legacy response."
    ),
    openapi_extra={
        "requestBody": {
            "content": {"application/json": {"example": REQUEST_EXAMPLE}}
        }
    },
    responses={
        200: {
            "description": "Summary generated successfully.",
            "content": {"application/json": {"example": RESPONSE_EXAMPLE}},
        },
        422: {"model": ErrorResponse, "description": "Invalid request."},
        429: {"model": ErrorResponse, "description": "Provider rate limit."},
        502: {"model": ErrorResponse, "description": "Provider failure."},
        503: {"model": ErrorResponse, "description": "API key missing."},
        504: {"model": ErrorResponse, "description": "Provider timeout."},
    },
)
async def generate_summary(
    request: ConsultationSummaryRequest,
    service: SummaryService = Depends(get_summary_service),
) -> ConsultationSummaryResponse:
    """Validate input and return a generated or compatible legacy summary."""
    logger.info("Consultation summary request received")
    language_service.resolve(
        request.transcript, request.language, request.output_language
    )
    if request.medical_entities is None:
        return ConsultationSummaryResponse(
            message="Dummy consultation summary generated",
            data=create_dummy_summary(),
        )

    data = service.generate(request.transcript, request.medical_entities)
    return ConsultationSummaryResponse(
        message="Summary generated successfully",
        data=data,
    )
