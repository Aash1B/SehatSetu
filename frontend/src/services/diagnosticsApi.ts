import { getToken } from '../auth/authStorage';
import { API_BASE_URL } from '../patient/utils/constants';

export interface DiagnosticOrderRecord {
  id: string;
  patientId: string;
  patient?: {
    id: string;
    name?: string | null;
    gender?: string | null;
    age?: string | null;
    phone?: string | null;
  };
  orderedByDoctorId: string;
  orderedByDoctor?: {
    id: string;
    name?: string | null;
    specialty?: string | null;
    hospital?: string | null;
  } | null;
  appointmentId?: string | null;
  testName: string;
  testType: 'BLOOD' | 'IMAGING' | 'URINE' | 'OTHER';
  instructions?: string | null;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'REPORT_UPLOADED' | 'REVIEWED';
  reportFileUrl?: string | null;
  resultSummary?: string | null;
  orderedAt: string;
  resultAt?: string | null;
}

export interface CreateDiagnosticOrderInput {
  patientId: string;
  orderedByDoctorId?: string;
  appointmentId?: string;
  testName: string;
  testType: 'BLOOD' | 'IMAGING' | 'URINE' | 'OTHER';
  instructions?: string;
}

function getCandidateEndpoints(path: string): string[] {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const candidates: string[] = [];

  if (API_BASE_URL) {
    const base = API_BASE_URL.replace(/\/+$/, '');
    if (cleanPath.startsWith('/api/')) {
      candidates.push(`${base.slice(0, -4)}${cleanPath}`);
    } else {
      candidates.push(`${base}${cleanPath}`);
      if (base.endsWith('/api')) {
        candidates.push(`${base.slice(0, -4)}${cleanPath}`);
      }
    }
  }

  const pathWithoutApi = cleanPath.startsWith('/api') ? cleanPath.slice(4) : cleanPath;
  candidates.push(`/api${pathWithoutApi}`);
  candidates.push(`http://127.0.0.1:8000/api${pathWithoutApi}`);
  candidates.push(`http://localhost:8000/api${pathWithoutApi}`);

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

  throw lastError || new Error('Unable to connect to diagnostics service.');
}

export async function createDiagnosticOrder(data: CreateDiagnosticOrderInput): Promise<DiagnosticOrderRecord> {
  return apiRequest<DiagnosticOrderRecord>('/diagnostics/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchPatientDiagnosticOrders(patientId: string): Promise<DiagnosticOrderRecord[]> {
  return apiRequest<DiagnosticOrderRecord[]>(`/diagnostics/orders/patient/${patientId}`);
}

export async function uploadDiagnosticReport(
  orderId: string,
  data: {
    reportFileUrl?: string;
    reportId?: string;
    resultSummary?: string;
  },
): Promise<DiagnosticOrderRecord> {
  return apiRequest<DiagnosticOrderRecord>(`/diagnostics/orders/${orderId}/upload-report`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reviewDiagnosticOrder(orderId: string, resultSummary: string): Promise<DiagnosticOrderRecord> {
  return apiRequest<DiagnosticOrderRecord>(`/diagnostics/orders/${orderId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ resultSummary }),
  });
}

export async function fetchAllDiagnosticOrders(status?: string): Promise<DiagnosticOrderRecord[]> {
  const queryStr = status ? `?status=${status}` : '';
  return apiRequest<DiagnosticOrderRecord[]>(`/diagnostics/orders${queryStr}`);
}
