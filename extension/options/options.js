/* CookieShield dashboard */
(async function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const X = window.CSExplain;
  const send = (type, payload) => chrome.runtime.sendMessage({ type, payload });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  $('side-pip').innerHTML = window.Pip.svg('calm', 54);
  $('side-version').textContent = `Version ${chrome.runtime.getManifest().version}`;

  // ------------------------------------------------------------------ tabs
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => { t.hidden = t.id !== `tab-${name}`; });
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === name));
    const fn = RENDER[name];
    if (fn) fn();
  }
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1) || 'history'));

  // ------------------------------------------------------------------ history
  let filter = 'all';
  const isRejected = (s) => s === 'VERIFIED' || s === 'CLICKED' || s === 'REMEMBERED';

  async function renderHistory() {
    const { history } = await chrome.storage.local.get({ history: [] });
    const q = $('history-search').value.trim().toLowerCase();

    const sum = $('history-summary');
    sum.innerHTML = '';
    const sites = new Set(history.filter(h => isRejected(h.status)).map(h => h.site));
    const stats = [
      [history.filter(h => h.status === 'VERIFIED' || h.status === 'CLICKED').length, 'banners rejected'],
      [sites.size, 'sites where your “no” is in place'],
      [history.filter(h => h.status === 'VERIFIED').length, 'confirmed by the site’s own record'],
      [history.filter(h => h.status === 'NEEDS_YOU' || h.status === 'FAILED').length, 'times I asked you instead of accepting']
    ];
    for (const [n, l] of stats) { const d = el('div', 'sum'); d.append(el('div', 'n', String(n)), el('div', 'l', l)); sum.appendChild(d); }

    const items = history.filter(h => {
      if (filter === 'rejected' && !isRejected(h.status)) return false;
      if (filter === 'needs' && h.status !== 'NEEDS_YOU') return false;
      if (filter === 'problem' && !(h.status === 'FAILED' || (h.health && !h.health.ok) || h.downgradedFrom)) return false;
      if (q && !(`${h.host} ${h.cmpName || ''} ${h.status}`.toLowerCase().includes(q))) return false;
      return true;
    });

    const list = $('history-list');
    list.innerHTML = '';
    if (!items.length) {
      const e = el('div', 'empty-state');
      const p = el('div', 'pipbox'); p.innerHTML = window.Pip.svg('sleepy', 90);
      e.append(p, el('p', '', history.length ? 'Nothing matches that filter.' : 'Nothing yet. Browse as usual — every site where I reject cookies, or find your “no” already in place, shows up here.'));
      list.appendChild(e);
      return;
    }

    let lastDay = null;
    for (const h of items.slice(0, 400)) {
      const day = new Date(h.at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      if (day !== lastDay) { list.appendChild(el('div', 'day', day)); lastDay = day; }
      list.appendChild(entryCard(h));
    }
  }

  function entryCard(h) {
    const info = X.STATUS[h.status] || X.STATUS.NO_BANNER;
    const d = el('details', 'entry');
    const s = el('summary');
    s.append(el('span', `ico tone-${info.tone}`, info.icon));
    const mid = el('div');
    mid.append(el('div', 'host', h.host));
    mid.append(el('div', 'sub', `${info.label}${h.cmpName ? ' · ' + (h.cmpId === 'generic' ? 'custom banner' : h.cmpName) : ''}${h.siteType && h.siteType !== 'other' ? ' · ' + h.siteType.replace('-', ' / ') : ''}`));
    s.append(mid);
    s.append(el('span', `pill tone-${info.tone}`, info.headline));
    const t = el('time', '', new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    t.dateTime = h.at;
    s.append(t);
    d.appendChild(s);

    const body = el('div', 'body');
    body.appendChild(el('p', '', info.what));
    const dl = el('dl');
    for (const [k, v] of X.details(h)) { dl.append(el('dt', '', k), el('dd', '', v)); }
    if (h.userHid) dl.append(el('dt', '', 'You chose'), el('dd', '', h.hideAlways ? 'Always hide this banner (no answer sent)' : 'Hide the banner this time (no answer sent)'));
    body.appendChild(dl);
    if (info.kept) body.appendChild(el('div', 'kept', info.kept));
    const acts = el('div', 'row-actions');
    const forget = el('button', 'btn', 'Forget this site');
    forget.onclick = async () => { await send('FORGET_SITE', { site: h.site }); forget.textContent = 'Forgotten'; forget.disabled = true; };
    const pause = el('button', 'btn', 'Pause this site');
    pause.onclick = async () => { await send('SET_PAUSED', { site: h.site, paused: true }); pause.textContent = 'Paused'; pause.disabled = true; };
    acts.append(forget, pause);
    body.appendChild(acts);
    d.appendChild(body);
    return d;
  }

  $('history-search').addEventListener('input', renderHistory);
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    filter = c.dataset.filter;
    renderHistory();
  }));
  $('clear-history').addEventListener('click', async () => {
    if (!confirm('Clear the whole history? Your stats and remembered sites stay.')) return;
    await chrome.storage.local.set({ history: [] });
    renderHistory();
  });
  $('export-csv').addEventListener('click', async () => {
    const { history } = await chrome.storage.local.get({ history: [] });
    const cols = ['at', 'host', 'status', 'reason', 'cmpName', 'method', 'siteType', 'bannerLang', 'clicks', 'turnedOff', 'evidence'];
    const esc = (v) => `"${String(Array.isArray(v) ? v.map(x => x.label || x).join(' | ') : (v ?? '')).replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...history.map(h => cols.map(c => esc(h[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `cookieshield-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  // ------------------------------------------------------------------ metrics
  async function renderMetrics() {
    const { metrics } = await chrome.storage.local.get({ metrics: null });
    const m = metrics || { coverage: {}, incorrectAcceptances: 0, falseSuccessReports: 0, exceptionsReported: 0, supportedVisits: 0, autoRegressions: 0, userRegressions: 0, repairsMade: 0 };
    $('metrics-since').textContent = m.since ? `Since ${new Date(m.since).toLocaleDateString()}.` : '';
    const tot = { enc: 0, ok: 0, ver: 0 };
    const byP = {}, byT = {};
    for (const [key, c] of Object.entries(m.coverage || {})) {
      const [p, t] = key.split('|');
      tot.enc += c.encountered; tot.ok += c.verified + c.clicked; tot.ver += c.verified;
      for (const [map, k] of [[byP, p], [byT, t]]) {
        map[k] = map[k] || { enc: 0, ok: 0 };
        map[k].enc += c.encountered; map[k].ok += c.verified + c.clicked;
      }
    }
    const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
    const plural = (n, one, many) => (n === 1 ? one : (many || one + 's'));
    const regs = (m.autoRegressions || 0) + (m.userRegressions || 0);
    const k = $('kpis');
    k.innerHTML = '';
    const kpi = (p, big, what, sub) => {
      const c = el('div', 'card kpi');
      c.append(el('div', 'p', p), el('div', 'big', big), el('div', 'what', what));
      const s = el('div', 'sub'); s.innerHTML = sub; c.appendChild(s);
      k.appendChild(c);
    };
    kpi('Priority 1 · Coverage', tot.enc ? `${pct(tot.ok, tot.enc)}%` : '—', 'of banners handled automatically',
      `<b>${tot.ok}</b> of <b>${tot.enc}</b> banners rejected; <b>${tot.ver}</b> confirmed by the site’s own consent record.`);
    kpi('Priority 2 · Never accept', String((m.incorrectAcceptances || 0) + (m.falseSuccessReports || 0)), 'wrong acceptances + false “rejected” reports',
      `<b>${m.incorrectAcceptances || 0}</b> ${plural(m.incorrectAcceptances, 'time')} optional consent still ended up granted (always reported, never hidden) · <b>${m.falseSuccessReports || 0}</b> ${plural(m.falseSuccessReports, 'success', 'successes')} later disproved · <b>${m.exceptionsReported || 0}</b> ${plural(m.exceptionsReported, 'time')} I asked you instead of accepting.`);
    kpi('Priority 3 · Don’t break sites', m.supportedVisits ? String(pct(regs, m.supportedVisits)) : '—', 'problems per 100 handled visits',
      `<b>${m.autoRegressions || 0}</b> found by the page check · <b>${m.userRegressions || 0}</b> reported by you · <b>${m.repairsMade || 0}</b> banner leftovers repaired · <b>${m.supportedVisits || 0}</b> handled visits.`);

    const fill = (id, map, labelFn) => {
      const tb = $(id).querySelector('tbody');
      tb.innerHTML = '';
      const rows = Object.entries(map).sort((a, b) => b[1].enc - a[1].enc);
      if (!rows.length) { const tr = el('tr'); const td = el('td', 'muted', 'No data yet.'); td.colSpan = 4; tr.appendChild(td); tb.appendChild(tr); return; }
      for (const [name, v] of rows) {
        const tr = el('tr');
        tr.append(el('td', '', labelFn(name)), el('td', 'num', String(v.enc)), el('td', 'num', `${pct(v.ok, v.enc)}%`));
        const td = el('td'); const bar = el('div', 'bar'); const i = el('i'); i.style.width = `${pct(v.ok, v.enc)}%`; bar.appendChild(i); td.appendChild(bar);
        tr.appendChild(td);
        tb.appendChild(tr);
      }
    };
    const rules = await send('GET_RULES');
    const names = Object.fromEntries((rules || []).map(r => [r.id, r.name]));
    fill('by-platform', byP, (id) => id === 'generic' ? 'Custom banners (multilingual reader)' : (names[id] || id));
    fill('by-sitetype', byT, (t) => t.replace('-', ' / '));
  }
  $('reset-metrics').addEventListener('click', async () => { if (confirm('Reset your stats?')) { await send('RESET_METRICS'); renderMetrics(); } });

  // ------------------------------------------------------------------ sites
  async function renderSites() {
    const settings = await send('GET_SETTINGS');
    const { siteMemory } = await chrome.storage.local.get({ siteMemory: {} });
    const pl = $('paused-list');
    pl.innerHTML = '';
    if (!settings.pausedSites.length) pl.appendChild(el('li', 'meta', 'No paused sites.'));
    for (const s of settings.pausedSites) {
      const li = el('li'); li.append(el('span', '', s));
      const b = el('button', 'btn', 'Resume');
      b.onclick = async () => { await send('SET_PAUSED', { site: s, paused: false }); renderSites(); };
      li.appendChild(b); pl.appendChild(li);
    }
    const ml = $('memory-list');
    ml.innerHTML = '';
    const entries = Object.entries(siteMemory).sort((a, b) => (b[1].lastAt || '').localeCompare(a[1].lastAt || ''));
    if (!entries.length) ml.appendChild(el('li', 'meta', 'Nothing remembered yet.'));
    for (const [s, m] of entries.slice(0, 300)) {
      const li = el('li');
      const left = el('div'); left.append(el('div', '', s));
      const info = X.STATUS[m.lastStatus] || {};
      left.append(el('div', 'meta', `${m.hideAlways ? 'Banner hidden by you · ' : ''}${info.label || m.lastStatus || ''}${m.cmpName ? ' · ' + m.cmpName : ''} · ${m.count || 0} visit${m.count === 1 ? '' : 's'}${m.lastAt ? ' · ' + X.timeAgo(m.lastAt) : ''}`));
      const b = el('button', 'btn', 'Forget');
      b.onclick = async () => { await send('FORGET_SITE', { site: s }); renderSites(); };
      li.append(left, b); ml.appendChild(li);
    }
  }
  $('pause-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = $('pause-input').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!v) return;
    await send('SET_PAUSED', { site: v, paused: true });
    $('pause-input').value = '';
    renderSites();
  });

  // ------------------------------------------------------------------ coverage
  async function renderCoverage() {
    const rules = await send('GET_RULES');
    const { remoteRules } = await chrome.storage.local.get({ remoteRules: null });
    $('rules-status').textContent = remoteRules ? `Using rule updates v${remoteRules.version || '?'} fetched ${X.timeAgo(remoteRules.fetchedAt)}.` : 'Using the rules built into this version.';
    const tb = $('matrix').querySelector('tbody');
    tb.innerHTML = '';
    const proof = { tcf: 'IAB TCF', onetrust: 'OneTrust API', cookiebot: 'Cookiebot API', didomi: 'Didomi API', usercentrics: 'Usercentrics API', osano: 'Osano API', klaro: 'Klaro API', consentmode: 'Google Consent Mode' };
    for (const r of rules) {
      const tr = el('tr');
      const name = el('td'); name.append(el('b', '', r.name)); if (r.notes) name.append(el('div', 'small muted', r.notes));
      const path = [r.reject && r.reject.length ? 'Reject button' : null, r.settings && r.settings.length ? 'Settings → all off → save' : null].filter(Boolean).join(' / ') || 'Multilingual reader';
      const where = [r.shadow ? 'Shadow DOM' : null, r.frameHosts && r.frameHosts.length ? 'iframe' : null].filter(Boolean).join(', ');
      const proofTxt = (r.state || []).map(s => proof[s] || s).join(', ');
      tr.append(name, el('td', '', r.type + (where ? ` · ${where}` : '')), el('td', '', path), el('td', '', proofTxt || 'Banner closes + consent cookie'));
      const t = el('td'); t.appendChild(el('span', `pill ${r.tested ? 'tone-ok' : 'tone-calm'}`, r.tested ? 'Automated test' : (r.remote ? 'Community rule' : 'Rule only')));
      tr.appendChild(t);
      tb.appendChild(tr);
    }
  }
  $('refresh-rules').addEventListener('click', async () => {
    $('rules-status').textContent = 'Checking…';
    const r = await send('REFRESH_RULES');
    $('rules-status').textContent = r.ok ? `Updated: ${r.count} platforms (v${r.version}).` : `Couldn’t update: ${r.reason}. (Set the rule-updates address in Settings.)`;
    if (r.ok) renderCoverage();
  });

  // ------------------------------------------------------------------ reports
  async function renderReports() {
    const { reports } = await chrome.storage.local.get({ reports: [] });
    const list = $('reports-list');
    list.innerHTML = '';
    if (!reports.length) { list.appendChild(el('div', 'empty-state', 'No reports yet. Use “Report a problem” in the popup when something goes wrong.')); return; }
    for (const r of reports) {
      const d = el('details', 'entry');
      const s = el('summary');
      s.append(el('span', `ico ${r.sent ? 'tone-ok' : 'tone-calm'}`, r.sent ? '↑' : '•'));
      const mid = el('div'); mid.append(el('div', 'host', r.site), el('div', 'sub', `${r.issueType.replace(/_/g, ' ')} · ${r.sent ? 'sent anonymously' : 'kept on this computer'}${r.error ? ' (' + r.error + ')' : ''}`));
      s.append(mid, el('span', ''), el('time', '', X.timeAgo(r.createdAt)));
      d.appendChild(s);
      const body = el('div', 'body');
      const pre = el('pre', 'small', JSON.stringify(r, null, 2)); pre.style.whiteSpace = 'pre-wrap';
      body.appendChild(pre);
      d.appendChild(body);
      list.appendChild(d);
    }
  }

  // ------------------------------------------------------------------ settings
  const LANGS = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'cs', 'hu', 'ro', 'el', 'tr', 'ru', 'uk', 'ja', 'zh', 'ko', 'ar', 'he', 'hi'];
  for (const l of LANGS) { const o = el('option', '', X.langName(l)); o.value = l; $('target-lang').appendChild(o); }

  async function renderSettings() {
    const s = await send('GET_SETTINGS');
    const f = $('settings-form');
    for (const [k, v] of Object.entries(s)) {
      const input = f.elements[k];
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = !!v; else input.value = v;
    }
  }
  $('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const patch = {};
    for (const k of ['enabled', 'showSuccess', 'shareReports', 'gpcSignal']) patch[k] = f.elements[k].checked;
    for (const k of ['translateMode', 'targetLang', 'reportEndpoint', 'rulesEndpoint', 'repoUrl']) patch[k] = f.elements[k].value.trim();
    for (const k of ['reportEndpoint', 'rulesEndpoint', 'repoUrl']) {
      if (patch[k] && !/^https:\/\//.test(patch[k])) { $('settings-saved').textContent = `${k}: please use an https:// address.`; return; }
    }
    if (patch.shareReports && !patch.reportEndpoint) { $('settings-saved').textContent = 'Add a report server address to share reports.'; return; }
    await send('SET_SETTINGS', patch);
    $('settings-saved').textContent = 'Saved ✓';
    setTimeout(() => { $('settings-saved').textContent = ''; }, 2500);
  });

  // ------------------------------------------------------------------ about
  function renderAbout() {
    const dl = $('legend');
    dl.innerHTML = '';
    for (const key of ['VERIFIED', 'CLICKED', 'REMEMBERED', 'NEEDS_YOU', 'FAILED', 'PREVIOUSLY_ACCEPTED', 'HIDDEN_BY_YOU', 'PAUSED']) {
      const s = X.STATUS[key];
      const dt = el('dt'); dt.appendChild(el('span', `pill tone-${s.tone}`, `${s.icon} ${s.label}`));
      dl.append(dt, el('dd', '', s.what));
    }
  }

  const RENDER = { history: renderHistory, metrics: renderMetrics, sites: renderSites, coverage: renderCoverage, reports: renderReports, settings: renderSettings, about: renderAbout };
  chrome.storage.onChanged.addListener(() => {
    const name = location.hash.slice(1) || 'history';
    if (name !== 'settings' && RENDER[name]) RENDER[name]();
  });
  showTab(location.hash.slice(1) || 'history');
})();
