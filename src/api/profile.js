import { apiRequest } from './client';

export function getProfile() {
  return apiRequest('/profile/');
}

export function updateProfile(payload) {
  return apiRequest('/profile/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload) {
  return apiRequest('/profile/change-password/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProfilePermissions() {
  return apiRequest('/profile/permissions/');
}

export function getProfileActivity() {
  return apiRequest('/profile/activity/');
}
