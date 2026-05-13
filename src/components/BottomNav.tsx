'use client';
// src/components/BottomNav.tsx

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/context/NotificationsContext';

const tabs = [
  {
    href: '/', label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/search', label: 'Search',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <circle cx="11" cy="11" r="7" strokeLinecap="round" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },

  {
    href: '/notifications', label: 'Alerts', isNotif: true,
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active ? (
          <path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zm7-6.5V11a7 7 0 00-14 0v4.5l-1.7 2.27A1.4 1.4 0 004.42 20h15.16a1.4 1.4 0 001.12-2.23L19 15.5z" />
        ) : (
          <>
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    ),
  },
  {
    href: '/profile', label: 'Profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <circle cx="12" cy="8" r="4" strokeLinecap="round" />
        <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`bottom-nav-item${active ? ' active' : ''}`}>
            <span style={{ position: 'relative', display: 'flex' }}>
              {tab.icon(active)}
              {tab.isNotif && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--primary)',
                  border: '1.5px solid var(--bg-card)',
                }} />
              )}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
