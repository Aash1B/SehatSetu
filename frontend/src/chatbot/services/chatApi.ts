import { API_BASE_URL } from '../../patient/utils/constants';
import { ChatbotResponse, ChatError } from '../types/chatbot.types';
import { getCurrentLanguage } from '../../i18n';

const REQUEST_TIMEOUT_MS = 15000;

function getAuthToken(): string | null {
  return localStorage.getItem('token') || localStorage.getItem('doctor_token') || sessionStorage.getItem('token');
}

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  language?: 'en' | 'hi';
  action?: {
    type: string;
    doctorId?: string;
    appointmentId?: string;
    slotId?: string;
    date?: string;
    timeSlot?: string;
    confirmation?: boolean;
  };
  location?: { latitude: number; longitude: number };
}

export class ChatApiError extends Error {
  public readonly errorType: ChatError['type'];
  public readonly canRetry: boolean;

  constructor(message: string, errorType: ChatError['type'], canRetry = true) {
    super(message);
    this.name = 'ChatApiError';
    this.errorType = errorType;
    this.canRetry = canRetry;
  }
}

export async function sendChatMessage(
  request: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatbotResponse> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ChatApiError(
      'You are currently offline. Please check your internet connection and try again.',
      'offline',
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const language = (getCurrentLanguage() === 'hi' ? 'hi' : 'en') as 'en' | 'hi';
    const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...request, language }),
      signal: signal ?? controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const msg = body?.message || `Server error (${response.status})`;
      const errorType = mapStatusToErrorType(response.status, body?.error?.code);
      throw new ChatApiError(msg, errorType);
    }

    const data = (await response.json()) as ChatbotResponse;
    return data;
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ChatApiError(
        'The request took too long. Please try again.',
        'timeout',
      );
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ChatApiError(
        'Unable to connect to the server. The backend may be unavailable.',
        'backend_unavailable',
      );
    }
    throw new ChatApiError(
      'Something went wrong while contacting the chatbot. Please try again.',
      'unknown',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapStatusToErrorType(status: number, code?: string): ChatError['type'] {
  if (status === 401 || status === 403) return 'auth_required';
  if (status >= 500 || status === 502 || status === 503 || status === 504) {
    return 'backend_unavailable';
  }
  if (status === 418 || code === 'ai_unavailable') return 'ai_unavailable';
  return 'unknown';
}

export async function getBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new ChatApiError('Geolocation is not supported by your browser.', 'location_denied', false));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {
        reject(new ChatApiError('Location access was denied. You can still enter a city name manually.', 'location_denied', false));
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  });
}
