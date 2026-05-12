'use client';

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

function parseTime(t: string): number {
  const n = t.trim().replace(',', '.');
  const p = n.split(':').map(Number);

  return p.length === 3
    ? p[0] * 3600 + p[1] * 60 + p[2]
    : p.length === 2
    ? p[0] * 60 + p[1]
    : 0;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

interface CueState {
  url: string;
  cues: Cue[];
}

function parseSubs(raw: string): Cue[] {
  const cues: Cue[] = [];

  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.includes('-->')) {
      const ax = line.indexOf('-->');

      const start = parseTime(
        line.slice(0, ax)
      );

      const end = parseTime(
        line
          .slice(ax + 3)
          .trim()
          .split(/\s+/)[0]
      );

      const tl: string[] = [];

      i++;

      while (
        i < lines.length &&
        lines[i].trim() !== ''
      ) {
        const c = lines[i]
          .replace(/<[^>]+>/g, '')
          .trim();

        if (c) tl.push(c);

        i++;
      }

      if (tl.length && end > start) {
        cues.push({
          start,
          end,
          text: tl.join('\n'),
        });
      }
    }

    i++;
  }

  return cues;
}

export default function VideoPlayer({
  videoUrl,
  qualities,
  subtitles,
  title,
  onBack,
  qualitySelectionEnabled = true,
}: Props) {

  const playerRef =
    useRef<MediaPlayerInstance>(null);

  const blobUrlRef =
    useRef<string | null>(null);

  const [currentSrc, setCurrentSrc] =
    useState(
      qualities[0]?.url ?? videoUrl
    );

  const [savedTime, setSavedTime] =
    useState(0);

  const [isLandscape, setIsLandscape] =
    useState(false);

  const [showQuality, setShowQuality] =
    useState(false);

  const [showSubMenu, setShowSubMenu] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [fontSize, setFontSize] =
    useState(18);

  // REAL RESPONSIVE SIZE
  const [screenSize, setScreenSize] =
    useState({
      width: 375,
      height: 667,
    });

  useEffect(() => {

    const update = () => {

      const vw =
        window.visualViewport;

      const width =
        vw?.width || window.innerWidth;

      const height =
        vw?.height || window.innerHeight;

      setScreenSize({
        width,
        height,
      });

      setIsLandscape(width > height);
    };

    update();

    window.addEventListener(
      'resize',
      update
    );

    window.addEventListener(
      'orientationchange',
      update
    );

    return () => {
      window.removeEventListener(
        'resize',
        update
      );

      window.removeEventListener(
        'orientationchange',
        update
      );
    };

  }, []);

  const defaultSub =
    subtitles.find(
      s =>
        s.language === 'si' ||
        s.language === 'sinhala'
    ) ?? subtitles[0] ?? null;

  const [selectedSubUrl, setSelectedSubUrl] =
    useState<string | null | undefined>(
      undefined
    );

  const [cueState, setCueState] =
    useState<CueState>({
      url: '',
      cues: [],
    });

  const selectedSub =
    selectedSubUrl === null
      ? null
      : subtitles.find(
          s => s.url === selectedSubUrl
        ) ?? defaultSub;

  const cues =
    selectedSub?.url === cueState.url
      ? cueState.cues
      : [];

  const currentCue = cues.find(
    c =>
      currentTime >= c.start &&
      currentTime <= c.end
  );

  const currentQuality =
    qualities.find(
      q => q.url === currentSrc
    )?.quality ?? 'Auto';

  // RESPONSIVE SUBTITLE SIZE
  const responsiveSubtitleSize =
    Math.max(
      13,
      Math.min(
        28,
        screenSize.width * 0.045
      )
    ) + (fontSize - 18);

  useEffect(() => {

    const ctrl = new AbortController();

    if (blobUrlRef.current) {
      URL.revokeObjectURL(
        blobUrlRef.current
      );

      blobUrlRef.current = null;
    }

    document
      .querySelectorAll('track[data-cs]')
      .forEach(t => t.remove());

    if (!selectedSub?.url) {
      setCueState({
        url: '',
        cues: [],
      });

      return;
    }

    fetch(selectedSub.url, {
      signal: ctrl.signal,
    })
      .then(r => {
        if (!r.ok)
          throw new Error(
            `HTTP ${r.status}`
          );

        return r.text();
      })
      .then(text => {

        setCueState({
          url: selectedSub.url,
          cues: parseSubs(text),
        });

        const vtt =
          text
            .trimStart()
            .startsWith('WEBVTT')
            ? text
            : `WEBVTT\n\n${text}`;

        const blobUrl =
          URL.createObjectURL(
            new Blob([vtt], {
              type: 'text/vtt',
            })
          );

        blobUrlRef.current = blobUrl;

        const v =
          document.querySelector('video');

        if (v) {

          const tr =
            document.createElement('track');

          tr.kind = 'subtitles';
          tr.label = selectedSub.label;
          tr.srclang = selectedSub.language;
          tr.src = blobUrl;
          tr.default = true;

          tr.setAttribute(
            'data-cs',
            '1'
          );

          v.appendChild(tr);

          const show = () => {
            for (
              let i = 0;
              i < v.textTracks.length;
              i++
            ) {
              if (
                v.textTracks[i].kind ===
                'subtitles'
              ) {
                v.textTracks[i].mode =
                  'showing';
              }
            }
          };

          tr.addEventListener(
            'load',
            show,
            { once: true }
          );

          setTimeout(show, 400);
        }
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
      });

    return () => {

      ctrl.abort();

      if (blobUrlRef.current) {
        URL.revokeObjectURL(
          blobUrlRef.current
        );
      }

      document
        .querySelectorAll('track[data-cs]')
        .forEach(t => t.remove());
    };

  }, [selectedSub?.url]);

  useEffect(() => {

    const id = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(
          playerRef.current.currentTime
        );
      }
    }, 250);

    return () => clearInterval(id);

  }, []);

  const handleQualityChange = (
    q: VideoQuality
  ) => {

    setSavedTime(
      playerRef.current?.currentTime ?? 0
    );

    setCurrentSrc(q.url);
    setShowQuality(false);
  };

  const btn: React.CSSProperties = {
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
  };

  const overlays = (
    <>
      {/* SUBTITLES */}
      {currentCue && (
        <div
          style={
            isLandscape
              ? {
                  position: 'absolute',
                  left: '50%',
                  bottom: Math.max(
                    30,
                    screenSize.height * 0.08
                  ),
                  transform:
                    'translateX(-50%)',
                  width: '92%',
                  zIndex: 9999,
                  pointerEvents: 'none',
                  textAlign: 'center',
                }
              : {
                  position: 'absolute',
                  left: '50%',
                  bottom: Math.max(
                    70,
                    screenSize.height * 0.09
                  ),
                  transform:
                    'translateX(-50%)',
                  width: '92%',
                  zIndex: 9999,
                  pointerEvents: 'none',
                  textAlign: 'center',
                }
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {currentCue.text
              .split('\n')
              .map((line, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    background:
                      'rgba(0,0,0,0.82)',
                    color: '#fff',
                    fontSize:
                      responsiveSubtitleSize,
                    fontWeight: 500,
                    padding: '4px 12px',
                    borderRadius: 6,
                    lineHeight: 1.45,
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  {line}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* BACK BUTTON */}
      <button
        onClick={e => {
          e.stopPropagation();
          onBack();
        }}
        style={{
          ...btn,
          position: 'absolute',
          top: `calc(env(safe-area-inset-top) + 10px)`,
          left: 12,
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
        }}
      >
        ←
      </button>

      {/* FULLSCREEN */}
      <button
        onClick={e => {
          e.stopPropagation();
          setIsLandscape(v => !v);
        }}
        style={{
          ...btn,
          position: 'absolute',
          bottom: `calc(env(safe-area-inset-bottom) + 12px)`,
          left: 12,
          width: 34,
          height: 34,
          zIndex: 99999,
        }}
      >
        ⛶
      </button>

      {/* TOP RIGHT CONTROLS */}
      <div
        style={{
          position: 'absolute',
          top: `calc(env(safe-area-inset-top) + 10px)`,
          right: 12,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >

        {/* QUALITY */}
        {qualitySelectionEnabled &&
          qualities.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowQuality(v => !v);
                  setShowSubMenu(false);
                }}
                style={{
                  ...btn,
                  height: 30,
                  padding: '0 10px',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {currentQuality}
              </button>

              {showQuality && (
                <div
                  style={{
                    position: 'absolute',
                    top: 36,
                    right: 0,
                    background:
                      'rgba(10,14,39,0.96)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    minWidth: 100,
                  }}
                >
                  {qualities.map(q => (
                    <button
                      key={q.quality}
                      onClick={() =>
                        handleQualityChange(q)
                      }
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '9px 14px',
                        textAlign: 'left',
                        fontSize: 13,
                        color:
                          q.url === currentSrc
                            ? '#00D9FF'
                            : '#fff',
                        background: 'none',
                        border: 'none',
                      }}
                    >
                      {q.quality}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* SUBTITLES */}
        {subtitles.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowSubMenu(v => !v);
                setShowQuality(false);
              }}
              style={{
                ...btn,
                height: 30,
                padding: '0 10px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              CC
            </button>

            {showSubMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 36,
                  right: 0,
                  background:
                    'rgba(10,14,39,0.96)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  minWidth: 130,
                }}
              >
                <button
                  onClick={() => {
                    setSelectedSubUrl(null);
                    setShowSubMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '9px 14px',
                    textAlign: 'left',
                    fontSize: 13,
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                  }}
                >
                  Off
                </button>

                {subtitles.map(s => (
                  <button
                    key={s.language}
                    onClick={() => {
                      setSelectedSubUrl(s.url);
                      setShowSubMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '9px 14px',
                      textAlign: 'left',
                      fontSize: 13,
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FONT SIZE */}
        <button
          onClick={() =>
            setFontSize(s =>
              s === 14
                ? 18
                : s === 18
                ? 24
                : 14
            )
          }
          style={{
            ...btn,
            height: 30,
            padding: '0 10px',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          Aa
        </button>
      </div>
    </>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
        zIndex: 9999,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom:
          'env(safe-area-inset-bottom)',
        paddingLeft:
          'env(safe-area-inset-left)',
        paddingRight:
          'env(safe-area-inset-right)',
      }}
      onClick={() => {
        setShowQuality(false);
        setShowSubMenu(false);
      }}
    >
      <MediaPlayer
        ref={playerRef}
        key={currentSrc}
        title={title}
        src={currentSrc}
        playsInline
        autoPlay
        muted
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#000',
        }}
        {...(savedTime > 0
          ? {
              currentTime: savedTime,
            }
          : {})}
      >
        <MediaProvider />

        <DefaultVideoLayout
          icons={defaultLayoutIcons}
        />

        {overlays}
      </MediaPlayer>
    </div>
  );
}