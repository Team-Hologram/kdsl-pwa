'use client';
// src/components/VideoPlayer.tsx — Android-style design

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
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({
  videoUrl, qualities, subtitles, title, onBack, qualitySelectionEnabled = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedQuality, setSelectedQuality] = useState(qualities[0]?.url ?? videoUrl);
  // Default to Sinhala sub if available, else first sub
  const defaultSub = subtitles.find((s) => s.language === 'si') ?? subtitles[0] ?? null;
  const [selectedSub, setSelectedSub] = useState<Subtitle | null>(defaultSub);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fontSizePx = fontSize === 'small' ? 12 : fontSize === 'large' ? 20 : 16;

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => { resetHideTimer(); }, []);

  // Apply subtitle font size via CSS on the video container
  useEffect(() => {
    const style = document.getElementById('sub-font-style') as HTMLStyleElement | null
      ?? (() => { const s = document.createElement('style'); s.id = 'sub-font-style'; document.head.appendChild(s); return s; })();
    style.textContent = `video::cue { font-size: ${fontSizePx}px; }`;
  }, [fontSizePx]);

  // Apply default sub on mount
  useEffect(() => {
    if (!defaultSub) return;
    const v = videoRef.current;
    if (!v) return;
    const apply = () => {
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = v.textTracks[i].label === defaultSub.label ? 'showing' : 'disabled';
      }
    };
    v.addEventListener('loadedmetadata', apply);
    return () => v.removeEventListener('loadedmetadata', apply);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);
    return () => document.removeEventListener('fullscreenchange', onFS);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); }
    else { v.pause(); }
    resetHideTimer();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
    resetHideTimer();
  };

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
    resetHideTimer();
  };

  // Safe orientation lock — iOS throws even inside try/catch; .catch() suppresses the rejection
  const safeOrientationLock = (o: string) => {
    try { (screen.orientation as any).lock?.(o)?.catch?.(() => {}); } catch {}
  };

  const toggleFullscreen = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS PWA: CSS rotate handles landscape — just flip the state
      setIsFullscreen((f) => !f);
    } else {
      const el = containerRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        try { await el.requestFullscreen(); safeOrientationLock('landscape'); setIsFullscreen(true); } catch {}
      } else {
        try { await document.exitFullscreen(); safeOrientationLock('portrait-primary'); } catch {}
        setIsFullscreen(false);
      }
    }
    resetHideTimer();
  };

  const handleQualityChange = (url: string) => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const was = !v.paused;
    setSelectedQuality(url);
    v.src = url;
    v.load();
    v.currentTime = t;
    if (was) v.play();
    setShowQuality(false);
    resetHideTimer();
  };

  const handleSubChange = (sub: Subtitle | null) => {
    setSelectedSub(sub);
    const v = videoRef.current;
    if (v) {
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
    }
    setShowSubs(false);
    resetHideTimer();
  };

  const currentQualityLabel = qualities.find((q) => q.url === selectedQuality)?.quality ?? 'HD';

  return (
    <div
      ref={containerRef}
      style={{
        // iOS PWA fullscreen: use CSS rotate to fake landscape
        // requestFullscreen/webkitEnterFullscreen don't work in iOS PWA home screen mode
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        width: isFullscreen ? '100dvh' : '100%',
        height: isFullscreen ? '100dvw' : '100dvh',
        transform: isFullscreen ? 'rotate(90deg) translateX(-100%)' : undefined,
        transformOrigin: isFullscreen ? 'top left' : undefined,
        background: '#000', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      // Tap anywhere to toggle controls
      onClick={() => {
        if (showQuality || showSubs) { setShowQuality(false); setShowSubs(false); return; }
        if (showControls) {
          setShowControls(false);
          if (hideTimer.current) clearTimeout(hideTimer.current);
        } else {
          resetHideTimer();
        }
      }}
    >
      {/* ── VIDEO ELEMENT ── */}
      <video
        ref={videoRef}
        src={selectedQuality || videoUrl}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        playsInline
        preload="auto"
        muted={muted}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => { setIsLoading(false); setHasError(false); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setIsLoading(false); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={(e) => {
          const err = e.currentTarget.error;
          const errLabels: Record<number,string> = {1:'Aborted',2:'Network',3:'Decode',4:'Format not supported'};
          const msg = err ? `Code ${err.code}: ${err.message || errLabels[err.code] || 'Unknown'}` : 'Unknown error';
          console.error('[VideoPlayer] Error:', msg);
          setErrorMsg(msg);
          setIsLoading(false);
          setHasError(true);
        }}
      >
        {subtitles.map((sub) => (
          <track
            key={sub.language}
            kind="subtitles"
            src={sub.url}
            label={sub.label}
            srcLang={sub.language}
            default={sub.language === 'si'}
          />
        ))}
      </video>

      {/* ── LOADING SPINNER ── */}
      {isLoading && !hasError && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      {/* ── ERROR STATE ── */}
      {hasError && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '0 24px',
        }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <p style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>Video failed to load</p>
          {errorMsg ? <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center' }}>{errorMsg}</p> : null}
          <button
            style={{ background: 'var(--primary)', color: '#000', padding: '8px 20px', borderRadius: 8, fontWeight: 700 }}
            onClick={(e) => { e.stopPropagation(); setHasError(false); setIsLoading(true); videoRef.current?.load(); }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── CONTROLS OVERLAY ── */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          background: showControls
            ? 'linear-gradient(rgba(0,0,0,0.55) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.65) 100%)'
            : 'transparent',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s, background 0.3s',
          pointerEvents: showControls ? 'all' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP BAR ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '48px 16px 16px' }}>
          {/* Circle back button */}
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <span
            className="line-clamp-1"
            style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#fff' }}
          >
            {title}
          </span>
          {/* Mute */}
          <button
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
            style={{ color: 'rgba(255,255,255,0.8)', padding: 8, background: 'none', border: 'none' }}
          >
            {muted
              ? <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round"/></svg>
            }
          </button>
        </div>

        {/* ── CENTER CONTROLS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {/* Rewind */}
            <button
              onClick={(e) => { e.stopPropagation(); skip(-10); }}
              style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', padding: 8 }}
            >
              <svg width={36} height={36} viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.5 12l-8.5 5V7l8.5 5zm10 0l-8.5 5V7l8.5 5z"/>
              </svg>
            </button>

            {/* Play / Pause — primary colored */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'transparent', border: 'none',
                color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                filter: 'drop-shadow(0 0 12px rgba(0,217,255,0.6))',
              }}
            >
              {playing
                ? <svg width={52} height={52} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width={52} height={52} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>

            {/* Forward */}
            <button
              onClick={(e) => { e.stopPropagation(); skip(10); }}
              style={{ color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none', padding: 8 }}
            >
              <svg width={36} height={36} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 12L21 7v10l-8.5-5zm-10 0L11 7v10l-8.5-5z"/>
              </svg>
            </button>
          </div>

          {/* Branding */}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', letterSpacing: 1 }}>
            KDrama SL
          </span>
        </div>

        {/* ── BOTTOM: PROGRESS + CONTROLS ── */}
        <div style={{ padding: '0 16px 32px' }}>
          {/* Time + seek bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>
              {formatTime(currentTime)}
            </span>

            {/* Custom seek bar */}
            <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
              {/* Track bg */}
              <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
              {/* Buffered */}
              <div style={{
                position: 'absolute', left: 0, height: 3, borderRadius: 2,
                width: `${duration ? (buffered / duration) * 100 : 0}%`,
                background: 'rgba(255,255,255,0.35)',
              }} />
              {/* Progress */}
              <div style={{
                position: 'absolute', left: 0, height: 3, borderRadius: 2,
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                background: 'var(--primary)',
              }} />
              <input
                type="range" min={0} max={duration || 100} step={0.5} value={currentTime}
                onChange={seek}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', left: 0, right: 0, width: '100%',
                  height: '100%', opacity: 0, cursor: 'pointer', zIndex: 1,
                }}
              />
              {/* Thumb indicator */}
              <div style={{
                position: 'absolute',
                left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                transform: 'translateX(-50%)',
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--primary)',
                boxShadow: '0 0 6px rgba(0,217,255,0.8)',
                pointerEvents: 'none',
              }} />
            </div>

            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Bottom pill controls */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {/* Quality */}
            {qualitySelectionEnabled && qualities.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowQuality((q) => !q); setShowSubs(false); }}
                style={{
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, padding: '8px 14px',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/></svg>
                {currentQualityLabel}
              </button>
            )}
            {/* Subtitles */}
            {subtitles.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubs((s) => !s); setShowQuality(false); setShowFontSize(false); }}
                style={{
                  background: selectedSub ? 'rgba(0,217,255,0.25)' : 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${selectedSub ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 8, padding: '8px 14px',
                  color: selectedSub ? 'var(--primary)' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                CC {subtitles.length}
              </button>
            )}
            {/* Font size (Aa) */}
            {subtitles.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowFontSize((f) => !f); setShowSubs(false); setShowQuality(false); }}
                style={{
                  background: showFontSize ? 'rgba(0,217,255,0.25)' : 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${showFontSize ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 8, padding: '8px 14px',
                  color: showFontSize ? 'var(--primary)' : '#fff',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                Aa
              </button>
            )}
            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '8px 14px',
                color: '#fff', fontSize: 12,
                display: 'flex', alignItems: 'center',
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {isFullscreen
                  ? <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
                  : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── QUALITY PICKER ── */}
      {showQuality && (
        <div
          style={{
            position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,20,40,0.96)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '6px 0', zIndex: 20, minWidth: 120,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {qualities.map((q) => (
            <button
              key={q.quality}
              onClick={(e) => { e.stopPropagation(); handleQualityChange(q.url); }}
              style={{
                display: 'block', width: '100%', padding: '10px 18px', textAlign: 'left',
                fontSize: 14, color: q.url === selectedQuality ? 'var(--primary)' : '#fff',
                fontWeight: q.url === selectedQuality ? 700 : 400,
                background: 'none', border: 'none',
              }}
            >
              {q.quality}
            </button>
          ))}
        </div>
      )}

      {/* ── FONT SIZE PICKER ── */}
      {showFontSize && (
        <div
          style={{
            position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,20,40,0.96)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '10px 16px', zIndex: 20,
            display: 'flex', gap: 12, alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); setFontSize(s); }}
              style={{
                padding: '8px 14px', borderRadius: 8,
                background: fontSize === s ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: fontSize === s ? '#000' : '#fff',
                fontSize: s === 'small' ? 11 : s === 'large' ? 17 : 14,
                fontWeight: 700, border: 'none',
              }}
            >
              {s === 'small' ? 'A' : s === 'medium' ? 'Aa' : 'AA'}
            </button>
          ))}
        </div>
      )}

      {/* ── SUBTITLE PICKER ── */}
      {showSubs && (
        <div
          style={{
            position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,20,40,0.96)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '6px 0', zIndex: 20, minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); handleSubChange(null); }}
            style={{
              display: 'block', width: '100%', padding: '10px 18px', textAlign: 'left',
              fontSize: 14, color: !selectedSub ? 'var(--primary)' : '#fff',
              fontWeight: !selectedSub ? 700 : 400, background: 'none', border: 'none',
            }}
          >Off</button>
          {subtitles.map((s) => (
            <button
              key={s.language}
              onClick={(e) => { e.stopPropagation(); handleSubChange(s); }}
              style={{
                display: 'block', width: '100%', padding: '10px 18px', textAlign: 'left',
                fontSize: 14, color: selectedSub?.language === s.language ? 'var(--primary)' : '#fff',
                fontWeight: selectedSub?.language === s.language ? 700 : 400,
                background: 'none', border: 'none',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
