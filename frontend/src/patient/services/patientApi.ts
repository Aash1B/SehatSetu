import { getToken } from '../../auth/authStorage';
import { API_BASE_URL } from '../utils/constants';

async function patientRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Please sign in to view your patient portal.');

  const response = await fetch(`${API_BASE_URL}/patient${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Unable to load patient data.');
  }
  return body as T;
}

export interface PatientDashboardData {
  profile: Record<string, any>;
  appointments: any[];
  ehrRecords: any[];
  prescriptions: any[];
  medicalReports: any[];
  payments: any[];
}

export const getPatientDashboard = () => patientRequest<PatientDashboardData>('/dashboard');

export const updatePatientProfile = (profile: Record<string, unknown>) =>
  patientRequest<Record<string, any>>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });

export async function uploadPatientAvatar(file: File) {
  const intent = await patientRequest<{
    uploadId: string;
    path: string;
    signedUploadUrl: string;
  }>('/profile/avatar/upload-intent', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    }),
  });

  const upload = await fetch(intent.signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
    body: file,
  });
  if (!upload.ok) throw new Error('The profile picture could not be uploaded to storage.');

  return patientRequest<{ profileImagePath: string; profileImageUrl: string }>(
    `/profile/avatar/${intent.uploadId}/complete`,
    { method: 'POST', body: JSON.stringify({ path: intent.path }) },
  );
}
