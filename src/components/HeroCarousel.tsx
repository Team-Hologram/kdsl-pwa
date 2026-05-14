'use client';
// src/components/HeroCarousel.tsx — smooth cross-fade between slides

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Media } from '@/lib/types';

interface Props { mediaList: Media[]; }

export default function HeroCarousel({ mediaList }: Props) {
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (next: number) => {
    if (transitioning || next === idx) return;
    setPrevIdx(idx);
    setTransitioning(true);
    setIdx(next);
    // Clear prev after transition finishes
    setTimeout(() => { setPrevIdx(null); setTransitioning(false); }, 600);
  };

  useEffect(() => {
    if (mediaList.length <= 1) return;
    timer.current = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % mediaList.length;
        setPrevIdx(i);
        setTransitioning(true);
        setTimeout(() => { setPrevIdx(null); setTransitioning(false); }, 600);
        return next;
      });
    }, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [mediaList.length]);

  if (!mediaList.length) return null;

  const media = mediaList[idx];
  const prevMedia = prevIdx !== null ? mediaList[prevIdx] : null;

  return (
    <div style={{ position: 'relative', height: 480, overflow: 'hidden' }}>
      {/* Previous slide (fading out) */}
      {prevMedia && (
        <img
          src={prevMedia.banner}
          alt={prevMedia.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', inset: 0,
            opacity: 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      )}

      {/* Current slide (fading in) */}
      <img
        key={media.id}
        src={media.banner}
        alt={media.title}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          position: 'absolute', inset: 0,
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.6s ease',
          // Trigger reflow so transition fires on mount
          animation: 'none',
        }}
        onLoad={(e) => {
          // Force opacity transition after image loads
          const el = e.currentTarget;
          el.style.opacity = '0';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => { el.style.opacity = '1'; });
          });
        }}
      />

      {/* Gradient overlays */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,14,39,0.15) 0%, transparent 35%, rgba(10,14,39,0.85) 72%, var(--bg) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Content — fades with slide */}
      <div
        key={`content-${media.id}`}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 16px 20px',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }} className="line-clamp-2">
          {media.title}
        </div>
        {media.titleSinhala && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }} className="line-clamp-1">
            {media.titleSinhala}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>⭐ {media.rating.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{media.year}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {media.type === 'movie' ? 'Movie' : `${media.totalEpisodes ?? '?'} Episodes`}
          </span>
          {/* Status badge */}
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
            onClick={() => window.location.assign(`/player?mediaId=${media.id}`)}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
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
              onClick={() => goTo(i)}
              style={{
                width: 4, height: i === idx ? 18 : 4,
                borderRadius: 2,
                background: i === idx ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
