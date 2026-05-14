const MONETAG_ONCLICK_SCRIPT_ID = 'monetag-popunder-script';
const MONETAG_ONCLICK_SRC = 'https://al5sm.com/tag.min.js';
const MONETAG_IN_PAGE_PUSH_SCRIPT_ID = 'monetag-in-page-push';
const MONETAG_IN_PAGE_PUSH_SRC = 'https://nap5k.com/tag.min.js';
const MONETAG_VIGNETTE_SCRIPT_ID = 'monetag-vignette-script';
const MONETAG_VIGNETTE_SRC = 'https://n6wxm.com/vignette.min.js';
const MONETAG_SDK_SCRIPT_ID = 'monetag-sdk-script';
const MONETAG_SDK_SRC = process.env.NEXT_PUBLIC_MONETAG_SDK_SRC ?? '';
const MONETAG_SDK_ZONE = process.env.NEXT_PUBLIC_MONETAG_SDK_ZONE ?? '';
const MONETAG_SDK_FN = process.env.NEXT_PUBLIC_MONETAG_SDK_FN || (MONETAG_SDK_ZONE ? `show_${MONETAG_SDK_ZONE}` : '');
let onclickCleanupTimer: number | null = null;
let popupBlockTimer: number | null = null;
let popupOpenOriginal: typeof window.open | null = null;
let sdkLoadPromise: Promise<boolean> | null = null;
const popupOpenBlocker = (() => null) as typeof window.open;

type MonetagSdkResult = {
  reward_event_type?: 'valued' | 'non_valued';
  estimated_price?: number;
  sub_zone_id?: number;
  zone_id?: number;
  request_var?: string;
  ymid?: string;
};

type MonetagSdkOptions = {
  type?: 'end' | 'start' | 'preload' | 'pop' | 'inApp';
  ymid?: string;
  requestVar?: string;
  timeout?: number;
  catchIfNoFeed?: boolean;
};

type MonetagSdkFunction = (options?: MonetagSdkOptions | string) => Promise<MonetagSdkResult>;

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

export function removeMonetagOnclickAd() {
  if (typeof document === 'undefined') return;
  if (onclickCleanupTimer) {
    window.clearTimeout(onclickCleanupTimer);
    onclickCleanupTimer = null;
  }
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

export function loadMonetagSdk() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(false);
  if (!MONETAG_SDK_SRC || !MONETAG_SDK_ZONE || !MONETAG_SDK_FN) return Promise.resolve(false);
  if (typeof window[MONETAG_SDK_FN as keyof Window] === 'function') return Promise.resolve(true);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<boolean>((resolve) => {
    const existing = document.getElementById(MONETAG_SDK_SCRIPT_ID) as HTMLScriptElement | null;

    const finish = (loaded: boolean) => {
      sdkLoadPromise = null;
      resolve(loaded && typeof window[MONETAG_SDK_FN as keyof Window] === 'function');
    };

    if (existing) {
      existing.addEventListener('load', () => finish(true), { once: true });
      existing.addEventListener('error', () => finish(false), { once: true });
      return;
    }

    const scriptHost = [document.documentElement, document.body].filter(Boolean).pop();
    if (!scriptHost) {
      finish(false);
      return;
    }

    const script = document.createElement('script');
    script.id = MONETAG_SDK_SCRIPT_ID;
    script.src = MONETAG_SDK_SRC;
    script.dataset.zone = MONETAG_SDK_ZONE;
    script.dataset.sdk = MONETAG_SDK_FN;
    script.async = true;
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    scriptHost.appendChild(script);
  });

  return sdkLoadPromise;
}

function getMonetagSdkFunction(): MonetagSdkFunction | null {
  if (typeof window === 'undefined' || !MONETAG_SDK_FN) return null;
  const sdkFn = window[MONETAG_SDK_FN as keyof Window];
  return typeof sdkFn === 'function' ? sdkFn as MonetagSdkFunction : null;
}

export async function preloadMonetagSdkAd(requestVar: string) {
  const loaded = await loadMonetagSdk();
  const sdkFn = loaded ? getMonetagSdkFunction() : null;
  if (!sdkFn) return false;

  try {
    await sdkFn({ type: 'preload', requestVar, timeout: 5, catchIfNoFeed: true });
    return true;
  } catch {
    return false;
  }
}

export async function showMonetagSdkAd(requestVar: string) {
  const loaded = await loadMonetagSdk();
  const sdkFn = loaded ? getMonetagSdkFunction() : null;
  if (!sdkFn) return false;

  try {
    await sdkFn({
      type: 'end',
      requestVar,
      ymid: `${requestVar}_${Date.now()}`,
      catchIfNoFeed: true,
    });
    return true;
  } catch {
    return false;
  }
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
