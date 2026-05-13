// src/lib/proxyUrl.ts
// Build client-side URLs that go through our API proxy

const PUBLIC_B2_CDN_URL = (process.env.NEXT_PUBLIC_B2_CDN_URL ?? '').replace(/\/+$/, '');

function cleanFileId(fileId: string) {
  return fileId.replace(/^\/+/, '');
}

function encodePath(path: string) {
  return cleanFileId(path).split('/').map(encodeURIComponent).join('/');
}

/**
 * Build a video URL.
 * If NEXT_PUBLIC_B2_CDN_URL is set, the browser loads directly from the CDN
 * and bypasses Vercel functions/bandwidth entirely.
 * @param fileId  The path stored in Firestore (e.g. "videos/episode1_720p.mp4")
 */
export function proxyVideoUrl(fileId: string | null | undefined): string {
  if (!fileId || fileId.trim() === '') return '';
  if (PUBLIC_B2_CDN_URL) return `${PUBLIC_B2_CDN_URL}/${encodePath(fileId)}`;
  return `/api/proxy/video?id=${encodeURIComponent(fileId)}`;
}

/**
 * Build a subtitle URL.
 * If NEXT_PUBLIC_B2_CDN_URL is set, the browser loads directly from the CDN
 * and bypasses Vercel functions/bandwidth entirely.
 * @param fileId  The path stored in Firestore
 */
export function proxySubtitleUrl(fileId: string | null | undefined): string {
  if (!fileId || fileId.trim() === '') return '';
  if (PUBLIC_B2_CDN_URL) return `${PUBLIC_B2_CDN_URL}/${encodePath(fileId)}`;
  return `/api/proxy/subtitle?id=${encodeURIComponent(fileId)}`;
}

/**
 * Proxy an R2 thumbnail image filename
 * @param filename  e.g. "my-demon.jpg" (stored in Firestore)
 */
export function proxyThumbnailUrl(filename: string | null | undefined): string {
  if (!filename || filename.trim() === '') return '';
  return `/api/proxy/image?type=thumbnail&id=${encodeURIComponent(filename)}`;
}

/**
 * Proxy an R2 banner image filename
 * @param filename  e.g. "my-demon-banner.jpg"
 */
export function proxyBannerUrl(filename: string | null | undefined): string {
  if (!filename || filename.trim() === '') return '';
  return `/api/proxy/image?type=banner&id=${encodeURIComponent(filename)}`;
}
