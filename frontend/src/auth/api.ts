const API_BASE_URL = 'http://localhost:8000';

export interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR';
  accessToken: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR';
  dataConsent: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

async function handleResponse(res: Response): Promise<AuthResponse> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Something went wrong. Please try again.');
  }
  return data;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}