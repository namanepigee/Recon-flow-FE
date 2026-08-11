import { useEffect, useMemo, useState } from 'react';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { getStoredOrganisationId } from '../services/organisationStorage';
import { getAccessToken } from '../services/tokenStorage';

function websocketBaseUrl() {
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) return '';
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = url.pathname.replace(/\/api\/v1\/?$/, '');
  return url.toString().replace(/\/$/, '');
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    listNotifications()
      .then((data) => {
        if (!isMounted) return;
        setNotifications(data.results ?? []);
        setUnreadCount(data.unread_count ?? 0);
        setError('');
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError.message || 'Unable to load notifications.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    const organisationId = getStoredOrganisationId();
    const baseUrl = websocketBaseUrl();
    if (!token || !organisationId || !baseUrl) return undefined;

    const params = new URLSearchParams({
      token,
      organisation: organisationId,
    });
    const socket = new WebSocket(`${baseUrl}/ws/notifications/?${params}`);
    let isActive = true;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'notification.created') return;
      setNotifications((current) =>
        [
          data.notification,
          ...current.filter((item) => item.id !== data.notification.id),
        ].slice(0, 50),
      );
      setUnreadCount((current) => current + 1);
    };
    socket.onerror = () => {
      if (isActive) {
        setError('Live notifications are temporarily unavailable.');
      }
    };

    return () => {
      isActive = false;
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.onopen = () => socket.close();
        return;
      }
      socket.close();
    };
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.is_read),
    [notifications],
  );

  async function markRead(notificationId) {
    await markNotificationRead(notificationId);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            }
          : notification,
      ),
    );
    setUnreadCount((current) => Math.max(current - 1, 0));
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  }

  return {
    error,
    isLoading,
    markAllRead,
    markRead,
    notifications,
    unreadCount,
    unreadNotifications,
  };
}
