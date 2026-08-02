# Contributing

[Documentation index](../README.md) · [API contract](API_CONTRACT.md) · [Testing](TESTING_AND_BENCHMARKS.md)

## Standards

- Use typed Python, Pydantic models, service-layer logic, and standard `ApiResponse`/`ErrorResponse` envelopes.
- Keep routes thin and use `AppException` for stable public failures.
- Never log raw audio, full patient transcripts, credentials, or documents at normal log levels.
- Preserve raw evidence separately from cleaned/normalized text.
- Prefer deterministic medical rules before generative fallback.

## Compatibility

- Do not delete or rename routes or required fields.
- Add response fields as optional with safe defaults.
- Retain documented legacy aliases such as `language_hint`, request `text`, and legacy input objects unless a versioned migration is approved.
- Update schemas, OpenAPI assertions, integration documentation, and examples together.

## Adding an endpoint

1. Add request/response schemas under `app/schemas/`.
2. Implement domain logic under `app/services/`.
3. Add the route under `app/api/v1/endpoints/` and include it in the v1 router.
4. Specify response models, status codes, descriptions, and stable error codes.
5. Add contract, validation, service, and failure-path tests.
6. Regenerate/review OpenAPI and update these documents.

## Tests and benchmarks

Run the full suite before review:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m compileall -q app scripts evaluation_dashboard
```

Changes affecting OCR, voice, language, extraction, provider prompts, or scoring require their focused tests and relevant benchmark. Keep synthetic, mocked, provider, and human results separate. Never weaken thresholds or expected data merely to pass.

## Documentation

Documentation must be derived from current routes, schemas, settings, tests, Docker/Render files, and reports. Verify relative links and never publish secrets, local absolute paths, patient data, model caches, or generated media.

## Git workflow

- Work on a task branch according to the repository owner’s process.
- Inspect `git status` and `git diff` before staging.
- Keep `.env`, `.tmp/`, `test/`, model caches, local logs, and generated media untracked.
- Do not combine unrelated OCR, voice, backend, or frontend changes.
- Use a focused commit message and include test/benchmark evidence in the pull request.
