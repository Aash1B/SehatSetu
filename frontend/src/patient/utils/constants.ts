// App-wide constants

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl !== 'http://localhost:8000') {
    return envUrl.replace(/\/+$/, '') + '/api';
  }
  // When running in browser with Vite dev server proxy, default to relative '/api'
  // to avoid IPv6 localhost resolution issues and CORS preflight mismatch
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Neurologist',
  'Orthopedic',
  'Pediatrician',
  'Psychiatrist',
  'Gynecologist',
  'ENT Specialist',
  'Ophthalmologist',
] as const;

export const ITEMS_PER_PAGE = 10;
