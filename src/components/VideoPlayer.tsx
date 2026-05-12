'use client';
import { useRef, useState, useEffect } from 'react';
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { VideoQuality, Subtitle } from '@/lib/types';

interface Props {
  videoUrl: string; qualities: VideoQuality[]; subtitles: Subtitle[];
  title: string; onBack: () => void; qualitySelectionEnabled?: boolean;
}

function parseTime(t: string): number {
  const n = t.trim().replace(',', '.');
  const p = n.split(':').map(Number);
  return p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p.length === 2 ? p[0]*60+p[1] : 0;
}
interface Cue { start: number; end: number; text: string }
interface CueState { url: string; cues: Cue[] }

function parseSubs(raw: string): Cue[] {
  const cues: Cue[] = [];
  const lines = raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const ax = line.indexOf('-->');
      const start = parseTime(line.slice(0, ax));
      const end = parseTime(line.slice(ax+3).trim().split(/\s+/)[0]);
      const tl: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        const c = lines[i].replace(/<[^>]+>/g,'').trim();
        if (c) tl.push(c);
        i++;
      }
      if (tl.length && end > start) cues.push({ start, end, text: tl.join('\n') });
    }
    i++;
  }
  return cues;
}

export default function VideoPlayer({
  videoUrl, qualities, subtitles, title, onBack, qualitySelectionEnabled = true,
}: Props) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState(qualities[0]?.url ?? videoUrl);
  const [savedTime, setSavedTime] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const defaultSub = subtitles.find(s => s.language==='si'||s.language==='sinhala') ?? subtitles[0] ?? null;
  const [selectedSubUrl, setSelectedSubUrl] = useState<string|null|undefined>(undefined);
  const [cueState, setCueState] = useState<CueState>({ url:'', cues:[] });
  const [currentTime, setCurrentTime] = useState(0);
  const [fontSize, setFontSize] = useState(17);

  useEffect(() => {
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.content;
    document.documentElement.classList.add('video-player-active');
    document.body.classList.add('video-player-active');
    if (themeMeta) themeMeta.content = '#000000';
    return () => {
      document.documentElement.classList.remove('video-player-active');
      document.body.classList.remove('video-player-active');
      if (themeMeta && previousThemeColor) themeMeta.content = previousThemeColor;
    };
  }, []);

  // Physical screen dimensions — like Android Dimensions.get('window'), includes status bar
  const [PW, setPW] = useState(375);
  const [PH, setPH] = useState(667);
  useEffect(() => {
    const upd = () => {
      setPW(Math.min(screen.width, screen.height));
      setPH(Math.max(screen.width, screen.height));
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  const selectedSub = selectedSubUrl === null
    ? null
    : subtitles.find(s => s.url === selectedSubUrl) ?? defaultSub;
  const cues = selectedSub?.url === cueState.url ? cueState.cues : [];
  const currentCue = cues.find(c => currentTime >= c.start && currentTime <= c.end);
  const currentQuality = qualities.find(q => q.url === currentSrc)?.quality ?? 'Auto';

  // Load subtitle → JS cue parser + blob URL for native <track>
  useEffect(() => {
    const ctrl = new AbortController();
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    document.querySelectorAll('track[data-cs]').forEach(t => t.remove());
    if (!selectedSub?.url) {
      const id = window.setTimeout(() => setCueState({ url: '', cues: [] }), 0);
      return () => window.clearTimeout(id);
    }
    fetch(selectedSub.url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(text => {
        setCueState({ url: selectedSub.url, cues: parseSubs(text) });
        const vtt = text.trimStart().startsWith('WEBVTT') ? text : `WEBVTT\n\n${text}`;
        const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
        blobUrlRef.current = blobUrl;
        const v = document.querySelector('video');
        if (v) {
          const tr = document.createElement('track');
          tr.kind = 'subtitles'; tr.label = selectedSub.label; tr.srclang = selectedSub.language;
          tr.src = blobUrl; tr.setAttribute('data-cs', '1'); tr.default = true;
          v.appendChild(tr);
          const show = () => {
            for (let i = 0; i < v.textTracks.length; i++)
              if (v.textTracks[i].kind === 'subtitles') v.textTracks[i].mode = 'showing';
          };
          tr.addEventListener('load', show, { once: true });
          setTimeout(show, 400);
        }
      })
      .catch(e => { if (e.name !== 'AbortError') console.error('[sub]', e); });
    return () => {
      ctrl.abort();
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
      document.querySelectorAll('track[data-cs]').forEach(t => t.remove());
    };
  }, [selectedSub?.url, selectedSub?.label, selectedSub?.language]);

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

  const dismiss = () => { setShowQuality(false); setShowSubMenu(false); };

  // ── Custom overlays (CSS classes → container queries in globals.css) ────────
  const overlays = (
    <>
      {/* Subtitle — .player-sub switches layout via @container(min-width:500px) */}
      {currentCue && (
        <div className="player-sub">
          <div className="player-sub-inner">
            {currentCue.text.split('\n').map((line, i) => (
              <span key={i} className="player-sub-line" style={{ fontSize }}>{line}</span>
            ))}
          </div>
        </div>
      )}

      {/* Back — .player-btn-back: top:3% left:2%, scales with container */}
      <button className="player-btn-back" onClick={e => { e.stopPropagation(); onBack(); }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      {/* Fullscreen toggle — .player-btn-fs positions on the right side */}
      <button className="player-btn-fs" onClick={e => { e.stopPropagation(); setIsLandscape(v => !v); }}>
        {isLandscape
          ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
          : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        }
      </button>

      {/* Controls cluster — .player-controls-cluster: top:3% right:2% */}
      <div className="player-controls-cluster" onClick={e => e.stopPropagation()}>

        {/* Quality */}
        {qualitySelectionEnabled && qualities.length > 1 && (
          <div style={{ position: 'relative' }}>
            <button className="player-ctrl-btn" onClick={() => { setShowQuality(v => !v); setShowSubMenu(false); }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/>
              </svg>
              {currentQuality}
            </button>
            {showQuality && (
              <div className="player-dropdown">
                {qualities.map(q => (
                  <button key={q.quality} className={q.url === currentSrc ? 'sel' : ''} onClick={() => handleQualityChange(q)}>
                    {q.quality}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CC */}
        {subtitles.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              className={`player-ctrl-btn ${selectedSub ? 'active' : ''}`}
              onClick={() => { setShowSubMenu(v => !v); setShowQuality(false); }}
            >CC</button>
            {showSubMenu && (
              <div className="player-dropdown">
                <button className={!selectedSub ? 'sel' : ''} onClick={() => { setSelectedSubUrl(null); setShowSubMenu(false); }}>Off</button>
                {subtitles.map(s => (
                  <button
                    key={s.language}
                    className={selectedSub?.language === s.language ? 'sel' : ''}
                    onClick={() => { setSelectedSubUrl(s.url); setShowSubMenu(false); }}
                  >{s.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aa — font size cycle */}
        <button className="player-ctrl-btn" onClick={() => setFontSize(s => s === 13 ? 17 : s === 17 ? 21 : 13)}>
          Aa
        </button>
      </div>
    </>
  );

  // ── Player element ─────────────────────────────────────────────────────────
  const playerEl = (
    <MediaPlayer
      ref={playerRef} key={currentSrc} title={title} src={currentSrc} playsInline
      {...(savedTime > 0 ? { currentTime: savedTime } : {})}
      style={{ flex: 1, minHeight: 0, width: '100%', height: '100%', position: 'relative' }}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
      {overlays}
    </MediaPlayer>
  );

  // ── LANDSCAPE: outer clips (fixed full-screen), inner rotates ──────────────
  // Inner div is sized PH × PW (landscape dims in CSS). After rotate(90deg) it fills screen.
  // @container queries on media-player inside see 852×393 (landscape) → apply landscape CSS.
  if (isLandscape) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, overflow: 'hidden' }}>
        <div
          onClick={dismiss}
          style={{
            position: 'absolute',
            width: PH, height: PW,        // landscape dims
            top: (PH - PW) / 2,           // center vertically
            left: (PW - PH) / 2,          // center horizontally
            transform: 'rotate(90deg)',
            transformOrigin: 'center center',
            display: 'flex', flexDirection: 'column',
            background: '#000',
            // After 90deg CW rotation, CSS left maps to the physical portrait top.
            paddingLeft: 'env(safe-area-inset-top)',
            paddingRight: 0,
          }}
        >
          {playerEl}
        </div>
      </div>
    );
  }

  // ── PORTRAIT ───────────────────────────────────────────────────────────────
  return (
    <div
      onClick={dismiss}
      style={{
        position: 'relative', width: '100%', height: '100dvh',
        background: '#000', overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 0,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {playerEl}
    </div>
  );
}
