"""Tests for live browser chunk validation and processing."""

from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints.live_transcription import session_manager
from app.core.config import Settings
from app.core.exceptions import AppException
from app.schemas.transcription import TranscriptionData
from app.services.audio_conversion_service import AudioConversionService
from app.services.transcription_service import get_transcription_service
from app.services.live_transcript_session_service import (
    LiveTranscriptSessionManager,
)


class FakeTranscription:
    def transcribe(self, path: Path, language: str) -> TranscriptionData:
        return TranscriptionData(
            transcript="fever and cough for two days",
            detected_language="en",
            language_probability=0.9,
            segments=[],
            model="test",
        )


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        AudioConversionService,
        "convert",
        lambda self, source, destination, mime_type="": (
            destination.write_bytes(b"wav")
        ),
    )
    app.dependency_overrides[get_transcription_service] = FakeTranscription
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def send(client: TestClient, session: str, chunk: str, **data: object):
    payload = {
        "session_id": session,
        "chunk_id": chunk,
        "sequence_number": 1,
        "timestamp_start_ms": 0,
        "timestamp_end_ms": 5000,
        "language": "auto",
        "previous_transcript": "the patient has fever and cough",
        **data,
    }
    return client.post(
        "/api/v1/live-transcription/chunk",
        files={"file": ("recording.webm", b"audio", "audio/webm;codecs=opus")},
        data=payload,
    )


def test_webm_codec_chunk_is_processed_and_merged(client: TestClient) -> None:
    response = send(client, uuid4().hex, uuid4().hex)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["speech_detected"] is True
    assert data["merged_transcript"] == (
        "the patient has fever and cough for two days"
    )


def test_duplicate_successful_chunk_is_acknowledged(client: TestClient) -> None:
    session, chunk = uuid4().hex, uuid4().hex
    assert send(
        client, session, chunk, multiple_chunks_expected="true"
    ).status_code == 200
    response = send(
        client, session, chunk, multiple_chunks_expected="true"
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Duplicate audio chunk acknowledged"


def test_out_of_order_and_short_chunks_are_rejected(client: TestClient) -> None:
    response = send(
        client,
        uuid4().hex,
        uuid4().hex,
        sequence_number=3,
        multiple_chunks_expected="true",
    )
    assert response.json()["error"]["code"] == "OUT_OF_ORDER_AUDIO_CHUNK"
    assert response.json()["message"] == "Audio chunk arrived out of order."
    assert response.json()["error"]["details"]["expected_sequence"] == 1

    response = send(
        client,
        uuid4().hex,
        uuid4().hex,
        timestamp_end_ms=100,
    )
    assert response.json()["error"]["code"] == "AUDIO_TOO_SHORT"


def test_first_chunk_initializes_multi_chunk_session(
    client: TestClient,
) -> None:
    response = send(
        client,
        uuid4().hex,
        uuid4().hex,
        sequence_number=1,
        multiple_chunks_expected="true",
    )
    assert response.status_code == 200
    assert response.json()["data"]["sequence_number"] == 1


def test_standalone_upload_needs_no_session_metadata(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/live-transcription/chunk",
        files={
            "file": (
                "recording.webm",
                b"audio",
                "audio/webm;codecs=opus",
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["session_id"].startswith("standalone-")


def test_single_upload_with_session_does_not_enforce_sequence(
    client: TestClient,
) -> None:
    response = send(
        client,
        uuid4().hex,
        uuid4().hex,
        sequence_number=7,
    )
    assert response.status_code == 200


def test_missing_chunk_reports_expected_sequence(
    client: TestClient,
) -> None:
    session = uuid4().hex
    first = send(
        client,
        session,
        uuid4().hex,
        sequence_number=1,
        multiple_chunks_expected="true",
    )
    assert first.status_code == 200
    missing = send(
        client,
        session,
        uuid4().hex,
        sequence_number=3,
        multiple_chunks_expected="true",
    )
    assert missing.status_code == 400
    details = missing.json()["error"]["details"]
    assert details["expected_sequence"] == 2
    assert details["received_sequence"] == 3
    assert details["recoverable"] is True


def test_first_chunk_sequence_zero_has_precise_error(
    client: TestClient,
) -> None:
    session = uuid4().hex
    response = send(
        client,
        session,
        uuid4().hex,
        sequence_number=0,
        multiple_chunks_expected="true",
    )
    assert response.status_code == 400
    assert response.json()["error"] == {
        "code": "OUT_OF_ORDER_AUDIO_CHUNK",
        "details": {
            "session_id": session,
            "expected_sequence": 1,
            "received_sequence": 0,
            "recoverable": True,
        },
    }


def test_successful_sequence_progression(client: TestClient) -> None:
    session = uuid4().hex
    for sequence in (1, 2, 3):
        response = send(
            client,
            session,
            uuid4().hex,
            sequence_number=sequence,
            multiple_chunks_expected="true",
        )
        assert response.status_code == 200
        assert response.json()["data"]["sequence_number"] == sequence


def test_failed_chunk_can_retry_without_sequence_increment(
    client: TestClient,
) -> None:
    class FailOnceTranscription:
        attempts = 0

        def transcribe(self, path: Path, language: str) -> TranscriptionData:
            self.attempts += 1
            if self.attempts == 1:
                raise AppException(
                    "Temporary transcription failure",
                    code="MODEL_INFERENCE_FAILED",
                )
            return FakeTranscription().transcribe(path, language)

    failing_service = FailOnceTranscription()
    app.dependency_overrides[get_transcription_service] = lambda: failing_service
    session, chunk = uuid4().hex, uuid4().hex
    first = send(
        client,
        session,
        chunk,
        sequence_number=1,
        multiple_chunks_expected="true",
    )
    assert first.status_code == 400
    retry = send(
        client,
        session,
        chunk,
        sequence_number=1,
        multiple_chunks_expected="true",
    )
    assert retry.status_code == 200


def test_conversion_failure_cleans_temporary_files(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    temporary_directory = session_manager.settings.temp_audio_dir.resolve()
    before = set(temporary_directory.glob("*"))

    def fail_conversion(*args, **kwargs) -> None:
        raise AppException(
            "Incomplete audio",
            code="INVALID_OR_INCOMPLETE_AUDIO",
        )

    monkeypatch.setattr(AudioConversionService, "convert", fail_conversion)
    response = send(client, uuid4().hex, uuid4().hex)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_OR_INCOMPLETE_AUDIO"
    assert set(temporary_directory.glob("*")) == before


def test_final_chunk_resets_rest_session(client: TestClient) -> None:
    session = uuid4().hex
    first = send(
        client,
        session,
        uuid4().hex,
        sequence_number=1,
        multiple_chunks_expected="true",
        is_final="true",
    )
    assert first.status_code == 200

    restarted = send(
        client,
        session,
        uuid4().hex,
        sequence_number=1,
        multiple_chunks_expected="true",
    )
    assert restarted.status_code == 200


def start_socket(client: TestClient, session_id: str):
    socket = client.websocket_connect("/api/v1/live-transcription/ws")
    socket.__enter__()
    socket.send_json(
        {
            "type": "session_start",
            "session_id": session_id,
            "language": "auto",
            "chunk_duration_ms": 5000,
        }
    )
    assert socket.receive_json()["type"] == "session_ready"
    return socket


def send_socket_chunk(
    socket: object,
    session_id: str,
    chunk_id: str,
    sequence: int = 1,
    mime_type: str = "audio/webm;codecs=opus",
):
    socket.send_json(
        {
            "type": "audio_chunk_metadata",
            "session_id": session_id,
            "chunk_id": chunk_id,
            "sequence_number": sequence,
            "mime_type": mime_type,
            "timestamp_start_ms": 0,
            "timestamp_end_ms": 5000,
            "is_final": False,
        }
    )
    first = socket.receive_json()
    if first["type"] == "chunk_received" and not first.get("duplicate"):
        socket.send_bytes(b"browser-audio")
        return first, socket.receive_json()
    return first, None


def test_websocket_chunk_update_and_finalize(client: TestClient) -> None:
    session_id = uuid4().hex
    socket = start_socket(client, session_id)
    try:
        received, update = send_socket_chunk(
            socket, session_id, uuid4().hex
        )
        assert received["type"] == "chunk_received"
        assert update["type"] == "transcript_update"
        assert update["speech_detected"] is True

        socket.send_json({"type": "finalize", "session_id": session_id})
        final = socket.receive_json()
        assert final["type"] == "transcript_final"
        assert final["final_transcript"] == update["merged_transcript"]
    finally:
        socket.__exit__(None, None, None)


def test_websocket_pause_resume_duplicate_and_ordering(
    client: TestClient,
) -> None:
    session_id, chunk_id = uuid4().hex, uuid4().hex
    socket = start_socket(client, session_id)
    try:
        socket.send_json({"type": "pause", "session_id": session_id})
        assert socket.receive_json()["type"] == "paused"
        error, _ = send_socket_chunk(socket, session_id, chunk_id)
        assert error["code"] == "SESSION_PAUSED"

        socket.send_json({"type": "resume", "session_id": session_id})
        assert socket.receive_json()["type"] == "resumed"
        _, update = send_socket_chunk(socket, session_id, chunk_id)
        assert update["type"] == "transcript_update"

        duplicate, _ = send_socket_chunk(socket, session_id, chunk_id, 2)
        assert duplicate["type"] == "chunk_received"
        assert duplicate["duplicate"] is True
        out_of_order, _ = send_socket_chunk(
            socket, session_id, uuid4().hex, 3
        )
        assert out_of_order["code"] == "OUT_OF_ORDER_AUDIO_CHUNK"
    finally:
        socket.__exit__(None, None, None)


def test_websocket_invalid_message_and_unsupported_mime(
    client: TestClient,
) -> None:
    session_id = uuid4().hex
    socket = start_socket(client, session_id)
    try:
        socket.send_json({"type": "unknown", "session_id": session_id})
        assert socket.receive_json()["code"] == "INVALID_CONTROL_MESSAGE"
        _, error = send_socket_chunk(
            socket, session_id, uuid4().hex, mime_type="audio/aac"
        )
        assert error["code"] == "UNSUPPORTED_MIME_TYPE"
    finally:
        socket.__exit__(None, None, None)


def test_websocket_failed_chunk_can_retry_same_sequence(
    client: TestClient,
) -> None:
    class FailOnceTranscription:
        attempts = 0

        def transcribe(self, path: Path, language: str) -> TranscriptionData:
            self.attempts += 1
            if self.attempts == 1:
                raise AppException(
                    "Temporary failure",
                    code="MODEL_INFERENCE_FAILED",
                )
            return FakeTranscription().transcribe(path, language)

    failing_service = FailOnceTranscription()
    app.dependency_overrides[get_transcription_service] = lambda: failing_service
    session_id, chunk_id = uuid4().hex, uuid4().hex
    socket = start_socket(client, session_id)
    try:
        _, failure = send_socket_chunk(
            socket, session_id, chunk_id, sequence=1
        )
        assert failure["code"] == "MODEL_INFERENCE_FAILED"
        _, update = send_socket_chunk(
            socket, session_id, chunk_id, sequence=1
        )
        assert update["type"] == "transcript_update"
        assert update["sequence_number"] == 1
    finally:
        socket.__exit__(None, None, None)


def test_websocket_reconnects_to_existing_session(client: TestClient) -> None:
    session_id = uuid4().hex
    first = start_socket(client, session_id)
    _, update = send_socket_chunk(first, session_id, uuid4().hex)
    first.__exit__(None, None, None)

    second = client.websocket_connect("/api/v1/live-transcription/ws")
    second.__enter__()
    try:
        second.send_json(
            {
                "type": "session_resume",
                "session_id": session_id,
                "last_received_sequence_number": 1,
                "current_transcript": update["merged_transcript"],
            }
        )
        assert second.receive_json()["type"] == "session_ready"
        second.send_json({"type": "finalize", "session_id": session_id})
        assert second.receive_json()["final_transcript"] == update[
            "merged_transcript"
        ]
    finally:
        second.__exit__(None, None, None)


def test_session_expiry_and_limit() -> None:
    settings = Settings(
        _env_file=None,
        live_transcript_session_ttl_seconds=1,
        live_transcript_max_active_sessions=1,
    )
    manager = LiveTranscriptSessionManager(settings)
    session = manager.start("expired", "en", None)
    session.last_activity -= 2
    assert manager.cleanup() == 1
    manager.start("active", "en", None)
    with pytest.raises(AppException) as exc_info:
        manager.start("second", "en", None)
    assert exc_info.value.code == "LIVE_SESSION_LIMIT_REACHED"


def test_expired_session_restarts_at_sequence_one() -> None:
    settings = Settings(
        _env_file=None,
        live_transcript_session_ttl_seconds=1,
    )
    manager = LiveTranscriptSessionManager(settings)
    expired = manager.start("reusable", "en", None)
    expired.expected_sequence_number = 4
    expired.last_activity -= 2

    restarted, newly_created = manager.start_with_status(
        "reusable", "en", None
    )
    assert newly_created is True
    assert restarted.expected_sequence_number == 1


def test_independent_sessions_both_start_at_sequence_one() -> None:
    manager = LiveTranscriptSessionManager(Settings(_env_file=None))
    first = manager.start("first", "en", None)
    second = manager.start("second", "en", None)
    assert first.expected_sequence_number == 1
    assert second.expected_sequence_number == 1


def test_development_page_uses_acknowledged_one_based_sequence() -> None:
    script = Path("app/static/live_audio.js").read_text(encoding="utf-8")
    assert "let liveSequence = 1;" in script
    assert "liveSequence++" not in script
    assert "liveSequence = activeLiveChunk.sequence + 1;" in script
    assert "liveSessionId = createSession ? crypto.randomUUID()" in script
    assert "function selectSupportedAudioMimeType()" in script
    assert "new Blob(recordingChunks, { type })" in script
    assert "recorder.start();" in script
    assert "recorder.start(Number(elements.chunkDuration.value))" not in script
    assert "sendLiveChunk(event.data)" not in script
    assert "`browser-recording.${extension}`" in script
    assert "form.append(" in script
    assert 'recordingChunks = []; selectedRecordingMimeType = "";' in script


def test_websocket_silent_chunk(client: TestClient) -> None:
    class SilentTranscription:
        def transcribe(self, path: Path, language: str) -> TranscriptionData:
            raise AppException(
                "No recognizable speech",
                code="NO_SPEECH_DETECTED",
            )

    app.dependency_overrides[get_transcription_service] = SilentTranscription
    session_id = uuid4().hex
    socket = start_socket(client, session_id)
    try:
        _, update = send_socket_chunk(socket, session_id, uuid4().hex)
        assert update["type"] == "transcript_update"
        assert update["speech_detected"] is False
        assert update["chunk_transcript"] == ""
    finally:
        socket.__exit__(None, None, None)


def test_websocket_queue_limit(client: TestClient) -> None:
    session_id = uuid4().hex
    socket = start_socket(client, session_id)
    try:
        session = session_manager.get(session_id)
        assert session is not None
        session.pending_chunks = (
            session_manager.settings.live_transcript_max_pending_chunks
        )
        error, _ = send_socket_chunk(socket, session_id, uuid4().hex)
        assert error["code"] == "LIVE_CHUNK_QUEUE_FULL"
    finally:
        socket.__exit__(None, None, None)
        session_manager.cancel(session_id)
