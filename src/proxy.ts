import { NextRequest, NextResponse } from 'next/server';

const MONETAG_VERIFICATION = '22864a604781ea94182620567edbe0f1';
const APP_URL = 'https://live.kdramasl.site';

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
      width: 116px;
      height: 116px;
      object-fit: contain;
      margin-bottom: 28px;
    }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 12px; }
    p { font-size: 16px; color: rgba(255,255,255,0.65); line-height: 1.6; max-width: 360px; margin-bottom: 8px; }
    .link-box {
      margin-top: 28px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      width: min(100%, 380px);
    }
    .url {
      min-width: 0;
      flex: 1;
      font-size: 15px;
      color: #00D9FF;
      letter-spacing: 0.3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }
    .copy {
      border: 0;
      border-radius: 10px;
      background: #00D9FF;
      color: #0A0E27;
      font-size: 13px;
      font-weight: 800;
      padding: 10px 13px;
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
    .step-icon {
      width: 24px;
      height: 24px;
      object-fit: contain;
      vertical-align: middle;
      display: inline-block;
      margin-right: 7px;
    }
  </style>
</head>
<body>
  <img class="logo" src="/splash/kdsl.png" alt="KDrama SL" />
  <h1>KDrama SL</h1>
  <p>This app is exclusively available for <strong>iPhone users via Safari</strong>.</p>
  <p>Open the link below on your iPhone in Safari to install it.</p>
  <div class="link-box">
    <div class="url">${APP_URL}</div>
    <button class="copy" type="button" onclick="copyAppLink(this)">Copy</button>
  </div>
  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text"><img class="step-icon" src="/icons/safari.png" alt="Safari" />Open Safari on your iPhone</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text">Go to <strong style="color:#00D9FF">${APP_URL}</strong></div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text">Tap the Share button → "Add to Home Screen"</div>
    </div>
  </div>
  <script>
    function copyAppLink(button) {
      var url = '${APP_URL}';
      function done() {
        button.textContent = 'Copied';
        window.setTimeout(function() { button.textContent = 'Copy'; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function() {
          window.prompt('Copy this link', url);
        });
      } else {
        window.prompt('Copy this link', url);
      }
    }
  </script>
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
