// src/lib/types.ts — Mirrors the React Native app's type system

export interface Media {
  id: string;
  title: string;
  titleSinhala?: string;
  type: 'movie' | 'drama';
  thumbnailFilename: string;  // raw Firestore filename (used to build proxy URL)
  bannerFilename: string;
  thumbnail: string;          // resolved proxy URL
  banner: string;
  year: number;
  rating: number;
  description: string;
  descriptionSinhala?: string;
  genres: string[];
  episodes?: Episode[];
  duration?: number;
  totalEpisodes?: number;
  views: number;
  trending?: boolean;
  latest?: boolean;
  completed?: boolean;
  createdAt?: string;
  trailerUrl?: string;
  videoUrl?: string;          // resolved proxy URL (movie)
  videoFileId?: string;       // raw B2 path (for ZIP download)
  qualities?: VideoQuality[];
  subtitles?: Subtitle[];
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  titleSinhala?: string;
  thumbnail: string;          // proxy URL
  thumbnailFilename: string;
  duration: number;
  videoUrl: string;           // proxy URL (best quality)
  videoFileId?: string;       // raw B2 path (for ZIP download)
  qualities: VideoQuality[];
  subtitles: Subtitle[];
  released: string;
}

export interface VideoQuality {
  quality: 'auto' | '480p' | '720p' | '1080p' | 'offline';
  url: string;          // proxy URL
  fileId?: string;      // raw B2 path (for ZIP download)
}

export interface Subtitle {
  language: string;
  label: string;
  url: string;          // proxy URL
  fileId?: string;      // raw B2 path (for ZIP download)
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Date;
}

export interface LocalUser {
  favorites: string[];
  watchlist: string[];
  settings: {
    theme: 'light' | 'dark';
    autoplay: boolean;
  };
}

export interface DownloadedEpisode {
  id: string;
  title: string;
  thumbnail: string;
  mediaId: string;
  episodeId?: string;
  downloadedAt: string;
  zipBlob?: Blob;
  // stored in IndexedDB as blob
}
