'use client';
// src/app/debug/page.tsx — TEMPORARY: Remove before production deployment

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DebugPage() {
  const [results, setResults] = useState<string[]>(['⏳ Starting tests...']);
  const [serverEnv, setServerEnv] = useState<Record<string, string>>({});
  const [clientEnv, setClientEnv] = useState<Record<string, string>>({});
  const [jsError, setJsError] = useState('');

  useEffect(() => {
    // Catch any global JS errors
    const handler = (e: ErrorEvent) => setJsError(`JS Error: ${e.message} @ ${e.filename}:${e.lineno}`);
    window.addEventListener('error', handler);

    // Client-side env vars (baked at build time)
    setClientEnv({
      apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '❌ MISSING').slice(0, 12) + '...',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '❌ MISSING',
      appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '❌ MISSING').slice(0, 20) + '...',
    });

    // Server-side env check via API
    fetch('/api/env-check')
      .then(r => r.json())
      .then(data => setServerEnv(data))
      .catch(e => setServerEnv({ error: String(e) }));

    // Firestore tests
    const run = async () => {
      const logs: string[] = [];

      logs.push('⏳ Checking db object...');
      setResults([...logs]);
      logs.push(`db: ${db ? '✅ initialized' : '❌ null'}`);
      setResults([...logs]);

      try {
        logs.push('⏳ Reading settings/app...');
        setResults([...logs]);
        const snap = await getDoc(doc(db, 'settings', 'app'));
        logs.push(snap.exists()
          ? `✅ settings/app: ${JSON.stringify(snap.data()).slice(0, 100)}`
          : '⚠️ settings/app: document does NOT exist');
      } catch (e: any) {
        logs.push(`❌ settings/app error: ${e?.message ?? e}`);
      }
      setResults([...logs]);

      try {
        logs.push('⏳ Reading media collection...');
        setResults([...logs]);
        const snap = await getDocs(collection(db, 'media'));
        logs.push(`✅ media: ${snap.size} documents`);
        snap.docs.slice(0, 2).forEach(d => {
          logs.push(`   → ${d.id}: "${d.data().title}"`);
        });
      } catch (e: any) {
        logs.push(`❌ media error: ${e?.message ?? e}`);
      }

      logs.push('✅ Done');
      setResults([...logs]);
    };

    run();
    return () => window.removeEventListener('error', handler);
  }, []);

  const row = (label: string, value: string) => (
    <div key={label} style={{ fontSize: 12, marginBottom: 4, wordBreak: 'break-all' }}>
      <span style={{ color: '#7B2FFF' }}>{label}:</span>{' '}
      <span style={{ color: value.includes('❌') ? '#ff4757' : value.includes('✅') ? '#2ed573' : '#fff' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '60px 16px 100px', background: '#0A0E27', minHeight: '100dvh', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#00D9FF', fontSize: 16, marginBottom: 12 }}>🔧 Firebase Debug</h1>

      {jsError && (
        <div style={{ background: '#ff4757', color: '#fff', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
          ⚠️ {jsError}
        </div>
      )}

      <div style={{ background: '#131829', borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <p style={{ color: '#aaa', fontSize: 11, marginBottom: 6 }}>CLIENT env vars (baked at build):</p>
        {Object.entries(clientEnv).length === 0
          ? <p style={{ color: '#ff4757', fontSize: 12 }}>❌ useEffect not running!</p>
          : Object.entries(clientEnv).map(([k, v]) => row(k, v))}
      </div>

      <div style={{ background: '#131829', borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <p style={{ color: '#aaa', fontSize: 11, marginBottom: 6 }}>SERVER env vars (live):</p>
        {Object.entries(serverEnv).length === 0
          ? <p style={{ color: '#aaa', fontSize: 12 }}>Loading...</p>
          : Object.entries(serverEnv).map(([k, v]) => row(k, v))}
      </div>

      <div style={{ background: '#131829', borderRadius: 8, padding: 12 }}>
        <p style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>Firestore Tests:</p>
        {results.map((r, i) => (
          <div key={i} style={{
            fontSize: 12, marginBottom: 5, wordBreak: 'break-all', lineHeight: 1.5,
            color: r.startsWith('❌') ? '#ff4757' : r.startsWith('✅') ? '#2ed573' : r.startsWith('⚠️') ? '#ffa502' : '#ccc',
          }}>{r}</div>
        ))}
      </div>
    </div>
  );
}
