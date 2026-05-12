'use client';
// src/components/VideoPlayer.tsx — Vidstack player + JS subtitle overlay
// All custom overlays are INSIDE <MediaPlayer> so they survive CSS fullscreen

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
  const n = t.trim().replace(',', '.');
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
  const blobUrlRef = useRef<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState(qualities[0]?.url ?? videoUrl);
  const [savedTime, setSavedTime] = useState(0);
  const [showQuality, setShowQuality] = useState(false);

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

  // Fetch subtitle → parse for div overlay + inject blob: URL for native track
  useEffect(() => {
    const controller = new AbortController();
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    document.querySelectorAll('track[data-custom-sub]').forEach((t) => t.remove());

    if (!selectedSub?.url) { setCueState({ url: '', cues: [] }); return; }

    fetch(selectedSub.url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((text) => {
        // 1. JS div overlay (portrait mode)
        setCueState({ url: selectedSub.url, cues: parseSubs(text) });

        // 2. blob: URL native track (visible in any fullscreen mode)
        const vtt = text.trimStart().startsWith('WEBVTT') ? text : `WEBVTT\n\n${text}`;
        const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
        blobUrlRef.current = blobUrl;

        const videoEl = document.querySelector('video');
        if (videoEl) {
          const trackEl = document.createElement('track');
          trackEl.kind = 'subtitles';
          trackEl.label = selectedSub.label;
          trackEl.srclang = selectedSub.language;
          trackEl.src = blobUrl;
          trackEl.setAttribute('data-custom-sub', 'true');
          trackEl.default = true;
          videoEl.appendChild(trackEl);

          const showTrack = () => {
            for (let i = 0; i < videoEl.textTracks.length; i++) {
              if (videoEl.textTracks[i].kind === 'subtitles') videoEl.textTracks[i].mode = 'showing';
            }
          };
          trackEl.addEventListener('load', showTrack, { once: true });
          setTimeout(showTrack, 400);
        }
      })
      .catch((e) => { if (e.name !== 'AbortError') console.error('[sub]', e); });

    return () => {
      controller.abort();
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
      document.querySelectorAll('track[data-custom-sub]').forEach((t) => t.remove());
    };
  }, [selectedSub?.url]);

  // Poll Vidstack currentTime
  useEffect(() => {
    const id = setInterval(() => {
      if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const handleQualityChange = (q: VideoQuality) => {
    setSavedTime(playerRef.current?.currentTime ?? 0);
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
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── All custom overlays are INSIDE MediaPlayer so they survive CSS fullscreen ── */}
      <MediaPlayer
        ref={playerRef}
        key={currentSrc}
        title={title}
        src={currentSrc}
        playsInline
        {...(savedTime > 0 ? { currentTime: savedTime } : {})}
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
        onClick={() => { setShowQuality(false); setShowSubMenu(false); }}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />

        {/* ── Subtitle div overlay (portrait normal mode) ── */}
        {currentCue && (
          <div
            style={{
              position: 'absolute',
              bottom: 72,
              left: 16, right: 16,
              textAlign: 'center',
              zIndex: 9990,
              pointerEvents: 'none',
            }}
          >
            {currentCue.text.split('\n').map((line, i) => (
              <div key={i} style={{
                display: 'inline-block',
                background: 'rgba(0,0,0,0.82)',
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
            position: 'absolute', top: 12, left: 14, zIndex: 9999,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* ── CC + Aa buttons ── */}
        {subtitles.length > 0 && (
          <div
            style={{
              position: 'absolute', top: 12,
              right: qualitySelectionEnabled && qualities.length > 1 ? 60 : 14,
              zIndex: 9999, display: 'flex', gap: 6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowSubMenu((v) => !v); setShowQuality(false); }}
              style={{
                height: 32, padding: '0 10px', borderRadius: 8,
                background: selectedSub ? 'rgba(0,217,255,0.25)' : 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                border: 'none', color: selectedSub ? '#00D9FF' : '#fff',
                fontSize: 12, fontWeight: 700,
              }}
            >CC</button>

            <button
              onClick={() => setFontSize((s) => s === 13 ? 17 : s === 17 ? 21 : 13)}
              style={{
                height: 32, padding: '0 10px', borderRadius: 8,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
              }}
            >Aa</button>

            {showSubMenu && (
              <div style={{
                position: 'absolute', top: 38, right: 0,
                background: 'rgba(10,14,39,0.97)',
                borderRadius: 12, overflow: 'hidden', minWidth: 140, zIndex: 100,
              }}>
                <button onClick={() => { setSelectedSubUrl(null); setShowSubMenu(false); }}
                  style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, color: !selectedSub ? '#00D9FF' : '#fff', fontWeight: !selectedSub ? 700 : 400, background: 'none', border: 'none' }}>
                  Off
                </button>
                {subtitles.map((s) => (
                  <button key={s.language} onClick={() => { setSelectedSubUrl(s.url); setShowSubMenu(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, color: selectedSub?.language === s.language ? '#00D9FF' : '#fff', fontWeight: selectedSub?.language === s.language ? 700 : 400, background: 'none', border: 'none' }}>
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
            style={{ position: 'absolute', top: 12, right: 14, zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowQuality((v) => !v); setShowSubMenu(false); }}
              style={{
                height: 32, padding: '0 12px', borderRadius: 8,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/>
              </svg>
              {currentQuality}
            </button>
            {showQuality && (
              <div style={{
                position: 'absolute', top: 38, right: 0,
                background: 'rgba(10,14,39,0.97)',
                borderRadius: 12, overflow: 'hidden', minWidth: 110,
              }}>
                {qualities.map((q) => (
                  <button key={q.quality} onClick={() => handleQualityChange(q)}
                    style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, color: q.url === currentSrc ? '#00D9FF' : '#fff', fontWeight: q.url === currentSrc ? 700 : 400, background: 'none', border: 'none' }}>
                    {q.quality}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </MediaPlayer>
    </div>
  );
}
