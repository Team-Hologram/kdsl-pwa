// src/app/api/proxy/video/route.ts
// Redirect-based proxy: hides B2 URL from HTML/JS source but is visible in network tab.
// Most reliable approach for iOS Safari video compatibility.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const B2_BASE_URL = (process.env.B2_BASE_URL ?? '').replace(/\/+$/, '');

  const { searchParams } = request.nextUrl;
  const fileId = searchParams.get('id');

  if (!fileId || fileId.trim() === '') {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
  }

  if (!B2_BASE_URL) {
    return NextResponse.json({ error: 'B2_BASE_URL not configured on server' }, { status: 500 });
  }

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = `${B2_BASE_URL}/${cleanPath}`;

  // Redirect directly to B2 CDN — iOS Safari handles range requests natively
  // The B2 URL is visible in network tab (same as Android app which accesses B2 directly)
  return NextResponse.redirect(b2Url, {
    status: 302,
    headers: {
      'cache-control': 'private, max-age=3600',
    },
  });
}

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
