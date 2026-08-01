const API_BASE_URL = 'http://localhost:8000';

export interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR';
  accessToken: string;
}

export interface SignupResponse {
  message: string;
  email: string;
}

export interface MessageResponse {
  message: string;
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

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

function extractErrorMessage(data: any): string {
  if (Array.isArray(data?.message)) {
    return data.message[0];
  }
  if (typeof data?.message === 'string') {
    return data.message;
  }
  return 'Something went wrong. Please try again.';
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(extractErrorMessage(data));
  }
  return data;
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<SignupResponse>(res);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(res);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MessageResponse>(res);
}

export async function resendOtp(payload: ResendOtpPayload): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MessageResponse>(res);
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MessageResponse>(res);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MessageResponse>(res);
}