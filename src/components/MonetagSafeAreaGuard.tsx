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
  const cssSafeTop = Number.isFinite(value) ? value : 0;
  if (cssSafeTop > 0) return cssSafeTop;

  // Some iPhone Safari/PWA contexts report env(safe-area-inset-top) as 0
  // even though top-fixed third-party ads still overlap the status bar.
  const isIphone = /iPhone/.test(navigator.userAgent);
  if (!isIphone) return 0;

  const shortSide = Math.min(window.screen.width, window.screen.height);
  const longSide = Math.max(window.screen.width, window.screen.height);

  if (shortSide <= 375 && longSide <= 667) return 24;
  if (shortSide <= 414 && longSide <= 896) return 44;
  return 54;
}

function shouldMoveElement(element: Element, safeTop: number): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element.classList.contains('portrait-lock-overlay')) return false;
  if (['HTML', 'BODY', 'SCRIPT', 'STYLE', 'META', 'LINK'].includes(element.tagName)) return false;

  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 20) return false;
  if (rect.top > safeTop + 4) return false;

  const zIndex = Number.parseInt(style.zIndex || '0', 10);
  const isFloating = style.position === 'fixed' || style.position === 'sticky';
  const sourceText = [
    element.id,
    element.className,
    element.getAttribute('src'),
    element.getAttribute('data-zone'),
  ].join(' ');
  const hasAdFrame = Boolean(
    element.tagName === 'IFRAME' ||
    element.querySelector('iframe') ||
    element.querySelector('[src*="nap5k"], [src*="monetag"], [src*="propeller"]')
  );
  const looksLikeMonetag = /nap5k|monetag|propeller|11000647/i.test(sourceText);

  return isFloating && (hasAdFrame || looksLikeMonetag || zIndex >= 1000);
}

function applySafeAreaOffset() {
  const safeTop = readSafeAreaTop();
  if (safeTop <= 0) return;

  const targetTop = safeTop + 8;
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!shouldMoveElement(element, safeTop)) continue;
    const rect = element.getBoundingClientRect();
    const shift = Math.max(0, targetTop - rect.top);
    const originalTransform = element.dataset.monetagSafeAreaTransform ?? element.style.transform;

    element.dataset.monetagSafeAreaTransform = originalTransform;
    element.style.setProperty('top', `${targetTop}px`, 'important');
    element.style.setProperty('transform', `${originalTransform} translateY(${shift}px)`.trim(), 'important');
    element.style.setProperty('max-height', `calc(100vh - ${targetTop}px)`, 'important');
    element.dataset.monetagSafeAreaAdjusted = '1';
  }
}

function installSafeAreaStyle() {
  const safeTop = readSafeAreaTop();
  if (safeTop <= 0 || document.getElementById('monetag-safe-area-style')) return;

  const top = safeTop + 8;
  const style = document.createElement('style');
  style.id = 'monetag-safe-area-style';
  style.textContent = `
    iframe[src*="nap5k"],
    iframe[src*="monetag"],
    iframe[src*="propeller"],
    [id*="monetag" i],
    [class*="monetag" i],
    [id*="propeller" i],
    [class*="propeller" i],
    [data-zone="11000647"] {
      top: ${top}px !important;
      max-height: calc(100vh - ${top}px) !important;
    }
  `;
  document.head.appendChild(style);
}

export default function MonetagSafeAreaGuard() {
  useEffect(() => {
    installSafeAreaStyle();
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
