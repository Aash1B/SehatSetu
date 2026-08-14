const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR';
  accessToken: string;
  onboardingCompleted: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  rejectionReason?: string | null;
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

export interface GoogleAuthPayload {
  credential: string;
  role: 'PATIENT' | 'DOCTOR';
  dataConsent?: boolean;
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
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error('Invalid JSON response from server:', text);
  }
  if (!res.ok) {
    throw new Error(extractErrorMessage(data) || `Server returned ${res.status}`);
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

export async function googleLogin(payload: GoogleAuthPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(res);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<MessageResponse & Partial<AuthResponse>> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MessageResponse & Partial<AuthResponse>>(res);
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

// Phone Authentication
export interface SendPhoneOtpPayload {
  phoneNumber: string;
  role: 'PATIENT' | 'DOCTOR';
}

export interface VerifyPhoneOtpPayload {
  phoneNumber: string;
  otp: string;
  role: 'PATIENT' | 'DOCTOR';
}

export interface PhoneSignupPayload {
  phoneNumber: string;
  otp: string;
  fullName: string;
  role: 'PATIENT';
  dataConsent: boolean;
}

export interface PhoneLoginPayload {
  phoneNumber: string;
  otp: string;
}

export async function sendPhoneOtp(payload: SendPhoneOtpPayload): Promise<MessageResponse & { devOtp?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/send-phone-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MessageResponse & { devOtp?: string }>(res);
}

export async function verifyPhoneOtp(payload: VerifyPhoneOtpPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-phone-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(res);
}

export async function phoneSignup(payload: PhoneSignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/phone-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(res);
}

export async function phoneLogin(payload: PhoneLoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthResponse>(res);
}