'use client';
// src/app/search/page.tsx

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaContext } from '@/context/MediaContext';
import { Media } from '@/lib/types';
import MediaCard from '@/components/MediaCard';

export default function SearchPage() {
  const { all, loading } = useMediaContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const genres = useMemo(() => Array.from(new Set(all.flatMap((m) => m.genres))).sort(), [all]);

  const filtered = useMemo(() => {
    return all.filter((m) => {
      const matchQ = !query || m.title.toLowerCase().includes(query.toLowerCase()) || m.titleSinhala?.toLowerCase().includes(query.toLowerCase());
      const matchG = !selectedGenre || m.genres.includes(selectedGenre);
      return matchQ && matchG;
    });
  }, [all, query, selectedGenre]);

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)',
        paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-card)', borderRadius: 14, padding: '12px 14px',
            border: '1px solid var(--border)',
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={2}>
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input
              className="input"
              style={{ background: 'transparent', border: 'none', padding: 0, flex: 1, fontSize: 15 }}
              placeholder="Search dramas, movies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'var(--text-secondary)' }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
              </button>
            )}
          </div>
          {/* Filter button */}
          <button
            onClick={() => setShowFilter(true)}
            style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: selectedGenre ? 'var(--primary)' : 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: selectedGenre ? '#0A0E27' : 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {selectedGenre && (
              <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#FF4757', border: '1.5px solid var(--bg-card)' }} />
            )}
          </button>
        </div>

        {/* Active filter chip */}
        {selectedGenre && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Filtered:</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,217,255,0.12)', border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-full)', padding: '3px 10px',
            }}>
              <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{selectedGenre}</span>
              <button onClick={() => setSelectedGenre(null)} style={{ color: 'var(--primary)', lineHeight: 1, display: 'flex' }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px' }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
          <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5}>
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>No results found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px' }}>
          {filtered.map((m) => (
            <MediaCard key={m.id} media={m} onPress={() => router.push(`/details/${m.id}`)} />
          ))}
        </div>
      )}

      {/* Filter bottom sheet */}
      {showFilter && (
        <>
          <div
            onClick={() => setShowFilter(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'var(--bg-card)',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '12px 0 calc(var(--nav-height) + env(safe-area-inset-bottom) + 8px)',
            maxHeight: '70vh', overflowY: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out',
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Filter by Category</span>
              <button onClick={() => setShowFilter(false)} style={{ color: 'var(--text-secondary)' }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 16px' }}>
              {[null, ...genres].map((g) => {
                const isActive = selectedGenre === g;
                return (
                  <button
                    key={g ?? '__all__'}
                    onClick={() => { setSelectedGenre(g); setShowFilter(false); }}
                    style={{
                      padding: '10px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600,
                      background: isActive ? 'var(--primary)' : 'var(--bg-elevated)',
                      color: isActive ? '#0A0E27' : 'var(--text)',
                      border: `1.5px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    }}
                  >
                    {g ?? 'All'}
                    {isActive && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
