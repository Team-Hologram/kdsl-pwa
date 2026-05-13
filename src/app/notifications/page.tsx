'use client';
// src/app/notifications/page.tsx

import { useNotifications } from '@/context/NotificationsContext';
import { useRouter } from 'next/navigation';

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();

  return (
    <div className="page-content" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: 16, paddingRight: 16, paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Notifications</h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 2 }}>{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600, padding: '8px 0' }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: '16px' }}>
            {[0,1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.2}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/>
            </svg>
            <p style={{ color: 'var(--text-secondary)', fontSize: 17, fontWeight: 600 }}>No Notifications</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>You&apos;re all caught up!</p>
          </div>
        ) : (
          <div style={{ padding: '8px 16px' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => { markAsRead(n.id); router.push(`/notifications/${n.id}`); }}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: n.read ? 'var(--bg-card)' : 'rgba(0,217,255,0.06)',
                  border: `1px solid ${n.read ? 'var(--border)' : 'rgba(0,217,255,0.2)'}`,
                  borderRadius: 12, padding: '12px',
                  marginBottom: 10, cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {n.imageUrl && (
                  <img src={n.imageUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    {!n.read && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }} className="line-clamp-1">{n.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }} className="line-clamp-2">{n.body}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
