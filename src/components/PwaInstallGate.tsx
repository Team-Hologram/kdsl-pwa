'use client';

import { useEffect, useState, type ReactNode } from 'react';

const APP_URL = 'https://live.kdramasl.site';

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandalonePwa() {
  const nav = navigator as NavigatorWithStandalone;
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export default function PwaInstallGate({ children }: { children: ReactNode }) {
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const update = () => setStandalone(isStandalonePwa());
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const copyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', APP_URL);
    }
  };

  if (standalone === null) {
    return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;
  }

  if (standalone) return <>{children}</>;

  return (
    <main style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top) + 28px) 22px calc(env(safe-area-inset-bottom) + 28px)',
    }}>
      <section style={{ width: '100%', maxWidth: 390, textAlign: 'center' }}>
        <img
          src="/splash/kdsl.png"
          alt="KDrama SL"
          style={{ width: 132, height: 132, objectFit: 'contain', margin: '0 auto 22px' }}
        />
        <h1 style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 850, marginBottom: 10 }}>
          Install KDrama SL
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: 24 }}>
          This app works from your Home Screen. Add it once, then open the KDrama SL icon.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 10,
          marginBottom: 16,
        }}>
          <span style={{
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--primary)',
            fontSize: 13,
            textAlign: 'left',
          }}>
            {APP_URL}
          </span>
          <button
            type="button"
            onClick={copyAppLink}
            style={{
              border: 0,
              borderRadius: 10,
              background: 'var(--primary)',
              color: '#0A0E27',
              fontSize: 13,
              fontWeight: 850,
              padding: '9px 12px',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 16,
          textAlign: 'left',
          display: 'grid',
          gap: 14,
        }}>
          {[
            { step: '1', text: 'Tap the Share button in Safari.', icon: true },
            { step: '2', text: 'Scroll & Choose Add to Home Screen.' },
            { step: '3', text: 'Tap Add, then open KDrama SL from Home Screen.' },
          ].map(({ step, text, icon }) => (
            <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#0A0E27',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 850,
                flexShrink: 0,
              }}>
                {step}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.35, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {icon && (
                  <svg width={20} height={20} fill="#ffffff" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z" />
                    <path d="M24 7h2v21h-2z" />
                    <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z" />
                  </svg>
                )}
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
