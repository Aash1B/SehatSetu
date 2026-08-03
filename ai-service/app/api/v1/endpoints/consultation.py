"""Unified typed-note and transcript consultation generation endpoint."""

import time
from fastapi import APIRouter, Depends
from app.core.logging import get_logger
from app.core.request_context import get_request_id
from app.schemas.consultation import UnifiedConsultationRequest, UnifiedConsultationResponse
from app.services.consultation.input_merge_service import ConsultationInputMergeService, get_consultation_input_merge_service

router = APIRouter(tags=["Consultation Generation"])
logger = get_logger(__name__)


@router.post(
    "/generate-consultation",
    response_model=UnifiedConsultationResponse,
    response_model_exclude_none=True,
    summary="Generate consultation outputs from typed notes and/or transcript",
    description="Doctor-confirmed fields take priority over typed notes, then usable speech. Emergency rules run locally before recommendations. All generated advice requires doctor confirmation.",
)
async def generate_consultation(request: UnifiedConsultationRequest, service: ConsultationInputMergeService = Depends(get_consultation_input_merge_service)) -> UnifiedConsultationResponse:
    request_id = get_request_id()
    started = time.perf_counter()
    logger.info("Unified consultation generation started request_id=%s", request_id)
    data = await service.generate(request)
    response = UnifiedConsultationResponse(message="Consultation outputs generated successfully", data=data)
    response.meta.processing_time_ms = (time.perf_counter() - started) * 1000
    return response

