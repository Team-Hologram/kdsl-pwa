// src/app/api/proxy/subtitle/route.ts
// Server-side proxy with browser-like headers to bypass Cloudflare Bot Fight Mode.
// We CANNOT redirect (browser fetch() gets CORS error on cross-origin redirect).
// We CANNOT server-fetch without headers (Cloudflare returns 403).
// Solution: fetch with spoofed browser User-Agent + return with CORS headers.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Mimic a real iOS Safari request to pass Cloudflare Bot Fight Mode
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8 Mobile/15E148 Safari/604.1',
  Accept: 'text/vtt,text/plain,text/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://kdsl-pwa.vercel.app/',
  Origin: 'https://kdsl-pwa.vercel.app',
};

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
    const upstream = await fetch(b2Url, { headers: BROWSER_HEADERS });

    if (!upstream.ok) {
      return new NextResponse(
        `Upstream error: HTTP ${upstream.status} for ${b2Url}`,
        { status: upstream.status }
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
  } catch (err: any) {
    return new NextResponse(`Proxy fetch error: ${err.message}`, { status: 502 });
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
