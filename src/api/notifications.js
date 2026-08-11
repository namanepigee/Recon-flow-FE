import { apiRequest } from './client';

export function listNotifications() {
  return apiRequest('/notifications/');
}

export function markNotificationRead(notificationId) {
  return apiRequest(`/notifications/${notificationId}/read/`, {
    method: 'POST',
  });
}

export function markAllNotificationsRead() {
  return apiRequest('/notifications/mark-all-read/', {
    method: 'POST',
  });
}
