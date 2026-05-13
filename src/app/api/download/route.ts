// src/app/api/download/route.ts
// Streams a ZIP file containing video + subtitles
// The real B2 URL is assembled server-side and never sent to browser

import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import type { ReadableStream as NodeReadableStream } from 'stream/web';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const B2_BASE_URL = (process.env.B2_BASE_URL ?? '').replace(/\/+$/, '');
const B2_DIRECT_URL = (process.env.B2_DIRECT_URL ?? '').replace(/\/+$/, '');
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kdramasl.site').replace(/\/+$/, '');

// Headers that make Cloudflare treat server-side fetches as browser requests.
// Without these the CDN returns 403 (bot protection blocks Vercel server IPs).
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': `${SITE_ORIGIN}/`,
  'Origin': SITE_ORIGIN,
};

function b2Urls(path: string) {
  if (/^https?:\/\//i.test(path)) return [path];

  const cleanPath = path.replace(/^\/+/, '');
  const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
  const bases = [B2_BASE_URL, B2_DIRECT_URL]
    .filter((base, index, bases): base is string => Boolean(base) && bases.indexOf(base) === index)
  return bases.flatMap((base) => {
    const rawUrl = `${base}/${cleanPath}`;
    const encodedUrl = `${base}/${encodedPath}`;
    return rawUrl === encodedUrl ? [rawUrl] : [rawUrl, encodedUrl];
  });
}

async function fetchB2(path: string) {
  let lastResponse: Response | null = null;
  for (const url of b2Urls(path)) {
    try {
      const response = await fetch(url, { headers: BROWSER_HEADERS });
      if (response.ok) return response;
      lastResponse = response;
      // Don't retry on 403/401 from same base — try next URL candidate
    } catch {
      // Network error — try the next URL candidate
    }
  }
  return lastResponse;
}

// Convert a Node.js Readable stream to a ReadableStream for Next.js response
function nodeToWeb(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

function responseBodyToNodeStream(response: Response): Readable {
  if (!response.body) {
    throw new Error('Response body is empty');
  }
  return Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
}

function extensionFromPath(path: string, fallback: string) {
  const match = path.split('?')[0].match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? fallback;
}

function safeZipPathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, '').trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const videoId = searchParams.get('videoId');
  const filename = searchParams.get('filename') ?? 'episode';

  if (!videoId) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 });
  }

  if (!B2_BASE_URL && !B2_DIRECT_URL) {
    return NextResponse.json({ error: 'B2 URL not configured' }, { status: 500 });
  }

  const subtitleIdsRaw = searchParams.get('subtitleIds') ?? '';
  const subtitleIds = [
    ...searchParams.getAll('subtitleId'),
    ...(subtitleIdsRaw ? subtitleIdsRaw.split(',') : []),
  ].map((id) => id.trim()).filter(Boolean);

  // Fetch the video stream from B2
  const videoResponse = await fetchB2(videoId);
  if (!videoResponse?.ok) {
    const status = videoResponse?.status ?? 0;
    console.error(`[download] B2 video fetch failed — id="${videoId}" status=${status}`);
    return NextResponse.json(
      { error: `Video not found (${status})` },
      { status: 404 },
    );
  }

  // Create archiver ZIP stream
  const archive = archiver('zip', { zlib: { level: 0 } }); // level 0 = store, fastest for already-compressed video
  const zipStream = new PassThrough();
  archive.on('error', (error) => zipStream.destroy(error));
  archive.pipe(zipStream);

  // Append video
  const videoExt = extensionFromPath(videoId, 'mp4');
  archive.append(responseBodyToNodeStream(videoResponse), { name: `video.${videoExt}` });

  // Append each subtitle
  for (const subId of subtitleIds) {
    const subExt = extensionFromPath(subId, 'vtt');
    const langMatch = subId.match(/([a-z]{2,3})\.(vtt|srt|ass|ssa)$/i);
    const lang = langMatch ? langMatch[1] : subId.split('/').pop()?.split('.')?.[0] ?? 'sub';
    const subResponse = await fetchB2(subId);
    if (subResponse?.ok) {
      archive.append(responseBodyToNodeStream(subResponse), {
        name: `subtitles/${safeZipPathPart(lang) || 'sub'}.${subExt}`,
      });
    }
  }

  archive.finalize().catch((error) => zipStream.destroy(error));

  const safeFilename = safeZipPathPart(filename) || 'episode';

  return new NextResponse(nodeToWeb(zipStream), {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${safeFilename}.zip"`,
      'cache-control': 'no-store',
    },
  });
}
