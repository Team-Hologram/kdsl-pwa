'use client';
// src/app/notifications/[id]/page.tsx

import { useNotifications } from '@/context/NotificationsContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { notifications, markAsRead } = useNotifications();
  const notification = notifications.find((n) => n.id === id);

  useEffect(() => {
    if (id) markAsRead(id);
  }, [id]);

  if (!notification) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh', gap: 12 }}>
        <p style={{ color: 'var(--text-secondary)' }}>Notification not found.</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Banner image */}
      {notification.imageUrl && (
        <div style={{ position: 'relative', height: 260, overflow: 'hidden', background: 'var(--bg-card)' }}>
          <img src={notification.imageUrl} alt={notification.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, var(--bg) 100%)' }} />
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top) + 12px)', left: 16, zIndex: 10,
          width: 40, height: 40, borderRadius: '50%',
          background: notification.imageUrl ? 'rgba(0,0,0,0.55)' : 'var(--bg-card)',
          backdropFilter: 'blur(8px)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)',
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{ padding: notification.imageUrl ? '12px 20px 32px' : 'calc(env(safe-area-inset-top) + 64px) 20px 32px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          {notification.createdAt.toLocaleDateString()} · {notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 16, lineHeight: 1.25 }}>
          {notification.title}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
          {notification.body}
        </p>
      </div>
    </div>
  );
}
