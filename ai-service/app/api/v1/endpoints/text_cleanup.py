"""Conservative transcript cleanup endpoint."""

from fastapi import APIRouter, Depends

from app.core.logging import get_logger
from app.schemas.common import ErrorResponse
from app.schemas.text_cleanup import (
    TextCleanupData,
    TextCleanupRequest,
    TextCleanupResponse,
)
from app.services.text_cleanup_service import (
    TextCleanupService,
    get_text_cleanup_service,
)

router = APIRouter(tags=["Transcript Cleanup"])
logger = get_logger(__name__)


@router.post(
    "/clean-transcript",
    response_model=TextCleanupResponse,
    summary="Clean a medical transcript",
    description=(
        "Normalizes whitespace, punctuation, dosage spacing, and clearly "
        "spoken blood-pressure measurements without inventing clinical facts."
    ),
    responses={422: {"model": ErrorResponse, "description": "Invalid request."}},
)
async def clean_transcript(
    request: TextCleanupRequest,
    service: TextCleanupService = Depends(get_text_cleanup_service),
) -> TextCleanupResponse:
    """Return a conservatively normalized transcript."""
    logger.info("Transcript cleanup request received")
    cleaned = service.clean(request.transcript)
    logger.info("Transcript cleanup completed character_count=%d", len(cleaned))
    return TextCleanupResponse(
        message="Transcript cleaned successfully",
        data=TextCleanupData(
            original_transcript=request.transcript,
            cleaned_transcript=cleaned,
        ),
    )
