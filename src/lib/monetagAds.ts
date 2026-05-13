const MONETAG_ONCLICK_SCRIPT_ID = 'monetag-popunder-script';

export function loadMonetagOnclickAd() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MONETAG_ONCLICK_SCRIPT_ID)) return;

  const scriptHost = [document.documentElement, document.body].filter(Boolean).pop();
  if (!scriptHost) return;

  const script = document.createElement('script');
  script.id = MONETAG_ONCLICK_SCRIPT_ID;
  script.dataset.zone = '11000625';
  script.src = 'https://al5sm.com/tag.min.js';
  script.async = true;
  scriptHost.appendChild(script);
}
