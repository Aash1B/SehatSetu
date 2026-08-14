const TOKEN_KEY = 'sehatsetu_token';
const ALT_TOKEN_KEY = 'sehat_setu_access_token';
const USER_KEY = 'sehatsetu_user';

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR';
}

export function saveAuth(accessToken: string, user: StoredUser) {
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(ALT_TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save auth to localStorage:', err);
  }
}

export function getToken(): string | null {
  try {
    return typeof window !== 'undefined' ? (localStorage.getItem(TOKEN_KEY) || localStorage.getItem(ALT_TOKEN_KEY)) : null;
  } catch (err) {
    console.error('Failed to read token from localStorage:', err);
    return null;
  }
}

export function getUser(): StoredUser | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to read user from localStorage:', err);
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ALT_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Failed to clear auth from localStorage:', err);
  }
}