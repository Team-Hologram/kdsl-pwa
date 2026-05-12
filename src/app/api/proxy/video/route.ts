// src/app/api/proxy/video/route.ts
// Node.js runtime (NOT edge) — edge runtime can't reliably access server env vars
// Streams B2 video with proper Range support for iOS Safari

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Access env var inside handler (not module level) for reliability
  const B2_BASE_URL = process.env.B2_BASE_URL ?? '';

  const { searchParams } = request.nextUrl;
  const fileId = searchParams.get('id');

  if (!fileId || fileId.trim() === '') {
    return new NextResponse('Missing file ID', { status: 400 });
  }

  if (!B2_BASE_URL) {
    console.error('[proxy/video] B2_BASE_URL is not set');
    return new NextResponse('Server misconfigured: B2_BASE_URL missing', { status: 500 });
  }

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = `${B2_BASE_URL}/${cleanPath}`;

  // Forward range request (critical for iOS Safari seek support)
  const rangeHeader = request.headers.get('range') ?? request.headers.get('Range');
  const upstreamHeaders: Record<string, string> = {};
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader;
  }

  try {
    const upstream = await fetch(b2Url, {
      headers: upstreamHeaders,
      // @ts-ignore — Node.js fetch signal
      signal: AbortSignal.timeout(30000),
    });

    // Forward all 2xx responses including 206 Partial Content
    if (upstream.status >= 400) {
      console.error(`[proxy/video] B2 error ${upstream.status} for: ${b2Url}`);
      return new NextResponse(`Upstream error ${upstream.status}`, { status: upstream.status });
    }

    const responseHeaders = new Headers();

    // Forward content headers from B2
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    // Ensure video/mp4 MIME type — critical for iOS Safari Code 4 fix
    if (!responseHeaders.get('content-type') || !responseHeaders.get('content-type')!.startsWith('video/')) {
      const ext = cleanPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'mp4' ? 'video/mp4' : ext === 'webm' ? 'video/webm' : ext === 'm3u8' ? 'application/x-mpegURL' : 'video/mp4';
      responseHeaders.set('content-type', mime);
    }

    // Always advertise range support
    responseHeaders.set('accept-ranges', 'bytes');
    // CORS — required if video element uses crossOrigin attribute
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-headers', 'range, Range');
    // Private cache
    responseHeaders.set('cache-control', 'private, max-age=3600');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[proxy/video] fetch error:', err);
    return new NextResponse('Proxy error', { status: 502 });
  }
}

// Handle CORS preflight for range requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'range, Range',
    },
  });
}
