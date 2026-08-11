import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

import { useNotifications } from '../../hooks/useNotifications';

function timeLabel(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const {
    error,
    isLoading,
    markAllRead,
    markRead,
    notifications,
    unreadCount,
  } = useNotifications();

  function destinationFor(notification) {
    if (notification.metadata?.url) return notification.metadata.url;
    return (
      {
        invoice_uploaded: '/invoice',
        bank_statement_uploaded: '/payments',
        payment_advice_uploaded: '/payment-advice',
        reconciliation_completed: '/recon',
      }[notification.event_type] ?? '/dashboard'
    );
  }

  return (
    <div className="relative">
      <button
        aria-label="Open notifications"
        className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-blue-700"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-blue-100">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-950">Notifications</p>
              <p className="text-xs font-semibold text-slate-500">
                {unreadCount} unread
              </p>
            </div>
            <button
              aria-label="Mark all notifications as read"
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!unreadCount}
              type="button"
              onClick={markAllRead}
            >
              <CheckCheck size={17} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm font-semibold text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Loading notifications
              </div>
            )}
            {!isLoading && error && (
              <p className="px-3 py-4 text-sm font-semibold text-rose-600">
                {error}
              </p>
            )}
            {!isLoading && !error && notifications.length === 0 && (
              <p className="px-3 py-4 text-sm font-semibold text-slate-500">
                No notifications yet.
              </p>
            )}
            {notifications.map((notification) => (
              <button
                className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition ${
                  notification.is_read
                    ? 'hover:bg-slate-50'
                    : 'bg-blue-50 hover:bg-blue-100'
                }`}
                key={notification.id}
                type="button"
                onClick={async () => {
                  if (!notification.is_read) await markRead(notification.id);
                  setIsOpen(false);
                  navigate(destinationFor(notification));
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-bold text-slate-950">
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                    {timeLabel(notification.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  {notification.message}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
