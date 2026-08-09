"""EHR text parsing endpoint."""

import json

from fastapi import APIRouter, Depends, status

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.common import ErrorResponse
from app.schemas.ocr import EhrParseRequest, EhrParseResponse
from app.services.gemini_service import GeminiService, get_gemini_service

router = APIRouter(tags=["EHR Processing"])
logger = get_logger(__name__)

EHR_PARSE_INSTRUCTIONS = """You are a medical data extraction assistant.
From the given OCR text (and any accompanying structured data), extract only:
- diagnosis: a concise diagnosis sentence, or null if not explicitly present
- medications: an array of medication name strings explicitly present in the text
- vitals: blood_pressure, temperature, heart_rate, weight, height,
  oxygen_saturation, blood_sugar — each a string value if explicitly present
  in the text, otherwise null
- notes: any other relevant clinical information explicitly present, or null

Only extract information explicitly present in the text. Do not infer, guess,
or invent any diagnosis, medication, or vital sign. If a field cannot be
confidently found, use null (or an empty array for lists).
Return only valid JSON matching the required response schema."""


@router.post(
    "/ocr/parse-text",
    response_model=EhrParseResponse,
    response_model_exclude_none=True,
    summary="Parse extracted OCR text into structured clinical data",
    description=(
        "Parse OCR-extracted medical text and data into structured clinical "
        "information (diagnosis, medications, vitals, notes) using the "
        "existing Gemini provider. Intended for EHR draft generation."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        502: {"model": ErrorResponse, "description": "Gemini API failed"},
        503: {"model": ErrorResponse, "description": "Gemini service unavailable"},
    },
)
async def parse_ocr_text(
    request: EhrParseRequest,
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> EhrParseResponse:
    """Extract clinical information from OCR text using the shared Gemini provider."""
    logger.info("EHR text parsing request received")

    if not request.extracted_text or not request.extracted_text.strip():
        raise AppException(
            "Extracted text is required",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EHR_PARSE_EMPTY_TEXT",
        )

    prompt = json.dumps(
        {
            "ocr_text": request.extracted_text,
            "extracted_data": request.extracted_data,
        },
        ensure_ascii=False,
    )

    try:
        result = gemini_service.generate_gemini_response(
            prompt=prompt,
            system_instruction=EHR_PARSE_INSTRUCTIONS,
            response_model=EhrParseResponse,
            temperature=0.1,
            max_output_tokens=1000,
            sensitive_content=True,
        )
        logger.info("Gemini EHR parsing response validated")
        return result
    except AppException as exc:
        logger.warning("EHR text parsing failed provider_code=%s", exc.code)
        raise
    except Exception as exc:
        logger.exception("EHR text parsing failed unexpectedly", exc_info=exc)
        raise AppException(
            "EHR text parsing is currently unavailable",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="EHR_PARSE_FAILED",
        ) from exc
