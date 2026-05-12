// src/app/api/subtitle-debug/route.ts
// Temporary debug: call /api/subtitle-debug?id=<fileId> to test the full subtitle pipeline
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const B2_BASE_URL = (process.env.B2_BASE_URL ?? '').replace(/\/+$/, '');
  const fileId = request.nextUrl.searchParams.get('id') ?? '';

  if (!B2_BASE_URL) {
    return NextResponse.json({ error: 'B2_BASE_URL not set' }, { status: 500 });
  }

  if (!fileId) {
    return NextResponse.json({
      hint: 'Pass ?id=<subtitle_file_path_from_firestore>',
      B2_BASE_URL_SET: !!B2_BASE_URL,
      B2_PREFIX: B2_BASE_URL.slice(0, 40),
    });
  }

  const cleanPath = fileId.replace(/^\/+/, '');
  const b2Url = `${B2_BASE_URL}/${cleanPath}`;

  let status: number | string = 'not tested';
  let contentType = '';
  let bodyPreview = '';
  let fetchError = '';

  try {
    const res = await fetch(b2Url);
    status = res.status;
    contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();
    bodyPreview = text.slice(0, 300); // first 300 chars of the file
  } catch (e: any) {
    fetchError = e.message;
  }

  return NextResponse.json({
    B2_BASE_URL_PREFIX: B2_BASE_URL.slice(0, 40),
    fileId,
    b2Url,
    upstream_status: status,
    upstream_content_type: contentType,
    body_preview: bodyPreview,
    fetch_error: fetchError || null,
  });
}
