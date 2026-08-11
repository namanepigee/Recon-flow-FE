export function validateEmail(email) {
  const value = email.trim().toLowerCase();
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email address.';
  return '';
}

export function passwordChecks(password) {
  return [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /\d/.test(password) },
    { label: 'One symbol', valid: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  const checks = passwordChecks(password);
  if (!checks.every((check) => check.valid)) {
    return 'Use at least 8 characters with uppercase, lowercase, number and symbol.';
  }
  return '';
}

export function normalizeServerErrors(errors = {}) {
  return {
    email: errors.email?.[0] ?? '',
    password: errors.password?.[0] ?? '',
    general: errors.non_field_errors?.[0] ?? '',
  };
}
