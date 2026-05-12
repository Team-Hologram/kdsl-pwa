// src/app/api/env-check/route.ts
// Temporary: verify env vars are set on the server. Remove before production.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ set' : '❌ MISSING',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ set' : '❌ MISSING',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ set' : '❌ MISSING',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ set' : '❌ MISSING',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ set' : '❌ MISSING',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ set' : '❌ MISSING',
    B2_BASE_URL: process.env.B2_BASE_URL ? '✅ set' : '❌ MISSING',
    R2_BASE_URL: process.env.R2_BASE_URL ? '✅ set' : '❌ MISSING',
    PROXY_SECRET: process.env.PROXY_SECRET ? '✅ set' : '❌ MISSING',
  });
}
