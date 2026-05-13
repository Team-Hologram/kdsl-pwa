'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { removeMonetagOnclickAd } from '@/lib/monetagAds';

export default function MonetagRouteGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/player')) {
      removeMonetagOnclickAd();
    }
  }, [pathname]);

  return null;
}
