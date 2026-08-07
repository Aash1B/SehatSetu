# Safe OCR evaluation fixtures

Only locally supplied, consented, fully anonymized synthetic or teaching
documents may be evaluated. Remove names, identifiers, dates of birth, phone
numbers, addresses, barcodes, QR codes, signatures, and record numbers before
copying a file here. Never use a real clinical record merely because it is
available locally.

Update `ocr_dataset_manifest.json` with manually verified expected text and
fields. A document is refused unless `consented=true`, `anonymized=true`,
`contains_patient_data=false`, and expected text is non-empty. Put prescriptions
under `prescriptions/` and lab reports under `lab-reports/`. Include printed,
rotated, low-contrast, mobile-photo, shadow/blur, table, scanned PDF, and
multi-page examples when safely available.
