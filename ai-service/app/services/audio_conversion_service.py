"""Safe, observable FFmpeg conversion for browser-recorded audio."""

import re
import subprocess
import wave
from array import array
from dataclasses import dataclass
from pathlib import Path

from fastapi import status

from app.core.config import Settings
from app.core.exceptions import AppException
from app.core.ffmpeg import resolve_ffmpeg_path
from app.core.logging import get_logger

logger = get_logger(__name__)
MIN_CONVERTIBLE_BYTES = 32


@dataclass(frozen=True)
class ConvertedAudioMetadata:
    """Validated properties of the normalized WAV output."""

    duration_seconds: float
    size_bytes: int
    sample_rate: int
    channels: int
    rms: float
    speech_detected: bool


def _inspect_pcm_wav(
    path: Path,
    minimum_duration_seconds: float,
    minimum_rms: int,
) -> ConvertedAudioMetadata:
    """Validate mono 16 kHz PCM output and estimate whether it has speech."""
    try:
        with wave.open(str(path), "rb") as wav_file:
            channels = wav_file.getnchannels()
            sample_rate = wav_file.getframerate()
            sample_width = wav_file.getsampwidth()
            frame_count = wav_file.getnframes()
            samples = wav_file.readframes(frame_count)
    except (OSError, EOFError, wave.Error) as exc:
        raise AppException(
            "The normalized audio output was invalid.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="INVALID_CONVERTED_AUDIO",
        ) from exc
    if channels != 1 or sample_rate != 16000 or sample_width != 2:
        raise AppException(
            "The normalized audio format was invalid.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="INVALID_CONVERTED_AUDIO",
            details={
                "sample_rate": sample_rate,
                "channels": channels,
                "sample_width": sample_width,
            },
        )
    duration = frame_count / sample_rate if sample_rate else 0
    if duration < minimum_duration_seconds:
        raise AppException(
            "Audio chunk is shorter than the minimum usable duration.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="AUDIO_TOO_SHORT",
            details={"minimum_duration_seconds": minimum_duration_seconds},
        )
    pcm = array("h")
    pcm.frombytes(samples)
    rms = (
        (sum(sample * sample for sample in pcm) / len(pcm)) ** 0.5
        if pcm
        else 0
    )
    return ConvertedAudioMetadata(
        duration_seconds=duration,
        size_bytes=path.stat().st_size,
        sample_rate=sample_rate,
        channels=channels,
        rms=rms,
        speech_detected=rms >= minimum_rms,
    )


def normalize_audio_mime_type(mime_type: str) -> str:
    """Remove codec parameters and normalize casing and whitespace."""
    return mime_type.lower().split(";", maxsplit=1)[0].strip()


def extension_for_audio_mime_type(mime_type: str) -> str:
    """Return the correct input extension for a supported audio MIME type."""
    extensions = {
        "audio/webm": ".webm",
        "video/webm": ".webm",
        "audio/ogg": ".ogg",
        "application/ogg": ".ogg",
        "audio/mp4": ".m4a",
        "video/mp4": ".mp4",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/x-m4a": ".m4a",
    }
    return extensions.get(normalize_audio_mime_type(mime_type), "")


def _sanitized_stderr(stderr: str, source: Path, destination: Path) -> str:
    """Remove temporary paths and constrain FFmpeg diagnostic log size."""
    sanitized = stderr.replace(str(source), "<input>")
    sanitized = sanitized.replace(str(destination), "<output>")
    return re.sub(r"\s+", " ", sanitized).strip()[:1000]


def _conversion_error(stderr: str, mime_type: str) -> AppException:
    """Map FFmpeg diagnostics to stable public API errors."""
    lowered = stderr.lower()
    details = {
        "mime_type": mime_type,
        "suggestion": (
            "Record for at least one second and send a complete recording."
        ),
    }
    if any(
        marker in lowered
        for marker in (
            "ebml header parsing failed",
            "invalid data found when processing input",
            "end of file",
        )
    ):
        return AppException(
            "The recorded browser audio was incomplete or could not be decoded.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="INVALID_OR_INCOMPLETE_AUDIO",
            details=details,
        )
    if any(
        marker in lowered
        for marker in ("unknown decoder", "unsupported codec", "decoder not found")
    ):
        return AppException(
            "The recorded audio codec is not supported by the server.",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="UNSUPPORTED_AUDIO_CODEC",
            details={
                "suggestion": (
                    "Use WebM Opus, OGG Opus, WAV, MP3, or M4A."
                )
            },
        )
    return AppException(
        "The recorded browser audio was incomplete or could not be decoded.",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="INVALID_OR_INCOMPLETE_AUDIO",
        details=details,
    )


class AudioConversionService:
    """Convert supported browser media into mono 16 kHz PCM WAV."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def convert(
        self,
        source: Path,
        destination: Path,
        mime_type: str = "application/octet-stream",
    ) -> ConvertedAudioMetadata:
        """Convert one complete media file and retain safe diagnostics."""
        executable = resolve_ffmpeg_path(self.settings)
        normalized_mime = normalize_audio_mime_type(mime_type)
        input_size = source.stat().st_size if source.is_file() else 0
        if input_size < MIN_CONVERTIBLE_BYTES:
            raise AppException(
                "The recorded browser audio was incomplete or could not be decoded.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="INVALID_OR_INCOMPLETE_AUDIO",
                details={
                    "mime_type": mime_type,
                    "suggestion": (
                        "Record for at least one second and send a complete "
                        "recording."
                    ),
                },
            )

        command = [
            executable,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-vn",
        ]
        if self.settings.audio_normalization_enabled:
            command.extend(
                ["-af", self.settings.audio_normalization_filter]
            )
        command.extend(
            [
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(destination),
            ]
        )
        try:
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                timeout=self.settings.audio_conversion_timeout_seconds,
            )
        except subprocess.TimeoutExpired as exc:
            logger.error(
                "FFmpeg timeout mime=%s normalized_mime=%s extension=%s "
                "input_size=%d timeout=true",
                mime_type,
                normalized_mime,
                source.suffix,
                input_size,
            )
            raise AppException(
                "Audio conversion took too long.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                code="AUDIO_CONVERSION_TIMEOUT",
            ) from exc
        except subprocess.CalledProcessError as exc:
            stderr = _sanitized_stderr(
                exc.stderr or "", source, destination
            )
            output_size = (
                destination.stat().st_size if destination.is_file() else 0
            )
            logger.error(
                "FFmpeg failure mime=%s normalized_mime=%s extension=%s "
                "input_size=%d output_size=%d return_code=%d stderr=%s "
                "timeout=false",
                mime_type,
                normalized_mime,
                source.suffix,
                input_size,
                output_size,
                exc.returncode,
                stderr or "<empty>",
            )
            raise _conversion_error(stderr, mime_type) from exc
        except OSError as exc:
            logger.exception(
                "FFmpeg process launch failed mime=%s extension=%s",
                mime_type,
                source.suffix,
            )
            raise AppException(
                "The recorded browser audio was incomplete or could not be decoded.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="INVALID_OR_INCOMPLETE_AUDIO",
                details={"mime_type": mime_type},
            ) from exc

        output_size = destination.stat().st_size if destination.is_file() else 0
        if output_size == 0:
            logger.error(
                "FFmpeg empty output mime=%s normalized_mime=%s extension=%s "
                "input_size=%d output_size=0",
                mime_type,
                normalized_mime,
                source.suffix,
                input_size,
            )
            raise AppException(
                "FFmpeg produced an empty audio file",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="EMPTY_CONVERTED_AUDIO",
                details={"mime_type": mime_type},
            )
        metadata = _inspect_pcm_wav(
            destination,
            self.settings.live_transcript_min_chunk_duration_ms / 1000,
            self.settings.vad_min_rms,
        )
        logger.info(
            "Converted audio mime=%s normalized_mime=%s input_size=%d "
            "wav_size=%d duration_seconds=%.3f sample_rate=%d channels=%d "
            "speech_detected=%s",
            mime_type,
            normalized_mime,
            input_size,
            metadata.size_bytes,
            metadata.duration_seconds,
            metadata.sample_rate,
            metadata.channels,
            metadata.speech_detected,
        )
        return metadata
