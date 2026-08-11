import { apiRequest } from './client';

export function getMembershipPermissions(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/permissions/`);
}

export function updateMembershipPermissions(membershipId, overrides) {
  return apiRequest(`/organisation/users/${membershipId}/permissions/`, {
    method: 'PUT',
    body: JSON.stringify({ overrides }),
  });
}

export function resetMembershipPermissions(membershipId) {
  return apiRequest(`/organisation/users/${membershipId}/permissions/reset/`, {
    method: 'POST',
  });
}
