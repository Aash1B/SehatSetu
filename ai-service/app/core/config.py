"""Environment-backed application configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic import (
    Field,
    NonNegativeInt,
    PositiveFloat,
    PositiveInt,
    SecretStr,
    field_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and `.env`."""

    app_name: str = "Sehat-Setu AI Service"
    app_version: str = "1.0.0"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    allowed_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000"
    )
    log_level: str = "INFO"
    whisper_model_size: str = "tiny"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_beam_size: PositiveInt = 5
    whisper_best_of: PositiveInt = 5
    whisper_cpu_threads: NonNegativeInt = 0
    whisper_num_workers: PositiveInt = 1
    whisper_language_detection_threshold: float = Field(default=0.55, ge=0, le=1)
    whisper_word_timestamps: bool = True
    whisper_medical_prompt_enabled: bool = True
    whisper_no_speech_threshold: float = Field(default=0.6, ge=0, le=1)
    whisper_log_prob_threshold: float = -1.0
    whisper_compression_ratio_threshold: PositiveFloat = 2.4
    whisper_temperature: float = Field(default=0, ge=0, le=1)
    whisper_condition_on_previous_text: bool = True
    whisper_context_words: PositiveInt = 50
    max_audio_size_mb: PositiveFloat = 25
    audio_max_file_size_mb: PositiveFloat | None = None
    audio_max_duration_seconds: PositiveFloat = 3600
    audio_sample_rate: PositiveInt = 16000
    audio_channels: PositiveInt = 1
    audio_enable_preprocessing: bool = True
    audio_enable_noise_reduction: bool = True
    audio_enable_silence_trimming: bool = False
    audio_min_speech_seconds: PositiveFloat = 0.35
    audio_normalization_target: float = Field(default=-18.0, ge=-30, le=-5)
    audio_chunk_duration_seconds: PositiveInt = 600
    audio_chunk_overlap_seconds: NonNegativeInt = 2
    transcription_timeout_seconds: PositiveInt = 120
    temp_audio_dir: Path = Path(".tmp/audio")
    ner_model_name: str = "d4data/biomedical-ner-all"
    ner_local_files_only: bool = True
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-flash-latest"
    gemini_temperature: float = Field(default=0.2, ge=0, le=2)
    gemini_max_output_tokens: PositiveInt = 300
    gemini_thinking_budget: NonNegativeInt = 0
    gemini_timeout_seconds: PositiveFloat = 30
    gemini_max_retries: NonNegativeInt = 2
    doctor_rule_confidence_threshold: float = Field(default=0.70, ge=0, le=1)
    doctor_gemini_fallback_enabled: bool = True
    prescription_dummy_mode: bool = False
    summarize_max_transcript_length: PositiveInt = 20_000
    default_output_language: str = "en"
    supported_languages: str = "en,hi,hi-Latn,bn,mr,gu,pa,ta,te,kn,ml,ur"
    ocr_max_file_size_mb: PositiveFloat = 10
    ocr_max_pdf_pages: PositiveInt = 10
    ocr_max_image_pixels: PositiveInt = 25_000_000
    gemini_ocr_max_output_tokens: PositiveInt = 4096
    ffmpeg_path: str = "ffmpeg"
    audio_conversion_timeout_seconds: PositiveInt = 30
    audio_normalization_enabled: bool = True
    audio_normalization_filter: str = (
        "highpass=f=80,lowpass=f=8000,loudnorm"
    )
    vad_enabled: bool = True
    vad_min_speech_duration_ms: PositiveInt = 250
    vad_min_silence_duration_ms: PositiveInt = 500
    vad_min_rms: NonNegativeInt = 50
    live_transcript_default_chunk_duration_ms: PositiveInt = 10000
    live_transcript_min_chunk_duration_ms: PositiveInt = 1000
    live_transcript_overlap_ms: NonNegativeInt = 750
    live_transcript_session_ttl_seconds: PositiveInt = 900
    live_transcript_max_active_sessions: PositiveInt = 100
    live_transcript_max_chunk_size_mb: PositiveFloat = 5
    live_transcript_max_pending_chunks: PositiveInt = 3
    live_transcription_min_buffer_seconds: PositiveFloat = 1
    live_transcription_window_seconds: PositiveInt = 30
    live_transcription_overlap_seconds: NonNegativeInt = 1
    live_transcription_max_buffer_mb: PositiveFloat = 25
    internal_api_key: SecretStr | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: object) -> object:
        """Support booleans plus common debug/release environment values."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized == "debug":
                return True
            if normalized == "release":
                return False
        return value

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return normalized, non-empty CORS origins."""
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]

    @property
    def effective_audio_max_size_mb(self) -> float:
        """Support the documented name without breaking MAX_AUDIO_SIZE_MB."""
        return self.audio_max_file_size_mb or self.max_audio_size_mb


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()
