'use client';
// src/app/player/page.tsx

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useMediaContext } from '@/context/MediaContext';
import { Episode, VideoQuality, Subtitle } from '@/lib/types';
import VideoPlayer from '@/components/VideoPlayer';
import { fetchEpisodes } from '@/lib/mediaService';

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getById } = useMediaContext();

  const mediaId = searchParams.get('mediaId') ?? '';
  const episodeId = searchParams.get('episodeId') ?? '';
  // Offline mode params (base64-encoded blob URLs stored in sessionStorage)
  const offlineKey = searchParams.get('offlineKey') ?? '';

  const media = getById(mediaId);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  // Offline blob URLs (set via downloads page)
  const [offlineVideoUrl, setOfflineVideoUrl] = useState('');
  const [offlineSubs, setOfflineSubs] = useState<Subtitle[]>([]);
  const [offlineTitle, setOfflineTitle] = useState('');

  useEffect(() => {
    // Lock to portrait (if not fullscreen)
    const lockPortrait = async () => {
      try { await (screen.orientation as any).lock?.('portrait-primary'); } catch {}
    };
    lockPortrait();
    return () => {
      // On unmount, release orientation lock
      try { (screen.orientation as any).unlock?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (offlineKey) {
      // Load offline blob data from sessionStorage
      try {
        const raw = sessionStorage.getItem(offlineKey);
        if (raw) {
          const data = JSON.parse(raw);
          setOfflineVideoUrl(data.videoUrl ?? '');
          setOfflineSubs(data.subtitles ?? []);
          setOfflineTitle(data.title ?? 'Offline');
        }
      } catch {}
      setLoading(false);
      return;
    }

    if (!media) return;

    if (media.type === 'movie') {
      setLoading(false);
      return;
    }

    // Drama — load episodes
    const loadEpisodes = async () => {
      const eps = await fetchEpisodes(mediaId);
      const ep = eps.find((e) => e.id === episodeId) ?? eps[0];
      setEpisode(ep ?? null);
      setLoading(false);
    };
    loadEpisodes();
  }, [media, mediaId, episodeId, offlineKey]);

  if (loading || (!media && !offlineKey)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#000' }}>
        <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  // OFFLINE playback
  if (offlineKey && offlineVideoUrl) {
    return (
      <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <VideoPlayer
          videoUrl={offlineVideoUrl}
          qualities={[{ quality: 'auto', url: offlineVideoUrl }]}
          subtitles={offlineSubs}
          title={offlineTitle}
          onBack={() => router.back()}
          qualitySelectionEnabled={false}
        />
      </div>
    );
  }

  if (!media) return null;

  // Movie
  if (media.type === 'movie') {
    const qs: VideoQuality[] = media.qualities ?? [];
    const url = qs[0]?.url ?? media.videoUrl ?? '';
    return (
      <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <VideoPlayer
          videoUrl={url}
          qualities={qs}
          subtitles={media.subtitles ?? []}
          title={media.title}
          onBack={() => router.back()}
        />
      </div>
    );
  }

  // Drama episode
  if (!episode) return null;
  const qs = episode.qualities.length > 0 ? episode.qualities : [{ quality: 'auto' as const, url: episode.videoUrl }];

  return (
    <div style={{ background: '#000', minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <VideoPlayer
        videoUrl={episode.videoUrl}
        qualities={qs}
        subtitles={episode.subtitles}
        title={`${media.title} – EP${episode.episodeNumber}`}
        onBack={() => router.back()}
      />
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#000' }}>
        <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
}
