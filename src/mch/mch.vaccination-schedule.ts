/**
 * MCH Vaccination Schedule Configuration
 *
 * IMPORTANT: This schedule is provided as a configurable starting point.
 * The exact schedule MUST be validated against current national immunisation
 * programme guidelines (e.g., IAP/NIP India) by a qualified medical professional
 * before clinical deployment.
 *
 * Doses are expressed as weeks or months after date of birth.
 * offsetDays: days after DOB when dose is scheduled.
 */

export interface VaccineDoseDefinition {
  vaccineName: string;
  doseNumber: number;
  /** Days after date of birth */
  offsetDays: number;
  /** Human-readable label, e.g. "At birth", "6 weeks" */
  label: string;
}

/**
 * Default Indian NIP-aligned schedule (indicative — REQUIRES CLINICAL VALIDATION).
 * Source guidance: https://www.mohfw.gov.in — validate before deployment.
 */
export const VACCINATION_SCHEDULE: VaccineDoseDefinition[] = [
  // ── At birth ────────────────────────────────────────────────────
  { vaccineName: 'BCG', doseNumber: 1, offsetDays: 0, label: 'At birth' },
  { vaccineName: 'OPV', doseNumber: 0, offsetDays: 0, label: 'At birth (OPV 0)' },
  { vaccineName: 'Hepatitis B', doseNumber: 1, offsetDays: 0, label: 'At birth' },

  // ── 6 weeks ─────────────────────────────────────────────────────
  { vaccineName: 'DPT', doseNumber: 1, offsetDays: 42, label: '6 weeks' },
  { vaccineName: 'OPV', doseNumber: 1, offsetDays: 42, label: '6 weeks' },
  { vaccineName: 'IPV', doseNumber: 1, offsetDays: 42, label: '6 weeks' },
  { vaccineName: 'Hib', doseNumber: 1, offsetDays: 42, label: '6 weeks' },
  { vaccineName: 'Hepatitis B', doseNumber: 2, offsetDays: 42, label: '6 weeks' },
  { vaccineName: 'Rotavirus', doseNumber: 1, offsetDays: 42, label: '6 weeks' },
  { vaccineName: 'PCV', doseNumber: 1, offsetDays: 42, label: '6 weeks' },

  // ── 10 weeks ────────────────────────────────────────────────────
  { vaccineName: 'DPT', doseNumber: 2, offsetDays: 70, label: '10 weeks' },
  { vaccineName: 'OPV', doseNumber: 2, offsetDays: 70, label: '10 weeks' },
  { vaccineName: 'Hib', doseNumber: 2, offsetDays: 70, label: '10 weeks' },
  { vaccineName: 'Rotavirus', doseNumber: 2, offsetDays: 70, label: '10 weeks' },

  // ── 14 weeks ────────────────────────────────────────────────────
  { vaccineName: 'DPT', doseNumber: 3, offsetDays: 98, label: '14 weeks' },
  { vaccineName: 'OPV', doseNumber: 3, offsetDays: 98, label: '14 weeks' },
  { vaccineName: 'IPV', doseNumber: 2, offsetDays: 98, label: '14 weeks' },
  { vaccineName: 'Hib', doseNumber: 3, offsetDays: 98, label: '14 weeks' },
  { vaccineName: 'Hepatitis B', doseNumber: 3, offsetDays: 98, label: '14 weeks' },
  { vaccineName: 'Rotavirus', doseNumber: 3, offsetDays: 98, label: '14 weeks' },
  { vaccineName: 'PCV', doseNumber: 2, offsetDays: 98, label: '14 weeks' },

  // ── 6 months ────────────────────────────────────────────────────
  { vaccineName: 'OPV', doseNumber: 4, offsetDays: 180, label: '6 months' },

  // ── 9 months ────────────────────────────────────────────────────
  { vaccineName: 'Measles/MR', doseNumber: 1, offsetDays: 270, label: '9 months' },
  { vaccineName: 'Vitamin A', doseNumber: 1, offsetDays: 270, label: '9 months' },
  { vaccineName: 'JE', doseNumber: 1, offsetDays: 270, label: '9 months (endemic areas)' },

  // ── 12 months ───────────────────────────────────────────────────
  { vaccineName: 'Hepatitis A', doseNumber: 1, offsetDays: 365, label: '12 months' },
  { vaccineName: 'PCV', doseNumber: 3, offsetDays: 365, label: '12 months (booster)' },

  // ── 15 months ───────────────────────────────────────────────────
  { vaccineName: 'MMR', doseNumber: 1, offsetDays: 456, label: '15 months' },
  { vaccineName: 'Varicella', doseNumber: 1, offsetDays: 456, label: '15 months' },

  // ── 16–18 months ────────────────────────────────────────────────
  { vaccineName: 'DPT', doseNumber: 4, offsetDays: 540, label: '18 months (booster 1)' },
  { vaccineName: 'OPV', doseNumber: 5, offsetDays: 540, label: '18 months (booster 1)' },
  { vaccineName: 'Hib', doseNumber: 4, offsetDays: 540, label: '18 months (booster)' },
  { vaccineName: 'Hepatitis A', doseNumber: 2, offsetDays: 540, label: '18 months' },
  { vaccineName: 'Measles/MR', doseNumber: 2, offsetDays: 540, label: '18 months' },

  // ── 2 years ─────────────────────────────────────────────────────
  { vaccineName: 'Typhoid', doseNumber: 1, offsetDays: 730, label: '2 years' },

  // ── 4–6 years ───────────────────────────────────────────────────
  { vaccineName: 'DPT', doseNumber: 5, offsetDays: 1825, label: '5 years (booster 2)' },
  { vaccineName: 'OPV', doseNumber: 6, offsetDays: 1825, label: '5 years (booster 2)' },
  { vaccineName: 'MMR', doseNumber: 2, offsetDays: 1825, label: '5 years' },
  { vaccineName: 'Varicella', doseNumber: 2, offsetDays: 1825, label: '5 years' },
];

/** Returns the scheduled doses for a child with the given DOB */
export function buildVaccinationSchedule(
  dateOfBirth: Date,
): Array<{ vaccineName: string; doseNumber: number; scheduledDate: Date; label: string }> {
  return VACCINATION_SCHEDULE.map((dose) => {
    const scheduled = new Date(dateOfBirth);
    scheduled.setDate(scheduled.getDate() + dose.offsetDays);
    return {
      vaccineName: dose.vaccineName,
      doseNumber: dose.doseNumber,
      scheduledDate: scheduled,
      label: dose.label,
    };
  });
}
