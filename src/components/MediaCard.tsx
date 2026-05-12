'use client';
// src/components/MediaCard.tsx

import { Media } from '@/lib/types';

interface Props {
  media: Media;
  onPress: () => void;
}

export default function MediaCard({ media, onPress }: Props) {
  // Status: Completed or Ongoing
  const statusLabel = media.completed ? 'Completed' : 'Ongoing';
  const statusColor = media.completed
    ? 'rgba(46,213,115,0.85)'   // green
    : 'rgba(255,165,0,0.85)';    // orange

  return (
    <div className="media-card" onClick={onPress} style={{ width: '100%' }}>
      <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
        <img
          src={media.thumbnail}
          alt={media.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
          decoding="async"
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          pointerEvents: 'none',
        }} />

        {/* Top-left badges */}
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Trending badge */}
          {media.trending && (
            <div style={{
              background: 'rgba(255,59,48,0.9)',
              color: '#fff', fontSize: 9, fontWeight: 800,
              padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              🔥 Trending
            </div>
          )}
          {/* New badge */}
          {media.latest && (
            <div style={{
              background: 'rgba(0,122,255,0.9)',
              color: '#fff', fontSize: 9, fontWeight: 800,
              padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              ✨ New
            </div>
          )}
        </div>

        {/* Bottom-left: status */}
        <div style={{
          position: 'absolute', bottom: 6, left: 6,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <div style={{
            background: statusColor,
            color: '#fff', fontSize: 9, fontWeight: 700,
            padding: '2px 6px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: 0.3,
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Bottom-right: rating */}
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          display: 'flex', alignItems: 'center', gap: 2,
          fontSize: 11, fontWeight: 600, color: '#FFD700',
        }}>
          ⭐ {media.rating.toFixed(1)}
        </div>
      </div>

      <div style={{ padding: '7px 8px 9px' }}>
        <div className="line-clamp-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
          {media.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
          {media.year} · {media.type === 'movie' ? 'Movie' : `${media.totalEpisodes ?? '?'} EP`}
        </div>
      </div>
    </div>
  );
}
