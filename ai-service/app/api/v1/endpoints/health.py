"""Health-check endpoint."""

from fastapi import APIRouter, status

from app.core.config import get_settings
from app.schemas.health import (
    FFmpegHealth,
    HealthData,
    HealthResponse,
    OCRHealth,
)
from app.core.ffmpeg import get_ffmpeg_status

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
        ),
    )
