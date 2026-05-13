import { NextRequest, NextResponse } from 'next/server';

const MONETAG_VERIFICATION = '22864a604781ea94182620567edbe0f1';

// iPhone UA detection — allow only iPhone Safari
// iPads on iOS 13+ report as "Macintosh" so they are blocked automatically
function isIphoneSafari(ua: string): boolean {
  const isIphone = /iPhone/.test(ua);
  // Exclude other browser engines on iPhone
  const isNativeSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIphone && isNativeSafari;
}

const BLOCKED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="monetag" content="${MONETAG_VERIFICATION}" />
  <title>KDrama SL – iPhone Only</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      background: #0A0E27;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      width: 96px;
      height: 96px;
      border-radius: 22px;
      background: linear-gradient(135deg, #00D9FF 0%, #7B2FFF 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      margin-bottom: 32px;
    }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 12px; }
    p { font-size: 16px; color: rgba(255,255,255,0.65); line-height: 1.6; max-width: 360px; margin-bottom: 8px; }
    .url {
      margin-top: 28px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 15px;
      color: #00D9FF;
      letter-spacing: 0.3px;
    }
    .arrow {
      font-size: 40px;
      margin-top: 28px;
      animation: bounce 1.4s ease-in-out infinite;
    }
    @keyframes bounce {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .steps {
      margin-top: 28px;
      text-align: left;
      max-width: 340px;
      width: 100%;
    }
    .step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0,217,255,0.2);
      border: 1px solid #00D9FF;
      color: #00D9FF;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-text { font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.5; }
  </style>
</head>
<body>
  <div class="logo">🎬</div>
  <h1>KDrama SL</h1>
  <p>This app is exclusively available for <strong>iPhone users via Safari</strong>.</p>
  <p>Open the link below on your iPhone in Safari to install it.</p>
  <div class="url">kdramasl.site</div>
  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text">Open Safari on your iPhone</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text">Go to <strong style="color:#00D9FF">kdramasl.site</strong></div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text">Tap the Share button → "Add to Home Screen"</div>
    </div>
  </div>
</body>
</html>`;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicFile = /\.[^/]+$/.test(pathname);

  // ── Always allow static/asset routes ──────────────────────────────────────
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/splash/') ||
    isPublicFile ||
    pathname === '/manifest.json' ||
    pathname === '/firebase-messaging-sw.js' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // ── Always allow localhost + private LAN IPs (dev / internal testing) ─────
  // 192.168.x.x / 10.x.x.x / 172.16-31.x.x are private ranges, not internet
  const host = request.headers.get('host') ?? '';
  const isPrivateHost =
    host.startsWith('localhost') ||
    host.startsWith('127.') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (isPrivateHost) {
    return NextResponse.next();
  }

  // ── iOS Safari gate (public internet traffic only) ────────────────────────
  const ua = request.headers.get('user-agent') ?? '';
  if (!isIphoneSafari(ua)) {
    return new NextResponse(BLOCKED_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
