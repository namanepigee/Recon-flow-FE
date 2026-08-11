import { apiRequest } from './client';

export function listOrganisations() {
  return apiRequest('/organisations/');
}

export function createOrganisation(payload) {
  return apiRequest('/organisations/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentOrganisation() {
  return apiRequest('/organisations/current/');
}

export function updateCurrentOrganisation(payload) {
  return apiRequest('/organisations/current/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
