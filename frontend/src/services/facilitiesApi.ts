import { API_BASE_URL } from '../patient/utils/constants';
import { getToken } from '../auth/authStorage';

export interface MedicineStockRecord {
  id: string;
  facilityId: string;
  medicineName: string;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  quantity: number | null;
  updatedAt?: string;
  facilityName?: string;
  facilityType?: string;
  district?: string;
  village?: string;
}

export interface FacilityRecord {
  id: string;
  name: string;
  type: string; // PHC, CHC, DISTRICT_HOSPITAL, SPECIALTY, GOVERNMENT, PRIVATE
  village?: string;
  district?: string;
  _count?: {
    inventory: number;
  };
  inventory?: MedicineStockRecord[];
}

export interface FacilityAppointmentItem {
  id: string;
  patientId?: string | null;
  patientName?: string | null;
  patientAge?: string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  healthConcern?: string | null;
  symptoms?: string[];
  severity?: string | null;
  status: string;
  priority: string;
  urgency?: string | null;
  date?: string | null;
  timeSlot?: string | null;
  createdAt: string;
  patient?: {
    id: string;
    name?: string | null;
    gender?: string | null;
    age?: string | null;
    phone?: string | null;
    village?: string | null;
    user?: {
      fullName?: string | null;
    } | null;
  } | null;
  doctor?: {
    id: string;
    name: string;
    specialty: string;
    hospital?: string | null;
  } | null;
}

export interface FacilityReferralItem {
  id: string;
  patientId: string;
  recommendedFacility: string;
  facilityType: string;
  reason: string;
  status: string;
  scheduledDate?: string | null;
  completedAt?: string | null;
  followUpNotes?: string | null;
  createdAt: string;
  patient?: {
    id: string;
    name?: string | null;
    gender?: string | null;
    phone?: string | null;
    village?: string | null;
  } | null;
  referredByDoctor?: {
    id: string;
    name: string;
    specialty: string;
  } | null;
}

export interface FacilityDiagnosticItem {
  id: string;
  patientId: string;
  testName: string;
  status: string;
  reportFileUrl?: string | null;
  resultSummary?: string | null;
  orderedAt: string;
  resultAt?: string | null;
  patient?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    village?: string | null;
  } | null;
  orderedByDoctor?: {
    id: string;
    name: string;
    specialty: string;
  } | null;
}

export interface FacilityOverdueItem {
  id: string;
  patientId: string;
  reminderType: string;
  eventDate: string;
  status: string;
  patient?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    village?: string | null;
  } | null;
  child?: {
    id: string;
    name?: string | null;
    dateOfBirth?: string | null;
  } | null;
}

export interface FacilityDashboardDetails {
  consultations: FacilityAppointmentItem[];
  referrals: FacilityReferralItem[];
  highRiskCases: FacilityAppointmentItem[];
  diagnosticOrders: FacilityDiagnosticItem[];
  medicineShortages: MedicineStockRecord[];
  overdueFollowUps: FacilityOverdueItem[];
}

export interface FacilityDashboardMetrics {
  facility: FacilityRecord;
  metrics: {
    consultations: {
      total: number;
      completed: number;
    };
    referrals: {
      total: number;
      pending: number;
      completed: number;
    };
    highRiskCases: {
      total: number;
      appointments: number;
      mchHighRiskMothers: number;
    };
    diagnosticOrders: {
      total: number;
      pending: number;
      completed: number;
    };
    medicineInventory: {
      totalItems: number;
      available: number;
      lowStock: number;
      outOfStock: number;
      shortages: number;
    };
    overdueFollowUps: {
      total: number;
    };
  };
  inventory: MedicineStockRecord[];
  details?: FacilityDashboardDetails;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAllFacilities(): Promise<FacilityRecord[]> {
  const res = await fetch(`${API_BASE_URL}/facilities`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch facilities list');
  }
  return res.json();
}

export async function fetchFacilityById(id: string): Promise<FacilityRecord> {
  const res = await fetch(`${API_BASE_URL}/facilities/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch facility ${id}`);
  }
  return res.json();
}

export async function fetchFacilityInventory(
  facilityId: string,
  status?: string,
): Promise<MedicineStockRecord[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE_URL}/facilities/${facilityId}/inventory${q}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch facility inventory');
  }
  return res.json();
}

export async function searchMedicineAvailability(
  name: string,
  district?: string,
): Promise<MedicineStockRecord[]> {
  if (!name.trim()) return [];
  const params = new URLSearchParams({ name: name.trim() });
  if (district) params.append('district', district);

  const res = await fetch(`${API_BASE_URL}/facilities/medicine-search?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to search medicine availability');
  }
  return res.json();
}

export async function updateMedicineStock(
  facilityId: string,
  medicineId: string,
  payload: { quantity?: number; status?: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' },
): Promise<MedicineStockRecord> {
  const res = await fetch(`${API_BASE_URL}/facilities/${facilityId}/inventory/${medicineId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to update medicine stock');
  }
  return res.json();
}

export async function fetchFacilityDashboard(
  facilityId: string,
): Promise<FacilityDashboardMetrics> {
  const res = await fetch(`${API_BASE_URL}/facilities/${facilityId}/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard metrics for facility ${facilityId}`);
  }
  return res.json();
}
