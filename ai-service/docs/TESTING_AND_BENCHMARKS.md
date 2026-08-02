# Testing and Benchmarks

[Documentation index](../README.md) · [Contributing](CONTRIBUTING.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Automated tests

Tests live under tracked `tests/`; generated evaluation output lives under ignored `test/`. Run:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m compileall -q app scripts evaluation_dashboard
```

Focused examples:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_transcription.py tests/test_live_transcription.py tests/test_language_service.py
.\.venv\Scripts\python.exe -m pytest tests/test_ocr.py tests/test_ocr_pipeline.py
.\.venv\Scripts\python.exe -m pytest tests/test_medical_extraction.py
```

The current suite covers contracts, middleware, audio conversion, transcription selection/safety, live sessions, language normalization, medical vocabulary, OCR, extraction, Gemini structured-response behavior, summaries, prescriptions, diet, doctor recommendation, and production readiness.

## Voice benchmarks

| Command | Purpose |
|---|---|
| `python scripts/benchmark_voice_accuracy.py --use-test-client` | Exercise `/api/v1/transcribe` against a manifest. |
| `python scripts/run_final_voice_benchmarks.py --models small tiny` | Run validated English synthetic fixtures for recommended profiles. |
| `python scripts/compare_whisper_models.py` | Sequential model comparison with resource measurements. |
| `python scripts/tune_transcription_settings.py --use-test-client` | Bounded decoding/preprocessing tuning harness. |
| `python scripts/generate_voice_safety_sets.py` | Regenerate deterministic text-only safety sets. |

The tracked fixture manifest contains synthetic English, Hindi, and Hinglish audio. Hindi/Hinglish files generated with an en-US voice are unsupported-language TTS and must not be used to claim language accuracy.

## OCR and extraction

```powershell
.\.venv\Scripts\python.exe scripts\benchmark_ocr_accuracy.py
.\.venv\Scripts\python.exe scripts\benchmark_extraction_and_safety.py
```

OCR reports record engine/provider, similarity, medical terms, numbers, units, confidence, latency, cache/fallback behavior, and failure details. Provider safety metrics remain blocked when no successful real provider output exists; mocked output is not silently scored as real.

## Dashboard

```powershell
.\.venv\Scripts\python.exe -m evaluation_dashboard.app
```

Output: `test/consolidated/reports/evaluation-dashboard.html`. Add `--serve --port 8765` to serve it locally. The loader redacts sensitive keys and reports missing metrics as “Not measured,” never zero.

## Current artifact status

At documentation generation time, `reports/standalone-verification/` contains no files. Ignored local artifacts under `test/consolidated/reports/` include voice/OCR benchmarks, model comparison, transcription tuning, extraction, Gemini integration, verification, and dashboard outputs.

Classification rules:

| Class | Meaning |
|---|---|
| Synthetic | Model inference on generated, patient-independent fixtures. |
| Deterministic text-only | Scorer/rule validation without acoustic inference. |
| Mocked | Unit/contract behavior with replaced provider/model. |
| Real provider | Actual external provider call; quota/network failures stay blocked. |
| Human | Real consented recording; no completed human result is currently documented. |
| Blocked | Required dependency/input/runtime unavailable; not counted as passed. |

## Known limitations

- Synthetic English results do not predict human clinical performance.
- English-only TTS cannot validate Hindi/Hinglish.
- Model results can vary with hardware, cache state, library version, and decoding settings.
- Process-local live-state tests do not prove multi-replica routing.
- OCR quality depends strongly on scan quality and installed Tesseract language data.
- Gemini results depend on model availability, quota, credentials, and network conditions.

Reports must contain no patient data, credentials, generated media, or model-cache files.
