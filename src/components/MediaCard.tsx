'use client';
// src/components/MediaCard.tsx — matches Android app design

import { Media } from '@/lib/types';
import { loadMonetagOnclickAd } from '@/lib/monetagAds';

interface Props {
  media: Media;
  onPress: () => void;
  showOnclickAd?: boolean;
}

export default function MediaCard({ media, onPress, showOnclickAd = false }: Props) {
  return (
    <div
      onPointerDown={showOnclickAd ? loadMonetagOnclickAd : undefined}
      onClick={onPress}
      style={{
        width: '100%', cursor: 'pointer',
        borderRadius: 12, overflow: 'hidden',
        background: 'transparent',
      }}
    >
      {/* ── Poster image ── */}
      <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden' }}>
        <img
          src={media.thumbnail}
          alt={media.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
          decoding="async"
        />

        {/* Dark gradient at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          pointerEvents: 'none',
        }} />

        {/* Top-left badges: NEW + ONGOING/COMPLETED stacked */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {media.latest && (
            <span style={{
              background: '#00D9FF', color: '#000',
              fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
              padding: '3px 8px', borderRadius: 6,
              textTransform: 'uppercase',
            }}>
              NEW
            </span>
          )}
          <span style={{
            background: media.completed ? '#00BFA5' : '#FF8C00',
            color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
            padding: '3px 8px', borderRadius: 6,
            textTransform: 'uppercase',
          }}>
            {media.completed ? 'COMPLETED' : 'ONGOING'}
          </span>
        </div>

        {/* Top-right: Trending icon */}
        {media.trending && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, borderRadius: 16,
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* trending chart up icon */}
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
        )}

        {/* Bottom-left: star rating */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 12, fontWeight: 700, color: '#FFD700',
        }}>
          ★ {media.rating.toFixed(1)}
        </div>
      </div>

      {/* ── Text below poster ── */}
      <div style={{ paddingTop: 6, paddingBottom: 2, paddingLeft: 2 }}>
        <div
          className="line-clamp-2"
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}
        >
          {media.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
          {media.year}
          {media.type === 'drama' && media.totalEpisodes
            ? ` • ${media.totalEpisodes} EP`
            : media.type === 'movie' ? ' • Movie' : ''}
        </div>
      </div>
    </div>
  );
}
