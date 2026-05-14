const MONETAG_ONCLICK_SCRIPT_ID = 'monetag-popunder-script';
const MONETAG_ONCLICK_SRC = 'https://al5sm.com/tag.min.js';
const MONETAG_IN_PAGE_PUSH_SCRIPT_ID = 'monetag-in-page-push';
const MONETAG_IN_PAGE_PUSH_SRC = 'https://nap5k.com/tag.min.js';
const MONETAG_VIGNETTE_SCRIPT_ID = 'monetag-vignette-script';
const MONETAG_VIGNETTE_SRC = 'https://n6wxm.com/vignette.min.js';
let onclickCleanupTimer: number | null = null;
let popupBlockTimer: number | null = null;
let popupOpenOriginal: typeof window.open | null = null;
let onclickLoadPromise: Promise<boolean> | null = null;
const popupOpenBlocker = (() => null) as typeof window.open;

function restoreWindowOpen() {
  if (typeof window === 'undefined') return;
  if (popupBlockTimer) {
    window.clearTimeout(popupBlockTimer);
    popupBlockTimer = null;
  }
  if (popupOpenOriginal && window.open === popupOpenBlocker) {
    window.open = popupOpenOriginal;
  }
  popupOpenOriginal = null;
}

function blockWindowOpenFor(durationMs: number) {
  if (typeof window === 'undefined') return;
  if (!popupOpenOriginal) {
    popupOpenOriginal = window.open;
    window.open = popupOpenBlocker;
  }
  if (popupBlockTimer) window.clearTimeout(popupBlockTimer);
  popupBlockTimer = window.setTimeout(restoreWindowOpen, durationMs);
}

function cleanupAfterCurrentInteraction() {
  if (typeof window === 'undefined') return;

  const cleanup = () => {
    window.setTimeout(removeMonetagOnclickAd, 100);
  };

  window.addEventListener('pointerup', cleanup, { once: true, capture: true });
  window.addEventListener('touchend', cleanup, { once: true, capture: true });
  window.addEventListener('click', cleanup, { once: true, capture: true });
}

export function loadMonetagOnclickAd() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MONETAG_ONCLICK_SCRIPT_ID)) return;

  const scriptHost = [document.documentElement, document.body].filter(Boolean).pop();
  if (!scriptHost) return;

  const script = document.createElement('script');
  script.id = MONETAG_ONCLICK_SCRIPT_ID;
  script.dataset.zone = '11000625';
  script.src = MONETAG_ONCLICK_SRC;
  script.async = true;
  scriptHost.appendChild(script);
  cleanupAfterCurrentInteraction();

  if (onclickCleanupTimer) window.clearTimeout(onclickCleanupTimer);
  onclickCleanupTimer = window.setTimeout(() => {
    removeMonetagOnclickAd();
    onclickCleanupTimer = null;
  }, 900);
}

export function waitForMonetagOnclickAd(timeoutMs = 2800) {
  if (typeof document === 'undefined') return Promise.resolve(false);

  const existing = document.getElementById(MONETAG_ONCLICK_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return Promise.resolve(true);
  if (onclickLoadPromise) return onclickLoadPromise;

  const scriptHost = [document.documentElement, document.body].filter(Boolean).pop();
  if (!scriptHost) return Promise.resolve(false);

  onclickLoadPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (!loaded) script.remove();
      onclickLoadPromise = null;
      resolve(loaded);
    };

    const script = document.createElement('script');
    script.id = MONETAG_ONCLICK_SCRIPT_ID;
    script.dataset.zone = '11000625';
    script.src = MONETAG_ONCLICK_SRC;
    script.async = true;
    script.onload = () => finish(true);
    script.onerror = () => finish(false);

    const timeout = window.setTimeout(() => finish(false), timeoutMs);
    scriptHost.appendChild(script);
    cleanupAfterCurrentInteraction();

    if (onclickCleanupTimer) window.clearTimeout(onclickCleanupTimer);
    onclickCleanupTimer = window.setTimeout(() => {
      removeMonetagOnclickAd();
      onclickCleanupTimer = null;
    }, Math.max(timeoutMs + 900, 1800));
  });

  return onclickLoadPromise;
}

export function removeMonetagOnclickAd() {
  if (typeof document === 'undefined') return;
  if (onclickCleanupTimer) {
    window.clearTimeout(onclickCleanupTimer);
    onclickCleanupTimer = null;
  }
  onclickLoadPromise = null;

  document.getElementById(MONETAG_ONCLICK_SCRIPT_ID)?.remove();
  document
    .querySelectorAll<HTMLScriptElement>(`script[src="${MONETAG_ONCLICK_SRC}"]`)
    .forEach((script) => script.remove());
}

export function removeMonetagInPagePushAd() {
  if (typeof document === 'undefined') return;

  document.getElementById(MONETAG_IN_PAGE_PUSH_SCRIPT_ID)?.remove();
  document
    .querySelectorAll<HTMLScriptElement>(`script[src="${MONETAG_IN_PAGE_PUSH_SRC}"]`)
    .forEach((script) => script.remove());
}

export function loadMonetagVignetteAd() {
  if (typeof document === 'undefined') return;

  removeMonetagVignetteAd();

  const scriptHost = [document.documentElement, document.body].filter(Boolean).pop();
  if (!scriptHost) return;

  const script = document.createElement('script');
  script.id = MONETAG_VIGNETTE_SCRIPT_ID;
  script.dataset.zone = '11004290';
  script.src = MONETAG_VIGNETTE_SRC;
  scriptHost.appendChild(script);
}

export function removeMonetagVignetteAd() {
  if (typeof document === 'undefined') return;

  document.getElementById(MONETAG_VIGNETTE_SCRIPT_ID)?.remove();
  document
    .querySelectorAll<HTMLScriptElement>(`script[src="${MONETAG_VIGNETTE_SRC}"]`)
    .forEach((script) => script.remove());
}

export function removeAllMonetagAdScripts() {
  removeMonetagOnclickAd();
  removeMonetagInPagePushAd();
  removeMonetagVignetteAd();
}

export function suppressMonetagOnclickAds(durationMs = 1500) {
  if (typeof window === 'undefined') return;
  removeMonetagOnclickAd();
  blockWindowOpenFor(durationMs);
  window.setTimeout(removeMonetagOnclickAd, 0);
  window.setTimeout(removeMonetagOnclickAd, 150);
  window.setTimeout(removeMonetagOnclickAd, 450);
}

export function blockPopupAdsWhileMounted() {
  if (typeof window === 'undefined') return () => {};

  const originalOpen = window.open;
  window.open = (() => null) as typeof window.open;

  return () => {
    if (window.open !== originalOpen) {
      window.open = originalOpen;
    }
  };
}
