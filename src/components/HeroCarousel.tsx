'use client';
// src/components/HeroCarousel.tsx

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Media } from '@/lib/types';

interface Props { mediaList: Media[]; }

export default function HeroCarousel({ mediaList }: Props) {
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mediaList.length <= 1) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % mediaList.length), 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [mediaList.length]);

  if (!mediaList.length) return null;
  const media = mediaList[idx];

  return (
    <div style={{ position: 'relative', height: 480, overflow: 'hidden' }}>
      {/* Banner */}
      <img
        key={media.id}
        src={media.banner}
        alt={media.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        className="fade-in"
      />

      {/* Gradient overlays */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,14,39,0.2) 0%, transparent 40%, rgba(10,14,39,0.9) 75%, var(--bg) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 16px 20px',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }} className="line-clamp-2">
          {media.title}
        </div>
        {media.titleSinhala && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }} className="line-clamp-1">
            {media.titleSinhala}
          </div>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>⭐ {media.rating.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{media.year}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {media.type === 'movie' ? 'Movie' : `${media.totalEpisodes ?? '?'} Episodes`}
          </span>
          {media.genres.slice(0, 2).map((g) => (
            <span key={g} style={{
              fontSize: 11, color: 'var(--primary)',
              border: '1px solid var(--primary)', borderRadius: 'var(--radius-full)',
              padding: '1px 8px', fontWeight: 500,
            }}>{g}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, height: 46 }}
            onClick={() => router.push(`/player?mediaId=${media.id}`)}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Play
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, height: 46 }}
            onClick={() => router.push(`/details/${media.id}`)}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Info
          </button>
        </div>
      </div>

      {/* Dot indicators */}
      {mediaList.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 90, right: 16,
          display: 'flex', gap: 5, flexDirection: 'column',
        }}>
          {mediaList.slice(0, 8).map((_, i) => (
            <div
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: 4, height: i === idx ? 18 : 4,
                borderRadius: 2,
                background: i === idx ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
