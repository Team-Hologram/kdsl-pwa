// src/app/api/proxy/subtitle/route.ts
import { NextRequest, NextResponse } from 'next/server';

const B2_BASE_URL = process.env.B2_BASE_URL ?? '';

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get('id');
  if (!fileId) return new NextResponse('Missing ID', { status: 400 });

  const b2Url = `${B2_BASE_URL}/${fileId.replace(/^\/+/, '')}`;

  try {
    const upstream = await fetch(b2Url);
    if (!upstream.ok) return new NextResponse('Upstream error', { status: upstream.status });

    const headers = new Headers({
      'content-type': 'text/vtt; charset=utf-8',
      'cache-control': 'private, max-age=3600',
      'access-control-allow-origin': '*',
    });

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error('[proxy/subtitle]', err);
    return new NextResponse('Proxy error', { status: 502 });
  }
}
