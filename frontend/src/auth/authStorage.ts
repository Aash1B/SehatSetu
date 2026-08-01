const TOKEN_KEY = 'sehatsetu_token';
const USER_KEY = 'sehatsetu_user';

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR';
}

export function saveAuth(accessToken: string, user: StoredUser) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}