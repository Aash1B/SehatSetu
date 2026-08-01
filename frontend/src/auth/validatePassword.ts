export interface PasswordCheck {
  valid: boolean;
  message: string;
}

export function validatePassword(password: string): PasswordCheck {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/^[A-Za-z0-9@#]+$/.test(password)) {
    return { valid: false, message: 'Only letters, numbers, and @ or # are allowed' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Must contain at least one uppercase letter' };
  }
  if (!/[@#]/.test(password)) {
    return { valid: false, message: 'Must contain at least one symbol (@ or #)' };
  }
  const letterCount = (password.match(/[A-Za-z]/g) || []).length;
  if (letterCount < 3) {
    return { valid: false, message: 'Must contain at least 3 letters' };
  }
  return { valid: true, message: '' };
}