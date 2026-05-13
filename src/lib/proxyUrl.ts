// src/lib/proxyUrl.ts
// Build client-side URLs that go through our API proxy
// Real B2/R2 origin URLs are NEVER sent to the browser

/**
 * Proxy a B2 video file path through the server-side proxy
 * @param fileId  The path stored in Firestore (e.g. "videos/episode1_720p.mp4")
 */
export function proxyVideoUrl(fileId: string | null | undefined): string {
  if (!fileId || fileId.trim() === '') return '';
  return `/api/proxy/video?id=${encodeURIComponent(fileId)}`;
}

/**
 * Proxy a B2 subtitle file path through the server-side proxy
 * @param fileId  The path stored in Firestore
 */
export function proxySubtitleUrl(fileId: string | null | undefined): string {
  if (!fileId || fileId.trim() === '') return '';
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

/**
 * Build the ZIP download URL for an episode
 * @param videoFileId  B2 file path for the video
 * @param subtitleIds  Array of B2 file paths for subtitles
 * @param filename     Output filename (without .zip)
 */
export function buildDownloadUrl(
  videoFileId: string,
  subtitleIds: string[],
  filename: string,
): string {
  const params = new URLSearchParams();
  params.set('videoId', videoFileId);
  params.set('filename', filename);
  subtitleIds.forEach((subtitleId) => params.append('subtitleId', subtitleId));
  return `/api/download?${params.toString()}`;
}
