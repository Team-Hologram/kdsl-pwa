'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { removeAllMonetagAdScripts, removeMonetagOnclickAd } from '@/lib/monetagAds';

export default function MonetagRouteGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/player')) {
      removeAllMonetagAdScripts();
      return;
    }

    if (pathname !== '/') {
      removeMonetagOnclickAd();
    }
  }, [pathname]);

  return null;
}
