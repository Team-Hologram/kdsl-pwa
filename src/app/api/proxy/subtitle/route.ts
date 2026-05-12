// src/app/api/proxy/subtitle/route.ts
// Same-origin subtitle proxy. Native iOS fullscreen requires a real <track>
// source, and same-origin VTT is the most reliable path for Safari.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function looksLikeVtt(text: string): boolean {
  return text.trimStart().startsWith('WEBVTT');
}

function srtToVtt(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const withoutNumericCueIds = normalized.replace(/(^|\n)\d+\n(?=\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s+-->)/g, '$1');
  return `WEBVTT\n\n${withoutNumericCueIds.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}`;
}

export async function GET(request: NextRequest) {
  const B2_BASE_URL = (process.env.B2_BASE_URL ?? '').replace(/\/+$/, '');
  const B2_DIRECT_URL = (process.env.B2_DIRECT_URL ?? '').replace(/\/+$/, ''); // Optional: B2 native URL (f005.backblazeb2.com) bypasses Cloudflare
  const fileId = request.nextUrl.searchParams.get('id');

  if (!fileId || fileId.trim() === '') {
    return new NextResponse('Missing id param', { status: 400 });
  }

  const base = B2_DIRECT_URL || B2_BASE_URL;
  if (!base) {
    return new NextResponse('B2 URL not configured', { status: 500 });
  }

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = `${base}/${cleanPath}`;

  const response = await fetch(b2Url, {
    headers: { accept: 'text/vtt,text/plain,*/*' },
    cache: 'force-cache',
  });

  if (!response.ok) {
    return new NextResponse('Subtitle not found', { status: response.status });
  }

  const sourceText = await response.text();
  const body = looksLikeVtt(sourceText) ? sourceText : srtToVtt(sourceText);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/vtt; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
      'access-control-allow-origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
    },
  });
}
