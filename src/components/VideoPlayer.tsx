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

export default function VideoPlayer({ videoUrl, qualities, subtitles, title, onBack, qualitySelectionEnabled = true }: Props) {
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
  // Physical screen size (like Android Dimensions.get('window') — includes status bar)
  const [PW, setPW] = useState(375); // portrait width  (shorter side)
  const [PH, setPH] = useState(667); // portrait height (longer side)
  useEffect(() => {
    const upd = () => { setPW(Math.min(screen.width, screen.height)); setPH(Math.max(screen.width, screen.height)); };
    upd(); window.addEventListener('resize', upd); return () => window.removeEventListener('resize', upd);
  }, []);

  const selectedSub = selectedSubUrl === null ? null : subtitles.find(s=>s.url===selectedSubUrl) ?? defaultSub;
  const cues = selectedSub?.url === cueState.url ? cueState.cues : [];
  const currentCue = cues.find(c => currentTime >= c.start && currentTime <= c.end);
  const currentQuality = qualities.find(q=>q.url===currentSrc)?.quality ?? 'Auto';

  useEffect(() => {
    const ctrl = new AbortController();
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current=null; }
    document.querySelectorAll('track[data-cs]').forEach(t=>t.remove());
    if (!selectedSub?.url) { setCueState({ url:'', cues:[] }); return; }
    fetch(selectedSub.url, { signal: ctrl.signal })
      .then(r => { if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(text => {
        setCueState({ url: selectedSub.url, cues: parseSubs(text) });
        const vtt = text.trimStart().startsWith('WEBVTT') ? text : `WEBVTT\n\n${text}`;
        const blobUrl = URL.createObjectURL(new Blob([vtt], { type:'text/vtt' }));
        blobUrlRef.current = blobUrl;
        const v = document.querySelector('video');
        if (v) {
          const tr = document.createElement('track');
          tr.kind='subtitles'; tr.label=selectedSub.label; tr.srclang=selectedSub.language;
          tr.src=blobUrl; tr.setAttribute('data-cs','1'); tr.default=true;
          v.appendChild(tr);
          const show = () => { for(let i=0;i<v.textTracks.length;i++) if(v.textTracks[i].kind==='subtitles') v.textTracks[i].mode='showing'; };
          tr.addEventListener('load', show, { once:true }); setTimeout(show, 400);
        }
      })
      .catch(e => { if(e.name!=='AbortError') console.error('[sub]',e); });
    return () => {
      ctrl.abort();
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current=null; }
      document.querySelectorAll('track[data-cs]').forEach(t=>t.remove());
    };
  }, [selectedSub?.url]);

  useEffect(() => {
    const id = setInterval(() => { if(playerRef.current) setCurrentTime(playerRef.current.currentTime); }, 250);
    return () => clearInterval(id);
  }, []);

  const handleQualityChange = (q: VideoQuality) => { setSavedTime(playerRef.current?.currentTime ?? 0); setCurrentSrc(q.url); setShowQuality(false); };

  const btn: React.CSSProperties = { background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'none', color:'#fff', borderRadius:8, cursor:'pointer' };

  // ── Shared overlay layer ────────────────────────────────────────────────────
  const overlays = (
    <>
      {/* Subtitle
          Landscape (90°CW rotation) coordinate mapping:
          CSS flexDirection=row → along user's vertical axis
          justifyContent=flex-end → pushes to CSS right → user's BOTTOM  ✅
          alignItems=center      → CSS vert center   → user's HORIZONTAL CENTER ✅ */}
      {currentCue && (
        <div style={isLandscape ? {
          position:'absolute', inset:0,
          display:'flex', flexDirection:'row',
          justifyContent:'flex-end',   // CSS right → user's visual bottom
          alignItems:'center',         // CSS vert center → user's horizontal center
          paddingRight: 58,            // gap from Vidstack seek bar (user's visual bottom)
          zIndex:9990, pointerEvents:'none',
        } : {
          position:'absolute', bottom:72, left:16, right:16,
          textAlign:'center', zIndex:9990, pointerEvents:'none',
        }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            {currentCue.text.split('\n').map((line, i) => (
              <span key={i} style={{ display:'block', background:'rgba(0,0,0,0.84)', color:'#fff', fontSize, fontWeight:500, padding:'3px 10px', borderRadius:4, lineHeight:1.5 }}>{line}</span>
            ))}
          </div>
        </div>
      )}

      {/* Back */}
      <button onClick={e=>{e.stopPropagation();onBack();}}
        style={{...btn, position:'absolute', top:10, left:12, width:38, height:38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>

      {/* Fullscreen toggle — bottom-left */}
      <button onClick={e=>{e.stopPropagation();setIsLandscape(v=>!v);}}
        style={{...btn, position:'absolute', bottom:10, left:12, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
        {isLandscape
          ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
          : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        }
      </button>

      {/* TOP-RIGHT cluster: Quality | CC | Aa  (all in one row, right-aligned) */}
      <div style={{ position:'absolute', top:10, right:12, zIndex:9999, display:'flex', alignItems:'center', gap:6 }} onClick={e=>e.stopPropagation()}>

        {/* Quality */}
        {qualitySelectionEnabled && qualities.length > 1 && (
          <div style={{ position:'relative' }}>
            <button onClick={()=>{setShowQuality(v=>!v);setShowSubMenu(false);}}
              style={{...btn, height:30, padding:'0 10px', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4}}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/></svg>
              {currentQuality}
            </button>
            {showQuality && (
              <div style={{ position:'absolute', top:36, right:0, background:'rgba(10,14,39,0.97)', borderRadius:12, overflow:'hidden', minWidth:100, zIndex:100 }}>
                {qualities.map(q=>(
                  <button key={q.quality} onClick={()=>handleQualityChange(q)}
                    style={{ display:'block', width:'100%', padding:'9px 14px', textAlign:'left', fontSize:13, color:q.url===currentSrc?'#00D9FF':'#fff', fontWeight:q.url===currentSrc?700:400, background:'none', border:'none', cursor:'pointer' }}>{q.quality}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CC */}
        {subtitles.length > 0 && (
          <div style={{ position:'relative' }}>
            <button onClick={()=>{setShowSubMenu(v=>!v);setShowQuality(false);}}
              style={{...btn, height:30, padding:'0 10px', fontSize:11, fontWeight:700, color:selectedSub?'#00D9FF':'#fff', background:selectedSub?'rgba(0,217,255,0.22)':'rgba(0,0,0,0.6)'}}>CC</button>
            {showSubMenu && (
              <div style={{ position:'absolute', top:36, right:0, background:'rgba(10,14,39,0.97)', borderRadius:12, overflow:'hidden', minWidth:130, zIndex:100 }}>
                <button onClick={()=>{setSelectedSubUrl(null);setShowSubMenu(false);}}
                  style={{ display:'block', width:'100%', padding:'9px 14px', textAlign:'left', fontSize:13, color:!selectedSub?'#00D9FF':'#fff', fontWeight:!selectedSub?700:400, background:'none', border:'none', cursor:'pointer' }}>Off</button>
                {subtitles.map(s=>(
                  <button key={s.language} onClick={()=>{setSelectedSubUrl(s.url);setShowSubMenu(false);}}
                    style={{ display:'block', width:'100%', padding:'9px 14px', textAlign:'left', fontSize:13, color:selectedSub?.language===s.language?'#00D9FF':'#fff', fontWeight:selectedSub?.language===s.language?700:400, background:'none', border:'none', cursor:'pointer' }}>{s.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aa — always visible next to CC */}
        <button onClick={()=>setFontSize(s=>s===13?17:s===17?21:13)}
          style={{...btn, height:30, padding:'0 10px', fontSize:11, fontWeight:700}}>Aa</button>
      </div>
    </>
  );

  // ── Player ─────────────────────────────────────────────────────────────────
  const playerEl = (
    <MediaPlayer ref={playerRef} key={currentSrc} title={title} src={currentSrc} playsInline
      {...(savedTime > 0 ? { currentTime: savedTime } : {})}
      style={{ flex:1, minHeight:0, width:'100%', height:'100%', position:'relative' }}>
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
      {overlays}
    </MediaPlayer>
  );

  // ── LANDSCAPE: outer clips, inner rotates ──────────────────────────────────
  if (isLandscape) {
    return (
      // Outer: fixed, covers entire screen, clips overflow
      <div style={{ position:'fixed', inset:0, background:'#000', zIndex:9999, overflow:'hidden' }}>
        {/* Inner: sized H×W (landscape dims), rotated 90°CW to fill portrait screen */}
        <div
          style={{
            position:'absolute',
            width: PH, height: PW,             // landscape width=screen H, height=screen W
            top: (PH - PW) / 2,               // centered vertically
            left: (PW - PH) / 2,              // centered horizontally (negative)
            transform: 'rotate(90deg)',
            transformOrigin: 'center center',
            display:'flex', flexDirection:'column',
            background:'#000',
            // Safe area: in landscape CSS rotation, top of inner div → user's right edge (no notch there)
            // paddingTop not needed here; status bar is above the fixed outer container
          }}
          onClick={()=>{setShowQuality(false);setShowSubMenu(false);}}
        >
          {playerEl}
        </div>
      </div>
    );
  }

  // ── PORTRAIT ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position:'relative', width:'100%', height:'100dvh',
      background:'#000', overflow:'hidden',
      paddingTop:'env(safe-area-inset-top)',
      paddingBottom:'env(safe-area-inset-bottom)',
      display:'flex', flexDirection:'column',
    }} onClick={()=>{setShowQuality(false);setShowSubMenu(false);}}>
      {playerEl}
    </div>
  );
}
