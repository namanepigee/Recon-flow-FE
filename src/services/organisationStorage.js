const ACTIVE_ORGANISATION_KEY = 'reconflow.activeOrganisationId';

export function getStoredOrganisationId() {
  return window.localStorage.getItem(ACTIVE_ORGANISATION_KEY);
}

export function setStoredOrganisationId(id) {
  window.localStorage.setItem(ACTIVE_ORGANISATION_KEY, id);
}

export function clearStoredOrganisationId() {
  window.localStorage.removeItem(ACTIVE_ORGANISATION_KEY);
}
