/**
 * CookieShield — Verifier (Priority 2: never silently accept, never falsely report success)
 *
 * Three kinds of evidence, strongest first:
 *   1. STATE   – the consent platform's own API / consent cookie says no optional purpose is granted.
 *   2. CLICKED – we clicked a button whose label means "reject", and the banner went away,
 *                but the site exposes no machine-readable record we could double-check.
 *   3. NONE    – nothing we can stand behind → report an exception to the user.
 *
 * If the state says optional consent IS granted after our action, that is a failure and is
 * reported as such (never as success).
 */
(function () {
  'use strict';

  const L = () => window.CookieShieldLexicon;
  const D = () => window.CookieShieldDOM;

  let reqCounter = 0;

  /** Ask the MAIN-world bridge for consent state. */
  function requestPageState(only) {
    return new Promise(resolve => {
      const id = `cs-${Date.now()}-${++reqCounter}`;
      const onRes = (ev) => {
        let data = {};
        try { data = JSON.parse(ev.detail || '{}'); } catch (e) { return; }
        if (data.id !== id) return;
        document.removeEventListener('cookieshield:state-response', onRes);
        clearTimeout(timer);
        resolve(data.results || []);
      };
      const timer = setTimeout(() => {
        document.removeEventListener('cookieshield:state-response', onRes);
        resolve([]);
      }, 2500);
      document.addEventListener('cookieshield:state-response', onRes);
      document.dispatchEvent(new CustomEvent('cookieshield:state-request', { detail: JSON.stringify({ id, only }) }));
    });
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  /** Consent cookies that are readable from the content script (first-party, non-HttpOnly). */
  function readCookieStates() {
    const out = [];

    const ot = getCookie('OptanonConsent');
    if (ot && /groups=/.test(ot)) {
      const groups = (ot.match(/groups=([^&]*)/) || [])[1] || '';
      const pairs = decodeURIComponent(groups).split(',').map(p => p.split(':'));
      const granted = pairs.filter(([g, v]) => g && g !== 'C0001' && v === '1').map(([g]) => g);
      const decided = !!getCookie('OptanonAlertBoxClosed');
      out.push({ key: 'onetrust-cookie', source: 'OneTrust cookie', decided, optionalGranted: decided ? granted.length > 0 : null, granted, denied: [], evidence: `groups=${decodeURIComponent(groups)}` });
    }

    const cb = getCookie('CookieConsent');
    if (cb && /marketing:/.test(cb)) {
      const g = ['preferences', 'statistics', 'marketing'].filter(k => new RegExp(`${k}:true`).test(cb));
      out.push({ key: 'cookiebot-cookie', source: 'Cookiebot cookie', decided: true, optionalGranted: g.length > 0, granted: g, denied: [], evidence: cb.slice(0, 120) });
    }

    const ax = getCookie('axeptio_cookies');
    if (ax) {
      try {
        const o = JSON.parse(ax);
        const g = Object.keys(o).filter(k => !k.startsWith('$$') && o[k] === true);
        out.push({ key: 'axeptio', source: 'Axeptio cookie', decided: !!o.$$completed, optionalGranted: o.$$completed ? g.length > 0 : null, granted: g, denied: [], evidence: `${g.length} vendors accepted` });
      } catch (e) { /* ignore */ }
    }

    const cmplz = ['marketing', 'statistics', 'preferences'].map(k => [k, getCookie(`cmplz_${k}`)]).filter(([, v]) => v);
    if (cmplz.length) {
      const g = cmplz.filter(([, v]) => v === 'allow').map(([k]) => k);
      out.push({ key: 'complianz', source: 'Complianz cookie', decided: true, optionalGranted: g.length > 0, granted: g, denied: [], evidence: cmplz.map(([k, v]) => `${k}=${v}`).join(', ') });
    }

    const cky = getCookie('cookieyes-consent');
    if (cky) {
      const action = /action:yes/.test(cky);
      const g = ['functional', 'analytics', 'performance', 'advertisement', 'other'].filter(k => new RegExp(`${k}:yes`).test(cky));
      out.push({ key: 'cookieyes', source: 'CookieYes cookie', decided: action, optionalGranted: action ? g.length > 0 : null, granted: g, denied: [], evidence: cky.slice(0, 120) });
    }

    const tru = getCookie('notice_gdpr_prefs') || getCookie('cmapi_cookie_privacy');
    if (tru) {
      // TrustArc: "0:" or "permit 1 required" = required only; "0,1,2:" = more
      const reqOnly = /^0:?$/.test(tru.trim()) || /permit 1 required/.test(tru);
      out.push({ key: 'trustarc', source: 'TrustArc cookie', decided: true, optionalGranted: !reqOnly, granted: reqOnly ? [] : [tru], denied: [], evidence: tru.slice(0, 60) });
    }

    const brl = getCookie('borlabs-cookie');
    if (brl) {
      try {
        const o = JSON.parse(brl);
        const groups = Object.keys(o.consents || {}).filter(k => k !== 'essential');
        out.push({ key: 'borlabs', source: 'Borlabs cookie', decided: true, optionalGranted: groups.length > 0, granted: groups, denied: [], evidence: `consent groups: ${Object.keys(o.consents || {}).join(', ')}` });
      } catch (e) { /* ignore */ }
    }

    const shop = getCookie('_tracking_consent');
    if (shop) {
      try {
        const o = JSON.parse(shop);
        const p = o.purposes || {};
        const g = Object.keys(p).filter(k => p[k] === true && k !== 'e');
        out.push({ key: 'shopify', source: 'Shopify consent cookie', decided: true, optionalGranted: g.length > 0, granted: g, denied: [], evidence: JSON.stringify(p) });
      } catch (e) { /* ignore */ }
    }

    return out;
  }

  /** Combined consent state. `preferred` limits to the bridge readers relevant to a rule. */
  async function readState(preferred) {
    const page = await requestPageState(preferred && preferred.length ? preferred : undefined);
    const cookies = readCookieStates();
    const all = [...page, ...cookies];
    const decided = all.filter(r => r.decided && r.optionalGranted !== null);
    return {
      sources: all,
      decided: decided.length > 0,
      anyGranted: decided.some(r => r.optionalGranted === true),
      allDenied: decided.length > 0 && decided.every(r => r.optionalGranted === false),
      summary: decided.map(r => `${r.source}: ${r.evidence}`).join(' · ')
    };
  }

  /** Final safety gate before ANY click. Returns {ok, cls, reason}. */
  function canClick(el, intent, { fromRule = false } = {}) {
    if (!el) return { ok: false, reason: 'no element' };
    const label = D().labelOf(el);
    const cls = L().classify(label);
    const blob = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''} ${el.getAttribute('data-testid') || ''} ${el.getAttribute('data-action') || ''}`.toLowerCase();

    // Hard blocks — these are never clicked, rule or not.
    if (cls.type === 'ACCEPT_ALL' || cls.type === 'PAY' || cls.type === 'AMBIGUOUS') return { ok: false, cls, reason: `label means ${cls.type}` };
    if (/(accept|agree|allow)[-_]?all|acceptall|allowall|optin[-_]?all|btn-accept|accept-btn|sp_choice_type_11/.test(blob) && !/reject|deny|decline|refuse|necessary|essential|selection|selected/.test(blob)) {
      return { ok: false, cls, reason: 'id/class means accept' };
    }

    if (intent === 'REJECT') {
      if (cls.type === 'REJECT') return { ok: true, cls };
      if (fromRule && cls.type === 'UNKNOWN') return { ok: true, cls, reason: 'tested rule selector' };
      return { ok: false, cls, reason: `label is ${cls.type}` };
    }
    if (intent === 'SAVE') {
      // A tested rule may name e.g. Cookiebot's "Allow selection" button — allowed only because
      // the caller has already verified every optional toggle is OFF.
      if (cls.type === 'SAVE' || cls.type === 'REJECT') return { ok: true, cls };
      if (fromRule && (cls.type === 'ACCEPT' || cls.type === 'UNKNOWN')) return { ok: true, cls, reason: 'tested rule save button (selection verified off)' };
      return { ok: false, cls, reason: `label is ${cls.type}` };
    }
    if (intent === 'SETTINGS') {
      if (cls.type === 'SETTINGS' || (fromRule && cls.type === 'UNKNOWN')) return { ok: true, cls };
      return { ok: false, cls, reason: `label is ${cls.type}` };
    }
    return { ok: false, cls, reason: 'unknown intent' };
  }

  /** Is the banner gone (removed, hidden, or zero-size)? */
  function bannerGone(el) {
    return !el || !el.isConnected || !D().isVisible(el);
  }

  // --- Toggle handling ------------------------------------------------------------------

  function toggleLabel(t) {
    const id = t.id;
    let lbl = t.getAttribute('aria-label') || '';
    if (!lbl && t.getAttribute('aria-labelledby')) {
      const root = t.getRootNode();
      lbl = t.getAttribute('aria-labelledby').split(/\s+/).map(i => (root.getElementById ? root.getElementById(i) : null)).filter(Boolean).map(e => e.textContent).join(' ');
    }
    if (!lbl && id) {
      const root = t.getRootNode();
      const l = root.querySelector ? root.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      if (l) lbl = l.textContent;
    }
    if (!lbl) {
      const l = t.closest('label');
      if (l) lbl = l.textContent;
    }
    if (!lbl) {
      // Nearest row container
      let p = t.parentElement;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        const tx = (p.innerText || '').trim();
        if (tx.length > 2) { lbl = tx; break; }
      }
    }
    return (lbl || id || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  }

  function isOn(t) {
    if (t.tagName === 'INPUT') return !!t.checked;
    const a = t.getAttribute('aria-checked') || t.getAttribute('aria-pressed');
    if (a !== null) return a === 'true';
    if (t.getAttribute('data-state')) return t.getAttribute('data-state') === 'checked';
    return t.classList.contains('active') || t.classList.contains('checked') || t.classList.contains('on');
  }

  function isLocked(t) {
    return t.disabled || t.getAttribute('aria-disabled') === 'true' || t.getAttribute('aria-readonly') === 'true';
  }

  /**
   * Turn every optional toggle OFF inside `root`. Essential/locked toggles are left alone.
   * Returns {turnedOff:[labels], stillOn:[labels], essential:[labels]}.
   */
  async function deselectOptional(root, toggleSelector) {
    const sel = toggleSelector || 'input[type="checkbox"], [role="switch"], [role="checkbox"]';
    const toggles = D().deepQueryAll(sel, root).filter(t => t.tagName !== 'INPUT' || t.type === 'checkbox');
    const turnedOff = [], essential = [], stillOn = [];
    for (const t of toggles) {
      const label = toggleLabel(t);
      if (isLocked(t) || L().isEssentialLabel(label)) { essential.push(label); continue; }
      if (!isOn(t)) continue;
      // Real user-style click so the CMP's own listeners update its model.
      const target = t.tagName === 'INPUT' && !D().isVisible(t) ? (t.closest('label') || t.parentElement) : t;
      D().safeClick(target);
      await D().wait(60);
      if (isOn(t) && t.tagName === 'INPUT') {
        // Some custom UIs hide the input behind a styled label; set it directly as a fallback.
        t.checked = false;
        t.dispatchEvent(new Event('input', { bubbles: true }));
        t.dispatchEvent(new Event('change', { bubbles: true }));
      }
      (isOn(t) ? stillOn : turnedOff).push(label);
    }
    // Re-read everything: nothing optional may remain ON.
    for (const t of toggles) {
      const label = toggleLabel(t);
      if (isLocked(t) || L().isEssentialLabel(label)) continue;
      if (isOn(t) && !stillOn.includes(label)) stillOn.push(label);
    }
    return { turnedOff, stillOn, essential, total: toggles.length };
  }

  window.CookieShieldVerifier = { requestPageState, readCookieStates, readState, canClick, bannerGone, deselectOptional, toggleLabel, isOn };
})();
