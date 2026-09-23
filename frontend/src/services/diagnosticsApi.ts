import { getToken } from '../auth/authStorage';

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

export async function createDiagnosticOrder(data: CreateDiagnosticOrderInput): Promise<DiagnosticOrderRecord> {
  return apiRequest<DiagnosticOrderRecord>('/api/diagnostics/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchPatientDiagnosticOrders(patientId: string): Promise<DiagnosticOrderRecord[]> {
  return apiRequest<DiagnosticOrderRecord[]>(`/api/diagnostics/orders/patient/${patientId}`);
}

export async function uploadDiagnosticReport(
  orderId: string,
  data: {
    reportFileUrl?: string;
    reportId?: string;
    resultSummary?: string;
  },
): Promise<DiagnosticOrderRecord> {
  return apiRequest<DiagnosticOrderRecord>(`/api/diagnostics/orders/${orderId}/upload-report`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reviewDiagnosticOrder(orderId: string, resultSummary: string): Promise<DiagnosticOrderRecord> {
  return apiRequest<DiagnosticOrderRecord>(`/api/diagnostics/orders/${orderId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ resultSummary }),
  });
}

export async function fetchAllDiagnosticOrders(status?: string): Promise<DiagnosticOrderRecord[]> {
  const queryStr = status ? `?status=${status}` : '';
  return apiRequest<DiagnosticOrderRecord[]>(`/api/diagnostics/orders${queryStr}`);
}
