import { apiRequest } from './client';

export function listAudit(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/organisation/audit/${query ? `?${query}` : ''}`);
}
