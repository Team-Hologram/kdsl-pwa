'use client';
// src/components/VideoPlayer.tsx
// Full custom HTML5 video player with:
// - Quality switching, subtitle selection
// - Fullscreen → landscape on iPhone PWA
// - iOS-compatible controls

import { useRef, useState, useEffect, useCallback } from 'react';
import { VideoQuality, Subtitle } from '@/lib/types';

interface Props {
  videoUrl: string;
  qualities: VideoQuality[];
  subtitles: Subtitle[];
  title: string;
  onBack: () => void;
  qualitySelectionEnabled?: boolean;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ videoUrl, qualities, subtitles, title, onBack, qualitySelectionEnabled = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]?.url ?? videoUrl);
  const [selectedSub, setSelectedSub] = useState<Subtitle | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => { resetControlsTimer(); }, []);

  // Fullscreen change
  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);
    return () => document.removeEventListener('fullscreenchange', onFS);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
    resetControlsTimer();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    resetControlsTimer();
  };

  const toggleFullscreen = async () => {
    const v = videoRef.current;
    const el = containerRef.current;
    if (!el || !v) return;

    // iOS Safari uses webkitEnterFullscreen on the video element directly
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      if ((v as any).webkitDisplayingFullscreen) {
        (v as any).webkitExitFullscreen?.();
        try { await (screen.orientation as any).lock?.('portrait-primary'); } catch {}
        setIsFullscreen(false);
      } else {
        (v as any).webkitEnterFullscreen?.();
        try { await (screen.orientation as any).lock?.('landscape'); } catch {}
        setIsFullscreen(true);
      }
    } else {
      if (!document.fullscreenElement) {
        try {
          await el.requestFullscreen();
          await (screen.orientation as any).lock?.('landscape').catch(() => {});
          setIsFullscreen(true);
        } catch {}
      } else {
        document.exitFullscreen();
        try { await (screen.orientation as any).lock?.('portrait-primary').catch(() => {}); } catch {}
        setIsFullscreen(false);
      }
    }
    resetControlsTimer();
  };

  const handleQualityChange = (url: string) => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const wasPlaying = !v.paused;
    setSelectedQuality(url);
    // Re-set src preserves currentTime via onLoadedMetadata
    v.src = url;
    v.currentTime = t;
    if (wasPlaying) v.play();
    setShowQuality(false);
    resetControlsTimer();
  };

  const handleSubChange = (sub: Subtitle | null) => {
    setSelectedSub(sub);
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      v.textTracks[i].mode = 'disabled';
    }
    if (sub) {
      for (let i = 0; i < v.textTracks.length; i++) {
        if (v.textTracks[i].label === sub.label) {
          v.textTracks[i].mode = 'showing';
          break;
        }
      }
    }
    setShowSubs(false);
    resetControlsTimer();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', width: '100%', height: isFullscreen ? '100vw' : '56.25vw',
        maxHeight: isFullscreen ? '100vh' : undefined,
        background: '#000', overflow: 'hidden',
        touchAction: 'none',
      }}
      onClick={() => { setShowQuality(false); setShowSubs(false); resetControlsTimer(); }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={selectedQuality || videoUrl}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        playsInline
        preload="metadata"
        muted={muted}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={(e) => console.error('[VideoPlayer] Error:', e.currentTarget.error)}
      >
        {subtitles.map((sub) => (
          <track
            key={sub.language}
            kind="subtitles"
            src={sub.url}
            label={sub.label}
            srcLang={sub.language}
            default={sub.language === 'si' || (!selectedSub && sub.language === 'en')}
          />
        ))}
      </video>

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: showControls ? 'linear-gradient(rgba(0,0,0,0.4) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)' : 'transparent',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s, background 0.3s',
          pointerEvents: showControls ? 'all' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <button onClick={onBack} style={{ color: '#fff', padding: 4 }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#fff' }} className="line-clamp-1">{title}</div>
          {/* Mute */}
          <button onClick={() => setMuted((m) => !m)} style={{ color: '#fff', padding: 4 }}>
            {muted
              ? <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round"/></svg>
            }
          </button>
        </div>

        {/* Center play button */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32 }}>
          {/* Rewind 10s */}
          <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; resetControlsTimer(); }} style={{ color: '#fff', padding: 8 }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.5 12l-8.5 5V7l8.5 5zm10 0l-8.5 5V7l8.5 5z" opacity={0.6}/>
            </svg>
          </button>
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              border: '2px solid rgba(255,255,255,0.4)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {playing
              ? <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          {/* Forward 10s */}
          <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; resetControlsTimer(); }} style={{ color: '#fff', padding: 8 }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 12L21 7v10l-8.5-5zm-10 0L11 7v10l-8.5-5z" opacity={0.6}/>
            </svg>
          </button>
        </div>

        {/* Bottom controls */}
        <div style={{ padding: '0 16px 12px' }}>
          {/* Seek bar */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            {/* Buffered */}
            <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: 3, width: `${duration ? (buffered / duration) * 100 : 0}%`, background: 'rgba(255,255,255,0.3)', borderRadius: 2, pointerEvents: 'none' }} />
            <input
              type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              onChange={seek}
              style={{ width: '100%', height: 3, accentColor: 'var(--primary)', cursor: 'pointer', background: 'transparent', position: 'relative', zIndex: 1 }}
            />
          </div>

          {/* Time + controls row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Subtitles */}
              {subtitles.length > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setShowSubs((s) => !s); setShowQuality(false); }} style={{ fontSize: 12, color: selectedSub ? 'var(--primary)' : 'rgba(255,255,255,0.7)', fontWeight: 600, padding: 4 }}>
                  CC
                </button>
              )}
              {/* Quality */}
              {qualitySelectionEnabled && qualities.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); setShowQuality((q) => !q); setShowSubs(false); }} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, padding: 4 }}>
                  {qualities.find((q) => q.url === selectedQuality)?.quality ?? 'HD'}
                </button>
              )}
              {/* Fullscreen */}
              <button onClick={toggleFullscreen} style={{ color: 'rgba(255,255,255,0.8)', padding: 4 }}>
                {isFullscreen
                  ? <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
                  : <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quality picker */}
      {showQuality && (
        <div
          style={{
            position: 'absolute', bottom: 60, right: 16,
            background: 'rgba(19,24,41,0.95)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 0', zIndex: 50, minWidth: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {qualities.map((q) => (
            <button
              key={q.quality}
              onClick={() => handleQualityChange(q.url)}
              style={{
                display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                fontSize: 14, color: q.url === selectedQuality ? 'var(--primary)' : 'var(--text)',
                fontWeight: q.url === selectedQuality ? 700 : 400,
              }}
            >
              {q.quality}
            </button>
          ))}
        </div>
      )}

      {/* Subtitle picker */}
      {showSubs && (
        <div
          style={{
            position: 'absolute', bottom: 60, right: 16,
            background: 'rgba(19,24,41,0.95)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 0', zIndex: 50, minWidth: 130,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleSubChange(null)}
            style={{
              display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
              fontSize: 14, color: !selectedSub ? 'var(--primary)' : 'var(--text)',
              fontWeight: !selectedSub ? 700 : 400,
            }}
          >Off</button>
          {subtitles.map((s) => (
            <button
              key={s.language}
              onClick={() => handleSubChange(s)}
              style={{
                display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                fontSize: 14, color: selectedSub?.language === s.language ? 'var(--primary)' : 'var(--text)',
                fontWeight: selectedSub?.language === s.language ? 700 : 400,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Tap to toggle controls */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: showQuality || showSubs ? 'none' : 'all' }}
        onClick={() => { setShowQuality(false); setShowSubs(false); if (showControls) { setShowControls(false); if (controlsTimer.current) clearTimeout(controlsTimer.current); } else resetControlsTimer(); }}
      />
    </div>
  );
}
