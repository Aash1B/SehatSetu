"""Raw-transcript NER-backed prescription draft endpoint."""

import asyncio
from time import perf_counter
from fastapi import APIRouter, Depends, status

from app.core.logging import get_logger
from app.core.request_context import get_request_id
from app.schemas.common import ErrorResponse
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.summarize_service import (
    SummarizeService,
    get_summarize_service,
)

router = APIRouter(tags=["Prescription"])
logger = get_logger(__name__)


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    response_model_exclude_none=True,
    summary="Generate an NER-backed prescription draft",
    description=(
        "Accepts a raw medical consultation transcript, extracts entities "
        "internally, and returns a structured AI-assisted draft. The result "
        "requires doctor review and confirmation and is not an autonomous "
        "prescription or final diagnosis."
    ),
    responses={
        200: {
            "description": "Doctor-review draft generated.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Prescription draft generated",
                        "data": {
                            "identified_issues": ["hypertension"],
                            "identified_symptoms": ["chest pain"],
                            "medications": [
                                {
                                    "name": "metformin",
                                    "dosage": "500 mg",
                                    "frequency": "twice daily",
                                    "route": None,
                                    "duration": None,
                                }
                            ],
                            "recommended_lab_tests": ["cbc"],
                            "vitals": ["blood_pressure: 176/110"],
                            "allergies": [],
                            "warnings": [],
                            "diagnosis": (
                                "Draft diagnosis pending doctor review"
                            ),
                            "requires_doctor_review": True,
                            "requires_doctor_confirmation": True,
                            "disclaimer": (
                                "AI-generated draft. Doctor approval required."
                            ),
                            "is_dummy": False,
                        },
                    }
                }
            },
        },
        422: {"model": ErrorResponse, "description": "Invalid transcript."},
        500: {"model": ErrorResponse, "description": "NER extraction failed."},
    },
)
async def summarize_transcript(
    request: SummarizeRequest,
    service: SummarizeService = Depends(get_summarize_service),
) -> SummarizeResponse:
    """Generate a safe draft directly from one raw transcript."""
    request_id = get_request_id()
    started = perf_counter()
    logger.info(
        "Summarization request started request_id=%s transcript_characters=%d",
        request_id,
        len(request.transcript),
    )
    draft, limited = await asyncio.to_thread(
        service.generate,
        request.transcript,
        request_id,
    )
    message = (
        "Dummy prescription draft generated"
        if draft.is_dummy
        else (
            "Prescription draft generated with limited extracted information"
            if limited
            else "Prescription draft generated"
        )
    )
    logger.info(
        "Summarization request finished request_id=%s processing_seconds=%.3f",
        request_id,
        perf_counter() - started,
    )
    return SummarizeResponse(message=message, data=draft)
