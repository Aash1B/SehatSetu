import { API_BASE_URL } from '../../patient/utils/constants';

function getAuthToken(): string | null {
  return localStorage.getItem('token') || localStorage.getItem('doctor_token') || sessionStorage.getItem('token');
}

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ConsultationSummaryResponse {
  success: boolean;
  data?: {
    chief_complaint?: string;
    symptoms?: string[];
    medical_history?: string[];
    allergies?: string[];
    doctor_advice?: string;
    follow_up?: string;
    is_dummy?: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface MedicalInfoResponse {
  success: boolean;
  data?: {
    symptoms?: Array<{ name: string; duration?: string }>;
    medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
    lab_tests?: Array<{ name: string; reason?: string }>;
    procedures?: string[];
    vitals?: Record<string, string>;
  };
}

export interface PrescriptionDraftResponse {
  success: boolean;
  data?: {
    identified_issues?: string[];
    medications?: Array<{ name: string; dosage: string; frequency: string; duration: string; route?: string }>;
    lab_tests?: string[];
    guidance_and_followup?: string;
    warnings?: string[];
    disclaimer?: string;
  };
}

export interface DoctorRecommendationResponse {
  success: boolean;
  data?: {
    specialization?: string;
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
    reasoning?: string;
  };
}

/**
 * Generate consultation summary from live call or transcript
 */
export async function fetchConsultationSummary(transcript: string): Promise<ConsultationSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/summary`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ transcript }),
  });
  return response.json();
}

/**
 * Extract medical entities (Symptoms, Medicines, Lab Tests) from live transcript/speech
 */
export async function extractMedicalInfo(transcript: string): Promise<MedicalInfoResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/medicalInfo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ transcript }),
  });
  return response.json();
}

/**
 * Generate digital prescription draft from consultation summary
 */
export async function generatePrescriptionDraft(summary: string): Promise<PrescriptionDraftResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/prescription`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ summary }),
  });
  return response.json();
}

/**
 * Recommend doctor specialty based on patient symptoms
 */
export async function recommendDoctorSpecialist(symptoms: string): Promise<DoctorRecommendationResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/specialist`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symptoms }),
  });
  return response.json();
}
