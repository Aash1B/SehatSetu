import i18n from '../../i18n/config';
import { API_BASE_URL } from '../utils/constants';
import { getToken } from '../../auth/authStorage';
import type { EhrDraftRecord } from '../../types';

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

export interface OcrStructuredEntity {
  kind?: string;
  name?: string;
  value?: string;
  unit?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  [key: string]: unknown;
}

export interface MedicalReportExtractedData {
  extracted_text?: string;
  structured_entities?: OcrStructuredEntity[];
  summary?: string;
  key_findings?: string[];
  abnormal_findings?: Array<Record<string, unknown>>;
  recommendations?: string[];
  diagnosis?: string | null;
  medications?: unknown[];
  vitals?: Record<string, unknown>;
  notes?: string | null;
  [key: string]: unknown;
}

export interface MedicalReportResponse {
  id: string;
  patientId: string;
  appointmentId: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number | string;
  reportType: string;
  status: string;
  ocrStatus: string;
  extractedText: string | null;
  extractedData: MedicalReportExtractedData | null;
  processingErrorCode: string | null;
  processingErrorMessage: string | null;
  createdAt: string;
  uploadedAt: string | null;
  processingStartedAt: string | null;
  processedAt: string | null;
  updatedAt: string;
  ehrDraft?: EhrDraftRecord | null;
}

function authorizationHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error(i18n.t('errors:authRequired'));
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
        : i18n.t('errors:unknownError');
    throw new Error(message);
  }
  return body as T;
}

export async function uploadMedicalReport(file: File, category?: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(i18n.t('errors:invalidReportType'));
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    throw new Error(i18n.t('errors:reportFileSize'));
  }

  let reportType: 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'SCAN' | 'OTHER' = 'OTHER';
  if (category === 'PREVIOUS_PRESCRIPTION') reportType = 'PRESCRIPTION';
  else if (category === 'TEST_REPORTS') reportType = 'LAB_REPORT';
  else if (category === 'DISCHARGE_SUMMARY') reportType = 'DISCHARGE_SUMMARY';
  else if (['X_RAY', 'MRI', 'CT_SCAN', 'ECG'].includes(category || '')) reportType = 'SCAN';

  const context = await backendRequest<{ patientId: string }>('/me/context');
  const intent = await backendRequest<UploadIntent>('/upload-intent', {
    method: 'POST',
    body: JSON.stringify({
      patientId: context.patientId,
      originalFileName: category ? `[${category}] ${file.name}` : file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      reportType: reportType,
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
    throw new Error(i18n.t('errors:reportUploadFailed'));
  }

  return backendRequest<MedicalReportResponse>(
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
