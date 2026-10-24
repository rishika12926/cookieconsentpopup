/**
 * CookieShield — Page bridge (runs in the page's MAIN world)
 *
 * Content scripts live in an isolated world and cannot see the page's JavaScript objects.
 * Consent platforms expose the *actual* stored decision through page-level APIs
 * (IAB TCF __tcfapi, OneTrust, Cookiebot, Didomi, Usercentrics, Osano, Klaro, Google Consent Mode).
 * This bridge only READS those APIs and answers the content script — it never changes consent.
 *
 * Protocol (strings only, so nothing leaks between worlds):
 *   content → page : document event 'cookieshield:state-request'  detail = JSON {id}
 *   page → content : document event 'cookieshield:state-response' detail = JSON {id, results:[...]}
 */
(function () {
  'use strict';
  if (window.__cookieShieldBridge) return;
  window.__cookieShieldBridge = true;

  const ESSENTIAL_RE = /necessary|essential|required|strictly|notwendig|essenziell|funktional|technical|c0001/i;

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise(r => setTimeout(() => r(null), ms))]);
  }

  // --- Individual readers. Each returns null (not present) or
  //     { source, decided:boolean, optionalGranted:boolean|null, granted:[], denied:[], evidence }

  function readTCF() {
    if (typeof window.__tcfapi !== 'function') return Promise.resolve(null);
    return withTimeout(new Promise(resolve => {
      try {
        window.__tcfapi('getTCData', 2, (tc, ok) => {
          if (!ok || !tc) return resolve({ source: 'IAB TCF v2', decided: false, optionalGranted: null, granted: [], denied: [], evidence: 'TCF API present but returned no data' });
          const consents = (tc.purpose && tc.purpose.consents) || {};
          const granted = Object.keys(consents).filter(k => consents[k]).map(k => `Purpose ${k}`);
          const denied = Object.keys(consents).filter(k => !consents[k]).map(k => `Purpose ${k}`);
          const vendorConsents = (tc.vendor && tc.vendor.consents) || {};
          const vendorsGranted = Object.keys(vendorConsents).filter(k => vendorConsents[k]).length;
          const li = (tc.purpose && tc.purpose.legitimateInterests) || {};
          const liActive = Object.keys(li).filter(k => li[k]).length;
          const decided = tc.eventStatus === 'useractioncomplete' || (tc.eventStatus === 'tcloaded' && !!tc.tcString);
          resolve({
            source: 'IAB TCF v2',
            decided,
            optionalGranted: decided ? (granted.length > 0 || vendorsGranted > 0) : null,
            granted, denied,
            evidence: decided
              ? `${granted.length} purpose consents and ${vendorsGranted} vendor consents granted` +
                (liActive ? `; ${liActive} purposes still claimed under "legitimate interest"` : '')
              : 'Waiting for a decision (no TC string yet)'
          });
        });
      } catch (e) { resolve(null); }
    }), 1200);
  }

  function readOneTrust() {
    const groups = window.OnetrustActiveGroups || window.OptanonActiveGroups;
    const hasSdk = !!(window.OneTrust || window.Optanon);
    if (!hasSdk && typeof groups !== 'string') return Promise.resolve(null);
    const active = String(groups || '').split(',').map(s => s.trim()).filter(Boolean);
    let decided = false;
    try { decided = typeof window.OneTrust?.IsAlertBoxClosed === 'function' ? window.OneTrust.IsAlertBoxClosed() : /OptanonAlertBoxClosed=/.test(document.cookie); } catch (e) { /* ignore */ }
    const optional = active.filter(g => g !== 'C0001' && !/^C0001$/i.test(g));
    // OneTrust uses C0001 for strictly necessary. Others (C0002 performance, C0003 functional, C0004 targeting, C0005 social, V2STACKx / ISFxx for IAB) are optional.
    return Promise.resolve({
      source: 'OneTrust',
      decided,
      optionalGranted: decided ? optional.length > 0 : null,
      granted: optional,
      denied: [],
      evidence: decided ? `Active groups: ${active.join(', ') || 'none'}` : 'Banner not answered yet'
    });
  }

  function readCookiebot() {
    const cb = window.Cookiebot || window.CookieConsent;
    if (!cb || typeof cb !== 'object' || !('consent' in cb)) return Promise.resolve(null);
    const c = cb.consent || {};
    const decided = !!cb.hasResponse;
    const cats = ['preferences', 'statistics', 'marketing'];
    const granted = cats.filter(k => c[k]);
    return Promise.resolve({
      source: 'Cookiebot',
      decided,
      optionalGranted: decided ? granted.length > 0 : null,
      granted,
      denied: cats.filter(k => !c[k]),
      evidence: decided ? `preferences=${!!c.preferences}, statistics=${!!c.statistics}, marketing=${!!c.marketing}` : 'Banner not answered yet'
    });
  }

  function readDidomi() {
    const d = window.Didomi;
    if (!d || typeof d !== 'object') return Promise.resolve(null);
    try {
      const decided = typeof d.shouldConsentBeCollected === 'function' ? !d.shouldConsentBeCollected() : null;
      let granted = [], denied = [];
      if (typeof d.getCurrentUserStatus === 'function') {
        const st = d.getCurrentUserStatus() || {};
        const p = st.purposes || {};
        for (const [id, v] of Object.entries(p)) (v && v.enabled ? granted : denied).push(id);
      } else if (typeof d.getUserConsentStatusForAll === 'function') {
        const st = d.getUserConsentStatusForAll() || {};
        granted = (st.purposes && st.purposes.enabled) || [];
        denied = (st.purposes && st.purposes.disabled) || [];
      }
      granted = granted.filter(id => !ESSENTIAL_RE.test(id));
      return Promise.resolve({
        source: 'Didomi',
        decided: !!decided,
        optionalGranted: decided ? granted.length > 0 : null,
        granted, denied,
        evidence: decided ? `${granted.length} purposes enabled, ${denied.length} disabled` : 'Banner not answered yet'
      });
    } catch (e) { return Promise.resolve(null); }
  }

  async function readUsercentrics() {
    try {
      if (window.__ucCmp && typeof window.__ucCmp.getConsentDetails === 'function') {
        const det = await withTimeout(window.__ucCmp.getConsentDetails(), 1000);
        if (det) {
          const services = Object.values(det.services || {});
          const cats = det.categories || {};
          const optional = services.filter(s => {
            const cat = cats[s.category] || {};
            return !(cat.essential || /essential/i.test(s.category || ''));
          });
          const granted = optional.filter(s => s.consent && s.consent.given).map(s => s.name || s.id);
          const decided = !!(det.consent && det.consent.setting && det.consent.setting.type !== 'IMPLICIT') || (det.consent && det.consent.type === 'EXPLICIT');
          return { source: 'Usercentrics v3', decided, optionalGranted: decided ? granted.length > 0 : null, granted, denied: [], evidence: `${granted.length} optional services granted` };
        }
      }
      if (window.UC_UI && typeof window.UC_UI.getServicesBaseInfo === 'function') {
        const services = window.UC_UI.getServicesBaseInfo() || [];
        const optional = services.filter(s => !/essential/i.test(s.categorySlug || ''));
        const granted = optional.filter(s => s.consent && s.consent.status).map(s => s.name);
        const history = services.some(s => s.consent && Array.isArray(s.consent.history) && s.consent.history.some(h => h.type === 'explicit'));
        const decided = typeof window.UC_UI.isConsentRequired === 'function' ? !window.UC_UI.isConsentRequired() : history;
        return { source: 'Usercentrics', decided, optionalGranted: decided ? granted.length > 0 : null, granted, denied: [], evidence: `${granted.length} of ${optional.length} optional services granted` };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function readOsano() {
    const cm = window.Osano && window.Osano.cm;
    if (!cm || typeof cm.getConsent !== 'function') return Promise.resolve(null);
    const c = cm.getConsent() || {};
    const optional = Object.keys(c).filter(k => !/ESSENTIAL|OPT_OUT/i.test(k));
    const granted = optional.filter(k => c[k] === 'ACCEPT');
    const decided = typeof cm.dialogOpen === 'boolean' ? !cm.dialogOpen : true;
    return Promise.resolve({ source: 'Osano', decided, optionalGranted: decided ? granted.length > 0 : null, granted, denied: optional.filter(k => c[k] !== 'ACCEPT'), evidence: optional.map(k => `${k}=${c[k]}`).join(', ') });
  }

  function readKlaro() {
    try {
      const k = window.klaro;
      if (!k || typeof k.getManager !== 'function') return Promise.resolve(null);
      const m = k.getManager();
      const apps = (m.config && (m.config.services || m.config.apps)) || [];
      const optional = apps.filter(a => !a.required);
      const granted = optional.filter(a => m.consents && m.consents[a.name]).map(a => a.name);
      const decided = !!m.confirmed;
      return Promise.resolve({ source: 'Klaro', decided, optionalGranted: decided ? granted.length > 0 : null, granted, denied: [], evidence: `${granted.length} of ${optional.length} optional services granted` });
    } catch (e) { return Promise.resolve(null); }
  }

  /** Google Consent Mode: last gtag('consent', 'update' | 'default', {...}) call in dataLayer. */
  function readConsentMode() {
    const dl = window.dataLayer;
    if (!Array.isArray(dl)) return Promise.resolve(null);
    let last = null, lastUpdate = null;
    for (const entry of dl) {
      if (entry && typeof entry === 'object' && entry[0] === 'consent' && entry[2] && typeof entry[2] === 'object') {
        last = entry;
        if (entry[1] === 'update') lastUpdate = entry;
      }
    }
    if (!last) return Promise.resolve(null);
    const s = (lastUpdate || last)[2];
    const keys = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization', 'personalization_storage'];
    const present = keys.filter(k => k in s);
    const granted = present.filter(k => s[k] === 'granted');
    return Promise.resolve({
      source: 'Google Consent Mode',
      decided: !!lastUpdate,
      optionalGranted: lastUpdate ? granted.length > 0 : null,
      granted, denied: present.filter(k => s[k] !== 'granted'),
      evidence: present.map(k => `${k}=${s[k]}`).join(', ')
    });
  }

  // --- US state privacy laws (CCPA/CPRA, VA, CO, CT…). These are OPT-OUT regimes: sale, sharing
  //     and targeted advertising are ON until the person opts out, so "not opted out" counts as
  //     optional consent still granted. regime:'us' lets the content script tell them apart.

  /** IAB Global Privacy Platform (GPP) — US national and state sections. */
  const GPP_US_FIELDS = { SaleOptOut: 'sale', SharingOptOut: 'sharing', TargetedAdvertisingOptOut: 'targeted advertising' };
  function readGPP() {
    if (typeof window.__gpp !== 'function') return Promise.resolve(null);
    return withTimeout(new Promise(resolve => {
      try {
        window.__gpp('ping', (d) => {
          const sections = d && d.parsedSections;
          if (!sections || typeof sections !== 'object') return resolve(null);
          const granted = [], denied = [];
          for (const [name, sec] of Object.entries(sections)) {
            if (!/^us/.test(name)) continue;            // usnat, usca, usva, usco, usct, usut…
            const s = Array.isArray(sec) ? sec[0] : sec; // some CMPs wrap sub-sections in arrays
            if (!s || typeof s !== 'object') continue;
            for (const [field, label] of Object.entries(GPP_US_FIELDS)) {
              if (s[field] === 2) granted.push(`${label} (${name})`);   // 2 = did not opt out
              else if (s[field] === 1) denied.push(`${label} (${name})`); // 1 = opted out
            }
          }
          if (!granted.length && !denied.length) return resolve(null);
          resolve({
            source: 'US privacy signal (GPP)', regime: 'us', decided: true,
            optionalGranted: granted.length > 0, granted, denied,
            evidence: granted.length ? `not opted out of: ${[...new Set(granted.map(g => g.split(' (')[0]))].join(', ')}` : `opted out of: ${[...new Set(denied.map(g => g.split(' (')[0]))].join(', ')}`
          });
        });
      } catch (e) { resolve(null); }
    }), 1200);
  }

  /** IAB US Privacy string (CCPA) — "1YN-": 3rd character Y = opted out of sale, N = not. */
  function readUSP() {
    if (typeof window.__uspapi !== 'function') return Promise.resolve(null);
    return withTimeout(new Promise(resolve => {
      try {
        window.__uspapi('getUSPData', 1, (d, ok) => {
          const s = ok && d && typeof d.uspString === 'string' ? d.uspString : '';
          if (!/^1[YN-][YN]/i.test(s)) return resolve(null);
          const optedOut = s[2].toUpperCase() === 'Y';
          resolve({ source: 'US Privacy string (CCPA)', regime: 'us', decided: true, optionalGranted: !optedOut, granted: optedOut ? [] : ['sale'], denied: optedOut ? ['sale'] : [], evidence: `uspString=${s} (${optedOut ? 'opted out of sale' : 'not opted out of sale'})` });
        });
      } catch (e) { resolve(null); }
    }), 1000);
  }

  const READERS = { tcf: readTCF, onetrust: readOneTrust, cookiebot: readCookiebot, didomi: readDidomi, usercentrics: readUsercentrics, osano: readOsano, klaro: readKlaro, consentmode: readConsentMode, gpp: readGPP, usp: readUSP };

  document.addEventListener('cookieshield:state-request', async (ev) => {
    let req = {};
    try { req = JSON.parse(ev.detail || '{}'); } catch (e) { /* ignore */ }
    const wanted = Array.isArray(req.only) && req.only.length ? req.only : Object.keys(READERS);
    const results = [];
    for (const key of wanted) {
      if (!READERS[key]) continue;
      try {
        const r = await READERS[key]();
        if (r) results.push({ key, ...r });
      } catch (e) { /* ignore broken CMP APIs */ }
    }
    document.dispatchEvent(new CustomEvent('cookieshield:state-response', { detail: JSON.stringify({ id: req.id, results }) }));
  });
})();
