# Voice fixture placement

This directory intentionally contains no fabricated human recordings. Record
only consented, non-patient sample phrases matching `../voice_dataset_manifest.json`
or generate them with an offline TTS tool already approved on your machine.

Keep recordings free of names, phone numbers, addresses, and clinical records.
Place files at the manifest paths, verify each expected transcript manually,
then set `enabled` appropriately. Missing `optional` files are reported as
`SKIPPED`; they are never counted as passes. WebM fixtures should be complete
MediaRecorder blobs containing the initial container header.

Most clips should be 10–45 seconds, preferably WAV or complete WebM/Opus. Each
entry must explicitly set `consented=true`, `synthetic_content=true`, and
`contains_patient_data=false`. Record the exact spoken words, language, speaker
conditions, noise, terms, medicines, dosages, tests, and negations. The
benchmark refuses entries without these safety declarations or without an
expected transcript. Never include identity, record numbers, addresses, or
phone numbers.

Do not commit sensitive recordings. Run:

```powershell
python scripts/benchmark_voice_accuracy.py --use-test-client
```

Use `--base-url http://127.0.0.1:8000` to exercise an already-running service.
