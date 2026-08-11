import { apiRequest } from './client';

export function listUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/organisation/users/${query ? `?${query}` : ''}`);
}

export function createUser(payload) {
  return apiRequest('/organisation/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getUser(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/`);
}

export function updateUser(membershipId, payload) {
  return apiRequest(`/organisation/users/${membershipId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function activateUser(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/activate/`, {
    method: 'POST',
  });
}

export function deactivateUser(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/deactivate/`, {
    method: 'POST',
  });
}

export function suspendUser(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/suspend/`, {
    method: 'POST',
  });
}

export function resendSetup(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/resend-setup/`, {
    method: 'POST',
  });
}
