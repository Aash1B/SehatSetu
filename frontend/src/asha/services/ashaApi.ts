import { getToken } from '../../auth/authStorage';
import { API_BASE_URL } from '../../patient/utils/constants';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface AshaDashboardData {
  worker: {
    id: string;
    workerCode: string | null;
    assignedArea: string | null;
    village: string | null;
    subCenterId: string | null;
    fullName?: string;
    phone?: string;
  };
  counts: {
    assignedPatients: number;
    todayAppointments: number;
    overdueFollowups: number;
    openEmergencies: number;
  };
  recentAppointments: Array<{
    id: string;
    patientName: string;
    patientPhone?: string;
    patientVillage?: string;
    doctorName: string;
    doctorSpecialty?: string;
    doctorImageUrl?: string;
    date?: string;
    timeSlot?: string;
    scheduledAt?: string;
    status: string;
    consultMode?: string;
    healthConcern?: string;
    isFollowUp?: boolean;
    paymentStatus?: string;
    verifiedByAsha?: boolean;
  }>;
}

export interface CaseloadPatientItem {
  id: string;
  name: string;
  phone: string;
  gender: string;
  age: string | null;
  village: string;
  assignedArea?: string;
  isAshaRegistered: boolean;
  hasAccount: boolean;
  bloodGroup?: string | null;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact?: string | null;
  lastVisitDate?: string | null;
  lastStatus?: string | null;
  hasEmergencyFlag: boolean;
  totalAppointments: number;
}

export interface PatientDetailData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  age?: string | null;
  dateOfBirth?: string | null;
  village?: string;
  assignedArea?: string;
  bloodGroup?: string | null;
  height?: string | null;
  weight?: string | null;
  emergencyContact?: string | null;
  allergies: string[];
  chronicConditions: string[];
  isAshaRegistered: boolean;
  hasAccount: boolean;
  appointments: Array<{
    id: string;
    doctorName?: string;
    specialty?: string;
    hospital?: string;
    date?: string;
    timeSlot?: string;
    scheduledAt?: string;
    status: string;
    consultMode?: string;
    healthConcern?: string;
    symptoms?: string[];
    severity?: string;
    urgency?: string;
    isFollowUp?: boolean;
    paymentStatus?: string;
    verifiedByAsha?: boolean;
    prescription?: any;
  }>;
  ehrRecords: Array<{
    id: string;
    diagnosis?: string | null;
    notes?: string | null;
    aiSummary?: string | null;
    createdAt: string;
    status: string;
  }>;
  prescriptions: Array<{
    id: string;
    doctorName?: string;
    specialty?: string;
    diagnosis?: string | null;
    medicines: any;
    dietAdvice?: string | null;
    createdAt: string;
  }>;
}

export interface QuickRegisterPatientPayload {
  fullName: string;
  gender: string;
  phone: string;
  village: string;
  age?: string;
  dateOfBirth?: string;
  assignedArea?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  emergencyContact?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface AshaCreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  consultMode?: string;
  healthConcern?: string;
  symptoms?: string[];
  duration?: string;
  severity?: string;
  urgency?: string;
  notes?: string;
  paymentStatus?: 'CASH_PENDING' | 'WAIVED' | 'PAID';
}

export interface OverdueFollowupItem {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientVillage?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  scheduledDate?: string;
  timeSlot?: string;
  healthConcern?: string;
  daysOverdue: number;
}

export interface EmergencyItem {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientVillage?: string;
  doctorName?: string;
  healthConcern?: string;
  symptoms?: string[];
  severity?: string;
  urgency?: string;
  verifiedByAsha: boolean;
  verifiedByAshaAt?: string;
  reportedAt: string;
}

export async function fetchAshaDashboard(): Promise<AshaDashboardData> {
  const res = await fetch(`${API_BASE_URL}/asha/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to load ASHA dashboard');
  }
  return res.json();
}

export async function fetchCaseloadPatients(search?: string): Promise<CaseloadPatientItem[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE_URL}/asha/patients${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to load caseload patients');
  }
  return res.json();
}

export async function fetchPatientDetail(patientId: string): Promise<PatientDetailData> {
  const res = await fetch(`${API_BASE_URL}/asha/patients/${encodeURIComponent(patientId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to load patient detail');
  }
  return res.json();
}

export async function quickRegisterPatient(
  payload: QuickRegisterPatientPayload,
): Promise<{ isExisting: boolean; message: string; patient: { id: string; name: string; phone: string; village?: string } }> {
  const res = await fetch(`${API_BASE_URL}/asha/patients/quick-register`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to register patient');
  }
  return res.json();
}

export async function createAshaAppointment(payload: AshaCreateAppointmentPayload): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/asha/appointments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to book appointment');
  }
  return res.json();
}

export async function fetchOverdueFollowups(): Promise<OverdueFollowupItem[]> {
  const res = await fetch(`${API_BASE_URL}/asha/followups/overdue`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to load overdue follow-ups');
  }
  return res.json();
}

export async function fetchEmergencies(): Promise<EmergencyItem[]> {
  const res = await fetch(`${API_BASE_URL}/asha/emergencies`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to load emergencies');
  }
  return res.json();
}

export async function verifyEmergencyFlag(appointmentId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/asha/emergencies/${encodeURIComponent(appointmentId)}/verify`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to verify emergency flag');
  }
  return res.json();
}
