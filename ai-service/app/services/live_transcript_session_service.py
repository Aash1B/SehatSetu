"""Bounded in-memory state for live transcript sessions."""

import time
from dataclasses import dataclass, field
from threading import Lock

from app.core.config import Settings
from app.core.exceptions import AppException


@dataclass
class LiveTranscriptSession:
    """Temporary state retained only for the configured TTL."""

    session_id: str
    language: str = "auto"
    output_language: str | None = None
    expected_sequence_number: int = 1
    merged_transcript: str = ""
    detected_language: str = "unknown"
    processed_chunk_ids: set[str] = field(default_factory=set)
    attempted_chunk_ids: set[str] = field(default_factory=set)
    last_activity: float = field(default_factory=time.monotonic)
    paused: bool = False
    pending_chunks: int = 0


class LiveTranscriptSessionManager:
    """Create, resume, expire, and bound process-local sessions."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._sessions: dict[str, LiveTranscriptSession] = {}
        self._lock = Lock()

    def start(
        self,
        session_id: str,
        language: str,
        output_language: str | None,
    ) -> LiveTranscriptSession:
        """Return an existing session or create one."""
        session, _ = self.start_with_status(
            session_id, language, output_language
        )
        return session

    def start_with_status(
        self,
        session_id: str,
        language: str,
        output_language: str | None,
    ) -> tuple[LiveTranscriptSession, bool]:
        """Return a session and whether it was newly created."""
        with self._lock:
            self._cleanup_locked()
            existing = self._sessions.get(session_id)
            if existing:
                existing.last_activity = time.monotonic()
                return existing, False
            if len(self._sessions) >= self.settings.live_transcript_max_active_sessions:
                raise AppException(
                    "Maximum active live transcript sessions reached",
                    code="LIVE_SESSION_LIMIT_REACHED",
                )
            session = LiveTranscriptSession(
                session_id=session_id,
                language=language,
                output_language=output_language,
            )
            self._sessions[session_id] = session
            return session, True

    def get(self, session_id: str) -> LiveTranscriptSession | None:
        with self._lock:
            self._cleanup_locked()
            session = self._sessions.get(session_id)
            if session:
                session.last_activity = time.monotonic()
            return session

    def cancel(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def cleanup(self) -> int:
        with self._lock:
            return self._cleanup_locked()

    def _cleanup_locked(self) -> int:
        cutoff = (
            time.monotonic()
            - self.settings.live_transcript_session_ttl_seconds
        )
        expired = [
            key
            for key, session in self._sessions.items()
            if session.last_activity < cutoff
        ]
        for key in expired:
            del self._sessions[key]
        return len(expired)
