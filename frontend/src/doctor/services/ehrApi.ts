import { getToken } from '../../auth/authStorage';
import type { EhrDraftRecord } from '../../types';

// The EHR controller is mounted at the backend root as `/ehr` (not `/api/ehr`).
// In dev, Vite only proxies `/api` and `/auth` (see frontend/vite.config.ts),
// so requests here go straight to the backend origin via VITE_API_BASE_URL,
// matching the same convention already used by frontend/src/auth/api.ts.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

/** Thrown when the session is missing, expired, or the user lacks the DOCTOR role. */
export class EhrSessionError extends Error {}

async function ehrRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new EhrSessionError('Please sign in to continue.');

  const response = await fetch(`${API_BASE_URL}/ehr${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : typeof body?.message === 'string'
        ? body.message
        : 'Something went wrong. Please try again.';
    if (response.status === 401) {
      throw new EhrSessionError('Your session has expired. Please sign in again.');
    }
    if (response.status === 403) {
      throw new EhrSessionError('Only doctors can review EHR drafts.');
    }
    throw new Error(message);
  }

  return body as T;
}

export const listPendingEhrDrafts = () =>
  ehrRequest<EhrDraftRecord[]>('/drafts/pending');

export const getEhrDraft = (id: string) =>
  ehrRequest<EhrDraftRecord>(`/drafts/${id}`);

export const approveEhrDraft = (id: string) =>
  ehrRequest<EhrDraftRecord>(`/drafts/${id}/approve`, { method: 'PUT' });

export const rejectEhrDraft = (id: string, reason?: string) =>
  ehrRequest<EhrDraftRecord>(`/drafts/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
