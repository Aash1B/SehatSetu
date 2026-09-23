import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a doctor name so it has exactly one 'Dr.' prefix without duplication.
 * E.g.:
 * - 'Dr. Dr. Kritttt' -> 'Dr. Kritttt'
 * - 'Dr. Kritttt'     -> 'Dr. Kritttt'
 * - 'Dr Kritttt'      -> 'Dr. Kritttt'
 * - 'Kritttt'         -> 'Dr. Kritttt'
 */
export function formatDoctorName(name?: string | null): string {
  if (!name || !name.trim()) return 'Doctor';
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^((dr|doctor)\b\.?\s*)+/i, '').trim();
  if (!stripped) return 'Doctor';
  return `Dr. ${stripped}`;
}

