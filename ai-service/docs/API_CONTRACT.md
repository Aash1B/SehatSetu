# API Contract

[Documentation index](../README.md) · [Integration guide](AI_SERVICE_INTEGRATION.md) · [Environment](ENVIRONMENT_VARIABLES.md)

This document reflects the current FastAPI OpenAPI schema and WebSocket router. Base URL examples use `http://127.0.0.1:8001`.

## Authentication and envelopes

When `INTERNAL_API_KEY` is configured and `APP_ENV` is not `testing`, `/healthz` is the public liveness endpoint. The root and documentation routes retain public service-discovery behavior; operational routes such as `/health`, `/readiness`, and every `/api/v1` endpoint require:

```http
X-Internal-API-Key: <server-side secret>
```

Successful versioned responses use:

```json
{"success": true, "message": "...", "data": {}, "meta": {"request_id": "...", "processing_time_ms": 12.3}}
```

Errors use:

```json
{"success": false, "message": "...", "error": {"code": "STABLE_CODE", "details": null}, "meta": {"request_id": "...", "processing_time_ms": 1.2}}
```

FastAPI validation failures use HTTP 422. Clients must tolerate documented optional response properties and must not infer that a missing/null metric equals zero.

## Endpoint index

| Method | Path | Content type | Response model |
|---|---|---|---|
| GET | `/` | — | `ApiResponse[dict[str,str]]` |
| GET | `/health` | — | unversioned process probe |
| GET, HEAD | `/healthz` | — | Render-only liveness probe |
| GET | `/readiness` | — | unversioned readiness summary |
| GET | `/live-audio` | — | HTML file |
| GET | `/api/v1/health` | — | `HealthResponse` |
| POST | `/api/v1/transcribe` | multipart | `TranscriptionResponse` |
| POST | `/api/v1/live-transcription/chunk` | multipart | `LiveTranscriptionResponse` |
| WS | `/api/v1/live-transcription/ws` | JSON control + binary | protocol messages |
| POST | `/api/v1/clean-transcript` | JSON | `TextCleanupResponse` |
| POST | `/api/v1/extract-medical-info` | JSON | `MedicalInfoResponse` |
| POST | `/api/v1/generate-summary` | JSON | `ConsultationSummaryResponse` |
| POST | `/api/v1/generate-prescription` | JSON | `PrescriptionResponse` |
| POST | `/api/v1/summarize` | JSON | `SummarizeResponse` |
| POST | `/api/v1/diet-recommendation` | JSON | `DietRecommendationResponse` |
| POST | `/api/v1/recommend-doctor` | JSON | `DoctorRecommendationResponse` |
| POST | `/api/v1/ocr/analyze` | multipart | `OCRAnalysisResponse` |

## Service endpoints

### `GET /`

Purpose: service information. Public, no body. Returns 200 with `data.docs` and `data.health`. Example:

```bash
curl http://127.0.0.1:8001/
```

### `GET /health`

Purpose: public process probe. No body. Returns 200:

```json
{"status":"healthy","service":"Sehat-Setu AI Service","meta":{"request_id":"...","processing_time_ms":0.2}}
```

### `GET` or `HEAD /healthz`

Purpose: minimal public liveness probe intended only for Render. External consumers should not use this endpoint. It performs no dependency checks, is excluded from OpenAPI, and returns 200. `GET` returns:

```json
{"status": "ok"}
```

### `GET /readiness`

Purpose: public lightweight FFmpeg/Gemini-configuration summary. Returns `status`, `ffmpeg.available`, `ffmpeg.path`, and `gemini_configured`. It does not load Whisper or test provider quota.

### `GET /live-audio`

Purpose: local framework-free microphone test page. Returns HTML. It is protected by internal-key middleware in configured non-testing environments; ordinary browser navigation cannot add the custom key easily, so this is primarily a local development route.

## Health

### `GET /api/v1/health`

Purpose: detailed service identity/readiness. Protected when internal auth is enabled. No body. Returns 200 `HealthResponse`; OpenAPI also declares 500.

`HealthData` fields: optional `status`; required `service`, `version`, `environment`, `ffmpeg`, `ocr`, `whisper`, `transcription_ready`, and `summary_provider_ready`. Whisper health includes `model`, `device`, `compute_type`, `loaded`, and `ready` without forcing a load.

```bash
curl -H "X-Internal-API-Key: $AI_KEY" http://127.0.0.1:8001/api/v1/health
```

## Voice

### `POST /api/v1/transcribe`

Purpose: normalize and transcribe one complete supported audio file through local faster-whisper. Timeout expectation: upstream timeout should exceed `TRANSCRIPTION_REQUEST_TIMEOUT_SECONDS`; inference itself uses `TRANSCRIPTION_TIMEOUT_SECONDS` after waiting up to `TRANSCRIPTION_QUEUE_TIMEOUT_SECONDS`.

Multipart fields:

| Field | Required | Type/default | Validation |
|---|---|---|---|
| `file` | Yes | binary | Safe filename; MP3/WAV/M4A/WebM/OGG/MP4/AAC/FLAC/Opus; configured size/duration/speech limits. |
| `language_hint` | No | string, `auto` | Legacy language input. |
| `language` | No | string/null | Preferred input; overrides `language_hint`. |
| `output_language` | No | string/null | Optional output preference. |
| `include_segments` | No | boolean, `true` | Empty segments when false. |
| `task` | No | literal `transcribe` | Translation is unsupported. |

```bash
curl -X POST http://127.0.0.1:8001/api/v1/transcribe \
  -H "X-Internal-API-Key: $AI_KEY" \
  -F "file=@sample.webm;type=audio/webm" -F "language=auto"
```

Required `TranscriptionData`: `transcript`, `detected_language`, `segments`, `model`. Optional/backward-compatible fields include raw/cleaned text, language confidence/probability, durations, processing time, warnings, second-pass/quality/disagreement metadata, correction candidates, native/Romanized text, output script, counts, and `is_dummy=false`. Each segment requires `start`, `end`, `text`; confidence/no-speech/warnings are optional.

Status/error families: 400 `UNSAFE_FILENAME`; 413 `AUDIO_FILE_TOO_LARGE`/`AUDIO_DURATION_TOO_LONG`; 415 unsupported extension/MIME/codec; 422 empty, too short, no speech, invalid/incomplete/converted audio; 503 `TRANSCRIPTION_QUEUE_TIMEOUT` or model unavailable; 504 conversion/transcription timeout. Do not retry deterministic 4xx failures.

### `POST /api/v1/live-transcription/chunk`

Purpose: idempotent REST processing of one browser audio chunk with overlap merge. Multipart fields:

| Field | Required | Default |
|---|---|---|
| `file` | Yes | — |
| `session_id`, `chunk_id` | No | generated when omitted |
| `sequence_number` | No | `1` |
| `timestamp_start_ms`, `timestamp_end_ms` | No | null |
| `language` | No | `auto` |
| `output_language` | No | null |
| `is_final` | No | `false` |
| `previous_transcript` | No | empty |
| `expected_sequence_number` | No | null |
| `multiple_chunks_expected` | No | `false` |

Response data requires session/chunk IDs, sequence, chunk/merged transcripts, speech flag, detected language, processing milliseconds, and final flag. Optional fields include language confidence, accepted/next indices, partial/finalized transcript, `needs_more_audio`, and warnings.

Errors are HTTP 422 and include empty/oversized/short/unsupported audio, out-of-order chunk, full chunk queue, paused/not-started session, no speech, and conversion failures. Duplicate processed chunk IDs return an acknowledgement rather than retranscribing.

### `WS /api/v1/live-transcription/ws`

Purpose: resumable sequential live transcription. Because HTTP middleware does not run for WebSockets, the handler validates `INTERNAL_API_KEY` before accepting the connection. Server clients should send `X-Internal-API-Key`; browser clients that cannot set headers may use `?api_key=...` only over TLS and should avoid retaining or logging the URL. Send JSON control messages (`session_start`, `session_resume`, pause/resume/finalize/cancel, or `audio_chunk_metadata`) and then matching binary audio bytes. `audio_chunk_metadata` requires non-empty `chunk_id` and integer `sequence_number`. Server messages include session state, `chunk_received`, transcription results, and structured errors.

Out-of-order chunks are rejected with the expected sequence. Duplicate IDs are acknowledged. Pending chunks and active sessions are bounded. Normal completion uses close code 1000; invalid policy/control flow may close with 1008. See [Integration](AI_SERVICE_INTEGRATION.md#live-transcription-flow).

## Transcript and extraction

### `POST /api/v1/clean-transcript`

JSON request `TextCleanupRequest`: required `transcript`. Returns original and cleaned transcript. It normalizes formatting and clearly spoken BP notation without inventing facts.

```json
{"transcript":"Patient has fever . BP is 120 over 80 ."}
```

Returns 200 or validation 422. Cleanup must not be used as a substitute for `raw_transcript`.

### `POST /api/v1/extract-medical-info`

Request `MedicalInfoRequest`: required `transcript`; optional `language` and `output_language`; legacy request property `text` remains accepted by schema logic. Returns 200 `MedicalInfoData` with optional/defaulted symptoms, symptom details, conditions, suspected/historical/family findings, negated findings, lab tests, doctor instructions, allergies, medications, durations, vitals, procedures, and legacy fields.

```json
{"transcript":"Patient has fever for three days and no chest pain. Takes paracetamol 500 mg twice daily.","language":"en"}
```

Medication mentions can include name, normalized name, strength/dose/unit/dosage, frequency/duration/route/instruction, confidence, and source text. Errors: 422 validation; 500 `NER_PROCESSING_FAILED`. Provider-free deterministic fallback is supported.

## Summary and clinical drafts

### `POST /api/v1/generate-summary`

Request `ConsultationSummaryRequest`: required `transcript`; optional `medical_entities`, `language`, and `output_language`. Returns required chief complaint, symptoms, medical history, allergies, doctor advice; optional follow-up and `is_dummy`.

```json
{"transcript":"Patient reports fever for three days.","language":"en"}
```

Statuses: 200, 422, 429, 502, 503, 504. Provider errors include missing/invalid key, rate limit, network, timeout, blocked/empty/truncated/invalid/schema-invalid response, and model/configuration failure. Do not retry 422 or invalid credentials; bounded retry with jitter is appropriate for selected 429/502/503/504 failures.

### `POST /api/v1/generate-prescription`

Request `PrescriptionRequest`: required `summary`; optional medical entities, age, gender, language/output language, and legacy input. Returns `PrescriptionData` with defaulted identified issues/symptoms, medications, lab tests, warnings, guidance/follow-up, doctor-confirmation/review flags, disclaimer, language, diagnosis/instructions, and dummy flag.

```json
{"summary":"Patient reports fever for three days; no known allergy.","language":"en"}
```

Statuses: 200, 422, 502, 504; unexpected internal failures map to `PRESCRIPTION_GENERATION_FAILED`. The response is a draft requiring doctor review.

### `POST /api/v1/summarize`

Request `SummarizeRequest`: required `transcript`. It extracts entities internally and returns `PrescriptionDraft` via `SummarizeResponse`. Draft fields include issues, symptoms, medications, lab tests, vitals, allergies, warnings, diagnosis/instructions, review/confirmation flags, disclaimer, and dummy flag.

```json
{"transcript":"Patient has fever and takes paracetamol 500 mg."}
```

Statuses: 200, 422, 500. This is not the same contract as `/generate-summary`.

### `POST /api/v1/diet-recommendation`

Request `DietRecommendationRequest`: required `summary`; optional medical entities, age, gender, dietary preference, language/output language, dietary preferences, allergies, and legacy input. Returns food lists, hydration, meal guidance, condition notes, warning signs, lifestyle guidance, vitamins/minerals, notes, review flag, disclaimer, language/condition/general advice, and dummy flag.

```json
{"summary":"Adult with diabetes; no food allergies.","dietary_preference":"vegetarian"}
```

Statuses: 200, 422, 502, 504; unexpected errors map to `DIET_GENERATION_FAILED`. Requires professional review.

### `POST /api/v1/recommend-doctor`

Request `DoctorRecommendationRequest`: required `issue`; optional symptoms, age, gender, language, and output language. Returns required controlled doctor category, matched symptoms, reason, urgency, confidence, alternative categories, and recommendation source; emergency warning/disclaimer are optional.

```json
{"issue":"Persistent chest pain and shortness of breath","symptoms":["chest pain"]}
```

Statuses: 200, 422, 500 `DOCTOR_RECOMMENDATION_FAILED`. This routes specialization only; it does not diagnose, select a doctor, check availability, or book.

## OCR

### `POST /api/v1/ocr/analyze`

Purpose: validate, temporarily store, analyze, and remove a medical document.

Multipart fields:

| Field | Required | Default |
|---|---|---|
| `file` | Yes | PNG, JPG/JPEG, WebP, or PDF |
| `language` | No | `auto` |
| `output_language` | No | null |
| `include_summary` | No | `true` |
| `include_medical_analysis` | No | `true` |

```bash
curl -X POST http://127.0.0.1:8001/api/v1/ocr/analyze \
  -H "X-Internal-API-Key: $AI_KEY" \
  -F "file=@report.pdf;type=application/pdf" -F "language=auto"
```

`OCRAnalysisData` contains provider/engine/local/fallback text, fallback/cache flags, confidence/time, corrections, structured entities, document type, extracted/raw/cleaned text, warnings, per-page results, optional summary/findings/recommendations, languages, doctor-review flag, and disclaimer. Page results expose provider, confidence, fallback, timing, warnings, status, selected variant, and variant diagnostics.

Statuses: 200; 413 `OCR_FILE_TOO_LARGE` or configured page/pixel bounds; 415 unsupported extension/MIME; 422 invalid, blank, corrupt, encrypted, or unprocessable document; 503 provider/local OCR unavailable. Timeout behavior follows OCR/provider settings.

## Backward compatibility

- Keep `/api/v1` paths stable.
- `language_hint` remains accepted for transcription; `language` takes precedence.
- Medical extraction retains legacy text input behavior.
- Prescription/diet schemas retain legacy input fields.
- New response fields are optional/defaulted; clients should ignore unknown fields.
- `meta` is middleware-added and clients should not require exact timing values.
