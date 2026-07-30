"""Tests for FFmpeg resolution and safe audio conversion."""

import subprocess
import wave
from pathlib import Path

import pytest

from app.core.config import Settings
from app.core.exceptions import AppException
from app.core.ffmpeg import (
    _parse_version,
    get_ffmpeg_status,
    resolve_ffmpeg_path,
)
from app.services.audio_conversion_service import AudioConversionService
from app.services.audio_conversion_service import (
    _inspect_pcm_wav,
    extension_for_audio_mime_type,
    normalize_audio_mime_type,
)


def settings(ffmpeg_path: str = "ffmpeg") -> Settings:
    return Settings(
        _env_file=None,
        ffmpeg_path=ffmpeg_path,
        audio_conversion_timeout_seconds=3,
    )


def test_ffmpeg_found_through_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.core.ffmpeg.shutil.which",
        lambda name: r"C:\tools\ffmpeg.exe" if name == "ffmpeg" else None,
    )
    monkeypatch.setattr(
        "app.core.ffmpeg.subprocess.run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args[0], 0, "ffmpeg version 7.1 full_build", ""
        ),
    )
    assert resolve_ffmpeg_path(settings()) == r"C:\tools\ffmpeg.exe"


def test_explicit_absolute_ffmpeg_path(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    executable = tmp_path / "ffmpeg.exe"
    executable.write_bytes(b"binary")
    monkeypatch.setattr(
        "app.core.ffmpeg.subprocess.run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args[0], 0, "ffmpeg version 7.1", ""
        ),
    )
    assert resolve_ffmpeg_path(settings(str(executable))) == str(executable)


def test_missing_ffmpeg(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.ffmpeg.shutil.which", lambda _: None)
    monkeypatch.setattr(
        "app.core.ffmpeg._common_windows_paths", lambda: []
    )
    with pytest.raises(AppException) as exc_info:
        resolve_ffmpeg_path(settings())
    assert exc_info.value.code == "FFMPEG_NOT_AVAILABLE"
    result = get_ffmpeg_status(settings())
    assert result.available is False
    assert result.reason == "Executable not found."


def test_invalid_absolute_configured_path(tmp_path: Path) -> None:
    missing = tmp_path / "missing-ffmpeg.exe"
    with pytest.raises(AppException) as exc_info:
        resolve_ffmpeg_path(settings(str(missing)))
    assert exc_info.value.code == "FFMPEG_NOT_AVAILABLE"


def test_invalid_ffmpeg_executable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    executable = tmp_path / "ffmpeg.exe"
    executable.write_bytes(b"not ffmpeg")
    monkeypatch.setattr(
        "app.core.ffmpeg.subprocess.run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args[0], 0, "not ffmpeg", ""
        ),
    )
    with pytest.raises(AppException) as exc_info:
        resolve_ffmpeg_path(settings(str(executable)))
    assert "recognizable FFmpeg version" in exc_info.value.details["reason"]


def test_ffmpeg_version_check_timeout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.core.ffmpeg.shutil.which", lambda _: "ffmpeg.exe"
    )
    monkeypatch.setattr(
        "app.core.ffmpeg.subprocess.run",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            subprocess.TimeoutExpired("ffmpeg", 5)
        ),
    )
    result = get_ffmpeg_status(settings())
    assert result.available is False
    assert result.reason == "FFmpeg version check timed out after 5 seconds."


def test_ffmpeg_version_parsing() -> None:
    assert _parse_version("ffmpeg version 7.1-full_build Copyright") == (
        "7.1-full_build"
    )


def test_conversion_timeout(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(
        "app.services.audio_conversion_service.resolve_ffmpeg_path",
        lambda _: "ffmpeg",
    )
    monkeypatch.setattr(
        "app.services.audio_conversion_service.subprocess.run",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            subprocess.TimeoutExpired("ffmpeg", 3)
        ),
    )
    source = tmp_path / "input.webm"
    source.write_bytes(b"a" * 64)
    with pytest.raises(AppException) as exc_info:
        AudioConversionService(settings()).convert(
            source, tmp_path / "output.wav", "audio/webm;codecs=opus"
        )
    assert exc_info.value.code == "AUDIO_CONVERSION_TIMEOUT"


def test_conversion_process_failure(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(
        "app.services.audio_conversion_service.resolve_ffmpeg_path",
        lambda _: "ffmpeg",
    )
    monkeypatch.setattr(
        "app.services.audio_conversion_service.subprocess.run",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            subprocess.CalledProcessError(
                1,
                "ffmpeg",
                stderr="EBML header parsing failed",
            )
        ),
    )
    source = tmp_path / "input.webm"
    source.write_bytes(b"a" * 64)
    with pytest.raises(AppException) as exc_info:
        AudioConversionService(settings()).convert(
            source, tmp_path / "output.wav", "audio/webm;codecs=opus"
        )
    assert exc_info.value.code == "INVALID_OR_INCOMPLETE_AUDIO"


def test_empty_output(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "app.services.audio_conversion_service.resolve_ffmpeg_path",
        lambda _: "ffmpeg",
    )
    monkeypatch.setattr(
        "app.services.audio_conversion_service.subprocess.run",
        lambda *args, **kwargs: subprocess.CompletedProcess([], 0),
    )
    source = tmp_path / "input.webm"
    source.write_bytes(b"a" * 64)
    with pytest.raises(AppException) as exc_info:
        AudioConversionService(settings()).convert(
            source, tmp_path / "output.wav", "audio/webm"
        )
    assert exc_info.value.code == "EMPTY_CONVERTED_AUDIO"


def test_successful_conversion_uses_safe_arguments(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    source, destination = tmp_path / "input.webm", tmp_path / "output.wav"
    source.write_bytes(b"a" * 64)
    monkeypatch.setattr(
        "app.services.audio_conversion_service.resolve_ffmpeg_path",
        lambda _: "resolved-ffmpeg",
    )
    captured: dict[str, object] = {}

    def fake_run(arguments: list[str], **kwargs: object):
        captured["arguments"] = arguments
        captured["kwargs"] = kwargs
        with wave.open(str(destination), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(16000)
            wav_file.writeframes((1000).to_bytes(2, "little", signed=True) * 16000)
        return subprocess.CompletedProcess(arguments, 0)

    monkeypatch.setattr(
        "app.services.audio_conversion_service.subprocess.run", fake_run
    )
    AudioConversionService(settings()).convert(
        source, destination, "audio/webm;codecs=opus"
    )

    assert captured["arguments"][0] == "resolved-ffmpeg"
    assert captured["kwargs"]["capture_output"] is True
    assert captured["kwargs"]["text"] is True
    assert captured["kwargs"]["check"] is True
    assert "shell" not in captured["kwargs"]
    assert captured["arguments"][1:6] == [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
    ]


def test_browser_mime_normalization_and_extensions() -> None:
    assert normalize_audio_mime_type("audio/webm;codecs=opus") == "audio/webm"
    assert normalize_audio_mime_type("audio/ogg;codecs=opus") == "audio/ogg"
    assert extension_for_audio_mime_type("audio/webm;codecs=opus") == ".webm"
    assert extension_for_audio_mime_type("audio/ogg;codecs=opus") == ".ogg"
    assert extension_for_audio_mime_type("audio/mp4") == ".m4a"


@pytest.mark.parametrize("size", [0, 8])
def test_empty_or_tiny_input_is_rejected(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, size: int
) -> None:
    monkeypatch.setattr(
        "app.services.audio_conversion_service.resolve_ffmpeg_path",
        lambda _: "ffmpeg",
    )
    source = tmp_path / "input.webm"
    source.write_bytes(b"a" * size)
    with pytest.raises(AppException) as exc_info:
        AudioConversionService(settings()).convert(
            source, tmp_path / "output.wav", "audio/webm"
        )
    assert exc_info.value.code == "INVALID_OR_INCOMPLETE_AUDIO"


def test_unsupported_codec_is_mapped(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(
        "app.services.audio_conversion_service.resolve_ffmpeg_path",
        lambda _: "ffmpeg",
    )
    source = tmp_path / "input.webm"
    source.write_bytes(b"a" * 64)
    monkeypatch.setattr(
        "app.services.audio_conversion_service.subprocess.run",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            subprocess.CalledProcessError(
                1, "ffmpeg", stderr="Unknown decoder"
            )
        ),
    )
    with pytest.raises(AppException) as exc_info:
        AudioConversionService(settings()).convert(
            source, tmp_path / "output.wav", "audio/webm"
        )
    assert exc_info.value.code == "UNSUPPORTED_AUDIO_CODEC"


@pytest.mark.parametrize(
    ("amplitude", "speech_detected"),
    [(0, False), (10, False), (1000, True)],
)
def test_silence_and_low_volume_detection(
    tmp_path: Path, amplitude: int, speech_detected: bool
) -> None:
    destination = tmp_path / "normalized.wav"
    with wave.open(str(destination), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        sample = amplitude.to_bytes(2, "little", signed=True)
        wav_file.writeframes(sample * 16000)

    metadata = _inspect_pcm_wav(destination, 1, 50)
    assert metadata.sample_rate == 16000
    assert metadata.channels == 1
    assert metadata.duration_seconds == 1
    assert metadata.speech_detected is speech_detected
