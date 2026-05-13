'use client';
// src/app/page.tsx — Home Screen

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaContext } from '@/context/MediaContext';
import { useNotifications } from '@/context/NotificationsContext';
import { Media } from '@/lib/types';
import HeroCarousel from '@/components/HeroCarousel';
import MediaCard from '@/components/MediaCard';

function CategoryRow({ title, data }: { title: string; data: Media[] }) {
  const router = useRouter();
  if (!data.length) return null;
  return (
    <section style={{ marginBottom: 8 }}>
      <div className="section-title">{title}</div>
      <div className="scroll-row">
        {data.map((m) => (
          <div key={m.id} style={{ minWidth: 130, maxWidth: 130, flexShrink: 0 }}>
            <MediaCard media={m} onPress={() => router.push(`/details/${m.id}`)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div style={{ minWidth: 130, height: 220, borderRadius: 12, flexShrink: 0 }} className="skeleton" />
  );
}

function HomeSkeleton() {
  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div className="skeleton" style={{ height: 480, borderRadius: 0 }} />
      {[0,1,2].map((i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 22, width: 140, margin: '20px 16px 12px' }} />
          <div style={{ display: 'flex', gap: 12, padding: '0 16px', overflowX: 'hidden' }}>
            {[0,1,2,3].map((j) => <SkeletonCard key={j} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { all, trending, latest, loading } = useMediaContext();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const heroMedia = latest.length > 0 ? latest : all.slice(0, 8);

  const romance = useMemo(() =>
    [...all].filter((m) => m.genres.includes('Romance'))
      .sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0))
  , [all]);

  const action = useMemo(() =>
    [...all].filter((m) => m.genres.some((g) => ['Action', 'Thriller'].includes(g)))
      .sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0))
  , [all]);

  if (loading) return <HomeSkeleton />;

  // Empty state — Firestore connected but returned no data, or data is still loading
  if (all.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh', gap: 16, padding: '0 32px', paddingBottom: 'var(--nav-height)' }}>
        <div style={{ fontSize: 64 }}>🎬</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Loading Content…</p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Make sure your device is connected to the internet.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 8 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Notification bell — floating */}
      <button
        onClick={() => router.push('/notifications')}
        style={{
          position: 'fixed',
          top: `calc(env(safe-area-inset-top) + 12px)`,
          right: 16, zIndex: 50,
          width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill={unreadCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 9, height: 9, borderRadius: '50%',
            background: 'var(--primary)',
            border: '1.5px solid rgba(0,0,0,0.4)',
          }} />
        )}
      </button>

      <HeroCarousel mediaList={heroMedia} />

      <div style={{ paddingTop: 16 }}>
        <CategoryRow title="Trending Now" data={trending} />
        <CategoryRow title="New Releases" data={latest} />
        <CategoryRow title="Romance" data={romance} />
        <CategoryRow title="Action & Thriller" data={action} />
      </div>
    </div>
  );
}
