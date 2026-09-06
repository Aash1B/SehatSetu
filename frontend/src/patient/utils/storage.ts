// localStorage helper functions for token management

const TOKEN_KEY = 'sehatsetu_token';
const ALT_TOKEN_KEY = 'sehat_setu_access_token';
const REFRESH_TOKEN_KEY = 'sehat_setu_refresh_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(ALT_TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ALT_TOKEN_KEY, token);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ALT_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('sehatsetu_user');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'));
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};
