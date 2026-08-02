"""Health-check endpoint."""

from fastapi import APIRouter, status

from app.core.config import get_settings
from app.schemas.health import (
    FFmpegHealth,
    HealthData,
    HealthResponse,
    OCRHealth,
    WhisperHealth,
)
from app.core.ffmpeg import get_ffmpeg_status
from app.services.transcription_service import get_transcription_service

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Check service health",
    description=(
        "Confirms that the AI service process is running and returns its "
        "configured identity, version, and environment."
    ),
    responses={
        200: {"description": "The service is healthy."},
        500: {"description": "An unexpected internal error occurred."},
    },
)
async def health_check() -> HealthResponse:
    """Return the current service health."""
    ffmpeg_status = get_ffmpeg_status(settings)
    transcription = get_transcription_service()
    return HealthResponse(
        message="AI service is healthy",
        data=HealthData(
            service=settings.app_name,
            version=settings.app_version,
            environment=settings.app_env,
            ffmpeg=FFmpegHealth(
                available=ffmpeg_status.available,
                path=ffmpeg_status.path,
                version=ffmpeg_status.version,
                reason=ffmpeg_status.reason,
                searched_locations=ffmpeg_status.searched_locations,
            ),
            ocr=OCRHealth(
                available=bool(
                    settings.gemini_api_key
                    and settings.gemini_model.strip()
                )
            ),
            whisper=WhisperHealth(
                model=settings.whisper_model_size,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
                loaded=transcription.is_loaded,
                ready=transcription.is_ready,
            ),
            transcription_ready=ffmpeg_status.available and transcription.is_ready,
            summary_provider_ready=bool(settings.gemini_api_key),
        ),
    )
