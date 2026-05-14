'use client';

export default function AdLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.58)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <div style={{
        minWidth: 150,
        minHeight: 128,
        borderRadius: 16,
        background: 'rgba(19,24,41,0.92)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 13,
        boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
      }}>
        <div
          className="spin"
          style={{
            width: 38,
            height: 38,
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
          }}
        />
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 650 }}>Loading Ad...</div>
      </div>
    </div>
  );
}
