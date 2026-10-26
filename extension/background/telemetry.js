/**
 * CookieShield — anonymous product statistics.
 *
 * A. Usage statistics (ON by default, disclosed on install, switch off any time):
 *    one summary per day with COUNTS only — banners seen, rejections, failures, manual
 *    interventions, errors, average handling time, extension version, Chrome major version.
 *    No website names, no URLs, no install ID: the server can only add numbers up.
 *
 * B. Site statistics (OFF unless you opt in): per day, which DOMAINS (e.g. "example.com")
 *    showed a cookie banner, which consent platform, and the outcome. Never paths, full URLs,
 *    page titles, search terms or anything typed. Turning it off stops sending immediately and
 *    deletes anything not yet sent.
 *
 * Never collected: full URLs, titles, query strings, cookies, tokens, page content, browsing
 * history, persistent identifiers.
 *
 * Summaries for a finished day are sent the next time Chrome runs (up to 14 days are kept).
 */
'use strict';

const Telemetry = (() => {
  const KEY = 'telemetry';
  const MAX_DAYS = 14;
  const COUNT_NAMES = ['installs', 'updates', 'banners', 'verified', 'clicked', 'needs_you', 'failed', 'false_success',
    'us_optouts', 'page_optouts', 'remembered', 'manual', 'errors', 'translated', 'handle_ms_sum', 'handle_n'];
  const KIND_RE = /^[A-Za-z0-9_.-]{1,40}$/;
  const DOMAIN_RE = /^(?=.{3,120}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

  const day = () => new Date().toISOString().slice(0, 10);   // UTC, same on every computer
  let chain = Promise.resolve();
  let serverDefault = null;

  async function prefs() {
    const { settings } = await chrome.storage.sync.get({ settings: {} });
    return { usage: settings.usageStats !== false, sites: settings.siteStats === true, enabled: settings.enabled !== false, server: await serverUrl(settings) };
  }

  /** Server address: the setting if filled in, else the one baked in at build time (config.json). */
  async function serverUrl(settings) {
    if (settings && settings.serverUrl) return String(settings.serverUrl).replace(/\/+$/, '');
    if (serverDefault === null) {
      try { serverDefault = ((await (await fetch(chrome.runtime.getURL('config.json'))).json()).server || '').replace(/\/+$/, ''); }
      catch (e) { serverDefault = ''; }
    }
    return serverDefault;
  }

  async function load() {
    const o = await chrome.storage.local.get({ [KEY]: null });
    return o[KEY] || { days: {}, sent: [] };
  }

  function mutate(fn) {
    chain = chain.then(async () => {
      const p = await prefs();
      if (!p.usage && !p.sites) return;
      const t = await load();
      const d = day();
      const b = t.days[d] || (t.days[d] = { counts: {}, events: {}, sites: {} });
      fn(b, p);
      // Keep at most MAX_DAYS days of unsent data.
      const keys = Object.keys(t.days).sort();
      while (keys.length > MAX_DAYS) delete t.days[keys.shift()];
      await chrome.storage.local.set({ [KEY]: t });
    }).catch(() => {});
    return chain;
  }

  const count = (name, n = 1) => mutate((b, p) => { if (p.usage && COUNT_NAMES.includes(name)) b.counts[name] = (b.counts[name] || 0) + n; });
  const event = (kind, n = 1) => mutate((b, p) => {
    if (!p.usage || !/^(manual|error|reason):/.test(kind) || !KIND_RE.test(kind.split(':')[1] || '')) return;
    b.events[kind] = (b.events[kind] || 0) + n;
    if (kind.startsWith('manual:')) b.counts.manual = (b.counts.manual || 0) + n;
    if (kind.startsWith('error:')) b.counts.errors = (b.counts.errors || 0) + n;
  });
  const site = (domain, cmp, outcome) => mutate((b, p) => {
    const d = String(domain || '').toLowerCase();
    if (!p.sites || !DOMAIN_RE.test(d)) return;           // opt-in only, domain only
    const k = `${d}|${String(cmp || 'unknown').replace(/[^\w.:-]/g, '').slice(0, 40) || 'unknown'}|${outcome}`;
    b.sites[k] = (b.sites[k] || 0) + 1;
  });

  /** Called from the background worker's existing handlers. */
  function onOutcome(o, p) {
    const status = String(o.status || '');
    const noBanner = o.method === 'us_optout' || o.method === 'page_optout';
    if (!noBanner) count('banners');
    if (status === 'VERIFIED') count('verified');
    else if (status === 'CLICKED') count('clicked');
    else if (status === 'NEEDS_YOU') count('needs_you');
    else if (status === 'FAILED') count('failed');
    if (o.method === 'us_optout' && (status === 'VERIFIED' || status === 'CLICKED')) count('us_optouts');
    if (o.method === 'page_optout' && status === 'VERIFIED') count('page_optouts');
    if (o.usOptOut && o.method !== 'us_optout' && o.method !== 'page_optout' && (status === 'VERIFIED' || status === 'CLICKED')) count('us_optouts');
    if (o.reason) event(`reason:${o.reason}`);
    if (Number.isFinite(p.ms) && p.ms > 0 && !noBanner) { count('handle_ms_sum', Math.min(Math.round(p.ms), 60000)); count('handle_n'); }
    const outcome = o.method === 'page_optout' ? 'page_optout' : o.method === 'us_optout' ? 'us_optout' : status.toLowerCase();
    if (['verified', 'clicked', 'needs_you', 'failed', 'us_optout', 'page_optout'].includes(outcome)) site(p.site, o.cmpId, outcome);
  }

  function onRemembered(p) {
    if (p.status === 'REMEMBERED') { count('remembered'); site(p.site, p.cmpId, 'remembered'); }
    else if (p.status === 'PREVIOUSLY_ACCEPTED') site(p.site, p.cmpId, 'previously_accepted');
  }

  /** Build the exact payloads for one finished day (also shown to the person in Settings). */
  function payloads(d, b, p) {
    const out = {};
    if (p.usage) {
      const counts = {};
      for (const k of COUNT_NAMES) if (b.counts[k]) counts[k] = b.counts[k];
      out.usage = { day: d, version: chrome.runtime.getManifest().version, browser: browserMajor(), counts, events: { ...b.events } };
    }
    if (p.sites) {
      const entries = Object.entries(b.sites).map(([k, n]) => { const [domain, cmp, outcome] = k.split('|'); return { domain, cmp, outcome, n }; });
      if (entries.length) out.sites = { day: d, entries: entries.slice(0, 300) };
    }
    return out;
  }

  function browserMajor() {
    const m = (navigator.userAgent || '').match(/Chrome\/(\d+)/);
    return m ? `Chrome ${m[1]}` : 'Chromium';
  }

  async function post(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'omit', cache: 'no-store' });
    if (!res.ok && res.status !== 400) throw new Error(`HTTP ${res.status}`);  // 400 = bad data: drop it, don't retry forever
  }

  /** Send every finished day. `includeToday` is only used by the automated tests. */
  async function flush({ includeToday = false } = {}) {
    await chain;
    const p = await prefs();
    if (!p.server) return { sent: 0, reason: 'no server configured' };
    const t = await load();
    const today = day();
    let sent = 0;
    for (const d of Object.keys(t.days).sort()) {
      if (d === today && !includeToday) continue;
      const pl = payloads(d, t.days[d], p);
      try {
        if (pl.usage) await post(`${p.server}/api/usage`, pl.usage);
        if (pl.sites) await post(`${p.server}/api/sites`, pl.sites);
        delete t.days[d];
        t.sent = [{ at: new Date().toISOString(), ...pl }, ...(t.sent || [])].slice(0, 5);  // "what was sent", for the person
        sent++;
      } catch (e) { break; }  // offline or server down: try again later
    }
    await chrome.storage.local.set({ [KEY]: t });
    return { sent };
  }

  /** Withdraw consent: stop and delete anything not yet sent. */
  async function forget({ sitesOnly = false } = {}) {
    await chain;
    const t = await load();
    for (const b of Object.values(t.days)) { b.sites = {}; if (!sitesOnly) { b.counts = {}; b.events = {}; } }
    await chrome.storage.local.set({ [KEY]: t });
  }

  async function preview() {
    await chain;
    const p = await prefs();
    const t = await load();
    const today = day();
    const b = t.days[today] || { counts: {}, events: {}, sites: {} };
    return { prefs: { usage: p.usage, sites: p.sites, server: p.server || null }, today: payloads(today, b, p), lastSent: t.sent || [] };
  }

  return { count, event, site, onOutcome, onRemembered, flush, forget, preview };
})();
