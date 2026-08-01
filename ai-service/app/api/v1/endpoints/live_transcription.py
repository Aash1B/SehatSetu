"""Stateless-friendly live browser audio chunk transcription."""

import asyncio
import inspect
import time
from contextlib import suppress
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)

from app.api.v1.endpoints.transcription import (
    SUPPORTED_MIME_TYPES,
    _save_upload,
    _validate_file_metadata,
)
from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.live_transcription import (
    LiveTranscriptionData,
    LiveTranscriptionResponse,
)
from app.services.audio_conversion_service import AudioConversionService
from app.services.transcript_merge_service import last_n_words, merge_transcripts
from app.services.transcription_service import (
    TranscriptionService,
    get_transcription_service,
)
from app.services.language_service import language_service
from app.services.live_transcript_session_service import (
    LiveTranscriptSession,
    LiveTranscriptSessionManager,
)

router = APIRouter(tags=["Live Transcription"])
settings = get_settings()
session_manager = LiveTranscriptSessionManager(settings)
logger = get_logger(__name__)
MIME_EXTENSIONS = {
    "audio/webm": ".webm",
    "video/webm": ".webm",
    "audio/ogg": ".ogg",
    "application/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".m4a",
    "video/mp4": ".mp4",
    "audio/m4a": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
}


def _transcribe_with_context(
    service: TranscriptionService,
    audio_path: Path,
    language: str,
    previous_transcript: str,
):
    """Pass bounded context when supported by the injected service."""
    prompt = last_n_words(
        previous_transcript, settings.whisper_context_words
    )
    parameters = inspect.signature(service.transcribe).parameters
    if "initial_prompt" in parameters:
        return service.transcribe(
            audio_path,
            language,
            initial_prompt=prompt or None,
        )
    return service.transcribe(audio_path, language)


def _session_input_language(session: LiveTranscriptSession) -> str:
    """Preserve explicit or once-detected language across live chunks."""
    if session.language != "auto":
        return session.language
    if session.detected_language not in {"", "unknown", "auto"}:
        return session.detected_language
    return "auto"


async def _process_chunk_bytes(
    audio: bytes,
    mime_type: str,
    session: LiveTranscriptSession,
    chunk_id: str,
    sequence_number: int,
    is_final: bool,
    service: TranscriptionService,
) -> LiveTranscriptionData:
    """Convert and transcribe bytes without blocking the event loop."""
    started = time.monotonic()
    base_mime = mime_type.lower().split(";")[0].strip()
    if base_mime not in SUPPORTED_MIME_TYPES:
        raise AppException(
            "Unsupported live audio MIME type",
            code="UNSUPPORTED_MIME_TYPE",
            details={"accepted": sorted(SUPPORTED_MIME_TYPES)},
        )
    max_bytes = int(settings.live_transcript_max_chunk_size_mb * 1024 * 1024)
    if not audio:
        raise AppException("Audio chunk is empty", code="EMPTY_AUDIO_FILE")
    if len(audio) > max_bytes:
        raise AppException("Audio chunk is too large", code="AUDIO_FILE_TOO_LARGE")
    directory = settings.temp_audio_dir.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / f"{uuid4().hex}{MIME_EXTENSIONS[base_mime]}"
    converted = directory / f"{uuid4().hex}.wav"
    try:
        source.write_bytes(audio)
        converted_metadata = await asyncio.to_thread(
            AudioConversionService(settings).convert,
            source,
            converted,
            mime_type,
        )
        try:
            if (
                hasattr(converted_metadata, "speech_detected")
                and not converted_metadata.speech_detected
            ):
                raise AppException(
                    "No recognizable speech was detected in the audio",
                    code="NO_SPEECH_DETECTED",
                )
            result = await asyncio.to_thread(
                _transcribe_with_context,
                service,
                converted,
                _session_input_language(session),
                session.merged_transcript,
            )
            chunk_text = result.transcript
            if session.detected_language in {"", "unknown", "auto"}:
                session.detected_language = result.detected_language
            confidence = result.language_probability
        except AppException as exc:
            if exc.code != "NO_SPEECH_DETECTED":
                raise
            chunk_text, confidence = "", None
        session.merged_transcript = merge_transcripts(
            session.merged_transcript, chunk_text
        )
        session.last_activity = time.monotonic()
        return LiveTranscriptionData(
            session_id=session.session_id,
            chunk_id=chunk_id,
            sequence_number=sequence_number,
            chunk_transcript=chunk_text,
            merged_transcript=session.merged_transcript,
            speech_detected=bool(chunk_text),
            detected_language=session.detected_language,
            language_confidence=confidence,
            processing_time_ms=(time.monotonic() - started) * 1000,
            is_final=is_final,
        )
    finally:
        source.unlink(missing_ok=True)
        converted.unlink(missing_ok=True)


async def _send_ws_error(
    websocket: WebSocket,
    code: str,
    message: str,
    recoverable: bool = True,
    details: dict[str, object] | None = None,
) -> None:
    await websocket.send_json(
        {
            "type": "error",
            "code": code,
            "message": message,
            "recoverable": recoverable,
            "details": details,
        }
    )


@router.post(
    "/live-transcription/chunk",
    response_model=LiveTranscriptionResponse,
    summary="Transcribe one browser-recorded audio chunk",
)
async def transcribe_live_chunk(
    file: Annotated[UploadFile, File()],
    session_id: Annotated[str | None, Form()] = None,
    chunk_id: Annotated[str | None, Form()] = None,
    sequence_number: Annotated[int, Form(ge=0)] = 1,
    timestamp_start_ms: Annotated[int, Form(ge=0)] = 0,
    timestamp_end_ms: Annotated[int, Form(ge=0)] = 10000,
    language: Annotated[str, Form()] = "auto",
    output_language: Annotated[str | None, Form()] = None,
    is_final: Annotated[bool, Form()] = False,
    previous_transcript: Annotated[str, Form()] = "",
    expected_sequence_number: Annotated[int | None, Form(ge=0)] = None,
    multiple_chunks_expected: Annotated[bool, Form()] = False,
    service: TranscriptionService = Depends(get_transcription_service),
) -> LiveTranscriptionResponse:
    """Convert, transcribe, and overlap-merge one idempotent chunk."""
    explicit_session = bool(session_id and session_id.strip())
    resolved_session_id = (
        session_id.strip() if explicit_session else f"standalone-{uuid4().hex}"
    )
    resolved_chunk_id = (
        chunk_id.strip() if chunk_id and chunk_id.strip() else uuid4().hex
    )
    enforce_sequence = explicit_session and (
        multiple_chunks_expected or expected_sequence_number is not None
    )
    if explicit_session:
        session, newly_created = session_manager.start_with_status(
            resolved_session_id, language, output_language
        )
    else:
        session, newly_created = None, True
    expected = session.expected_sequence_number if session else 1
    logger.info(
        "REST live chunk session_id=%s expected_sequence=%d "
        "received_sequence=%d chunk_id=%s newly_created=%s retry=%s",
        resolved_session_id,
        expected,
        sequence_number,
        resolved_chunk_id,
        newly_created,
        bool(session and resolved_chunk_id in session.attempted_chunk_ids),
    )

    if (
        timestamp_end_ms - timestamp_start_ms
        < settings.live_transcript_min_chunk_duration_ms
    ):
        raise AppException(
            "Audio chunk is shorter than the minimum usable duration.",
            code="AUDIO_TOO_SHORT",
            details={
                "minimum_duration_ms": (
                    settings.live_transcript_min_chunk_duration_ms
                )
            },
        )
    if sequence_number == 0:
        raise AppException(
            "Audio chunk arrived out of order.",
            code="OUT_OF_ORDER_AUDIO_CHUNK",
            details={
                "session_id": resolved_session_id,
                "expected_sequence": 1,
                "received_sequence": 0,
                "recoverable": True,
            },
        )
    if session and resolved_chunk_id in session.processed_chunk_ids:
        logger.info(
            "REST duplicate acknowledged session_id=%s chunk_id=%s "
            "received_sequence=%d expected_sequence=%d retry=true",
            resolved_session_id,
            resolved_chunk_id,
            sequence_number,
            session.expected_sequence_number,
        )
        return LiveTranscriptionResponse(
            message="Duplicate audio chunk acknowledged",
            data=LiveTranscriptionData(
                session_id=resolved_session_id,
                chunk_id=resolved_chunk_id,
                sequence_number=sequence_number,
                chunk_transcript="",
                merged_transcript=session.merged_transcript,
                speech_detected=False,
                detected_language=session.detected_language,
                processing_time_ms=0,
                is_final=is_final,
            ),
        )
    if enforce_sequence and session and sequence_number != session.expected_sequence_number:
        raise AppException(
            "Audio chunk arrived out of order.",
            code="OUT_OF_ORDER_AUDIO_CHUNK",
            details={
                "session_id": resolved_session_id,
                "expected_sequence": session.expected_sequence_number,
                "received_sequence": sequence_number,
                "recoverable": True,
            },
        )
    started = time.monotonic()
    if session:
        session.attempted_chunk_ids.add(resolved_chunk_id)
    language_metadata = language_service.resolve(
        "", language, output_language
    )
    selected_language = (
        "auto"
        if language_service.normalize(language, allow_auto=True) in {None, "auto"}
        else language_metadata.detected
    )
    extension = _validate_file_metadata(file)
    directory = settings.temp_audio_dir.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / f"{uuid4().hex}{extension}"
    converted = directory / f"{uuid4().hex}.wav"
    try:
        await _save_upload(file, source)
        converted_metadata = await asyncio.to_thread(
            AudioConversionService(settings).convert,
            source,
            converted,
            file.content_type or "application/octet-stream",
        )
        try:
            if (
                hasattr(converted_metadata, "speech_detected")
                and not converted_metadata.speech_detected
            ):
                raise AppException(
                    "No recognizable speech was detected in the audio",
                    code="NO_SPEECH_DETECTED",
                )
            context = (
                session.merged_transcript
                if session and session.merged_transcript
                else previous_transcript
            )
            result = await asyncio.to_thread(
                _transcribe_with_context,
                service,
                converted,
                (
                    _session_input_language(session)
                    if session
                    else selected_language
                ),
                context,
            )
            chunk_text = result.transcript
            detected = result.detected_language
            confidence = result.language_probability
        except AppException as exc:
            if exc.code != "NO_SPEECH_DETECTED":
                raise
            chunk_text, detected, confidence = "", language, None
        prior_transcript = (
            session.merged_transcript
            if session and session.merged_transcript
            else previous_transcript
        )
        merged = merge_transcripts(prior_transcript, chunk_text)
        if session:
            session.merged_transcript = merged
            if session.detected_language in {"", "unknown", "auto"}:
                session.detected_language = detected
            session.processed_chunk_ids.add(resolved_chunk_id)
            if enforce_sequence:
                session.expected_sequence_number += 1
        data = LiveTranscriptionData(
            session_id=resolved_session_id,
            chunk_id=resolved_chunk_id,
            sequence_number=sequence_number,
            chunk_transcript=chunk_text,
            merged_transcript=merged,
            speech_detected=bool(chunk_text),
            detected_language=detected,
            language_confidence=confidence,
            processing_time_ms=(time.monotonic() - started) * 1000,
            is_final=is_final,
            accepted_chunk_index=sequence_number,
            expected_next_chunk=(
                session.expected_sequence_number if session else sequence_number + 1
            ),
            partial_transcript=merged,
            finalized_transcript=merged if is_final else None,
            needs_more_audio=not is_final and not bool(chunk_text),
            warnings=[] if chunk_text else ["silence_or_no_recognizable_speech"],
        )
        response = LiveTranscriptionResponse(
            message="Live audio chunk processed", data=data
        )
        if session and is_final:
            session_manager.cancel(resolved_session_id)
        logger.info(
            "REST live chunk completed session_id=%s chunk_id=%s "
            "sequence=%d processing_succeeded=true",
            resolved_session_id,
            resolved_chunk_id,
            sequence_number,
        )
        return response
    except AppException as exc:
        logger.warning(
            "REST live chunk failed session_id=%s chunk_id=%s sequence=%d "
            "processing_succeeded=false code=%s",
            resolved_session_id,
            resolved_chunk_id,
            sequence_number,
            exc.code,
        )
        raise
    finally:
        await file.close()
        source.unlink(missing_ok=True)
        converted.unlink(missing_ok=True)


@router.websocket("/live-transcription/ws")
async def live_transcription_websocket(
    websocket: WebSocket,
    service: TranscriptionService = Depends(get_transcription_service),
) -> None:
    """Stream sequential browser chunks with resumable temporary state."""
    await websocket.accept()
    session: LiveTranscriptSession | None = None
    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")

            if message_type in {"session_start", "session_resume"}:
                session_id = str(message.get("session_id", "")).strip()
                if not session_id:
                    await _send_ws_error(
                        websocket, "INVALID_CONTROL_MESSAGE",
                        "session_id is required.", False,
                    )
                    continue
                language = str(message.get("language", "auto"))
                output_language = message.get("output_language")
                language_metadata = language_service.resolve(
                    "", language, output_language
                )
                selected_language = (
                    "auto"
                    if language_service.normalize(
                        language, allow_auto=True
                    ) in {None, "auto"}
                    else language_metadata.detected
                )
                session, newly_created = session_manager.start_with_status(
                    session_id,
                    selected_language,
                    language_metadata.output,
                )
                logger.info(
                    "WebSocket live session session_id=%s expected_sequence=%d "
                    "newly_created=%s",
                    session_id,
                    session.expected_sequence_number,
                    newly_created,
                )
                if message_type == "session_resume":
                    supplied = str(message.get("current_transcript", "")).strip()
                    if supplied and not session.merged_transcript:
                        session.merged_transcript = supplied
                    last_sequence = message.get("last_received_sequence_number")
                    if isinstance(last_sequence, int):
                        session.expected_sequence_number = max(
                            session.expected_sequence_number,
                            last_sequence + 1,
                        )
                await websocket.send_json(
                    {"type": "session_ready", "session_id": session_id}
                )
                continue

            if session is None:
                await _send_ws_error(
                    websocket, "SESSION_NOT_STARTED",
                    "Send session_start before other messages.", False,
                )
                continue

            if message_type == "pause":
                session.paused = True
                session.last_activity = time.monotonic()
                await websocket.send_json(
                    {"type": "paused", "session_id": session.session_id}
                )
            elif message_type == "resume":
                session.paused = False
                session.last_activity = time.monotonic()
                await websocket.send_json(
                    {"type": "resumed", "session_id": session.session_id}
                )
            elif message_type == "cancel":
                session_manager.cancel(session.session_id)
                await websocket.send_json(
                    {"type": "cancelled", "session_id": session.session_id}
                )
                await websocket.close(code=1000)
                return
            elif message_type == "finalize":
                finalized_session_id = session.session_id
                await websocket.send_json(
                    {
                        "type": "transcript_final",
                        "session_id": finalized_session_id,
                        "final_transcript": session.merged_transcript,
                        "detected_language": session.detected_language,
                        "is_final": True,
                    }
                )
                session_manager.cancel(finalized_session_id)
                session = None
            elif message_type == "audio_chunk_metadata":
                if session.paused:
                    await _send_ws_error(
                        websocket, "SESSION_PAUSED",
                        "Resume the session before sending audio.",
                    )
                    continue
                chunk_id = str(message.get("chunk_id", "")).strip()
                sequence = message.get("sequence_number")
                if not chunk_id or not isinstance(sequence, int):
                    await _send_ws_error(
                        websocket, "INVALID_CONTROL_MESSAGE",
                        "chunk_id and sequence_number are required.",
                    )
                    continue
                if chunk_id in session.processed_chunk_ids:
                    await websocket.send_json(
                        {
                            "type": "chunk_received",
                            "chunk_id": chunk_id,
                            "sequence_number": sequence,
                            "duplicate": True,
                            "merged_transcript": session.merged_transcript,
                        }
                    )
                    continue
                if sequence != session.expected_sequence_number:
                    await _send_ws_error(
                        websocket, "OUT_OF_ORDER_AUDIO_CHUNK",
                        "Audio chunk arrived out of order.",
                        details={
                            "session_id": session.session_id,
                            "expected_sequence": (
                                session.expected_sequence_number
                            ),
                            "received_sequence": sequence,
                            "recoverable": True,
                        },
                    )
                    logger.warning(
                        "WebSocket chunk out of order session_id=%s "
                        "expected_sequence=%d received_sequence=%d chunk_id=%s "
                        "newly_created=false retry=false",
                        session.session_id,
                        session.expected_sequence_number,
                        sequence,
                        chunk_id,
                    )
                    continue
                if (
                    session.pending_chunks
                    >= settings.live_transcript_max_pending_chunks
                ):
                    await _send_ws_error(
                        websocket, "LIVE_CHUNK_QUEUE_FULL",
                        "The chunk queue is full; retry this chunk.",
                    )
                    continue
                await websocket.send_json(
                    {
                        "type": "chunk_received",
                        "chunk_id": chunk_id,
                        "sequence_number": sequence,
                    }
                )
                retry = chunk_id in session.attempted_chunk_ids
                session.attempted_chunk_ids.add(chunk_id)
                logger.info(
                    "WebSocket chunk accepted session_id=%s "
                    "expected_sequence=%d received_sequence=%d chunk_id=%s "
                    "newly_created=false retry=%s",
                    session.session_id,
                    session.expected_sequence_number,
                    sequence,
                    chunk_id,
                    retry,
                )
                frame = await websocket.receive()
                audio = frame.get("bytes")
                if not isinstance(audio, bytes):
                    await _send_ws_error(
                        websocket, "INVALID_AUDIO_FRAME",
                        "The metadata must be followed by a binary frame.",
                    )
                    continue
                session.pending_chunks += 1
                try:
                    result = await _process_chunk_bytes(
                        audio,
                        str(message.get("mime_type", "")),
                        session,
                        chunk_id,
                        sequence,
                        bool(message.get("is_final", False)),
                        service,
                    )
                    session.processed_chunk_ids.add(chunk_id)
                    session.expected_sequence_number += 1
                    logger.info(
                        "WebSocket chunk completed session_id=%s chunk_id=%s "
                        "received_sequence=%d expected_sequence=%d "
                        "processing_succeeded=true",
                        session.session_id,
                        chunk_id,
                        sequence,
                        session.expected_sequence_number,
                    )
                    await websocket.send_json(
                        {
                            "type": "transcript_update",
                            **result.model_dump(),
                        }
                    )
                except AppException as exc:
                    logger.warning(
                        "WebSocket chunk failed session_id=%s chunk_id=%s "
                        "received_sequence=%d expected_sequence=%d "
                        "processing_succeeded=false code=%s",
                        session.session_id,
                        chunk_id,
                        sequence,
                        session.expected_sequence_number,
                        exc.code,
                    )
                    await _send_ws_error(
                        websocket, exc.code, exc.message, True
                    )
                finally:
                    session.pending_chunks -= 1
            else:
                await _send_ws_error(
                    websocket, "INVALID_CONTROL_MESSAGE",
                    "Unsupported WebSocket message type.",
                )
    except WebSocketDisconnect:
        return
    except AppException as exc:
        with suppress(RuntimeError):
            await _send_ws_error(websocket, exc.code, exc.message, False)
            await websocket.close(code=1008)
