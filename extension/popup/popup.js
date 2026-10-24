/* CookieShield popup */
(async function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const X = window.CSExplain;
  const send = (type, payload, extra = {}) => chrome.runtime.sendMessage({ type, payload, ...extra });

  // ?tabId= lets the automated UI tests open the popup for a specific tab.
  const forced = Number(new URLSearchParams(location.search).get('tabId'));
  const tab = forced ? await chrome.tabs.get(forced) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let url = null;
  try { url = new URL(tab.url); } catch (e) { /* no url */ }
  const host = url && /^https?:$/.test(url.protocol) ? url.hostname : null;
  const site = host ? siteKey(host) : null;
  let settings = await send('GET_SETTINGS');
  let pageInfo = null;
  let lastReport = null;

  function siteKey(h) {
    h = String(h).toLowerCase().replace(/^www\d?\./, '');
    const p = h.split('.');
    if (p.length <= 2) return h;
    const two = p.slice(-2).join('.');
    return /^(co|com|org|net|gov|ac|edu|gouv|gob|nic|ltd|plc|ne|or|go)\.[a-z]{2}$/.test(two) ? p.slice(-3).join('.') : two;
  }

  function toPage(msg) {
    return chrome.tabs.sendMessage(tab.id, msg, { frameId: 0 }).catch(() => null);
  }

  // ------------------------------------------------------------------ status
  async function loadStatus() {
    if (!host) return { status: 'UNSUPPORTED' };
    if (!settings.enabled) return { status: 'OFF' };
    if ((settings.pausedSites || []).includes(site)) return { status: 'PAUSED' };
    const [bg, page] = await Promise.all([send('GET_TAB_STATUS', null, { tabId: tab.id }), toPage({ type: 'GET_PAGE_STATUS' })]);
    pageInfo = page;
    const merged = { ...(page || {}), ...(bg || {}) };
    if (!merged.status) merged.status = page ? page.status : 'SCANNING';
    if (page && page.health && !merged.health) merged.health = page.health;
    return merged;
  }

  function render(st) {
    const info = X.STATUS[st.status] || X.STATUS.NO_BANNER;
    $('pip').innerHTML = window.Pip.svg(info.mood, 84);
    $('bubble').textContent = info.say;
    const pill = $('status-pill');
    pill.className = `pill tone-${info.tone}`;
    pill.textContent = `${info.icon}  ${info.label}`;
    $('site-name').textContent = host || 'This page';
    $('status-headline').textContent = info.headline;
    $('status-what').textContent = info.what;

    const o = st.outcome || {};
    const facts = X.details({ ...o, evidence: o.evidence || st.evidence, health: st.health });
    const dl = $('status-facts');
    dl.innerHTML = '';
    for (const [k, v] of facts) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      dl.append(dt, dd);
    }
    $('status-kept').textContent = info.kept || '';
    $('status-kept').hidden = !info.kept;
    $('status-details').hidden = !(facts.length || info.kept);

    // Priority 3: page health after handling
    const h = $('health');
    if (st.health && st.health.checks) {
      const names = { scroll: 'Scrolling', click: 'Clicking', links: 'Links', forms: 'Forms', inert: 'Page active' };
      h.innerHTML = '';
      for (const [k, label] of Object.entries(names)) {
        const ok = st.health.checks[k] !== false;
        const s = document.createElement('span');
        s.className = `chk ${ok ? 'ok' : 'bad'}`;
        s.textContent = `${ok ? '✓' : '✗'} ${label}`;
        h.appendChild(s);
      }
      h.hidden = false;
    } else h.hidden = true;

    // Buttons
    const paused = (settings.pausedSites || []).includes(site);
    $('pause-label').textContent = paused ? 'Resume on this site' : 'Pause on this site';
    for (const id of ['pause-btn', 'rescan-btn', 'report-btn']) $(id).disabled = !host || !settings.enabled;
    $('rescan-btn').disabled = !host || !settings.enabled || paused;
    $('undo-btn').hidden = !(pageInfo && pageInfo.fixesApplied > 0);

    // Translation
    const tr = pageInfo && pageInfo.translator;
    const lang = pageInfo && pageInfo.language;
    const target = (settings.targetLang || 'en').split('-')[0];
    if (lang && lang.code && lang.code !== 'und' && lang.code !== target) {
      $('translate-card').hidden = false;
      $('t-target').textContent = X.langName(target) || target;
      $('t-sub').textContent = `This page is in ${lang.name || lang.code}${tr && tr.apiAvailable ? ' · translated on your device' : ''}`;
      $('translate-btn').textContent = tr && tr.translated ? 'Show original' : 'Translate';
    } else $('translate-card').hidden = true;
  }

  async function renderRecent() {
    const { history } = await chrome.storage.local.get({ history: [] });
    const ul = $('recent-list');
    if (!history.length) return;
    ul.innerHTML = '';
    for (const e of history.slice(0, 4)) {
      const info = X.STATUS[e.status] || X.STATUS.NO_BANNER;
      const li = document.createElement('li');
      const ico = document.createElement('span'); ico.className = `ico tone-${info.tone}`; ico.textContent = info.icon;
      const mid = document.createElement('span'); mid.className = 'host'; mid.textContent = e.host;
      const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = info.label + (e.cmpName && e.cmpId !== 'generic' ? ` · ${e.cmpName}` : '');
      mid.appendChild(sub);
      const t = document.createElement('time'); t.dateTime = e.at; t.textContent = X.timeAgo(e.at);
      li.append(ico, mid, t);
      ul.appendChild(li);
    }
  }

  async function refresh() { render(await loadStatus()); }

  // ------------------------------------------------------------------ actions
  $('global-toggle').checked = settings.enabled;
  $('global-toggle').addEventListener('change', async (e) => {
    settings = await send('SET_SETTINGS', { enabled: e.target.checked });
    await refresh();
    chrome.tabs.reload(tab.id);
  });

  $('pause-btn').addEventListener('click', async () => {
    const paused = !(settings.pausedSites || []).includes(site);
    await send('SET_PAUSED', { site, paused });
    settings = await send('GET_SETTINGS');
    await refresh();
    chrome.tabs.reload(tab.id);
  });

  $('rescan-btn').addEventListener('click', async () => {
    $('rescan-btn').disabled = true;
    render({ status: 'SCANNING' });
    await toPage({ type: 'RESCAN' });
    setTimeout(async () => { await refresh(); $('rescan-btn').disabled = false; }, 2500);
  });

  $('undo-btn').addEventListener('click', async () => {
    const r = await toPage({ type: 'UNDO_FIXES' });
    $('undo-btn').hidden = true;
    $('bubble').textContent = r && r.undone ? `Undid ${r.undone} page fix${r.undone === 1 ? '' : 'es'}. If that helped, please report it so I can learn.` : 'Nothing to undo.';
  });

  $('translate-btn').addEventListener('click', async () => {
    const tr = pageInfo && pageInfo.translator;
    if (tr && tr.translated) await toPage({ type: 'SHOW_ORIGINAL' });
    else {
      $('translate-btn').textContent = 'Translating…';
      await toPage({ type: 'TRANSLATE_PAGE', target: settings.targetLang });
    }
    await refresh();
  });

  const openDash = (hash) => (e) => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL(`options/options.html#${hash}`) }); };
  $('open-history').addEventListener('click', openDash('history'));
  $('open-dashboard').addEventListener('click', openDash('history'));
  $('open-metrics').addEventListener('click', openDash('metrics'));
  $('open-settings').addEventListener('click', openDash('settings'));

  // ------------------------------------------------------------------ report
  async function buildReport() {
    const issueType = document.querySelector('input[name=issue]:checked').value;
    const comment = $('report-comment').value;
    const fromPage = await toPage({ type: 'BUILD_REPORT', issueType, comment });
    lastReport = fromPage || { site, issueType, comment };
    $('report-preview').textContent = JSON.stringify(lastReport, null, 2);
    $('pause-reload-btn').hidden = issueType !== 'site_broken';
  }

  $('report-btn').addEventListener('click', async () => {
    $('report-site').textContent = host || 'this site';
    const canShare = !!settings.reportEndpoint;
    $('report-share').checked = canShare && settings.shareReports;
    $('report-share').disabled = !canShare;
    $('share-label').textContent = canShare ? 'Send anonymously to the CookieShield project (site name only — no full address, cookies or page content)'
      : 'Saved on this computer. To share reports, add the report server in Settings.';
    $('report-result').textContent = '';
    await buildReport();
    $('report-dialog').showModal();
  });
  document.querySelectorAll('input[name=issue]').forEach(r => r.addEventListener('change', buildReport));
  $('report-comment').addEventListener('input', () => { if (lastReport) { lastReport.comment = $('report-comment').value; $('report-preview').textContent = JSON.stringify(lastReport, null, 2); } });

  $('report-send').addEventListener('click', async () => {
    await buildReport();
    if ($('report-share').checked !== settings.shareReports && settings.reportEndpoint) {
      settings = await send('SET_SETTINGS', { shareReports: $('report-share').checked });
    }
    $('report-send').disabled = true;
    const res = await send('SUBMIT_REPORT', { report: lastReport });
    $('report-send').disabled = false;
    const out = $('report-result');
    out.textContent = res.sent ? 'Thanks! Sent anonymously.' : (res.error ? `Saved on this computer (couldn’t send: ${res.error}).` : 'Thanks! Saved on this computer.');
    if (res.issueUrl || settings.repoUrl) {
      const a = document.createElement('a');
      a.textContent = res.issueUrl ? ' View the issue' : ' Open as a GitHub issue';
      a.href = res.issueUrl || `${settings.repoUrl.replace(/\/$/, '')}/issues/new?labels=site-report&title=${encodeURIComponent(`[${lastReport.issueType}] ${lastReport.site}`)}&body=${encodeURIComponent('```json\n' + JSON.stringify(lastReport, null, 2) + '\n```')}`;
      a.target = '_blank';
      out.appendChild(a);
    }
  });

  $('pause-reload-btn').addEventListener('click', async () => {
    await send('SUBMIT_REPORT', { report: lastReport });
    await send('SET_PAUSED', { site, paused: true });
    chrome.tabs.reload(tab.id);
    window.close();
  });

  // ------------------------------------------------------------------ go
  await refresh();
  renderRecent();
  // Status can still be settling right after page load.
  setTimeout(refresh, 1500);
})();
