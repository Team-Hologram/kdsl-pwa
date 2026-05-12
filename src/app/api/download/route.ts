// src/app/api/download/route.ts
// Streams a ZIP file containing video + subtitles
// The real B2 URL is assembled server-side and never sent to browser

import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'stream';

const B2_BASE_URL = process.env.B2_BASE_URL ?? '';

function b2Url(path: string) {
  return `${B2_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

// Convert a Node.js Readable stream to a ReadableStream for Next.js response
function nodeToWeb(nodeStream: Readable): ReadableStream {
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const videoId = searchParams.get('videoId');
  const subtitleIdsRaw = searchParams.get('subtitleIds') ?? '';
  const filename = searchParams.get('filename') ?? 'episode';

  if (!videoId || !B2_BASE_URL) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const subtitleIds = subtitleIdsRaw
    ? subtitleIdsRaw.split(',').filter(Boolean)
    : [];

  // Fetch the video stream from B2
  const videoResponse = await fetch(b2Url(videoId));
  if (!videoResponse.ok) {
    return new NextResponse('Video not found', { status: 404 });
  }

  // Create archiver ZIP stream
  const archive = archiver('zip', { zlib: { level: 0 } }); // level 0 = store, fastest for already-compressed video

  // Append video
  const videoExt = videoId.endsWith('.mkv') ? 'mkv' : 'mp4';
  // @ts-expect-error — archiver accepts web ReadableStream in newer Node
  archive.append(videoResponse.body, { name: `video.${videoExt}` });

  // Append each subtitle
  for (const subId of subtitleIds) {
    const langMatch = subId.match(/([a-z]{2,3})\.(vtt|srt)$/i);
    const lang = langMatch ? langMatch[1] : subId.split('/').pop()?.split('.')?.[0] ?? 'sub';
    const subResponse = await fetch(b2Url(subId));
    if (subResponse.ok) {
      // @ts-expect-error
      archive.append(subResponse.body, { name: `subtitles/${lang}.vtt` });
    }
  }

  archive.finalize();

  const safeFilename = filename.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 80);

  return new NextResponse(nodeToWeb(archive as unknown as Readable), {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${safeFilename}.zip"`,
      'cache-control': 'no-store',
    },
  });
}
