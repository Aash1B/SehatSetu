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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  } catch (err) {
    console.error('Failed to save auth to localStorage:', err);
  }
}

function isExpiredToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

export function getToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(ALT_TOKEN_KEY);
    if (!token) return null;
    if (isExpiredToken(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ALT_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return token;
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  } catch (err) {
    console.error('Failed to clear auth from localStorage:', err);
  }
}