export interface PatientProfile {
  userId: string;
  email: string;
  fullName: string;
  role?: string;
  phone?: string;
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

const API_BASE = 'http://localhost:8000/api/patient';

export async function fetchPatientProfile(userId?: string): Promise<PatientProfile> {
  const url = userId ? `${API_BASE}/profile?userId=${encodeURIComponent(userId)}` : `${API_BASE}/profile`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch patient profile');
  }
  return res.json();
}

export async function updatePatientProfile(profileData: Partial<PatientProfile>, userId?: string): Promise<PatientProfile> {
  const url = userId ? `${API_BASE}/profile?userId=${encodeURIComponent(userId)}` : `${API_BASE}/profile`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    throw new Error('Failed to update patient profile');
  }
  return res.json();
}

export async function fetchPatientDashboardData(userId?: string) {
  const url = userId ? `${API_BASE}/dashboard?userId=${encodeURIComponent(userId)}` : `${API_BASE}/dashboard`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return res.json();
}
