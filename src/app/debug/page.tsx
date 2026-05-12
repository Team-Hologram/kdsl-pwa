'use client';
// src/app/debug/page.tsx — TEMPORARY: Remove before production deployment

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DebugPage() {
  const [results, setResults] = useState<string[]>(['Testing...']);
  const [env, setEnv] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnv({
      apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'MISSING').slice(0, 10) + '...',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'MISSING',
      appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? 'MISSING').slice(0, 20) + '...',
    });

    const run = async () => {
      const logs: string[] = [];

      // Test 1: Read settings/app
      try {
        logs.push('⏳ Reading settings/app...');
        setResults([...logs]);
        const snap = await getDoc(doc(db, 'settings', 'app'));
        if (snap.exists()) {
          logs.push(`✅ settings/app exists: ${JSON.stringify(snap.data()).slice(0, 120)}`);
        } else {
          logs.push('⚠️ settings/app does NOT exist in Firestore');
        }
      } catch (e: any) {
        logs.push(`❌ settings/app error: ${e?.message ?? e}`);
      }
      setResults([...logs]);

      // Test 2: Read media collection (first 3 docs)
      try {
        logs.push('⏳ Reading media collection...');
        setResults([...logs]);
        const snap = await getDocs(collection(db, 'media'));
        logs.push(`✅ media collection: ${snap.size} documents`);
        snap.docs.slice(0, 2).forEach(d => {
          logs.push(`   → ${d.id}: title="${d.data().title}", type="${d.data().type}"`);
        });
      } catch (e: any) {
        logs.push(`❌ media collection error: ${e?.message ?? e}`);
      }
      setResults([...logs]);

      logs.push('✅ All tests complete');
      setResults([...logs]);
    };

    run();
  }, []);

  return (
    <div style={{ padding: 20, background: '#0A0E27', minHeight: '100dvh', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#00D9FF', fontSize: 18, marginBottom: 12 }}>🔧 Firebase Debug</h1>

      <div style={{ background: '#131829', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>Environment Variables:</p>
        {Object.entries(env).map(([k, v]) => (
          <div key={k} style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>
            <span style={{ color: '#7B2FFF' }}>{k}:</span> {v}
          </div>
        ))}
      </div>

      <div style={{ background: '#131829', borderRadius: 8, padding: 12 }}>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>Firestore Tests:</p>
        {results.map((r, i) => (
          <div key={i} style={{
            fontSize: 12, color: r.startsWith('❌') ? '#FF4757' : r.startsWith('✅') ? '#2ed573' : r.startsWith('⚠️') ? '#ffa502' : '#ccc',
            marginBottom: 6, wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {r}
          </div>
        ))}
      </div>

      <p style={{ color: '#555', fontSize: 10, marginTop: 20 }}>Remove /debug before deploying to production</p>
    </div>
  );
}
