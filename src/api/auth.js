import { apiRequest } from './client';

export function signup(payload) {
  return apiRequest('/auth/signup/', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return apiRequest('/auth/login/', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });
}

export function logout(refresh) {
  return apiRequest('/auth/logout/', {
    method: 'POST',
    retryOnUnauthorized: false,
    body: JSON.stringify({ refresh }),
  });
}

export function getCurrentUser(options = {}) {
  return apiRequest('/auth/me/', options);
}
