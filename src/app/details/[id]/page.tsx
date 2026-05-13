'use client';
// src/app/details/[id]/page.tsx

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMediaContext } from '@/context/MediaContext';
import { useLocalUser } from '@/hooks/useLocalUser';
import { Episode, VideoQuality } from '@/lib/types';
import { fetchEpisodes } from '@/lib/mediaService';
import { buildDownloadUrl } from '@/lib/proxyUrl';
import { proxyVideoUrl, proxySubtitleUrl } from '@/lib/proxyUrl';

function DetailsSkeletonContent() {
  return (
    <div style={{ paddingTop: 0 }}>
      <div className="skeleton" style={{ height: 300, borderRadius: 0 }} />
      <div style={{ padding: '16px' }}>
        <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, width: '50%', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div className="skeleton" style={{ flex: 1, height: 50, borderRadius: 12 }} />
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ width: 50, height: 50, borderRadius: 12 }} />)}
        </div>
        {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 12 }} />)}
      </div>
    </div>
  );
}

// Quality picker bottom sheet
function QualityPicker({ qualities, onSelect, onClose }: { qualities: VideoQuality[]; onSelect: (q: VideoQuality) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '12px 0 calc(var(--nav-height) + 8px)',
        animation: 'slideUp 0.25s ease-out',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
        <p style={{ padding: '0 20px 12px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Select Quality</p>
        {qualities.map((q) => (
          <button key={q.quality} onClick={() => onSelect(q)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            width: '100%', padding: '14px 20px', textAlign: 'left',
            color: 'var(--text)', fontSize: 16,
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--primary)',
            }}>{q.quality}</span>
            Download {q.quality}
          </button>
        ))}
        <button onClick={onClose} style={{ display: 'block', width: '100%', padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 15 }}>Cancel</button>
      </div>
    </>
  );
}

function downloadQualities(ep: Episode, fallbackQualities: VideoQuality[] = []): VideoQuality[] {
  const qualities = ep.qualities.length > 0 ? ep.qualities : fallbackQualities;
  if (qualities.length > 0) return qualities;
  if (!ep.videoFileId) return [];
  return [{ quality: 'offline', url: ep.videoUrl, fileId: ep.videoFileId }];
}

// ── IndexedDB helpers (same schema as downloads/page.tsx) ─────────────────
const DB_NAME = 'kdramasl_downloads';
const DB_VERSION = 1;
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function saveDownload(id: string, meta: object, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(['meta', 'blobs'], 'readwrite');
    tx.objectStore('meta').put({ id, ...meta, downloadedAt: new Date().toISOString() });
    tx.objectStore('blobs').put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export default function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getById } = useMediaContext();
  const { isFavorite, isInWatchlist, addFavorite, removeFavorite, addWatchlist, removeWatchlist } = useLocalUser();

  const media = getById(id);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [qualityEpisode, setQualityEpisode] = useState<Episode | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  useEffect(() => {
    if (!media || media.type !== 'drama') return;
    setEpisodesLoading(true);
    fetchEpisodes(id).then((eps) => { setEpisodes(eps); setEpisodesLoading(false); });
  }, [id, media]);

  if (!media) return <DetailsSkeletonContent />;

  const isMovie = media.type === 'movie';
  const favorite = isFavorite(id);
  const inWatchlist = isInWatchlist(id);
  const displayEpisodes = isMovie
    ? [{
        id: media.id, episodeNumber: 1, title: media.title, titleSinhala: media.titleSinhala,
        thumbnail: media.thumbnail, thumbnailFilename: media.thumbnailFilename,
        duration: media.duration ?? 0, videoUrl: media.videoUrl ?? '',
        videoFileId: media.videoFileId, qualities: media.qualities ?? [],
        subtitles: media.subtitles ?? [], released: String(media.year),
      }]
    : episodes;

  const handlePlay = (ep: Episode) => {
    const url = new URL('/player', window.location.origin);
    url.searchParams.set('mediaId', id);
    if (!isMovie) url.searchParams.set('episodeId', ep.id);
    router.push(url.pathname + url.search);
  };

  const handleDownload = async (ep: Episode, quality: VideoQuality) => {
    if (!quality.fileId) { showToast('Download URL not available'); return; }
    const name = isMovie ? media.title : `${media.title} - EP${ep.episodeNumber}`;
    setQualityEpisode(null);
    showToast(`Starting download: ${name} (${quality.quality})…`);
    try {
      // ── Use SAME proxy URL as streaming ──────────────────────────────────
      // /api/proxy/video → 302 → CDN URL (Cloudflare CORS rule applies)
      // Browser fetches CDN directly — no server-side Vercel→Cloudflare 403
      const videoRes = await fetch(proxyVideoUrl(quality.fileId));
      if (!videoRes.ok) { showToast(`Download failed (${videoRes.status})`); return; }
      const videoBlob = await videoRes.blob();

      // ── Build ZIP client-side with JSZip ─────────────────────────────────
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const ext = quality.fileId.split('.').pop()?.toLowerCase() ?? 'mp4';
      zip.file(`video.${ext}`, videoBlob);

      // Subtitles
      for (const sub of ep.subtitles) {
        if (!sub.fileId) continue;
        try {
          const subRes = await fetch(proxySubtitleUrl(sub.fileId));
          if (!subRes.ok) continue;
          const langMatch = sub.fileId.match(/([a-z]{2,3})\.(vtt|srt|ass)$/i);
          const lang = langMatch ? langMatch[1] : sub.language ?? 'sub';
          const subExt = sub.fileId.split('.').pop() ?? 'vtt';
          zip.file(`subtitles/${lang}.${subExt}`, await subRes.blob());
        } catch { /* skip failed subtitle */ }
      }

      showToast(`Packaging ${name}…`);
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });

      // ── Save to IndexedDB for offline playback ───────────────────────────
      await saveDownload(ep.id, {
        title: name,
        thumbnail: ep.thumbnail,
        mediaId: media.id,
        episodeId: isMovie ? undefined : ep.id,
      }, zipBlob);

      // ── Trigger device download ──────────────────────────────────────────
      const objUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = objUrl; a.download = `${name}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 30_000);
      showToast(`✓ ${name} saved to Downloads`);
    } catch (err) {
      console.error('[Details] download error', err);
      showToast('Download failed: network error');
    }
  };

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Banner */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
        <img src={media.banner} alt={media.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, var(--bg) 100%)' }} />
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: 16,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4, lineHeight: 1.2 }}>{media.title}</h1>
        {media.titleSinhala && <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 12 }}>{media.titleSinhala}</p>}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ color: '#FFD700', fontWeight: 700, fontSize: 14 }}>⭐ {media.rating.toFixed(1)}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{media.year}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{isMovie ? 'Movie' : `${media.totalEpisodes ?? '?'} Episodes`}</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {/* Trailer */}
          {media.trailerUrl && (
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: 50 }}
              onClick={() => {
                const ytId = media.trailerUrl?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
                if (ytId) window.open(`https://www.youtube.com/watch?v=${ytId}`, '_blank');
              }}
            >
              ▶ Trailer
            </button>
          )}

          {/* Favorite */}
          <button
            className="btn-icon"
            onClick={() => { favorite ? removeFavorite(id) : addFavorite(id); showToast(favorite ? 'Removed from Favorites' : 'Added to Favorites'); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', color: favorite ? '#FF6B6B' : 'var(--text)' }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>

          {/* Watchlist */}
          <button
            className="btn-icon"
            onClick={() => { inWatchlist ? removeWatchlist(id) : addWatchlist(id); showToast(inWatchlist ? 'Removed from Watchlist' : 'Added to Watchlist'); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', color: inWatchlist ? 'var(--primary)' : 'var(--text)' }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Share */}
          <button
            className="btn-icon"
            onClick={() => navigator.share?.({ title: media.title, url: window.location.href })}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>

        {/* Genres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {media.genres.map((g) => <span key={g} className="genre-badge">{g}</span>)}
        </div>

        {/* Synopsis */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Synopsis</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{media.description}</p>
        {media.descriptionSinhala && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{media.descriptionSinhala}</p>
        )}

        {/* Episodes / Watch */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          {isMovie ? 'Watch' : 'Episodes'}
        </h2>

        {episodesLoading ? (
          [0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 12 }} />)
        ) : (
          displayEpisodes.map((ep) => (
            <div key={ep.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-card)', borderRadius: 12,
              padding: '10px 12px', marginBottom: 10,
              border: '1px solid var(--border)',
            }}>
              <img src={ep.thumbnail} alt={ep.title} style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }} className="line-clamp-1">
                  {isMovie ? ep.title : `Episode ${ep.episodeNumber}`}
                </div>
                {ep.titleSinhala && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }} className="line-clamp-1">{ep.titleSinhala}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {ep.duration ? `${Math.floor(ep.duration / 60)} min` : ''}
                </div>
              </div>

              {/* Play button */}
              <button onClick={() => handlePlay(ep)} style={{ padding: 8, color: 'var(--primary)', flexShrink: 0 }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
                </svg>
              </button>

              {/* Download button */}
              {(ep.qualities.length > 0 || ep.videoFileId) && (
                <button onClick={() => setQualityEpisode(ep)} style={{ padding: 8, color: 'var(--primary)', flexShrink: 0 }}>
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
                    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
        <div style={{ height: 16 }} />
      </div>

      {/* Quality picker sheet */}
      {qualityEpisode && (
        <QualityPicker
          qualities={downloadQualities(qualityEpisode, media.qualities ?? [])}
          onSelect={(q) => handleDownload(qualityEpisode, q)}
          onClose={() => setQualityEpisode(null)}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
