'use client';
// src/app/downloads/page.tsx
// Lists downloaded ZIPs from IndexedDB, supports offline playback

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { loadMonetagOnclickAd } from '@/lib/monetagAds';

interface DownloadRecord {
  id: string;
  title: string;
  thumbnail: string;
  mediaId: string;
  episodeId?: string;
  downloadedAt: string;
}

const DB_NAME = 'kdramasl_downloads';
const STORE_BLOBS = 'blobs';
const STORE_META = 'meta';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_BLOBS)) db.createObjectStore(STORE_BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadMeta(): Promise<DownloadRecord[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).getAll();
    req.onsuccess = () => res(req.result as DownloadRecord[]);
    req.onerror = () => rej(req.error);
  });
}

async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const req = tx.objectStore(STORE_BLOBS).get(id);
    req.onsuccess = () => res(req.result as Blob ?? null);
    req.onerror = () => rej(req.error);
  });
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction([STORE_META, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_META).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export default function DownloadsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadMeta().then((data) => { setRecords(data.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handlePlay = async (rec: DownloadRecord) => {
    setPlayingId(rec.id);
    try {
      const blob = await getBlob(rec.id);
      if (!blob) { alert('File not found. It may have been cleared by the browser.'); setPlayingId(null); return; }
      const zip = await JSZip.loadAsync(blob);

      // Find video file
      const videoEntry = Object.values(zip.files).find((f) => !f.dir && (f.name.endsWith('.mp4') || f.name.endsWith('.mkv')));
      if (!videoEntry) { alert('Video not found in ZIP'); setPlayingId(null); return; }
      const videoBlob = await videoEntry.async('blob');
      const videoUrl = URL.createObjectURL(videoBlob);

      // Find subtitles
      const subs: Array<{ language: string; label: string; url: string }> = [];
      for (const [name, file] of Object.entries(zip.files)) {
        if (!file.dir && name.startsWith('subtitles/') && name.endsWith('.vtt')) {
          const subBlob = await file.async('blob');
          const subUrl = URL.createObjectURL(subBlob);
          const lang = name.replace('subtitles/', '').replace('.vtt', '');
          subs.push({ language: lang, label: lang === 'si' ? 'Sinhala' : lang === 'en' ? 'English' : lang, url: subUrl });
        }
      }

      // Store in sessionStorage so the player page can read it
      const key = `offline_${rec.id}`;
      sessionStorage.setItem(key, JSON.stringify({ videoUrl, subtitles: subs, title: rec.title }));
      router.push(`/player?offlineKey=${encodeURIComponent(key)}`);
    } catch (e) {
      console.error('[Downloads] play error', e);
      alert('Could not open the downloaded file.');
    }
    setPlayingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this download?')) return;
    await deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="page-content">
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: 16, paddingRight: 16, paddingBottom: 16,
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Downloads</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Downloaded episodes play offline. Stored as ZIP files.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '0 16px' }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 12 }} />)}
        </div>
      ) : records.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
          <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, fontWeight: 600 }}>No Downloads Yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', maxWidth: 260 }}>
            Go to any drama or movie and tap the download button to save episodes for offline viewing.
          </p>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {records.map((rec) => (
            <div key={rec.id} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 12px', marginBottom: 10,
            }}>
              <img src={rec.thumbnail} alt={rec.title} style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }} className="line-clamp-2">{rec.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {new Date(rec.downloadedAt).toLocaleDateString()}
                </div>
              </div>
              {/* Play */}
              <button
                onPointerDown={loadMonetagOnclickAd}
                onClick={() => handlePlay(rec)}
                disabled={playingId === rec.id}
                style={{ padding: 8, color: 'var(--primary)', flexShrink: 0 }}
              >
                {playingId === rec.id
                  ? <div className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(0,217,255,0.3)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
                  : <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
                }
              </button>
              {/* Delete */}
              <button onClick={() => handleDelete(rec.id)} style={{ padding: 8, color: 'var(--text-muted)', flexShrink: 0 }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round"/>
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
