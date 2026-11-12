
import React, { useCallback, useEffect, useState } from 'react';

const API_BASE = '/api/notifications';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const [listResponse, countResponse] = await Promise.all([
        fetch(API_BASE, { credentials: 'include' }),
        fetch(`${API_BASE}/unread-count`, {
          credentials: 'include'
        })
      ]);

      if (!listResponse.ok || !countResponse.ok) {
        throw new Error('Unable to load notifications.');
      }

      const listResult = await listResponse.json();
      const countResult = await countResponse.json();

      setNotifications(
        Array.isArray(listResult.data) ? listResult.data : []
      );

      setUnreadCount(
        Number(countResult.data?.unreadCount ?? 0)
      );

      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  
async function markAsRead(notificationId) {
  try {
    setLoading(true);
    setError('');

    // STEP 1: Retrieve the CSRF token.
    const csrfResponse = await fetch(
      '/api/auth/csrf-token',
      {
        credentials: 'include'
      }
    );

    const csrfResult = await csrfResponse.json();

    if (!csrfResponse.ok || !csrfResult.success) {
      throw new Error(
        'Unable to verify the request security token.'
      );
    }

    const csrfToken = csrfResult.data?.csrfToken;

    if (!csrfToken) {
      throw new Error('CSRF token was not returned.');
    }

    // STEP 2: Mark the notification as read.
    const response = await fetch(
      `${API_BASE}/${notificationId}/read`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
        'Unable to mark notification as read.'
      );
    }

    // STEP 3: Refresh the notification list and unread count.
    await loadNotifications();

  } catch (err) {
    console.error('Mark notification as read error:', err);

    setError(
      err.message || 'Unable to mark notification as read.'
    );
  } finally {
    setLoading(false);
  }
}


  function formatDate(value) {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  return (
    <div className="notification-menu"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center'
      }}
    >
      <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          padding: '8px'
        }}
      >
        🔔

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: '#b44343',
              color: '#fff',
              borderRadius: '999px',
              fontSize: '10px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notification list"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '340px',
            maxWidth: '90vw',
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            padding: '14px'
          }}
        >
          <h3 style={{ margin: '0 0 12px' }}>
            Notifications
          </h3>

          {error && (
            <p style={{ color: '#b44343', fontSize: '13px' }}>
              {error}
            </p>
          )}

          {notifications.length === 0 && !error && (
            <p style={{ fontSize: '14px', color: '#666' }}>
              No notifications yet.
            </p>
          )}

          {notifications.map(notification => (
            <div
              key={notification.notificationId}
              style={{
                padding: '12px 8px',
                borderBottom: '1px solid #eee',
                background: notification.isRead
                  ? 'transparent'
                  : '#f7f3eb',
                borderRadius: '6px',
                marginBottom: '6px'
              }}
            >
              <strong style={{ fontSize: '14px' }}>
                {notification.title}
              </strong>

              <p
                style={{
                  fontSize: '13px',
                  margin: '6px 0'
                }}
              >
                {notification.message}
              </p>

              <small style={{ color: '#777' }}>
                {formatDate(notification.createdAt)}
              </small>

              {!notification.isRead && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => markAsRead(notification.notificationId)}
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: '#765b43',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
