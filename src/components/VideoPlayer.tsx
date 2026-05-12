'use client';
// src/components/VideoPlayer.tsx — Vidstack v1 player

import { useRef, useState } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
} from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { VideoQuality, Subtitle } from '@/lib/types';

interface Props {
  videoUrl: string;
  qualities: VideoQuality[];
  subtitles: Subtitle[];
  title: string;
  onBack: () => void;
  qualitySelectionEnabled?: boolean;
}

export default function VideoPlayer({
  videoUrl,
  qualities,
  subtitles,
  title,
  onBack,
  qualitySelectionEnabled = true,
}: Props) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [currentSrc, setCurrentSrc] = useState(qualities[0]?.url ?? videoUrl);
  const [savedTime, setSavedTime] = useState(0);
  const [showQuality, setShowQuality] = useState(false);

  const currentQuality =
    qualities.find((q) => q.url === currentSrc)?.quality ?? 'Auto';

  const handleQualityChange = (q: VideoQuality) => {
    const t = playerRef.current?.currentTime ?? 0;
    setSavedTime(t);
    setCurrentSrc(q.url);
    setShowQuality(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* ── Vidstack Player ── */}
      <MediaPlayer
        ref={playerRef}
        key={currentSrc}
        title={title}
        src={currentSrc}
        playsInline
        {...(savedTime > 0 ? { currentTime: savedTime } : {})}
        style={{ width: '100%', height: '100%' }}
      >
        <MediaProvider>
          {subtitles.map((sub) => (
            <Track
              key={sub.language}
              src={sub.url}
              kind="subtitles"
              label={sub.label}
              lang={sub.language}
              default={sub.language === 'si'}
            />
          ))}
        </MediaProvider>

        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {/* ── Back button — always above Vidstack controls ── */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top) + 12px)',
          left: 16,
          zIndex: 9999,
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>

      {/* ── Quality selector button + dropdown ── */}
      {qualitySelectionEnabled && qualities.length > 1 && (
        <>
          <button
            onClick={() => setShowQuality((v) => !v)}
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top) + 12px)',
              right: 16,
              zIndex: 9999,
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/></svg>
            {currentQuality}
          </button>

          {showQuality && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top) + 52px)',
                right: 16,
                zIndex: 9999,
                background: 'rgba(10,14,39,0.97)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                overflow: 'hidden',
                minWidth: 120,
              }}
            >
              {qualities.map((q) => (
                <button
                  key={q.quality}
                  onClick={() => handleQualityChange(q)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '11px 18px',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: q.url === currentSrc ? 700 : 400,
                    color: q.url === currentSrc ? 'var(--primary)' : '#fff',
                    background: 'none',
                    border: 'none',
                  }}
                >
                  {q.quality}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
