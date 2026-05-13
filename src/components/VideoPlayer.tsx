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
      const start = parseTime(line.slice(0, ax));
      const end = parseTime(line.slice(ax + 3).trim().split(/\s+/)[0]);

      const textLines: string[] = [];
      i++;

      while (i < lines.length && lines[i].trim() !== '') {
        const clean = lines[i].replace(/<[^>]+>/g, '').trim();
        if (clean) textLines.push(clean);
        i++;
      }

      if (textLines.length && end > start) {
        cues.push({
          start,
          end,
          text: textLines.join('\n'),
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
  const playerRef = useRef<MediaPlayerInstance>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [currentSrc, setCurrentSrc] = useState(
    qualities[0]?.url ?? videoUrl
  );

  const [savedTime, setSavedTime] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);

  const defaultSub =
    subtitles.find(
      (s) =>
        s.language === 'si' ||
        s.language === 'sinhala'
    ) ??
    subtitles[0] ??
    null;

  const [selectedSubUrl, setSelectedSubUrl] =
    useState<string | null | undefined>(undefined);

  const [cueState, setCueState] = useState<CueState>({
    url: '',
    cues: [],
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [fontSize, setFontSize] = useState(17);

  const [screenShort, setScreenShort] = useState(667);
  const [screenLong, setScreenLong] = useState(390);

  useEffect(() => {
    const themeMeta =
      document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]'
      );

    const statusMeta =
      document.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      );

    const previousThemeColor = themeMeta?.content;
    const previousStatusBar = statusMeta?.content;

    document.documentElement.classList.add('video-player-active');
    document.body.classList.add('video-player-active');

    if (themeMeta) themeMeta.content = '#000000';
    if (statusMeta) statusMeta.content = 'black-translucent';

    return () => {
      document.documentElement.classList.remove('video-player-active');
      document.body.classList.remove('video-player-active');

      if (themeMeta && previousThemeColor) {
        themeMeta.content = previousThemeColor;
      }

      if (statusMeta && previousStatusBar) {
        statusMeta.content = previousStatusBar;
      }
    };
  }, []);

  useEffect(() => {
    const updateScreen = () => {
      setScreenShort(Math.min(screen.width, screen.height));
      setScreenLong(Math.max(screen.width, screen.height));
    };

    updateScreen();

    window.addEventListener('resize', updateScreen);
    window.addEventListener('orientationchange', updateScreen);

    return () => {
      window.removeEventListener('resize', updateScreen);
      window.removeEventListener('orientationchange', updateScreen);
    };
  }, []);

  const selectedSub =
    selectedSubUrl === null
      ? null
      : subtitles.find((s) => s.url === selectedSubUrl) ?? defaultSub;

  const cues =
    selectedSub?.url === cueState.url ? cueState.cues : [];

  const currentCue = cues.find(
    (c) =>
      currentTime >= c.start &&
      currentTime <= c.end
  );

  const currentQuality =
    qualities.find((q) => q.url === currentSrc)?.quality ?? 'Auto';

  useEffect(() => {
    const ctrl = new AbortController();

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    document
      .querySelectorAll('track[data-cs]')
      .forEach((t) => t.remove());

    if (!selectedSub?.url) {
      const id = window.setTimeout(() => {
        setCueState({
          url: '',
          cues: [],
        });
      }, 0);

      return () => window.clearTimeout(id);
    }

    fetch(selectedSub.url, {
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        setCueState({
          url: selectedSub.url,
          cues: parseSubs(text),
        });

        const vtt = text.trimStart().startsWith('WEBVTT')
          ? text
          : `WEBVTT\n\n${text}`;

        const blobUrl = URL.createObjectURL(
          new Blob([vtt], {
            type: 'text/vtt',
          })
        );

        blobUrlRef.current = blobUrl;

        const video = document.querySelector('video');

        if (video) {
          const track = document.createElement('track');

          track.kind = 'subtitles';
          track.label = selectedSub.label;
          track.srclang = selectedSub.language;
          track.src = blobUrl;
          track.default = true;
          track.setAttribute('data-cs', '1');

          video.appendChild(track);

          const showTrack = () => {
            for (let i = 0; i < video.textTracks.length; i++) {
              if (video.textTracks[i].kind === 'subtitles') {
                video.textTracks[i].mode = 'showing';
              }
            }
          };

          track.addEventListener('load', showTrack, {
            once: true,
          });

          setTimeout(showTrack, 400);
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          console.error('[subtitle]', e);
        }
      });

    return () => {
      ctrl.abort();

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      document
        .querySelectorAll('track[data-cs]')
        .forEach((t) => t.remove());
    };
  }, [
    selectedSub?.url,
    selectedSub?.label,
    selectedSub?.language,
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.currentTime);
      }
    }, 250);

    return () => clearInterval(id);
  }, []);

  const handleQualityChange = (q: VideoQuality) => {
    setSavedTime(playerRef.current?.currentTime ?? 0);
    setCurrentSrc(q.url);
    setShowQuality(false);
  };

  const dismissMenus = () => {
    setShowQuality(false);
    setShowSubMenu(false);
  };

  const toggleLandscape = async () => {
    dismissMenus();

    setIsLandscape((value) => !value);

    try {
      if (!isLandscape) {
        await (screen.orientation as any).lock?.('landscape');
      } else {
        await (screen.orientation as any).lock?.('portrait-primary');
      }
    } catch {}
  };

  const overlays = (
    <>
      {currentCue && (
        <div className="player-sub">
          <div className="player-sub-inner">
            {currentCue.text.split('\n').map((line, index) => (
              <span
                key={index}
                className="player-sub-line"
                style={{
                  fontSize,
                }}
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        className="player-btn-back"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
        aria-label="Back"
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>

      <button
        className="player-btn-fs"
        onClick={(e) => {
          e.stopPropagation();
          toggleLandscape();
        }}
        aria-label="Fullscreen"
      >
        {isLandscape ? (
          <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
          </svg>
        ) : (
          <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        )}
      </button>

      <div
        className="player-controls-cluster"
        onClick={(e) => e.stopPropagation()}
      >
        {qualitySelectionEnabled && qualities.length > 1 && (
          <div className="player-menu-wrap">
            <button
              className="player-ctrl-btn"
              onClick={() => {
                setShowQuality((value) => !value);
                setShowSubMenu(false);
              }}
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"
                  strokeLinecap="round"
                />
              </svg>
              {currentQuality}
            </button>

            {showQuality && (
              <div className="player-dropdown">
                {qualities.map((q) => (
                  <button
                    key={q.quality}
                    className={
                      q.url === currentSrc ? 'sel' : ''
                    }
                    onClick={() => handleQualityChange(q)}
                  >
                    {q.quality}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {subtitles.length > 0 && (
          <div className="player-menu-wrap">
            <button
              className={`player-ctrl-btn player-ctrl-btn-text ${
                selectedSub ? 'active' : ''
              }`}
              onClick={() => {
                setShowSubMenu((value) => !value);
                setShowQuality(false);
              }}
            >
              CC
            </button>

            {showSubMenu && (
              <div className="player-dropdown">
                <button
                  className={!selectedSub ? 'sel' : ''}
                  onClick={() => {
                    setSelectedSubUrl(null);
                    setShowSubMenu(false);
                  }}
                >
                  Off
                </button>

                {subtitles.map((s) => (
                  <button
                    key={s.language}
                    className={
                      selectedSub?.language === s.language
                        ? 'sel'
                        : ''
                    }
                    onClick={() => {
                      setSelectedSubUrl(s.url);
                      setShowSubMenu(false);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          className="player-ctrl-btn player-ctrl-btn-text"
          onClick={() =>
            setFontSize((size) =>
              size === 13 ? 17 : size === 17 ? 21 : 13
            )
          }
        >
          Aa
        </button>
      </div>
    </>
  );

  const playerEl = (
    <MediaPlayer
      ref={playerRef}
      key={currentSrc}
      title={title}
      src={currentSrc}
      playsInline
      className="kdrama-media-player"
      {...(savedTime > 0
        ? {
            currentTime: savedTime,
          }
        : {})}
    >
      <MediaProvider />

      <DefaultVideoLayout icons={defaultLayoutIcons} />

      {overlays}
    </MediaPlayer>
  );

  if (isLandscape) {
    return (
      <div
        className="ios-player-landscape-root"
        onClick={dismissMenus}
      >
        <div
          className="ios-player-landscape-stage"
          style={{
            width: screenLong,
            height: screenShort,
            top: (screenLong - screenShort) / 2,
            left: (screenShort - screenLong) / 2,
          }}
        >
          {playerEl}
        </div>
      </div>
    );
  }

  return (
    <div
      className="ios-player-portrait-root"
      onClick={dismissMenus}
    >
      {playerEl}
    </div>
  );
}