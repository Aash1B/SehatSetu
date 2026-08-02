# Deployment

[Documentation index](../README.md) · [Environment reference](ENVIRONMENT_VARIABLES.md) · [Architecture](ARCHITECTURE.md)

## Current approach

The repository deploys `sehat-setu-ai` as a Docker web service through the root `render.yaml`:

- context: `./ai-service`
- Dockerfile: `./ai-service/Dockerfile`
- Render liveness endpoint: `/healthz` (`GET` or `HEAD`)
- runtime port: `${PORT:-8001}`
- Uvicorn workers: `1`

## Docker

From `ai-service/`:

```bash
docker build -t sehat-setu-ai .
docker run --rm -p 8001:8001 --env-file .env sehat-setu-ai
```

The image uses `python:3.12-slim`, installs FFmpeg, Tesseract, English Tesseract data, `libgl1`, and `libglib2.0-0`, installs Python requirements, copies only `app/`, switches to UID 10001, and exposes port 8001.

Because only `app/` is copied, local documentation, tests, scripts, and benchmark reports are not present in the runtime image.

## Render configuration

`render.yaml` explicitly configures production mode, native tool paths, OCR mode/cache/concurrency, CPU/int8 Whisper, internal/Gemini secrets, Gemini model, timeout, and retries. `WHISPER_MODEL_SIZE` is not fixed by `render.yaml`; absent an environment override, application default `tiny` is used.

Required production secrets:

- `INTERNAL_API_KEY`
- `GEMINI_API_KEY` when provider-backed features are enabled

Set `ALLOWED_ORIGINS` to trusted origins. Do not put secrets in the image or build command.

## Voice profiles

| Profile | Variables | Use |
|---|---|---|
| Low memory | `tiny`, CPU, int8, one worker | Conservative constrained hosting |
| Accuracy | `small`, CPU, int8, one worker | Only after CPU/RAM/latency validation |

Use the example files in `config/`. `base` is not recommended because prior synthetic evaluation showed repetition failures.

## Model caching and cold start

The Dockerfile does not pre-download Whisper or NER models. faster-whisper downloads its selected model at first load into the runtime cache. On ephemeral disks this may repeat after restart and increases cold-start/network risk. Pre-downloading can reduce runtime uncertainty but enlarges the image; it is not part of the current Dockerfile.

The configured biomedical NER model uses `local_files_only=true` by default and is not bundled, so production normally uses deterministic fallback unless the model is added deliberately.

## Resources and concurrency

- Keep one Uvicorn worker to avoid duplicate model memory and process-local live-session divergence.
- Set bounded transcription and OCR concurrency.
- Ensure request/proxy timeouts exceed application transcription/provider timeouts.
- The repository does not declare the Render plan’s exact RAM, CPU, disk, or request ceiling; verify those in the authorized environment.

## Health and rollout

Configure Render's health check to probe `/healthz`, which does not require authentication or load dependencies. This endpoint is intended only for Render liveness and is not an external consumer API. After deployment, separately test `/api/v1/health` with the internal key, then one small OCR and voice request. A successful process probe does not prove model download, Gemini quota, Tesseract language data, or live-session routing.

No deployment command beyond Docker/Render configuration is encoded in this repository.
