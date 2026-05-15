'use client';
// src/app/about/page.tsx

import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();
  return (
    <div className="page-content">
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 56px)', padding: 'calc(env(safe-area-inset-top) + 56px) 20px 32px', textAlign: 'center' }}>
        <button onClick={() => router.back()} style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 12px)', left: 16, color: 'var(--primary)', fontSize: 15, fontWeight: 600 }}>← Back</button>

        <div style={{ width: 100, height: 100, borderRadius: 24, margin: '0 auto 20px', overflow: 'hidden', background: 'var(--bg-card)', border: '2px solid var(--border)' }}>
          <img src="/icons/icon-180.png" alt="KDrama SL" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>KDrama SL</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Version 1.0.0 (PWA)</p>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', textAlign: 'left', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>About</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            KDrama SL is the go-to platform for Sri Lankan K-drama fans. Stream and download your favourite Korean dramas with Sinhala and English subtitles, completely free.
          </p>
        </div>

        {[
          { label: 'Platform', value: 'iOS PWA (iPhone)' },
          { label: 'Content', value: 'Korean Dramas' },
          { label: 'Subtitles', value: 'Sinhala & English' },
          { label: 'Company', value: 'KDrama SL' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
          </div>
        ))}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 32 }}>
          © {new Date().getFullYear()} KDrama SL · All rights reserved
        </p>
      </div>
    </div>
  );
}
