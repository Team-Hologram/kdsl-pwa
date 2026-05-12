// src/app/api/proxy/image/route.ts
// Proxies R2 thumbnail/banner images — hides origin URLs
import { NextRequest, NextResponse } from 'next/server';

const R2_BASE_URL = process.env.R2_BASE_URL ?? 'https://images.kdramasl.site';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type'); // 'thumbnail' | 'banner'
  const id = searchParams.get('id');

  if (!id || !type) return new NextResponse('Missing params', { status: 400 });

  const dir = type === 'banner' ? 'banners' : 'thumbnails';
  const url = `${R2_BASE_URL}/${dir}/${id.replace(/^\/+/, '')}`;

  try {
    const upstream = await fetch(url, { next: { revalidate: 3600 } });
    if (!upstream.ok) return new NextResponse('Not found', { status: upstream.status });

    const ct = upstream.headers.get('content-type') ?? 'image/jpeg';
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'content-type': ct,
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('[proxy/image]', err);
    return new NextResponse('Proxy error', { status: 502 });
  }
}
