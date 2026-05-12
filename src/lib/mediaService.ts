// src/lib/mediaService.ts
// Mirrors the React Native app's MediaProvider + mediaService
// Uses the same Firestore structure but routes media URLs through the PWA proxy

import {
  collection, doc, onSnapshot, getDoc, getDocs,
  query, orderBy, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Media, Episode, VideoQuality, Subtitle } from './types';
import { proxyThumbnailUrl, proxyBannerUrl, proxyVideoUrl, proxySubtitleUrl } from './proxyUrl';

const MEDIA_COL = 'media';

// ── URL builders (same logic as RN b2.ts/r2.ts but via proxy) ─────────────

function buildVideoQuality(data: Record<string, any>): VideoQuality[] {
  const q: VideoQuality[] = [];
  const qualities: Array<{ key: string; label: VideoQuality['quality'] }> = [
    { key: 'videoFileId_480p', label: '480p' },
    { key: 'videoFileId_720p', label: '720p' },
    { key: 'videoFileId_1080p', label: '1080p' },
  ];
  for (const { key, label } of qualities) {
    if (data[key]) {
      q.push({ quality: label, url: proxyVideoUrl(data[key]), fileId: data[key] });
    }
  }
  return q;
}

function buildSubtitles(subs: any[]): Subtitle[] {
  return (subs ?? []).map((s: any) => ({
    language: s.language,
    label: s.label,
    url: proxySubtitleUrl(s.path || s.fileId),
    fileId: s.path || s.fileId,
  }));
}

export function mapMediaDoc(id: string, data: any): Media {
  const thumbnailFilename = data.thumbnailFilename ?? '';
  const bannerFilename = data.bannerFilename ?? '';

  const base: Omit<Media, 'videoUrl' | 'videoFileId' | 'qualities' | 'subtitles'> = {
    id,
    title: data.title ?? '',
    titleSinhala: data.titleSinhala,
    type: data.type,
    thumbnailFilename,
    bannerFilename,
    thumbnail: proxyThumbnailUrl(thumbnailFilename),
    banner: proxyBannerUrl(bannerFilename),
    year: data.year ?? 0,
    rating: data.rating ?? 0,
    description: data.description ?? '',
    descriptionSinhala: data.descriptionSinhala,
    genres: data.genres ?? [],
    duration: data.duration,
    totalEpisodes: data.totalEpisodes,
    views: data.views ?? 0,
    trending: data.trending ?? false,
    latest: data.new ?? false,
    completed: data.completed ?? false,
    createdAt: data.createdAt ?? null,
    episodes: [],
    trailerUrl: data.trailerUrl ?? null,
  };

  if (data.type === 'movie') {
    const qualities = buildVideoQuality(data);
    const subtitles = buildSubtitles(data.subtitles ?? []);
    const bestFileId = data.videoFileId_1080p || data.videoFileId_720p || data.videoFileId_480p;
    return {
      ...base,
      videoUrl: bestFileId ? proxyVideoUrl(bestFileId) : '',
      videoFileId: bestFileId,
      qualities,
      subtitles,
    };
  }

  return { ...base, qualities: [], subtitles: [] };
}

export function mapEpisodeDoc(id: string, data: any): Episode {
  const qualities = buildVideoQuality(data);
  const subtitles = buildSubtitles(data.subtitles ?? []);
  const thumbnailFilename = data.thumbnailFilename ?? '';
  const bestFileId = data.videoFileId_1080p || data.videoFileId_720p || data.videoFileId_480p;

  return {
    id,
    episodeNumber: data.episodeNumber ?? 0,
    title: data.title ?? '',
    titleSinhala: data.titleSinhala,
    thumbnailFilename,
    thumbnail: proxyThumbnailUrl(thumbnailFilename),
    duration: data.duration ?? 0,
    videoUrl: qualities.length > 0 ? qualities[qualities.length - 1].url : '',
    videoFileId: bestFileId,
    qualities,
    subtitles,
    released: data.released ?? '',
  };
}

// ── Firestore helpers ──────────────────────────────────────────────────────

export function subscribeToSettingsApp(
  callback: (data: Record<string, any>) => void,
  onError?: (e: Error) => void,
  onNotFound?: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'settings', 'app'),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        // settings/app doc doesn't exist — signal caller to do a full fetch
        console.warn('[mediaService] settings/app not found — calling onNotFound');
        onNotFound?.();
      }
    },
    (e) => {
      console.error('[mediaService] settings/app onSnapshot error:', e);
      onError?.(e);
    }
  );
}

export async function fetchAllMedia(): Promise<Media[]> {
  const snap = await getDocs(collection(db, MEDIA_COL));
  return snap.docs.map((d) => mapMediaDoc(d.id, d.data()));
}

export async function fetchMediaById(id: string): Promise<Media | null> {
  const snap = await getDoc(doc(db, MEDIA_COL, id));
  if (!snap.exists()) return null;
  return mapMediaDoc(snap.id, snap.data());
}

export async function fetchEpisodes(mediaId: string): Promise<Episode[]> {
  const ref = collection(doc(db, MEDIA_COL, mediaId), 'episodes');
  const snap = await getDocs(query(ref, orderBy('episodeNumber')));
  return snap.docs.map((d) => mapEpisodeDoc(d.id, d.data()));
}

export function subscribeToEpisodes(
  mediaId: string,
  callback: (episodes: Episode[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const ref = collection(doc(db, MEDIA_COL, mediaId), 'episodes');
  return onSnapshot(query(ref, orderBy('episodeNumber')), (snap) => {
    callback(snap.docs.map((d) => mapEpisodeDoc(d.id, d.data())));
  }, onError);
}
