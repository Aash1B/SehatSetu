# Running Locally

[Documentation index](../README.md) · [Environment reference](ENVIRONMENT_VARIABLES.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Prerequisites

- Python 3.12 or newer; the Docker image uses Python 3.12.
- FFmpeg available on `PATH` or through `FFMPEG_PATH`.
- Tesseract OCR with English data on `PATH` or through `TESSERACT_PATH`.
- Optional Google Gemini API key for provider-backed endpoints and OCR fallback.

## Install

Windows PowerShell, from `ai-service/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Linux/macOS:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

Install native tools with the operating system package manager. Debian/Ubuntu uses `apt-get install ffmpeg tesseract-ocr tesseract-ocr-eng`. Verify with `ffmpeg -version` and `tesseract --version`.

## Configure

Set at least `APP_ENV`, `DEBUG`, native executable paths when not on `PATH`, and credentials used by the selected workflows. `INTERNAL_API_KEY` is optional in development but should be set in production. Never commit `.env`.

For voice, start from `config/whisper-low-memory.env.example` (`tiny`) or `config/whisper-accuracy.env.example` (`small`). Do not append both profiles.

## Run

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Production-like local command (matching the container worker count):

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1
```

Open:

- `http://127.0.0.1:8001/healthz`
- `http://127.0.0.1:8001/docs`
- `http://127.0.0.1:8001/openapi.json`
- `http://127.0.0.1:8001/live-audio` for the local microphone page

If `INTERNAL_API_KEY` is configured outside testing, send `X-Internal-API-Key` to non-public routes, including `/health`, `/readiness`, `/api/v1/health`, `/live-audio`, and static assets. `/healthz`, the root, and documentation routes remain public.

## Expected startup behavior

Startup logs report service identity and FFmpeg discovery. Whisper is lazy and should not load until transcription. Tesseract discovery is reflected by versioned health. The biomedical NER model may be unavailable locally; deterministic extraction remains active.

## Verify

```powershell
.\.venv\Scripts\python.exe scripts\validate_environment.py
.\.venv\Scripts\python.exe -m pytest
```

Common failures are covered in [Troubleshooting](TROUBLESHOOTING.md).
