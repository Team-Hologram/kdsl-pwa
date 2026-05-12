'use client';
// src/components/MediaCard.tsx

import Image from 'next/image';
import { Media } from '@/lib/types';

interface Props {
  media: Media;
  onPress: () => void;
  width?: number;
}

export default function MediaCard({ media, onPress }: Props) {
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
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: media.type === 'movie' ? 'var(--secondary)' : 'var(--primary)',
          color: media.type === 'movie' ? '#fff' : '#0A0E27',
          fontSize: 10, fontWeight: 700, padding: '2px 7px',
          borderRadius: 'var(--radius-full)', letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          {media.type === 'movie' ? 'Movie' : 'Drama'}
        </div>
        {/* Rating */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 11, fontWeight: 600, color: '#FFD700',
        }}>
          ⭐ {media.rating.toFixed(1)}
        </div>
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div className="line-clamp-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
          {media.title}
        </div>
        {media.titleSinhala && (
          <div className="line-clamp-1" style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {media.titleSinhala}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {media.year} · {media.type === 'movie' ? 'Movie' : `${media.totalEpisodes ?? '?'} EP`}
        </div>
      </div>
    </div>
  );
}
