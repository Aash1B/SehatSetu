import { getToken } from '../auth/authStorage';

export interface ReferralRecord {
  id: string;
  patientId: string;
  patient?: {
    id: string;
    name?: string | null;
    village?: string | null;
    gender?: string | null;
    age?: string | null;
    phone?: string | null;
  };
  referredByDoctorId?: string | null;
  referredByDoctor?: {
    id: string;
    name?: string | null;
    specialty?: string | null;
    hospital?: string | null;
  } | null;
  appointmentId?: string | null;
  recommendedFacility: string;
  facilityType: string;
  reason: string;
  status: 'PENDING' | 'SCHEDULED' | 'VISITED' | 'COMPLETED' | 'DECLINED';
  scheduledDate?: string | null;
  completedAt?: string | null;
  followUpNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferralInput {
  patientId: string;
  referredByDoctorId?: string;
  appointmentId?: string;
  recommendedFacility: string;
  facilityType: 'GOVERNMENT' | 'PRIVATE' | 'SPECIALTY';
  reason: string;
  status?: string;
  scheduledDate?: string;
  followUpNotes?: string;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export async function createReferral(data: CreateReferralInput): Promise<ReferralRecord> {
  return apiRequest<ReferralRecord>('/api/referrals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateReferralStatus(
  id: string,
  data: {
    status: string;
    scheduledDate?: string;
    completedAt?: string;
    followUpNotes?: string;
  },
): Promise<ReferralRecord> {
  return apiRequest<ReferralRecord>(`/api/referrals/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchPatientReferrals(patientId: string): Promise<ReferralRecord[]> {
  return apiRequest<ReferralRecord[]>(`/api/referrals/patient/${patientId}`);
}

export async function fetchReferrals(status?: string, facilityType?: string): Promise<ReferralRecord[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (facilityType) params.append('facilityType', facilityType);
  const queryStr = params.toString();
  return apiRequest<ReferralRecord[]>(`/api/referrals${queryStr ? `?${queryStr}` : ''}`);
}
