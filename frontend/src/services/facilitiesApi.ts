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
