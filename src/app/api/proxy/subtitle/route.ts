// src/app/api/proxy/subtitle/route.ts
// Server-side proxy for subtitle text.
// We CANNOT redirect (browser fetch() gets CORS error on cross-origin redirect).
// Solution: fetch server-side and return the text with same-origin/CORS-safe headers.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8 Mobile/15E148 Safari/604.1';

const UPSTREAM_ATTEMPTS: RequestInit[] = [
  {
    headers: {
      Accept: 'text/vtt,application/x-subrip,text/plain,text/*,*/*;q=0.8',
    },
  },
  {
    headers: {
      'User-Agent': SAFARI_UA,
      Accept: 'text/vtt,application/x-subrip,text/plain,text/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
];

export async function GET(request: NextRequest) {
  const B2_BASE_URL = (process.env.B2_BASE_URL ?? '').replace(/\/+$/, '');
  const fileId = request.nextUrl.searchParams.get('id');

  if (!fileId || fileId.trim() === '') {
    return new NextResponse('Missing id param', { status: 400 });
  }
  if (!B2_BASE_URL) {
    return new NextResponse('B2_BASE_URL not configured', { status: 500 });
  }

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = `${B2_BASE_URL}/${cleanPath}`;

  try {
    let upstream: Response | null = null;

    for (const init of UPSTREAM_ATTEMPTS) {
      upstream = await fetch(b2Url, {
        ...init,
        cache: 'no-store',
      });
      if (upstream.ok || upstream.status !== 403) break;
    }

    if (!upstream?.ok) {
      return new NextResponse(
        `Upstream subtitle error: HTTP ${upstream?.status ?? 502}`,
        { status: upstream?.status ?? 502 }
      );
    }

    const text = await upstream.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        // Allow browser fetch() from any origin (fixes CORS for our JS fetch)
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Proxy fetch error: ${message}`, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
