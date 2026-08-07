# Environment Variables

[Documentation index](../README.md) · [Local setup](RUNNING_LOCALLY.md) · [Deployment](DEPLOYMENT.md)

Settings are loaded by `pydantic-settings` from process environment and `.env`, case-insensitively. Unknown variables are ignored. Process environment overrides `.env`. Values below are the code defaults; `.env.example`, `config/whisper-accuracy.env.example`, and `config/whisper-low-memory.env.example` provide deployable examples.

`GEMINI_API_KEY` and `INTERNAL_API_KEY` are secrets. Never log, commit, or place them in client-side code.

## Application and security

| Variable | Default | Required | Purpose / production recommendation |
|---|---:|---|---|
| `APP_NAME` | `Sehat-Setu AI Service` | No | Service display name; normally retain. |
| `APP_VERSION` | `1.0.0` | No | Health/OpenAPI version; update with releases. |
| `APP_ENV` | `development` | Production | Use `production` on Render. |
| `DEBUG` | `true` | Production | Use `false` outside local development. |
| `API_V1_PREFIX` | `/api/v1` | No | Versioned router prefix; changing it breaks clients. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Production | Comma-separated CORS origins; restrict in production. |
| `LOG_LEVEL` | `INFO` | No | Python logging level; `INFO` is recommended. |
| `INTERNAL_API_KEY` | unset | Production | Protects non-public HTTP routes; send as `X-Internal-API-Key`. |
| `DEFAULT_OUTPUT_LANGUAGE` | `en` | No | Fallback output code. |
| `SUPPORTED_LANGUAGES` | `en,hi,hi-Latn,bn,mr,gu,pa,ta,te,kn,ml,ur` | No | Comma-separated configured language set. |
| `TEMP_AUDIO_DIR` | `.tmp/audio` | No | Temporary upload/normalized audio directory; must be writable. |

## Whisper and transcription

| Variable | Default | Purpose / recommendation |
|---|---:|---|
| `WHISPER_MODEL_SIZE` | `tiny` | faster-whisper model; use `small` accuracy or `tiny` low-memory. |
| `WHISPER_DEVICE` | `cpu` | Set CUDA only after installing/validating a compatible runtime. |
| `WHISPER_COMPUTE_TYPE` | `int8` | Safe CPU compute type. |
| `WHISPER_BEAM_SIZE` | `5` | Primary decode beam size. |
| `WHISPER_BEST_OF` | `5` | Candidate count used by compatible decoding. |
| `WHISPER_CPU_THREADS` | `0` | CTranslate2 thread selection; zero delegates selection. |
| `WHISPER_NUM_WORKERS` | `1` | Model worker count; keep one for bounded memory. |
| `WHISPER_LANGUAGE_DETECTION_THRESHOLD` | `0.55` | Below this, emit low-language-confidence warning. |
| `WHISPER_WORD_TIMESTAMPS` | `true` | Request word-level timestamp support from Whisper. |
| `WHISPER_MEDICAL_PROMPT_ENABLED` | `true` | Include bounded patient-independent medical vocabulary. |
| `WHISPER_NO_SPEECH_THRESHOLD` | `0.6` | Whisper no-speech threshold. |
| `WHISPER_LOG_PROB_THRESHOLD` | `-1.0` | Decoder log-probability threshold. |
| `WHISPER_COMPRESSION_RATIO_THRESHOLD` | `2.4` | Decoder compression/hallucination threshold. |
| `WHISPER_TEMPERATURE` | `0` | Deterministic primary decode. |
| `WHISPER_CONDITION_ON_PREVIOUS_TEXT` | `true` | Primary-pass context carryover; recovery disables it. |
| `WHISPER_CONTEXT_WORDS` | `50` | Maximum live previous-context words. |
| `WHISPER_SECOND_PASS_ENABLED` | `true` | Enable bounded uncertainty-triggered alternate decode. |
| `ENABLE_SECOND_PASS_TRANSCRIPTION` | `true` | Deployment-profile alias for `WHISPER_SECOND_PASS_ENABLED`. |
| `ENABLE_TRANSCRIPTION_QUALITY_WARNINGS` | `true` | Reserved deployment-profile flag; keep true for medical transcription safety. |
| `WHISPER_SECOND_PASS_LOGPROB_THRESHOLD` | `-0.85` | Configured low-confidence threshold. |
| `WHISPER_REPETITION_WORD_RUN` | `6` | Repeated identical-word alarm length. |
| `WHISPER_REPETITION_PHRASE_REPEATS` | `3` | Repeated phrase/medical-loop alarm count. |
| `WHISPER_MAX_WORDS_PER_AUDIO_SECOND` | `5.0` | Transcript expansion safety threshold. |
| `WHISPER_REPEATED_NUMERIC_RUN` | `6` | Numeric-chain alarm threshold. |
| `WHISPER_CORRECTION_CONFIDENCE_THRESHOLD` | `0.88` | Minimum non-destructive correction-candidate confidence. |
| `TRANSCRIPTION_TIMEOUT_SECONDS` | `120` | Per-inference endpoint timeout. |
| `TRANSCRIPTION_MAX_CONCURRENT_REQUESTS` | `2` | Process-local upload transcription slots; profiles recommend one. |
| `TRANSCRIPTION_QUEUE_TIMEOUT_SECONDS` | `30` | Maximum wait for a transcription slot. |
| `TRANSCRIPTION_REQUEST_TIMEOUT_SECONDS` | `180` | Overall configured request budget for integrations. |
| `MODEL_LOAD_TIMEOUT_SECONDS` | `300` | Model-load budget exposed in configuration. |
| `NER_MODEL_NAME` | `d4data/biomedical-ner-all` | Optional Transformers model identifier. |
| `NER_LOCAL_FILES_ONLY` | `true` | Avoid runtime NER downloads; deterministic fallback remains. |

## Audio conversion, VAD, and limits

| Variable | Default | Purpose / recommendation |
|---|---:|---|
| `MAX_AUDIO_SIZE_MB` | `25` | Legacy upload size limit. |
| `AUDIO_MAX_FILE_SIZE_MB` | unset | Preferred override; falls back to `MAX_AUDIO_SIZE_MB`. |
| `AUDIO_MAX_DURATION_SECONDS` | `3600` | Maximum accepted normalized duration. |
| `AUDIO_SAMPLE_RATE` | `16000` | Normalized sample rate. |
| `AUDIO_CHANNELS` | `1` | Normalized mono channel count. |
| `AUDIO_ENABLE_PREPROCESSING` | `true` | Enable conservative FFmpeg filters. |
| `AUDIO_ENABLE_NOISE_REDUCTION` | `true` | Add conservative `afftdn`. |
| `AUDIO_ENABLE_SILENCE_TRIMMING` | `false` | Keep disabled unless validated against negations. |
| `AUDIO_MIN_SPEECH_SECONDS` | `0.35` | Minimum usable normalized duration. |
| `AUDIO_NORMALIZATION_TARGET` | `-18.0` | Loudness normalization integrated-loudness target. |
| `AUDIO_CHUNK_DURATION_SECONDS` | `600` | Long-audio logical chunk duration; voice profiles set `20`. |
| `AUDIO_CHUNK_OVERLAP_SECONDS` | `2` | Chunk overlap; must remain below chunk duration. |
| `LONG_AUDIO_MAX_DURATION_SECONDS` | `3600` | Deployment-profile alias for `AUDIO_MAX_DURATION_SECONDS`. |
| `LONG_AUDIO_CHUNK_SECONDS` | `600` | Deployment-profile alias for `AUDIO_CHUNK_DURATION_SECONDS`. |
| `LONG_AUDIO_OVERLAP_SECONDS` | `2` | Deployment-profile alias for `AUDIO_CHUNK_OVERLAP_SECONDS`. |
| `FFMPEG_PATH` | `ffmpeg` | Executable name/path; container uses `/usr/bin/ffmpeg`. |
| `AUDIO_CONVERSION_TIMEOUT_SECONDS` | `30` | FFmpeg subprocess timeout. |
| `AUDIO_NORMALIZATION_ENABLED` | `true` | Enable normalization filter chain. |
| `AUDIO_NORMALIZATION_FILTER` | `highpass=f=80,lowpass=f=8000,loudnorm` | Documented configurable filter string; converter builds its conservative chain. |
| `VAD_ENABLED` | `true` | Enable faster-whisper VAD filtering. |
| `VAD_MIN_SPEECH_DURATION_MS` | `250` | Minimum VAD speech region. |
| `VAD_MIN_SILENCE_DURATION_MS` | `500` | Minimum VAD separating silence. |
| `VAD_MIN_RMS` | `50` | PCM usable-speech RMS floor. |

## Live transcription

| Variable | Default | Purpose |
|---|---:|---|
| `LIVE_TRANSCRIPT_DEFAULT_CHUNK_DURATION_MS` | `10000` | Browser test/default chunk duration. |
| `LIVE_TRANSCRIPT_MIN_CHUNK_DURATION_MS` | `1000` | Minimum declared live chunk duration. |
| `LIVE_TRANSCRIPT_OVERLAP_MS` | `750` | Live chunk overlap metadata default. |
| `LIVE_TRANSCRIPT_SESSION_TTL_SECONDS` | `900` | Idle process-local session expiry. |
| `LIVE_TRANSCRIPT_MAX_ACTIVE_SESSIONS` | `100` | Maximum live sessions per process. |
| `LIVE_TRANSCRIPT_MAX_CHUNK_SIZE_MB` | `5` | Maximum uploaded live chunk. |
| `LIVE_TRANSCRIPT_MAX_PENDING_CHUNKS` | `3` | Per-session pending queue bound. |
| `LIVE_TRANSCRIPTION_MIN_BUFFER_SECONDS` | `1` | Streaming buffer minimum. |
| `LIVE_TRANSCRIPTION_WINDOW_SECONDS` | `30` | Streaming transcription window. |
| `LIVE_TRANSCRIPTION_OVERLAP_SECONDS` | `1` | Streaming overlap. |
| `LIVE_TRANSCRIPTION_MAX_BUFFER_MB` | `25` | Streaming buffer memory bound. |

## Gemini and domain services

| Variable | Default | Required | Purpose |
|---|---:|---|---|
| `GEMINI_API_KEY` | unset | For Gemini flows | Server-side provider credential. |
| `GEMINI_MODEL` | `gemini-flash-latest` | No | Provider model identifier. |
| `GEMINI_TEMPERATURE` | `0.2` | No | Low-variance generation. |
| `GEMINI_MAX_OUTPUT_TOKENS` | `300` | No | Default structured generation cap. |
| `GEMINI_THINKING_BUDGET` | `0` | No | Provider thinking budget. |
| `GEMINI_TIMEOUT_SECONDS` | `30` | No | Provider call timeout. |
| `GEMINI_MAX_RETRIES` | `2` | No | Retry count for eligible failures. |
| `GEMINI_OCR_MAX_OUTPUT_TOKENS` | `4096` | No | OCR fallback output cap. |
| `DOCTOR_RULE_CONFIDENCE_THRESHOLD` | `0.70` | No | Rule result confidence cutoff. |
| `DOCTOR_GEMINI_FALLBACK_ENABLED` | `true` | No | Enable provider fallback for doctor routing. |
| `PRESCRIPTION_DUMMY_MODE` | `false` | No | Explicit test/development dummy behavior; keep false in production. |
| `SUMMARIZE_MAX_TRANSCRIPT_LENGTH` | `20000` | No | Summarize input character limit. |
| `PROVIDER_MAX_CONCURRENT_REQUESTS` | `2` | No | Shared provider concurrency bound. |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` | `60` | No | Shared provider request budget. |

## OCR

| Variable | Default | Purpose / recommendation |
|---|---:|---|
| `OCR_MAX_FILE_SIZE_MB` | `10` | OCR upload size limit. |
| `OCR_MAX_PDF_PAGES` | `10` | Maximum rendered PDF pages. |
| `OCR_MAX_IMAGE_PIXELS` | `25000000` | Decompression/pixel safety bound. |
| `OCR_MODE` | `local-first` | Current provider policy. |
| `OCR_LOCAL_ENGINE` | `tesseract` | Local engine identifier. |
| `TESSERACT_PATH` | unset | Executable path; container uses `/usr/bin/tesseract`. |
| `TESSERACT_LANGUAGE` | `eng` | Installed Tesseract language expression. |
| `OCR_PREPROCESS_ENABLED` | `true` | Enable OCR variants. |
| `OCR_PREPROCESS_ADAPTIVE_THRESHOLD` | `true` | Enable adaptive-threshold variant. |
| `OCR_PREPROCESS_DESKEW` | `true` | Enable deskew variant. |
| `OCR_FALLBACK_THRESHOLD` | `0.55` | Below this, attempt configured Gemini fallback. Render sets `0.60`. |
| `OCR_MAX_CONCURRENT_REQUESTS` | `2` | OCR process-local concurrency. |
| `OCR_REQUEST_TIMEOUT_SECONDS` | `120` | OCR execution budget. |
| `OCR_CACHE_TTL_SECONDS` | `300` | In-memory SHA-256 result cache TTL; zero disables retention. |

## Example production minimum

```dotenv
APP_ENV=production
DEBUG=false
ALLOWED_ORIGINS=https://your-trusted-app.example
INTERNAL_API_KEY=<server-side-secret>
FFMPEG_PATH=/usr/bin/ffmpeg
TESSERACT_PATH=/usr/bin/tesseract
WHISPER_MODEL_SIZE=tiny
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_NUM_WORKERS=1
TRANSCRIPTION_MAX_CONCURRENT_REQUESTS=1
GEMINI_API_KEY=<server-side-secret-if-used>
```
