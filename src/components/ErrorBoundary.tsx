'use client';
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface State { error: Error | null }
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{ padding: 24, color: '#ff4757', fontFamily: 'monospace', fontSize: 13, background: '#0A0E27', minHeight: '50dvh' }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ Render Error</p>
          <p style={{ wordBreak: 'break-all', color: '#ccc' }}>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', background: '#00D9FF', color: '#000', borderRadius: 8, fontWeight: 600 }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
