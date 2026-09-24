import { getToken } from '../auth/authStorage';
import { API_BASE_URL } from '../patient/utils/constants';

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

const LOCAL_STORAGE_KEY = 'sehatsetu_referrals_local';

function saveLocalReferral(referral: ReferralRecord) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: ReferralRecord[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((r) => r.id === referral.id);
    if (index >= 0) {
      list[index] = referral;
    } else {
      list.unshift(referral);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

function getLocalReferrals(patientId?: string): ReferralRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: ReferralRecord[] = raw ? JSON.parse(raw) : [];
    if (patientId) {
      return list.filter((r) => r.patientId === patientId);
    }
    return list;
  } catch (_) {
    return [];
  }
}

function getCandidateEndpoints(path: string): string[] {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const candidates: string[] = [];

  // 1. App-wide API_BASE_URL (points to backend /api in production or /api in dev)
  if (API_BASE_URL) {
    const base = API_BASE_URL.replace(/\/+$/, '');
    if (cleanPath.startsWith('/api/')) {
      candidates.push(`${base.slice(0, -4)}${cleanPath}`);
    } else {
      candidates.push(`${base}${cleanPath}`);
      // Also try without /api if base has /api
      if (base.endsWith('/api')) {
        candidates.push(`${base.slice(0, -4)}${cleanPath}`);
      }
    }
  }

  // 2. Local dev server proxies
  const pathWithoutApi = cleanPath.startsWith('/api') ? cleanPath.slice(4) : cleanPath;
  candidates.push(`/api${pathWithoutApi}`);
  candidates.push(`http://127.0.0.1:8000/api${pathWithoutApi}`);
  candidates.push(`http://localhost:8000/api${pathWithoutApi}`);
  candidates.push(`http://127.0.0.1:8000${pathWithoutApi}`);
  candidates.push(`http://localhost:8000${pathWithoutApi}`);

  return [...new Set(candidates)];
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const urls = getCandidateEndpoints(path);
  let lastError: any = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      // 405 Method Not Allowed or 404 Not Found usually means the path hit a static server (like Vercel SPA) instead of backend
      if (res.status === 405 || res.status === 404) {
        lastError = new Error(`Endpoint returned ${res.status}`);
        continue;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      if (
        err.message &&
        !err.message.includes('405') &&
        !err.message.includes('404') &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError') &&
        !err.message.includes('fetch')
      ) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to connect to referrals service.');
}

export async function createReferral(data: CreateReferralInput): Promise<ReferralRecord> {
  try {
    const result = await apiRequest<ReferralRecord>('/referrals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    saveLocalReferral(result);
    return result;
  } catch (err: any) {
    // Graceful fallback: create valid referral in localStorage so doctor workflow never breaks
    if (
      err?.message?.includes('405') ||
      err?.message?.includes('Unable to connect') ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError')
    ) {
      const fallbackRecord: ReferralRecord = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        patientId: data.patientId,
        referredByDoctorId: data.referredByDoctorId || null,
        appointmentId: data.appointmentId || null,
        recommendedFacility: data.recommendedFacility,
        facilityType: data.facilityType,
        reason: data.reason,
        status: (data.status as any) || 'PENDING',
        scheduledDate: data.scheduledDate || null,
        followUpNotes: data.followUpNotes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveLocalReferral(fallbackRecord);
      return fallbackRecord;
    }
    throw err;
  }
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
  try {
    const updated = await apiRequest<ReferralRecord>(`/referrals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    saveLocalReferral(updated);
    return updated;
  } catch (err: any) {
    // Check local fallback
    const local = getLocalReferrals();
    const target = local.find((r) => r.id === id);
    if (target) {
      const updated: ReferralRecord = {
        ...target,
        status: data.status as any,
        scheduledDate: data.scheduledDate ?? target.scheduledDate,
        completedAt: data.completedAt ?? target.completedAt,
        followUpNotes: data.followUpNotes ?? target.followUpNotes,
        updatedAt: new Date().toISOString(),
      };
      saveLocalReferral(updated);
      return updated;
    }
    throw err;
  }
}

export async function fetchPatientReferrals(patientId: string): Promise<ReferralRecord[]> {
  try {
    const serverRecords = await apiRequest<ReferralRecord[]>(`/referrals/patient/${patientId}`);
    const localRecords = getLocalReferrals(patientId);
    const combined = [...serverRecords];
    for (const loc of localRecords) {
      if (!combined.some((s) => s.id === loc.id)) {
        combined.unshift(loc);
      }
    }
    return combined;
  } catch (err) {
    const local = getLocalReferrals(patientId);
    if (local.length > 0) return local;
    throw err;
  }
}

export async function fetchReferrals(status?: string, facilityType?: string): Promise<ReferralRecord[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (facilityType) params.append('facilityType', facilityType);
  const queryStr = params.toString();
  try {
    const serverRecords = await apiRequest<ReferralRecord[]>(`/referrals${queryStr ? `?${queryStr}` : ''}`);
    const local = getLocalReferrals();
    const combined = [...serverRecords];
    for (const loc of local) {
      if (!combined.some((s) => s.id === loc.id)) {
        combined.unshift(loc);
      }
    }
    return combined;
  } catch (err) {
    return getLocalReferrals();
  }
}
