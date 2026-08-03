# Account deletion

## API

- `POST /account/deletion/request-otp` requires a bearer JWT and has no request body.
- `POST /account/deletion/confirm` requires the same authenticated account and `{ "otp": "123456", "confirmation": "DELETE" }`.

The deletion target is always derived from the validated JWT. Email, user, doctor, and patient identifiers supplied by a client are ignored because they are not accepted by either contract.

## Verification controls

- Six-digit OTP generated with a cryptographically secure generator.
- Only a bcrypt hash is stored.
- Purpose is fixed to `ACCOUNT_DELETION`.
- Expiry is configurable with `ACCOUNT_DELETION_OTP_EXPIRY_MINUTES` and restricted to 5–10 minutes.
- Resend cooldown is configurable with `ACCOUNT_DELETION_OTP_RESEND_SECONDS` and has a minimum of 30 seconds.
- Maximum five requests per hour and five verification attempts per code.
- A resend consumes all earlier unused deletion codes.
- The successful code is atomically claimed and then removed with the account's other deletion codes.
- Deleted accounts have `accountStatus=DELETED`; `tokenVersion` is incremented and checked by the JWT strategy on every protected request.

## Patient handling

- All `SCHEDULED` and `WAITING` appointments are cancelled.
- Flat appointment identifiers and notes are cleared.
- Patient demographic, contact, allergy, condition, and avatar metadata are cleared.
- Medical-report metadata is deleted.
- Profile images and medical-report objects are queued for Supabase deletion from trusted database paths.
- The patient and user rows are irreversibly anonymized so required prescriptions, EHR records, payments, and completed appointments keep valid relational integrity.

## Doctor handling

- Deletion is blocked while any `SCHEDULED` or `WAITING` appointment exists.
- Availability, public identity, image, location, hospital, and tags are cleared after appointments are resolved.
- Doctor-document storage paths found in trusted persisted availability metadata are queued for deletion.
- The doctor and user rows are anonymized so completed appointments and prescriptions belonging to patients remain valid.

## Retained data

Completed appointments, prescriptions, EHR records, and payment records are retained in minimally necessary form because the current schema treats them as shared clinical/financial records with required foreign keys. The legal team must confirm jurisdiction-specific retention durations and whether more fields must be encrypted, archived, or removed.

## External cleanup

Storage deletion is not transactionally coupled to PostgreSQL. Each trusted bucket/path is first inserted into `StorageCleanupJob` in the database transaction. Immediate deletion is attempted after commit. Failures remain `PENDING` with a bounded error message; the backend retries pending jobs every five minutes, up to ten attempts per object. Service-role credentials remain backend-only.

## Audit

`AccountDeletionAudit` stores only a one-way user identifier hash, role, outcome, and timestamp. It does not contain email, OTP, medical data, or access tokens.
