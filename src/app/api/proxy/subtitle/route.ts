// src/app/api/proxy/subtitle/route.ts
// Redirect-based proxy — works once Cloudflare Transform Rule adds CORS headers for cdn.kdramasl.site
// Browser fetch() follows redirect → gets subtitle file with CORS headers → succeeds

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

  // Redirect → browser fetches subtitle directly.
  // Requires CORS headers on cdn.kdramasl.site (Cloudflare Transform Rule).
  // OR use B2_DIRECT_URL pointing to f005.backblazeb2.com which supports CORS natively.
  return NextResponse.redirect(b2Url, {
    status: 302,
    headers: { 'cache-control': 'private, max-age=3600' },
  });
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
