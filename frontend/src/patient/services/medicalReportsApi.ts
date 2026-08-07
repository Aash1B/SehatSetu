import { API_BASE_URL } from '../utils/constants';
import { getToken } from '../../auth/authStorage';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface UploadIntent {
  reportId: string;
  signedUploadUrl: string;
}

function authorizationHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error('Please sign in before uploading a report.');
  return { Authorization: `Bearer ${token}` };
}

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/medical-reports${path}`, {
    ...init,
    headers: {
      ...authorizationHeaders(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body?.message === 'string'
        ? body.message
        : 'The medical report request failed.';
    throw new Error(message);
  }
  return body as T;
}

export async function uploadMedicalReport(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Choose a PDF, JPEG, PNG, or WebP report.');
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    throw new Error('The report must be between 1 byte and 20 MB.');
  }

  const context = await backendRequest<{ patientId: string }>('/me/context');
  const intent = await backendRequest<UploadIntent>('/upload-intent', {
    method: 'POST',
    body: JSON.stringify({
      patientId: context.patientId,
      originalFileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      reportType: 'OTHER',
    }),
  });

  const upload = await fetch(intent.signedUploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!upload.ok) {
    throw new Error('The report could not be uploaded to secure storage.');
  }

  return backendRequest<Record<string, unknown>>(
    `/${intent.reportId}/upload-complete`,
    { method: 'POST' },
  );
}

export async function listMedicalReports() {
  try {
    return await backendRequest<any[]>('');
  } catch (e) {
    console.warn('Backend listMedicalReports unavailable, returning empty list:', e);
    return [];
  }
}
