"""FFmpeg executable discovery, verification, and health reporting."""

import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import status

from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger

logger = get_logger(__name__)
VERSION_TIMEOUT_SECONDS = 5


@dataclass(frozen=True)
class FFmpegStatus:
    """Result of resolving and executing the FFmpeg binary."""

    available: bool
    configured_path: str
    path: str | None = None
    version: str | None = None
    reason: str | None = None
    path_detection: str = "FAILED"
    searched_locations: list[str] = field(default_factory=list)


def _common_windows_paths() -> list[Path]:
    """Return common system and WinGet FFmpeg executable locations."""
    candidates = [
        Path(r"C:\ffmpeg\bin\ffmpeg.exe"),
        Path(r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"),
        Path(r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe"),
        Path(r"C:\ProgramData\chocolatey\bin\ffmpeg.exe"),
    ]
    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        candidates.append(
            Path(local_app_data) / "Microsoft/WinGet/Links/ffmpeg.exe"
        )
    return candidates


def _parse_version(output: str) -> str | None:
    """Extract the version token from the first FFmpeg output line."""
    match = re.search(r"^ffmpeg version\s+([^\s]+)", output, re.IGNORECASE)
    return match.group(1) if match else None


def _verify_executable(executable: str) -> tuple[str | None, str | None]:
    """Run an executable version probe and return version or failure reason."""
    try:
        result = subprocess.run(
            [executable, "-version"],
            capture_output=True,
            text=True,
            timeout=VERSION_TIMEOUT_SECONDS,
            check=True,
        )
    except subprocess.TimeoutExpired:
        reason = "FFmpeg version check timed out after 5 seconds."
        logger.error("%s path=%s", reason, executable)
        return None, reason
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        reason = f"FFmpeg version check failed: {stderr or exc}"
        logger.error("%s path=%s", reason, executable)
        return None, reason
    except OSError as exc:
        reason = f"FFmpeg executable could not be started: {exc}"
        logger.error("%s path=%s", reason, executable)
        return None, reason

    version = _parse_version(result.stdout or result.stderr)
    if not version:
        reason = "Executable did not return recognizable FFmpeg version output."
        logger.error("%s path=%s", reason, executable)
        return None, reason
    return version, None


def inspect_ffmpeg(settings: Settings | None = None) -> FFmpegStatus:
    """Resolve and verify FFmpeg without raising an application exception."""
    current_settings = settings or get_settings()
    configured = current_settings.ffmpeg_path.strip()
    searched: list[str] = []
    configured_path = Path(configured).expanduser() if configured else None

    if configured_path and configured_path.is_absolute():
        searched.append(str(configured_path))
        if not configured_path.is_file():
            return FFmpegStatus(
                available=False,
                configured_path=configured,
                reason="Configured executable does not exist.",
                searched_locations=searched,
            )
        if not os.access(configured_path, os.X_OK):
            return FFmpegStatus(
                available=False,
                configured_path=configured,
                reason="Configured file is not executable.",
                searched_locations=searched,
            )
        candidate = str(configured_path)
    else:
        candidate = None
        if configured:
            searched.append(f"PATH:{configured}")
            candidate = shutil.which(configured)
        if not candidate:
            searched.append("PATH:ffmpeg")
            candidate = shutil.which("ffmpeg")
        if not candidate and os.name == "nt":
            for common_path in _common_windows_paths():
                searched.append(str(common_path))
                if common_path.is_file():
                    candidate = str(common_path)
                    break

    if not candidate:
        return FFmpegStatus(
            available=False,
            configured_path=configured,
            reason="Executable not found.",
            searched_locations=list(dict.fromkeys(searched)),
        )

    version, failure = _verify_executable(candidate)
    return FFmpegStatus(
        available=version is not None,
        configured_path=configured,
        path=candidate if version else None,
        version=version,
        reason=failure,
        path_detection="SUCCESS",
        searched_locations=list(dict.fromkeys(searched)),
    )


def resolve_ffmpeg_path(settings: Settings | None = None) -> str:
    """Return a verified FFmpeg executable or a public configuration error."""
    result = inspect_ffmpeg(settings)
    if result.available and result.path:
        return result.path
    raise AppException(
        "FFmpeg is not installed or cannot be located.",
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        code="FFMPEG_NOT_AVAILABLE",
        details={
            "configured_path": result.configured_path or None,
            "searched_path": os.getenv("PATH", ""),
            "searched_locations": result.searched_locations,
            "reason": result.reason,
            "resolution": "Install FFmpeg or set FFMPEG_PATH.",
        },
    )


def get_ffmpeg_status(settings: Settings | None = None) -> FFmpegStatus:
    """Return detailed availability without failing startup or health checks."""
    return inspect_ffmpeg(settings)
