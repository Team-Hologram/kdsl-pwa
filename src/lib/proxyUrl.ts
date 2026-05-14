// src/lib/proxyUrl.ts
// Build client-side media URLs. Public CDN URLs keep large media off Vercel.

const PUBLIC_B2_CDN_URL = (process.env.NEXT_PUBLIC_B2_CDN_URL ?? 'https://cdn.kdramasl.site/file/kdrama-sl').replace(/\/+$/, '');
const PUBLIC_R2_BASE_URL = (process.env.NEXT_PUBLIC_R2_BASE_URL ?? 'https://images.kdramasl.site').replace(/\/+$/, '');

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
  return `${PUBLIC_B2_CDN_URL}/${encodePath(fileId)}`;
}

/**
 * Build a subtitle URL.
 * If NEXT_PUBLIC_B2_CDN_URL is set, the browser loads directly from the CDN
 * and bypasses Vercel functions/bandwidth entirely.
 * @param fileId  The path stored in Firestore
 */
export function proxySubtitleUrl(fileId: string | null | undefined): string {
  if (!fileId || fileId.trim() === '') return '';
  return `${PUBLIC_B2_CDN_URL}/${encodePath(fileId)}`;
}

/**
 * Build a public R2 thumbnail image URL.
 * @param filename  e.g. "my-demon.jpg" (stored in Firestore)
 */
export function proxyThumbnailUrl(filename: string | null | undefined): string {
  if (!filename || filename.trim() === '') return '';
  return `${PUBLIC_R2_BASE_URL}/thumbnails/${encodePath(filename)}`;
}

/**
 * Build a public R2 banner image URL.
 * @param filename  e.g. "my-demon-banner.jpg"
 */
export function proxyBannerUrl(filename: string | null | undefined): string {
  if (!filename || filename.trim() === '') return '';
  return `${PUBLIC_R2_BASE_URL}/banners/${encodePath(filename)}`;
}
