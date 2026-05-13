'use client';

import { useEffect } from 'react';

function readSafeAreaTop(): number {
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.paddingTop = 'env(safe-area-inset-top)';
  document.body.appendChild(probe);

  const value = Number.parseFloat(getComputedStyle(probe).paddingTop || '0');
  probe.remove();
  return Number.isFinite(value) ? value : 0;
}

function shouldMoveElement(element: Element, safeTop: number): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element.classList.contains('portrait-lock-overlay')) return false;
  if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return false;
  if (element.dataset.monetagSafeAreaAdjusted === '1') return false;

  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (style.position !== 'fixed' && style.position !== 'sticky') return false;

  const top = Number.parseFloat(style.top || '9999');
  const zIndex = Number.parseInt(style.zIndex || '0', 10);
  const hasAdFrame = Boolean(
    element.querySelector('iframe') ||
    element.querySelector('[src*="nap5k"], [src*="monetag"], [src*="propeller"]')
  );

  return (hasAdFrame || zIndex >= 1000) && top <= Math.max(safeTop, 4);
}

function applySafeAreaOffset() {
  const safeTop = readSafeAreaTop();
  if (safeTop <= 0) return;

  const top = safeTop + 8;
  for (const element of Array.from(document.body.children)) {
    if (!shouldMoveElement(element, safeTop)) continue;
    element.style.setProperty('top', `${top}px`, 'important');
    element.style.setProperty('max-height', `calc(100vh - ${top}px)`, 'important');
    element.dataset.monetagSafeAreaAdjusted = '1';
  }
}

export default function MonetagSafeAreaGuard() {
  useEffect(() => {
    applySafeAreaOffset();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applySafeAreaOffset);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(applySafeAreaOffset, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
