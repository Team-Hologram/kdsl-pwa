// src/app/api/proxy/video/route.ts
// Server-side proxy for B2 video files
// The real B2 URL is NEVER sent to the browser

import { NextRequest, NextResponse } from 'next/server';

const B2_BASE_URL = process.env.B2_BASE_URL ?? '';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fileId = searchParams.get('id');

  if (!fileId || fileId.trim() === '') {
    return new NextResponse('Missing file ID', { status: 400 });
  }

  if (!B2_BASE_URL) {
    return new NextResponse('Server misconfigured', { status: 500 });
  }

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = `${B2_BASE_URL}/${cleanPath}`;

  // Forward range requests for seek support
  const rangeHeader = request.headers.get('range');
  const upstreamHeaders: HeadersInit = {};
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader;
  }

  try {
    const upstream = await fetch(b2Url, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse('Upstream error', { status: upstream.status });
    }

    const responseHeaders = new Headers();
    // Forward content headers
    const forwardHeaders = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'last-modified', 'etag',
    ];
    for (const h of forwardHeaders) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }
    // Allow seek on the proxy stream
    responseHeaders.set('accept-ranges', 'bytes');
    // CORS — needed for Safari when crossOrigin attribute is used
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-headers', 'range');
    // Private cache only — don't let CDNs cache and expose the origin
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
