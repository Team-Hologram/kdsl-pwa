// src/app/api/video-debug/route.ts
// DELETE after debugging is done
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const B2_BASE_URL = process.env.B2_BASE_URL ?? '';
  const { searchParams } = request.nextUrl;
  const fileId = searchParams.get('id') ?? '';

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = B2_BASE_URL ? `${B2_BASE_URL}/${cleanPath}` : 'B2_BASE_URL missing';

  // Test if B2 URL is reachable
  let b2Status: number | string = 'not tested';
  let b2ContentType = '';
  if (B2_BASE_URL && fileId) {
    try {
      const res = await fetch(b2Url, { method: 'HEAD' });
      b2Status = res.status;
      b2ContentType = res.headers.get('content-type') ?? '';
    } catch (e: any) {
      b2Status = `fetch error: ${e.message}`;
    }
  }

  return NextResponse.json({
    B2_BASE_URL_SET: !!B2_BASE_URL,
    B2_BASE_URL_PREFIX: B2_BASE_URL.slice(0, 30) + '...',
    fileId,
    b2Url,
    b2Status,
    b2ContentType,
  });
}
