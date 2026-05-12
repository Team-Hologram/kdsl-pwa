// src/app/api/proxy/subtitle/route.ts
// Redirect-based proxy — same pattern as video proxy.
// Vercel server-side fetch gets HTTP 403 from Cloudflare Bot Fight Mode.
// Redirecting lets the BROWSER fetch B2 directly with proper browser headers → allowed.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

  // 302 redirect → browser fetches subtitle directly from B2 CDN.
  // Browser requests carry proper User-Agent/Origin so Cloudflare allows them.
  return NextResponse.redirect(b2Url, {
    status: 302,
    headers: { 'cache-control': 'private, max-age=3600' },
  });
}
