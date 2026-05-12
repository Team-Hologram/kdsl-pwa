'use client';
// src/app/watchlist/page.tsx

import { useRouter } from 'next/navigation';
import { useLocalUser } from '@/hooks/useLocalUser';
import { useMediaContext } from '@/context/MediaContext';
import MediaCard from '@/components/MediaCard';

export default function WatchlistPage() {
  const router = useRouter();
  const { user } = useLocalUser();
  const { all, loading } = useMediaContext();

  const items = all.filter((m) => user.watchlist.includes(m.id));

  return (
    <div className="page-content">
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Watchlist</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{items.length} title{items.length !== 1 ? 's' : ''} saved</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px' }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 12 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 16, padding: '60px 32px 0' }}>
          <div style={{ fontSize: 72 }}>🎬</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Your Watchlist is Empty</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>Browse dramas and movies and tap the bookmark icon to save them here.</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => router.push('/')}>Browse Now</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px' }}>
          {items.map((m) => (
            <MediaCard key={m.id} media={m} onPress={() => router.push(`/details/${m.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
