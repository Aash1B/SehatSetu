"""Medical information extraction endpoint."""

from fastapi import APIRouter, Depends, status

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.common import ErrorResponse
from app.schemas.medical_info import MedicalInfoRequest, MedicalInfoResponse
from app.services.ner_service import MedicalNERService, get_ner_service
from app.services.language_service import language_service

router = APIRouter(tags=["Medical Information"])
logger = get_logger(__name__)

RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Medical entities extracted successfully",
    "data": {
        "symptoms": ["fever", "cough"],
        "conditions": [],
        "allergies": ["penicillin"],
        "medications": [
            {
                "name": "paracetamol",
                "dosage": "500 mg",
                "frequency": "twice daily",
            }
        ],
        "duration": ["three days"],
        "vital_signs": {
            "blood_pressure": "140/90",
            "temperature": None,
            "heart_rate": None,
            "weight": None,
            "height": None,
        },
        "procedures": [],
        "durations": ["three days"],
        "legacy_vital_signs": [
            {"name": "blood_pressure", "value": "140/90"}
        ],
        "is_dummy": False,
    },
}


@router.post(
    "/extract-medical-info",
    response_model=MedicalInfoResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Extract medical entities",
    description=(
        "Extracts symptoms, conditions, allergies, medicines, durations, "
        "vital signs, and procedures using a hybrid biomedical NER and regex "
        "pipeline. The legacy `text` request property remains accepted."
    ),
    responses={
        200: {
            "description": "Medical entities extracted successfully.",
            "content": {"application/json": {"example": RESPONSE_EXAMPLE}},
        },
        422: {"model": ErrorResponse, "description": "Invalid request."},
        500: {
            "model": ErrorResponse,
            "description": "Entity extraction failed safely.",
        },
    },
)
async def extract_medical_info(
    request: MedicalInfoRequest,
    service: MedicalNERService = Depends(get_ner_service),
) -> MedicalInfoResponse:
    """Validate a transcript and return extracted medical entities."""
    logger.info("Medical entity extraction request received")
    try:
        language_service.resolve(
            request.transcript, request.language, request.output_language
        )
        data = service.extract(request.transcript)
        # Retain the Day 2 compatibility marker while older clients migrate.
        data.is_dummy = request.legacy_text_input
        if request.legacy_text_input:
            data.vital_signs = data.legacy_vital_signs
        return MedicalInfoResponse(
            message="Medical entities extracted successfully",
            data=data,
        )
    except AppException:
        raise
    except Exception as exc:
        logger.exception("Medical entity extraction failed", exc_info=exc)
        raise AppException(
            "Medical entity extraction is currently unavailable",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="NER_PROCESSING_FAILED",
        ) from exc
