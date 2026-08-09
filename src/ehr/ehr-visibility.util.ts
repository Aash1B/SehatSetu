/**
 * Shared backend-level safety guard for EHR record visibility.
 *
 * Patients must never receive DRAFT or REJECTED EhrRecord data — only
 * doctor-VERIFIED records are safe for direct patient consumption. This is
 * enforced here, in the backend response-shaping code, rather than left to
 * the frontend to hide fields.
 *
 * Used by call sites that embed a to-one `ehrRecord` relation (e.g. via
 * Appointment.ehrRecord) where Prisma does not support filtering a to-one
 * relation's `include` by a `where` clause the way it does for to-many
 * relations. The primary many-record read path (EhrService.getPatientHistory)
 * filters at the query level directly; this covers the remaining call sites.
 */
export function redactEhrRecordForPatient<T extends { status?: string | null } | null | undefined>(
  ehrRecord: T,
): T | null {
  if (!ehrRecord) return null;
  return ehrRecord.status === 'VERIFIED' ? ehrRecord : null;
}
