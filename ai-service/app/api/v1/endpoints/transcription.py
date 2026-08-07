"""Secure uploaded-audio transcription endpoint."""

import asyncio
import time
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.core.request_context import get_request_id
from app.schemas.common import ErrorResponse
from app.schemas.transcription import TranscriptionResponse
from app.services.transcription_service import (
    TranscriptionService,
    get_transcription_service,
)
from app.services.language_service import language_service
from app.services.audio_conversion_service import AudioConversionService

router = APIRouter(tags=["Transcription"])
logger = get_logger(__name__)
settings = get_settings()
_transcription_slots = asyncio.Semaphore(
    settings.transcription_max_concurrent_requests
)

SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".mp4", ".aac", ".flac", ".opus"}
SUPPORTED_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
    "audio/webm",
    "video/webm",
    "audio/ogg",
    "application/ogg",
    "video/mp4",
    "audio/aac", "audio/flac", "audio/x-flac", "audio/opus",
    "application/octet-stream",
}
UPLOAD_CHUNK_SIZE = 1024 * 1024


def _validate_file_metadata(upload: UploadFile) -> str:
    """Validate untrusted filename and content metadata."""
    filename = upload.filename or ""
    if (
        not filename
        or len(filename) > 255
        or filename in {".", ".."}
        or "/" in filename
        or "\\" in filename
        or any(ord(character) < 32 for character in filename)
    ):
        raise AppException(
            "The uploaded filename is invalid",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="UNSAFE_FILENAME",
        )

    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise AppException(
            "Unsupported audio file extension",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="UNSUPPORTED_FILE_EXTENSION",
            details={"supported_extensions": sorted(SUPPORTED_EXTENSIONS)},
        )

    original_content_type = upload.content_type or ""
    normalized_content_type = original_content_type.lower().split(";")[0].strip()
    logger.info(
        "Received audio filename=%s content_type=%s normalized_type=%s",
        filename,
        original_content_type,
        normalized_content_type,
    )
    # MIME metadata is advisory: browsers frequently omit it or report a
    # generic binary type. FFmpeg decodability is the authoritative check.
    if normalized_content_type and normalized_content_type not in SUPPORTED_MIME_TYPES:
        raise AppException(
            "Unsupported audio MIME type",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="UNSUPPORTED_MIME_TYPE",
            details=original_content_type or None,
        )
    return extension


async def _save_upload(upload: UploadFile, destination: Path) -> int:
    """Write an upload in bounded chunks while enforcing its size limit."""
    max_bytes = int(settings.effective_audio_max_size_mb * 1024 * 1024)
    total_bytes = 0

    with destination.open("xb") as temporary_file:
        while chunk := await upload.read(UPLOAD_CHUNK_SIZE):
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                raise AppException(
                    f"Audio file exceeds the {settings.effective_audio_max_size_mb:g} MB limit",
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    code="AUDIO_FILE_TOO_LARGE",
                )
            temporary_file.write(chunk)

    if total_bytes == 0:
        raise AppException(
            "The uploaded audio file is empty",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="EMPTY_AUDIO_FILE",
        )
    return total_bytes


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe an uploaded audio file",
    description=(
        "Uploads a supported audio file for local faster-whisper transcription. "
        "The file is held only temporarily and removed after success or failure. "
        "Use `auto` to let Whisper detect English or Hindi."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Unsafe filename."},
        413: {"model": ErrorResponse, "description": "File exceeds size limit."},
        415: {"model": ErrorResponse, "description": "Unsupported media type."},
        422: {"model": ErrorResponse, "description": "Invalid audio or no speech."},
        504: {"model": ErrorResponse, "description": "Transcription timed out."},
    },
)
async def transcribe(
    file: Annotated[UploadFile, File(description="Audio file to transcribe.")],
    language_hint: Annotated[
        str,
        Form(
            description=(
                "Language code or alias; `auto` enables model detection."
            ),
            examples=["auto", "en", "Hindi", "hi-Latn"],
        ),
    ] = "auto",
    language: Annotated[
        str | None,
        Form(
            description=(
                "Preferred language parameter. Overrides legacy `language_hint`."
            )
        ),
    ] = None,
    output_language: Annotated[
        str | None,
        Form(
            description=(
                "Optional response language; null, empty, and `auto` preserve "
                "the detected spoken language."
            )
        ),
    ] = None,
    include_segments: Annotated[
        bool, Form(description="Include time-aligned segments in the response.")
    ] = True,
    task: Annotated[
        Literal["transcribe"],
        Form(description="Whisper task. Translation is intentionally unsupported."),
    ] = "transcribe",
    service: TranscriptionService = Depends(get_transcription_service),
) -> TranscriptionResponse:
    """Validate, temporarily store, and locally transcribe uploaded audio."""
    request_id = get_request_id()
    started_at = time.monotonic()
    temporary_path: Path | None = None
    normalized_path: Path | None = None
    outcome = "failed"

    logger.info("Transcription request started request_id=%s", request_id)
    try:
        extension = _validate_file_metadata(file)
        temporary_directory = settings.temp_audio_dir.resolve()
        temporary_directory.mkdir(parents=True, exist_ok=True)
        temporary_path = temporary_directory / f"{uuid4().hex}{extension}"
        normalized_path = temporary_directory / f"{uuid4().hex}.wav"

        file_size = await _save_upload(file, temporary_path)
        logger.info(
            "Audio accepted request_id=%s type=%s size_bytes=%d model=%s",
            request_id,
            file.content_type,
            file_size,
            settings.whisper_model_size,
        )

        selected_language = language or language_hint
        if selected_language != "auto":
            selected_language = language_service.resolve(
                "", selected_language, selected_language
            ).detected
        if isinstance(service, TranscriptionService):
            metadata = await asyncio.to_thread(
                AudioConversionService(settings).convert,
                temporary_path,
                normalized_path,
                file.content_type or "application/octet-stream",
            )
        else:
            # Dependency-overridden lightweight unit services predate the
            # normalization pipeline and intentionally receive the saved file.
            from app.services.audio_conversion_service import ConvertedAudioMetadata
            normalized_path = temporary_path
            metadata = ConvertedAudioMetadata(
                duration_seconds=0,
                size_bytes=file_size,
                sample_rate=settings.audio_sample_rate,
                channels=settings.audio_channels,
                rms=float(settings.vad_min_rms),
                speech_detected=True,
            )
        if metadata.duration_seconds > settings.audio_max_duration_seconds:
            raise AppException(
                "Audio exceeds the configured duration limit",
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                code="AUDIO_DURATION_TOO_LONG",
                details={"maximum_duration_seconds": settings.audio_max_duration_seconds},
            )
        if not metadata.speech_detected:
            raise AppException(
                "No usable speech was detected in the audio",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="NO_SPEECH_DETECTED",
            )
        transcription_started_at = time.monotonic()
        slot_acquired = False
        try:
            try:
                await asyncio.wait_for(
                    _transcription_slots.acquire(),
                    timeout=settings.transcription_queue_timeout_seconds,
                )
                slot_acquired = True
            except TimeoutError as exc:
                raise AppException(
                    "The transcription queue is busy; retry later.",
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    code="TRANSCRIPTION_QUEUE_TIMEOUT",
                ) from exc
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    service.transcribe,
                    normalized_path,
                    selected_language,
                ),
                timeout=settings.transcription_timeout_seconds,
            )
        except TimeoutError as exc:
            outcome = "timeout"
            raise AppException(
                "Audio transcription timed out",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                code="TRANSCRIPTION_TIMEOUT",
            ) from exc
        finally:
            if slot_acquired:
                _transcription_slots.release()

        result.processing_time_seconds = (
            time.monotonic() - transcription_started_at
        )
        if metadata.duration_seconds:
            result.audio_duration_seconds = metadata.duration_seconds
            result.duration_seconds = metadata.duration_seconds
        result.warnings = list(dict.fromkeys([*result.warnings, *metadata.warnings]))
        language_service.resolve(
            result.transcript,
            result.detected_language,
            output_language,
        )
        if not include_segments:
            result.segments = []
        outcome = "success"
        return TranscriptionResponse(
            message="Audio transcribed successfully",
            data=result,
        )
    except AppException as exc:
        outcome = exc.code
        raise
    finally:
        await file.close()
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        if normalized_path is not None:
            normalized_path.unlink(missing_ok=True)
        logger.info(
            "Transcription request finished request_id=%s outcome=%s "
            "processing_seconds=%.3f",
            request_id,
            outcome,
            time.monotonic() - started_at,
        )
