'use client';
// src/app/details/[id]/page.tsx

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMediaContext } from '@/context/MediaContext';
import { useLocalUser } from '@/hooks/useLocalUser';
import { Episode } from '@/lib/types';
import { fetchEpisodes } from '@/lib/mediaService';
import { loadMonetagVignetteAd, removeMonetagVignetteAd } from '@/lib/monetagAds';

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

export default function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getById } = useMediaContext();
  const { isFavorite, isInWatchlist, addFavorite, removeFavorite, addWatchlist, removeWatchlist } = useLocalUser();

  const media = getById(id);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null);
  const episodeCacheVersion = media?.totalEpisodes ?? null;
  const mediaType = media?.type;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  useEffect(() => {
    loadMonetagVignetteAd();
    return removeMonetagVignetteAd;
  }, [id]);

  useEffect(() => {
    if (mediaType !== 'drama') return;
    setEpisodesLoading(true);
    fetchEpisodes(id, { cacheVersion: episodeCacheVersion })
      .then((eps) => { setEpisodes(eps); setEpisodesLoading(false); })
      .catch(() => setEpisodesLoading(false));
  }, [id, mediaType, episodeCacheVersion]);

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
    window.location.assign(url.pathname + url.search);
  };

  const handlePendingDownload = (ep: Episode) => {
    setPendingDownloadId(ep.id);
    showToast('Download feature coming soon');
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
                <button
                  onClick={() => handlePendingDownload(ep)}
                  aria-pressed={pendingDownloadId === ep.id}
                  style={{
                    padding: 8,
                    color: pendingDownloadId === ep.id ? '#FFD700' : 'var(--primary)',
                    flexShrink: 0,
                  }}
                >
                  {pendingDownloadId === ep.id
                    ? (
                      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )
                    : (
                      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
                        <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
                      </svg>
                    )
                  }
                </button>
              )}
            </div>
          ))
        )}
        <div style={{ height: 16 }} />
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
      {pendingDownloadId && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 'calc(var(--bottom-nav-height) + 16px)',
            zIndex: 10002,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,215,0,0.12)',
            color: '#FFD700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700 }}>Downloads coming soon</div>
            <div className="line-clamp-1" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Offline saving is not available yet.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
