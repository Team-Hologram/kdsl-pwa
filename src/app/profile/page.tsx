'use client';
// src/app/profile/page.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalUser } from '@/hooks/useLocalUser';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useLocalUser();
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingName, setRatingName] = useState('');
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const handleShare = async () => {
    try {
      await navigator.share({ title: 'KDrama SL', text: 'Watch Korean dramas with Sinhala subtitles! 🎬', url: window.location.origin });
    } catch { showToast('Share cancelled'); }
  };

  const handleSubmitRating = async () => {
    if (!rating || ratingSubmitting) return;
    setRatingSubmitting(true);
    try {
      const nameToSave = ratingName.trim().slice(0, 80) || 'Anonymous';
      const feedbackToSave = ratingFeedback.trim().slice(0, 600);

      await addDoc(collection(db, 'ratings'), {
        name: nameToSave,
        feedback: feedbackToSave,
        rating,
        timestamp: serverTimestamp(),
      });
      setRatingDone(true);
      setTimeout(() => {
        setShowRateModal(false);
        setRatingDone(false);
        setRating(0);
        setRatingName('');
        setRatingFeedback('');
      }, 1800);
    } catch (error) {
      console.error('[Profile] rating submit failed:', error);
      showToast('Could not submit. Try again.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const menuItems = [
    {
      icon: theme === 'dark' ? '🌙' : '☀️', label: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
      subtitle: 'Toggle app theme', isToggle: true,
      action: toggleTheme,
    },
    {
      icon: '⭐', label: 'Rate the App', subtitle: 'Tell us what you think',
      action: () => setShowRateModal(true),
    },
    {
      icon: '💬', label: 'Suggest a K-Drama', subtitle: 'Request via WhatsApp',
      action: () => window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''}?text=${encodeURIComponent('Hi! I\'d like to suggest a K-Drama for the app: ')}`, '_blank'),
    },
    {
      icon: '📤', label: 'Share with Friends', subtitle: 'Invite others to the app',
      action: handleShare,
    },
    {
      icon: 'ℹ️', label: 'About', subtitle: 'App version & info',
      action: () => router.push('/about'),
    },
  ];

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 8px) 20px 20px',
        background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(123,47,255,0.06) 100%)',
        borderBottom: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        {/* App logo */}
        <div style={{ width: 80, height: 80, borderRadius: 20, margin: '0 auto 12px', overflow: 'hidden' }}>
          <img src="/icons/icon-192.png" alt="KDrama SL" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>KDrama SL</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Your K-Drama companion</p>
      </div>

      {/* Menu items */}
      <div style={{ padding: '12px 16px' }}>
        {menuItems.map((item, i) => (
          <div
            key={i}
            onClick={item.action}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
          >
            <span style={{ fontSize: 26, width: 36, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.subtitle}</div>
            </div>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8 }}>KDrama SL · Built with ❤️</p>

      {/* Rate Modal */}
      {showRateModal && (
        <>
          <div onClick={() => setShowRateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'var(--bg-card)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '24px 24px calc(var(--nav-height) + 16px)',
            animation: 'slideUp 0.3s ease-out',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

            {ratingDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🙏</div>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Thanks for your feedback!</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Rate KDrama SL</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>How would you rate your experience?</p>

                <input
                  className="input"
                  style={{ marginBottom: 16 }}
                  placeholder="Your name (optional)"
                  value={ratingName}
                  maxLength={80}
                  onChange={(e) => setRatingName(e.target.value)}
                />

                {/* Stars */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setRatingHover(s)}
                      onMouseLeave={() => setRatingHover(0)}
                      style={{ fontSize: 40, transition: 'transform 0.15s', transform: (ratingHover || rating) >= s ? 'scale(1.15)' : 'scale(1)' }}
                    >
                      {(ratingHover || rating) >= s ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>

                {rating > 0 && (
                  <textarea
                    className="input"
                    style={{ marginBottom: 16, minHeight: 80, resize: 'none' }}
                    placeholder="Add a comment (optional)..."
                    value={ratingFeedback}
                    maxLength={600}
                    onChange={(e) => setRatingFeedback(e.target.value)}
                  />
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', height: 52, opacity: rating === 0 ? 0.4 : 1 }}
                  disabled={rating === 0 || ratingSubmitting}
                  onClick={handleSubmitRating}
                >
                  {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
