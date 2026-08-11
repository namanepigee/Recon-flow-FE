import { apiRequest } from './client';

export function listDocuments(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/documents/${query ? `?${query}` : ''}`);
}

export function uploadDocuments({ documentType, files }) {
  const body = new FormData();
  body.append('document_type', documentType);
  files.forEach((file) => body.append('files', file));

  return apiRequest('/documents/', {
    method: 'POST',
    body,
  });
}

export function listInvoices() {
  return apiRequest('/invoices/');
}

export function listBankStatements() {
  return apiRequest('/bank-statements/');
}

export function listBankTransactions(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/bank-transactions/${query ? `?${query}` : ''}`);
}

export function listPaymentAdvices() {
  return apiRequest('/payment-advices/');
}

export function syncPaymentAdvices() {
  return apiRequest('/payment-advices/', {
    method: 'POST',
  });
}

export function listReconciliationMatches() {
  return apiRequest('/reconciliation-matches/');
}

export function runReconciliation() {
  return apiRequest('/reconciliation-matches/', {
    method: 'POST',
  });
}

export function unmatchReconciliation(matchId) {
  return apiRequest(`/reconciliation-matches/${matchId}/unmatch/`, {
    method: 'POST',
  });
}
