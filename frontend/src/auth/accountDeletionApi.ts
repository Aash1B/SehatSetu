import { getToken } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function deletionRequest<T>(path: string, body?: object): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Please sign in again before deleting your account.');
  const response = await fetch(`${API_BASE_URL}/account/deletion/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(result?.message) ? result.message[0] : result?.message;
    throw new Error(typeof message === 'string' ? message : 'Account deletion could not be completed.');
  }
  return result as T;
}

export interface DeletionOtpMetadata {
  maskedDestination: string;
  expiresAt: string;
  resendAfterSeconds: number;
}

export const requestAccountDeletionOtp = () => deletionRequest<DeletionOtpMetadata>('request-otp');
export const confirmAccountDeletion = (otp: string) => deletionRequest<{ deleted: boolean; message: string }>('confirm', { otp, confirmation: 'DELETE' });
