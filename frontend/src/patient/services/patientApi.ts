import i18n from '../../i18n/config';
import { getToken } from '../../auth/authStorage';
import type { EhrDraftRecord } from '../../types';
import type { MedicalReportResponse } from './medicalReportsApi';
import { API_BASE_URL } from '../utils/constants';

async function patientRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error(i18n.t('errors:authRequired'));

  try {
    const response = await fetch(`${API_BASE_URL}/patient${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    const body = await response.json().catch(() => null);

    if (response.status === 401) {
      throw new Error('Session expired. Please sign out and sign in again.');
    }

    if (!response.ok) {
      const fallbackKey = path === '/dashboard'
        ? 'errors:unableToLoadDashboard'
        : path.startsWith('/profile')
          ? 'errors:unableToSaveProfile'
          : 'errors:patientRequestFailed';
      throw new Error(typeof body?.message === 'string' ? body.message : i18n.t(fallbackKey));
    }
    return body as T;
  } catch (err: any) {
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new Error('Unable to connect to SehatSetu backend server. Please check if the backend is running.');
    }
    throw err;
  }
}

export interface PatientDashboardData {
  profile: Record<string, any>;
  appointments: any[];
  ehrRecords: EhrDraftRecord[];
  prescriptions: any[];
  medicalReports: MedicalReportResponse[];
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
  if (!upload.ok) throw new Error(i18n.t('errors:profilePictureUploadFailed'));

  return patientRequest<{ profileImagePath: string; profileImageUrl: string }>(
    `/profile/avatar/${intent.uploadId}/complete`,
    { method: 'POST', body: JSON.stringify({ path: intent.path }) },
  );
}
