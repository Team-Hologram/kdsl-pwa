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

function b2Url(path: string) {
  return `${B2_DIRECT_URL || B2_BASE_URL}/${path.replace(/^\/+/, '')}`;
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

  if (!videoId || !B2_BASE_URL) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const subtitleIdsRaw = searchParams.get('subtitleIds') ?? '';
  const subtitleIds = [
    ...searchParams.getAll('subtitleId'),
    ...(subtitleIdsRaw ? subtitleIdsRaw.split(',') : []),
  ].map((id) => id.trim()).filter(Boolean);

  // Fetch the video stream from B2
  const videoResponse = await fetch(b2Url(videoId));
  if (!videoResponse.ok) {
    return new NextResponse('Video not found', { status: 404 });
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
    const subResponse = await fetch(b2Url(subId));
    if (subResponse.ok) {
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
