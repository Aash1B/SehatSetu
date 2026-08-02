export const MEDICAL_REPORT_BUCKET = 'medical-reports';
export const ALLOWED_MEDICAL_REPORT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface AuthenticatedActor {
  userId: string;
  role: 'PATIENT' | 'DOCTOR';
}

export interface StoredObjectMetadata {
  exists: boolean;
  sizeBytes?: number;
  mimeType?: string;
}

export interface SignedUpload {
  signedUrl: string;
  token: string;
  expiresAt: Date;
}

export interface SignedDownload {
  signedUrl: string;
  expiresAt: Date;
}

export interface DownloadedObject {
  bytes: Uint8Array;
  mimeType: string;
  sizeBytes: number;
}

export interface OcrResult {
  extractedText: string;
  extractedData: Record<string, unknown>;
}
