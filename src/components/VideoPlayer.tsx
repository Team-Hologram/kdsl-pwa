'use client';
// src/components/VideoPlayer.tsx — Vidstack player + JS subtitle overlay

import { useRef, useState, useEffect } from 'react';
import {
  MediaPlayer,
  MediaProvider,
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

// ── VTT / SRT parser ──────────────────────────────────────────────────────────
function parseTime(t: string): number {
  const n = t.trim().replace(',', '.'); // SRT uses comma, VTT uses dot
  const parts = n.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

interface Cue { start: number; end: number; text: string }
interface CueState { url: string; cues: Cue[] }

function parseSubs(content: string): Cue[] {
  const cues: Cue[] = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const arrowIdx = line.indexOf('-->');
      const start = parseTime(line.slice(0, arrowIdx));
      const end = parseTime(line.slice(arrowIdx + 3).trim().split(/\s+/)[0]);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        const clean = lines[i].replace(/<[^>]+>/g, '').trim();
        if (clean) textLines.push(clean);
        i++;
      }
      if (textLines.length && end > start) {
        cues.push({ start, end, text: textLines.join('\n') });
      }
    }
    i++;
  }
  return cues;
}
// ─────────────────────────────────────────────────────────────────────────────

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

  // Subtitle state
  const defaultSub = subtitles.find((s) => s.language === 'si' || s.language === 'sinhala') ?? subtitles[0] ?? null;
  const [selectedSubUrl, setSelectedSubUrl] = useState<string | null | undefined>(undefined);
  const [cueState, setCueState] = useState<CueState>({ url: '', cues: [] });
  const [currentTime, setCurrentTime] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [showSubMenu, setShowSubMenu] = useState(false);

  const selectedSub = selectedSubUrl === null
    ? null
    : subtitles.find((s) => s.url === selectedSubUrl) ?? defaultSub;
  const cues = selectedSub?.url === cueState.url ? cueState.cues : [];
  const currentCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
  const currentQuality = qualities.find((q) => q.url === currentSrc)?.quality ?? 'Auto';

  // Load selected subtitle file via fetch (same-origin proxy, no CORS issue)
  useEffect(() => {
    const controller = new AbortController();
    if (!selectedSub?.url) return;

    fetch(selectedSub.url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} from proxy`);
        return r.text();
      })
      .then((text) => {
        const parsed = parseSubs(text);
        setCueState({ url: selectedSub.url, cues: parsed });
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setCueState({ url: selectedSub.url, cues: [] });
        console.error('[VideoPlayer] subtitle load failed:', e);
      });

    return () => controller.abort();
  }, [selectedSub?.url]);

  // Poll Vidstack currentTime for subtitle sync
  useEffect(() => {
    const id = setInterval(() => {
      if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
    }, 250);
    return () => clearInterval(id);
  }, []);

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
        // Push content below iOS status bar
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => { setShowQuality(false); setShowSubMenu(false); }}
    >
      {/* ── Vidstack player (fills remaining space) ── */}
      <MediaPlayer
        ref={playerRef}
        key={currentSrc}
        title={title}
        src={currentSrc}
        playsInline
        {...(savedTime > 0 ? { currentTime: savedTime } : {})}
        style={{ flex: 1, minHeight: 0 }}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {/* ── JS Subtitle overlay (fetched via same-origin proxy, no crossOrigin needed) ── */}
      {currentCue && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom) + 64px)',
            left: 16, right: 16,
            textAlign: 'center',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          {currentCue.text.split('\n').map((line, i) => (
            <div key={i} style={{
              display: 'inline-block',
              background: 'rgba(0,0,0,0.78)',
              color: '#fff',
              fontSize,
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: 4,
              lineHeight: 1.5,
              marginBottom: 2,
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* ── Back button ── */}
      <button
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top) + 10px)',
          left: 14,
          zIndex: 9999,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: 'none',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>

      {/* ── Subtitle + font-size controls (top-right cluster) ── */}
      {subtitles.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 10px)',
            right: qualitySelectionEnabled && qualities.length > 1 ? 68 : 14,
            zIndex: 9999,
            display: 'flex', gap: 6,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtitle picker */}
          <button
            onClick={() => { setShowSubMenu((v) => !v); setShowQuality(false); }}
            style={{
              height: 32, padding: '0 10px', borderRadius: 8,
              background: selectedSub ? 'rgba(0,217,255,0.25)' : 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: 'none',
              color: selectedSub ? 'var(--primary)' : '#fff',
              fontSize: 12, fontWeight: 600,
            }}
          >CC</button>
          {/* Font size */}
          <button
            onClick={() => setFontSize((s) => s === 13 ? 17 : s === 17 ? 21 : 13)}
            style={{
              height: 32, padding: '0 10px', borderRadius: 8,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}
          >Aa</button>

          {/* Subtitle dropdown */}
          {showSubMenu && (
            <div style={{
              position: 'absolute', top: 38, right: 0,
              background: 'rgba(10,14,39,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, overflow: 'hidden', minWidth: 140, zIndex: 100,
            }}>
              <button onClick={() => { setSelectedSubUrl(null); setShowSubMenu(false); }}
                style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, color: !selectedSub ? 'var(--primary)' : '#fff', fontWeight: !selectedSub ? 700 : 400, background: 'none', border: 'none' }}>
                Off
              </button>
              {subtitles.map((s) => (
                <button key={s.language} onClick={() => { setSelectedSubUrl(s.url); setShowSubMenu(false); }}
                  style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, color: selectedSub?.language === s.language ? 'var(--primary)' : '#fff', fontWeight: selectedSub?.language === s.language ? 700 : 400, background: 'none', border: 'none' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quality selector ── */}
      {qualitySelectionEnabled && qualities.length > 1 && (
        <div
          style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', right: 14, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowQuality((v) => !v); setShowSubMenu(false); }}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/></svg>
            {currentQuality}
          </button>
          {showQuality && (
            <div style={{
              position: 'absolute', top: 38, right: 0,
              background: 'rgba(10,14,39,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, overflow: 'hidden', minWidth: 110,
            }}>
              {qualities.map((q) => (
                <button key={q.quality} onClick={() => handleQualityChange(q)}
                  style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, color: q.url === currentSrc ? 'var(--primary)' : '#fff', fontWeight: q.url === currentSrc ? 700 : 400, background: 'none', border: 'none' }}>
                  {q.quality}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
