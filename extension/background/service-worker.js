/**
 * CookieShield — Background service worker
 * Per-tab status & badge, history, site memory, success metrics (P1/P2/P3),
 * opt-in anonymized reports and opt-in rule updates.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  pausedSites: [],
  showSuccess: false,
  translateMode: 'auto',           // 'off' | 'offer' | 'auto' (auto by default since 2.7)
  targetLang: 'en',
  translateNeverSites: [],
  shareReports: false,             // opt-in: send anonymized reports to the project server
  reportEndpoint: '',              // e.g. https://your-app.vercel.app/api/report
  rulesEndpoint: '',               // e.g. https://your-app.vercel.app/rules/cmp-rules.json
  repoUrl: '',                     // e.g. https://github.com/you/cookieshield (for prefilled issues)
  // Global Privacy Control. OFF by default: sites that honour it (e.g. iubenda) lock their
  // sale/sharing toggles OFF so you can't switch them back on from the site. Opt-in only.
  // (Renamed from sendGPC, which was on by default in 2.1 — that old value is ignored.)
  gpcSignal: false
};

const HISTORY_MAX = 1000;

function siteKey(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^www\d?\./, '');
  const parts = h.split('.');
  if (parts.length <= 2 || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return h;
  const two = parts.slice(-2).join('.');
  return /^(co|com|org|net|gov|ac|edu|gouv|gob|nic|ltd|plc|ne|or|go)\.[a-z]{2}$/.test(two) ? parts.slice(-3).join('.') : two;
}
const tabs = new Map();            // tabId -> { frames: {frameId: status}, site }

// ------------------------------------------------------------------------------------------
async function getSettings() {
  const { settings } = await chrome.storage.sync.get({ settings: {} });
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}
async function setSettings(patch) {
  const s = await getSettings();
  const next = { ...s, ...patch };
  await chrome.storage.sync.set({ settings: next });
  return next;
}

// ------------------------------------------------------------------------------------------
// Global Privacy Control: Sec-GPC header (static ruleset) + navigator.globalPrivacyControl
// (MAIN-world script). Off when CookieShield is off or the setting is off; never on paused sites.
const GPC_SCRIPT_ID = 'cookieshield-gpc';
async function syncGPC() {
  try {
    const s = await getSettings();
    const on = !!(s.enabled && s.gpcSignal);
    const paused = (s.pausedSites || []).filter(d => /^[a-z0-9.-]+$/i.test(d));
    await chrome.declarativeNetRequest.updateEnabledRulesets(on ? { enableRulesetIds: ['gpc'] } : { disableRulesetIds: ['gpc'] });
    // Paused sites: higher-priority "allow" rules stop the header on the site and its requests.
    const old = await chrome.declarativeNetRequest.getDynamicRules();
    const add = paused.length ? [
      { id: 101, priority: 10, action: { type: 'allow' }, condition: { requestDomains: paused, resourceTypes: ['main_frame', 'sub_frame'] } },
      { id: 102, priority: 10, action: { type: 'allow' }, condition: { initiatorDomains: paused } }
    ] : [];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: old.map(r => r.id), addRules: add });
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [GPC_SCRIPT_ID] });
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [GPC_SCRIPT_ID] });
    if (on) {
      await chrome.scripting.registerContentScripts([{
        id: GPC_SCRIPT_ID, js: ['content/gpc.js'], matches: ['http://*/*', 'https://*/*'],
        excludeMatches: paused.flatMap(d => [`*://${d}/*`, `*://*.${d}/*`]),
        runAt: 'document_start', allFrames: true, world: 'MAIN', persistAcrossSessions: true
      }]);
    }
  } catch (e) { console.warn('[CookieShield] GPC sync failed', e); }
}
chrome.runtime.onStartup.addListener(syncGPC);
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'sync' && changes.settings) syncGPC(); });

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await getSettings();
  delete cur.sendGPC;                       // 2.1 default-on value: drop it, GPC is now opt-in
  // 2.7: translate automatically by default (asked for by the person). Applied once on update.
  if (!cur.autoTranslateDefault) { cur.translateMode = 'auto'; cur.autoTranslateDefault = true; }
  await chrome.storage.sync.set({ settings: cur });
  await syncGPC();
  const local = await chrome.storage.local.get({ history: null, metrics: null, siteMemory: null, reports: null });
  const init = {};
  if (!local.history) init.history = [];
  if (!local.metrics) init.metrics = emptyMetrics();
  if (!local.siteMemory) init.siteMemory = {};
  if (!local.reports) init.reports = [];
  await chrome.storage.local.set(init);
  chrome.alarms.create('rules-refresh', { periodInMinutes: 24 * 60, delayInMinutes: 1 });
});

function emptyMetrics() {
  return {
    since: new Date().toISOString(),
    // P1: banners encountered vs handled correctly, segmented by platform and website type
    coverage: {},          // key "cmpId|siteType" -> {encountered, verified, clicked, needsYou, failed}
    // P2
    incorrectAcceptances: 0,   // our handling ended with optional consent granted
    falseSuccessReports: 0,    // we reported success, a later check (or the user) proved otherwise
    exceptionsReported: 0,
    // P3
    supportedVisits: 0,        // page visits where we handled a banner
    autoRegressions: 0,        // self-test still failing after handling
    userRegressions: 0,        // user reported a broken site after handling
    repairsMade: 0
  };
}

// ------------------------------------------------------------------------------------------
// Badge
const BADGE = {
  VERIFIED: { text: '✓', color: '#2a9d8f', title: 'Optional cookies rejected — confirmed by the site’s consent record' },
  CLICKED: { text: '✓', color: '#5fa8d3', title: 'Reject clicked — the site offers no record to double-check' },
  REMEMBERED: { text: '✓', color: '#8ab6d6', title: 'Your earlier rejection is still in effect' },
  NEEDS_YOU: { text: '!', color: '#e9a23b', title: 'Needs your choice — nothing was accepted' },
  FAILED: { text: '!', color: '#d1495b', title: 'Site still reports optional cookies as allowed' },
  PREVIOUSLY_ACCEPTED: { text: 'i', color: '#8ab6d6', title: 'Some extras are allowed here — your choice is respected' },
  HIDDEN_BY_YOU: { text: '–', color: '#8d99ae', title: 'Banner hidden by you (no answer sent)' },
  PAUSED: { text: '❚❚', color: '#8d99ae', title: 'Paused on this site' },
  OFF: { text: 'off', color: '#8d99ae', title: 'CookieShield is turned off' }
};

function setBadge(tabId, status) {
  const b = BADGE[status];
  chrome.action.setBadgeText({ tabId, text: b ? b.text : '' }).catch(() => {});
  if (b) chrome.action.setBadgeBackgroundColor({ tabId, color: b.color }).catch(() => {});
  chrome.action.setTitle({ tabId, title: `CookieShield — ${b ? b.title : 'Watching for cookie banners'}` }).catch(() => {});
}

const PRIORITY = ['FAILED', 'NEEDS_YOU', 'VERIFIED', 'CLICKED', 'HIDDEN_BY_YOU', 'PREVIOUSLY_ACCEPTED', 'REMEMBERED', 'WAITING_FRAME', 'HANDLING', 'PAUSED', 'OFF', 'NO_BANNER', 'SCANNING'];
function summarizeTab(tabId) {
  const t = tabs.get(tabId);
  if (!t) return null;
  const frames = Object.values(t.frames);
  frames.sort((a, b) => PRIORITY.indexOf(a.status) - PRIORITY.indexOf(b.status));
  const top = t.frames[0] || {};
  const best = frames[0] || top;
  return { ...top, ...best, site: top.site || best.site, host: top.host || best.host, health: top.health || best.health, siteType: top.siteType || best.siteType, language: top.language };
}

function updateTab(tabId, frameId, patch) {
  const t = tabs.get(tabId) || { frames: {} };
  t.frames[frameId] = { ...(t.frames[frameId] || {}), ...patch };
  tabs.set(tabId, t);
  const s = summarizeTab(tabId);
  setBadge(tabId, s && s.status);
  // Survives the service worker being suspended (MV3).
  chrome.storage.session.set({ [`tab_${tabId}`]: s }).catch(() => {});
}

// ------------------------------------------------------------------------------------------
// History, metrics, memory
async function recordOutcome(p, tabId) {
  const o = p.outcome;
  const { history, metrics, siteMemory } = await chrome.storage.local.get({ history: [], metrics: emptyMetrics(), siteMemory: {} });

  const entry = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    site: p.site, host: p.host,
    status: o.status, reason: o.reason, method: o.method,
    cmpId: o.cmpId, cmpName: o.cmpName, supported: !!o.supported,
    clicks: o.clicks || [], turnedOff: o.turnedOff || [], essentialKept: (o.essentialKept || []).slice(0, 6),
    evidence: o.evidence, stateSources: o.stateSources || [],
    bannerLang: o.bannerLang, translatedLabels: o.translatedLabels || null,
    usOptOut: o.usOptOut || null, refused: o.refused || null, siteSignalConflict: o.siteSignalConflict || null,
    siteType: p.siteType || 'other', ms: p.ms
  };
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;

  // P1 coverage
  const key = `${o.cmpId || 'generic'}|${p.siteType || 'other'}`;
  const c = metrics.coverage[key] || { encountered: 0, verified: 0, clicked: 0, needsYou: 0, failed: 0 };
  c.encountered++;
  if (o.status === 'VERIFIED') c.verified++;
  else if (o.status === 'CLICKED') c.clicked++;
  else if (o.status === 'FAILED') c.failed++;
  else c.needsYou++;
  metrics.coverage[key] = c;

  // P2
  if (o.status === 'FAILED') metrics.incorrectAcceptances++;
  if (o.status === 'NEEDS_YOU') metrics.exceptionsReported++;

  // P3 denominator
  if (o.status === 'VERIFIED' || o.status === 'CLICKED') metrics.supportedVisits++;

  // Site memory → faster, flicker-free handling next time ("remember my choice")
  const mem = siteMemory[p.site] || { count: 0 };
  mem.count++;
  mem.lastStatus = o.status;
  mem.lastAt = entry.at;
  mem.cmpId = o.cmpId;
  mem.cmpName = o.cmpName;
  // Where the "no" came from — shown later when the site remembers it ("Your no is remembered").
  if (o.status === 'VERIFIED' || o.status === 'CLICKED') {
    mem.lastRejection = {
      at: entry.at, status: o.status, cmpName: o.cmpName, cmpId: o.cmpId, method: o.method,
      clicks: (o.clicks || []).map(c => c.label).slice(0, 6), refused: o.refused || null, usOptOut: o.usOptOut || null
    };
  }
  // Only precise selectors (a tested rule's container or an element id) are used for anti-flicker.
  if ((o.status === 'VERIFIED' || o.status === 'CLICKED') && o.selector && (o.supported || o.selector.startsWith('#'))) mem.prehide = [o.selector];
  else delete mem.prehide;
  siteMemory[p.site] = mem;

  await chrome.storage.local.set({ history, metrics, siteMemory });
  entry.tabId = tabId;
  return entry;
}

async function bumpMetric(fn) {
  const { metrics } = await chrome.storage.local.get({ metrics: emptyMetrics() });
  fn(metrics);
  await chrome.storage.local.set({ metrics });
}

async function updateLastHistory(site, patch) {
  const { history } = await chrome.storage.local.get({ history: [] });
  const i = history.findIndex(h => h.site === site);
  if (i >= 0) { history[i] = { ...history[i], ...patch }; await chrome.storage.local.set({ history }); }
}

// ------------------------------------------------------------------------------------------
// Reports (opt-in, anonymized). Hostname only — never full URLs, cookies, or page content.
async function submitReport(report, sender) {
  const s = await getSettings();
  const clean = {
    id: `r_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    site: String(report.site || '').slice(0, 120),
    issueType: String(report.issueType || 'other').slice(0, 40),
    comment: String(report.comment || '').slice(0, 500),
    cmpId: report.cmpId || null, status: report.status || null, reason: report.reason || null, method: report.method || null,
    buttons: (report.buttons || []).slice(0, 12).map(b => ({ label: String(b.label || '').slice(0, 60), type: b.type })),
    bannerLang: report.bannerLang || null, pageLang: report.pageLang || null, siteType: report.siteType || null,
    health: report.health || null, selector: report.selector ? String(report.selector).slice(0, 120) : null,
    extensionVersion: chrome.runtime.getManifest().version,
    browser: (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] ? `Chrome ${(navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1]}` : 'Chromium'
  };

  if (/broken|regression|scroll|login|form|navigation/.test(clean.issueType)) await bumpMetric(m => { m.userRegressions++; });
  if (clean.issueType === 'wrong_choice') await bumpMetric(m => { m.falseSuccessReports++; });

  let sent = false, error = null;
  if (s.shareReports && s.reportEndpoint) {
    try {
      const res = await fetch(s.reportEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) });
      sent = res.ok;
      if (!res.ok) error = `Server answered ${res.status}`;
      else { try { const j = await res.json(); clean.issueUrl = j.issueUrl || null; } catch (e) { /* ignore */ } }
    } catch (e) { error = String(e.message || e); }
  }
  clean.sent = sent;
  clean.error = error;
  const { reports } = await chrome.storage.local.get({ reports: [] });
  reports.unshift(clean);
  if (reports.length > 200) reports.length = 200;
  await chrome.storage.local.set({ reports });
  return clean;
}

// ------------------------------------------------------------------------------------------
// Opt-in rule updates: JSON data only, validated, never executable code.
function validRules(doc) {
  if (!doc || !Array.isArray(doc.platforms) || doc.platforms.length > 500) return false;
  const isStrArr = (a) => a === undefined || (Array.isArray(a) && a.every(x => typeof x === 'string' && x.length < 300));
  return doc.platforms.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' &&
    ['detect', 'container', 'reject', 'settings', 'settingsReject', 'save', 'frameHosts', 'frameDetect', 'lockClasses', 'backdrops', 'state'].every(k => isStrArr(p[k])) &&
    (p.toggles === undefined || p.toggles === null || typeof p.toggles === 'string'));
}

async function refreshRules() {
  const s = await getSettings();
  if (!s.rulesEndpoint) return { ok: false, reason: 'No rules URL set' };
  try {
    const res = await fetch(s.rulesEndpoint, { cache: 'no-store' });
    const doc = await res.json();
    if (!validRules(doc)) return { ok: false, reason: 'Rules file failed validation' };
    await chrome.storage.local.set({ remoteRules: { ...doc, fetchedAt: new Date().toISOString() } });
    return { ok: true, count: doc.platforms.length, version: doc.version };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'rules-refresh') refreshRules(); });

let bundledRules = null;
async function getPageRules() {
  try { return (await (await fetch(chrome.runtime.getURL('rules/cmp-rules.json'))).json()).optOutPages || []; }
  catch (e) { return []; }
}
async function getRules() {
  if (!bundledRules) {
    try { bundledRules = (await (await fetch(chrome.runtime.getURL('rules/cmp-rules.json'))).json()).platforms || []; }
    catch (e) { bundledRules = []; }
  }
  const { remoteRules } = await chrome.storage.local.get({ remoteRules: null });
  const byId = new Map(bundledRules.map(r => [r.id, r]));
  // Remote rules (opt-in) override bundled ones by id — selectors only, never code.
  if (remoteRules && Array.isArray(remoteRules.platforms)) for (const r of remoteRules.platforms) byId.set(r.id, { ...r, remote: true });
  return [...byId.values()];
}

// ------------------------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : msg.tabId;
  const frameId = sender.frameId || 0;
  const p = msg.payload || {};
  // Messages from a page that is no longer the one on screen (back/forward cache, a page being
  // replaced) must not overwrite the current page's status in the popup and badge.
  const stale = !!(sender.documentLifecycle && sender.documentLifecycle !== 'active');

  (async () => {
    switch (msg.type) {
      case 'STATUS':
        if (tabId != null && !stale) updateTab(tabId, frameId, p);
        return { ok: true };

      case 'FRAME_ACTION':
        if (tabId != null) chrome.tabs.sendMessage(tabId, { type: 'VERIFY_FRAME_ACTION', outcome: p.outcome }, { frameId: 0 }).catch(() => {});
        return { ok: true };

      case 'OUTCOME': {
        // Outcomes from CMP iframes belong to the page the user is on, not the iframe's host.
        if (frameId !== 0 && sender.tab && sender.tab.url) {
          try { const h = new URL(sender.tab.url).hostname; p.host = h; p.site = siteKey(h); } catch (e) { /* ignore */ }
        }
        if (tabId != null && !stale) updateTab(tabId, frameId, { ...p, status: p.outcome.status });
        const entry = await recordOutcome(p, tabId);
        // A CMP inside an iframe finished → let the top frame repair / notify.
        if (frameId !== 0 && tabId != null) chrome.tabs.sendMessage(tabId, { type: 'FRAME_OUTCOME', outcome: p.outcome }, { frameId: 0 }).catch(() => {});
        return { ok: true, id: entry.id };
      }

      case 'HEALTH':
        if (tabId != null && !stale) updateTab(tabId, frameId, { health: p.health });
        await bumpMetric(m => {
          if (!p.health.ok) m.autoRegressions++;
          m.repairsMade += (p.health.repairs || []).length;
        });
        await updateLastHistory(p.site, { health: p.health });
        return { ok: true };

      case 'FALSE_SUCCESS':
        if (tabId != null) updateTab(tabId, frameId, { status: p.outcome.status, outcome: p.outcome });
        await bumpMetric(m => {
          m.falseSuccessReports++;
          if (p.outcome.status === 'FAILED') m.incorrectAcceptances++;
        });
        await updateLastHistory(p.site, { status: p.outcome.status, reason: p.outcome.reason, evidence: p.outcome.evidence, downgradedFrom: p.outcome.downgradedFrom });
        return { ok: true };

      case 'USER_HID_BANNER': {
        const { siteMemory } = await chrome.storage.local.get({ siteMemory: {} });
        const mem = siteMemory[p.site] || { count: 0 };
        if (p.always && p.selector) { mem.hideAlways = true; mem.hideSelector = p.selector; }
        siteMemory[p.site] = mem;
        await chrome.storage.local.set({ siteMemory });
        if (tabId != null) updateTab(tabId, 0, { status: 'HIDDEN_BY_YOU' });
        await updateLastHistory(p.site, { userHid: true, hideAlways: !!p.always });
        return { ok: true };
      }

      case 'SET_PAUSED': {
        const s = await getSettings();
        const set = new Set(s.pausedSites);
        if (p.paused) set.add(p.site); else set.delete(p.site);
        await setSettings({ pausedSites: [...set] });
        return { ok: true, paused: !!p.paused };
      }

      case 'FORGET_SITE': {
        const { siteMemory } = await chrome.storage.local.get({ siteMemory: {} });
        delete siteMemory[p.site];
        await chrome.storage.local.set({ siteMemory });
        return { ok: true };
      }

      case 'REMEMBERED_VISIT': {
        // A site already had a choice stored (no banner). Log it — once per site every 12 h.
        const { history, siteMemory } = await chrome.storage.local.get({ history: [], siteMemory: {} });
        const mem = siteMemory[p.site] || null;
        const origin = mem && mem.lastRejection ? mem.lastRejection : null;
        const recent = history.find(h => h.site === p.site);
        const fresh = recent && recent.status === p.status && recent.kind === 'visit' && Date.now() - Date.parse(recent.at) < 12 * 3600 * 1000;
        if (fresh) {
          Object.assign(recent, { at: new Date().toISOString(), visits: (recent.visits || 1) + 1, evidence: p.evidence, refused: p.refused, allowed: p.allowed, origin });
          history.splice(history.indexOf(recent), 1);
          history.unshift(recent);
        } else {
          history.unshift({
            id: `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, kind: 'visit',
            at: new Date().toISOString(), site: p.site, host: p.host, status: p.status,
            cmpName: origin ? origin.cmpName : null, cmpId: origin ? origin.cmpId : null,
            evidence: p.evidence, stateSources: p.stateSources || [], refused: p.refused || [], allowed: p.allowed || [],
            origin, siteType: p.siteType || 'other', visits: 1, clicks: []
          });
          if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
        }
        // Remember that a "no" was in place here, so a later "yes" is treated as the person's choice.
        if (p.status === 'REMEMBERED') siteMemory[p.site] = { ...(siteMemory[p.site] || { count: 0 }), seenNo: true, seenNoAt: new Date().toISOString() };
        await chrome.storage.local.set({ history, siteMemory });
        return { ok: true };
      }

      case 'GET_PAGE_RULES':
        return getPageRules();

      case 'PAGE_OPTOUT_PENDING':
      case 'PAGE_OPTOUT_DONE': {
        // Settings-page opt-outs (e.g. Amazon ads): done ONCE per site and page, then left alone.
        const { siteMemory } = await chrome.storage.local.get({ siteMemory: {} });
        const mem = siteMemory[p.site] || { count: 0 };
        mem.pageOptOuts = mem.pageOptOuts || {};
        const prev = mem.pageOptOuts[p.key] || {};
        mem.pageOptOuts[p.key] = msg.type === 'PAGE_OPTOUT_PENDING'
          ? { pending: true, at: new Date().toISOString(), clicks: p.clicks || [] }
          : { ...prev, pending: false, ok: !!p.ok, already: !!p.already, doneAt: new Date().toISOString() };
        siteMemory[p.site] = mem;
        await chrome.storage.local.set({ siteMemory });
        return { ok: true };
      }

      case 'GET_TAB_STATUS': {
        const live = summarizeTab(msg.tabId);
        if (live) return live;
        const k = `tab_${msg.tabId}`;
        const st = await chrome.storage.session.get(k);
        return st[k] || null;
      }

      case 'SUBMIT_REPORT':
        return submitReport(p.report || p, sender);

      case 'GET_RULES':
        return getRules();

      case 'REFRESH_RULES':
        return refreshRules();

      case 'GET_SETTINGS':
        return getSettings();

      case 'SET_SETTINGS':
        return setSettings(p);

      case 'RESET_METRICS':
        await chrome.storage.local.set({ metrics: emptyMetrics() });
        return { ok: true };

      default:
        return null;
    }
  })().then(sendResponse, err => sendResponse({ error: String(err && err.message || err) }));
  return true;
});

chrome.tabs.onRemoved.addListener(tabId => { tabs.delete(tabId); chrome.storage.session.remove(`tab_${tabId}`).catch(() => {}); });
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading' && info.url) { tabs.delete(tabId); setBadge(tabId, null); chrome.storage.session.remove(`tab_${tabId}`).catch(() => {}); }
});
