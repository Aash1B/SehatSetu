# Troubleshooting

[Documentation index](../README.md) · [Local setup](RUNNING_LOCALLY.md) · [Environment reference](ENVIRONMENT_VARIABLES.md)

## Fast lookup

| Symptom | Likely cause | Action |
|---|---|---|
| Server starts but transcription fails | FFmpeg/model unavailable | Check `/api/v1/health`, `FFMPEG_PATH`, disk/network, and model name. |
| `401 INTERNAL_AUTH_FAILED` | Missing/wrong internal key | Send `X-Internal-API-Key` matching server configuration. |
| `422` upload failure | Invalid, empty, short, silent, corrupt, or partial media | Send a complete supported recording and inspect structured error code. |
| `503` transcription queue/model | Queue timeout or model-load failure | Reduce concurrency, increase valid queue budget, verify model cache/network. |
| OCR unavailable | Tesseract missing/path/language | Verify executable and `tesseract --list-langs`. |
| Gemini `429/502/503/504` | Quota, provider, credential, or timeout | Do not retry blindly; use bounded policy below. |
| OpenAPI missing route | Wrong service/prefix or stale process | Open `/openapi.json`; expected prefix is `/api/v1`. |
| WebSocket absent from OpenAPI | Expected FastAPI behavior | WebSocket is `/api/v1/live-transcription/ws`; inspect route docs/tests. |

> Security note: WebSocket authentication is enforced by the route itself because HTTP middleware does not cover WebSockets. Prefer the internal-key header from server clients and a trusted authenticated proxy for browsers.

## FFmpeg unavailable

Run `ffmpeg -version`. Set `FFMPEG_PATH` to an executable, not a directory. In Docker it is `/usr/bin/ffmpeg`. `/api/v1/health` reports resolved path/version/reason without loading Whisper.

Partial MediaRecorder WebM fragments may lack an EBML header and are not independently decodable. Preserve the first container chunk and use the live-session protocol. Corrupt/empty audio is intentionally rejected.

## Whisper download or load failure

Confirm `WHISPER_MODEL_SIZE` is a supported faster-whisper identifier, available disk/network, and `WHISPER_DEVICE`/`WHISPER_COMPUTE_TYPE` compatibility. CPU should use `int8`. Model load is lazy, so `/healthz` can succeed before the first inference. Runtime caches may be ephemeral on Render.

For memory pressure, use the `tiny` low-memory profile, one Uvicorn worker, and one concurrent transcription. Do not run multiple model sizes in one production process.

## Voice confidence and repetition

Surface `quality_warnings` and `warnings`; do not suppress review flags. `REPETITION_DETECTED`, disagreement warnings, or `TRANSCRIPT_REQUIRES_REVIEW` require manual review. Preserve `raw_transcript`; candidate corrections are not confirmed medicines.

Aggressive silence trimming can remove short negations. Keep `AUDIO_ENABLE_SILENCE_TRIMMING=false` unless validated on human paired recordings.

## Tesseract unavailable or low confidence

Run `tesseract --version` and `tesseract --list-langs`. Set `TESSERACT_PATH` and ensure `TESSERACT_LANGUAGE` is installed. Container defaults are `/usr/bin/tesseract` and `eng`.

Low-confidence OCR may return local text with warnings or attempt Gemini below `OCR_FALLBACK_THRESHOLD`. Improve source resolution/contrast before lowering safety thresholds. Encrypted, oversized, over-page-limit, and invalid documents are rejected by design.

## Gemini failures

- Verify `GEMINI_API_KEY` is set server-side and not a placeholder.
- Confirm `GEMINI_MODEL` availability and provider quota.
- `429`: wait/back off; do not multiply retries across NestJS and FastAPI.
- `502/503`: transient provider/service failure; retry only idempotent requests with jitter.
- `504`: align upstream timeout above FastAPI’s provider timeout.

Never convert failed provider output into a successful clinical result.

## Health and readiness

- `/healthz`: public process probe used by Render.
- `/readiness`: public FFmpeg/Gemini-configuration summary.
- `/api/v1/health`: detailed versioned readiness and protected when an internal key is configured.

A green process probe does not prove first-time Whisper download, Tesseract extraction quality, Gemini quota, or live-session affinity.

## Docker/Render

Build from `ai-service/`, not the repository root, when using `ai-service/Dockerfile`. Verify port 8001 and `/healthz`. The image copies only `app/`; benchmark scripts and docs are intentionally absent. Render instance limits are not encoded in the repository.

## Benchmark failures

- Check that fixture files exist and manifest paths are relative to the manifest directory.
- Exclude unsupported-language TTS, placeholders, unsafe metadata, and missing files.
- Keep model settings identical for comparisons.
- Do not interpret missing/null as zero or blocked as passed.
- Clear only task-specific temporary output; do not delete tracked fixtures.

## Environment parsing

Pydantic reports invalid booleans, bounds, paths, and positive/non-negative constraints during startup. Compare `.env` against [Environment Variables](ENVIRONMENT_VARIABLES.md), but do not copy secrets into support messages.
