/* CookieShield owner dashboard. Reads /api/stats with the owner token (kept in sessionStorage). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n == null ? '–' : Number(n).toLocaleString();
  const pct = (a, b) => b ? `${Math.round(1000 * a / b) / 10}%` : '–';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let token = null, days = 30;
  try { token = sessionStorage.getItem('cs-owner-token'); } catch (e) { /* private mode */ }

  function tiles(el, list) {
    el.innerHTML = list.map(([n, l, s]) => `<div class="tile"><div class="n">${n}</div><div class="l">${esc(l)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`).join('');
  }

  function table(el, cols, rows, empty) {
    if (!rows || !rows.length) { el.innerHTML = `<p class="empty">${esc(empty || 'Nothing yet.')}</p>`; return; }
    el.innerHTML = `<table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${
      rows.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(r) : esc(c.v(r))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  /** Single-series bar chart with hover values (no legend needed: the panel title names it). */
  function bars(el, series, key, label) {
    const data = series.map(d => ({ day: d.day, v: Number(d[key] || 0) }));
    if (!data.length) { el.innerHTML = '<p class="empty">No data yet.</p>'; return; }
    const max = Math.max(1, ...data.map(d => d.v));
    el.innerHTML = `<div class="chart" role="img" aria-label="${esc(label)} per day">${data.map(d =>
      `<div class="bar" tabindex="0" data-tip="${esc(d.day)}: ${fmt(d.v)} ${esc(label)}" style="height:${Math.max(d.v ? 3 : 0, Math.round(100 * d.v / max))}%"></div>`).join('')}</div>
      <div class="axis"><span>${esc(data[0].day)}</span><span>max ${fmt(max)}</span><span>${esc(data[data.length - 1].day)}</span></div>`;
  }

  const tip = $('tip');
  document.addEventListener('pointerover', (e) => {
    const b = e.target.closest && e.target.closest('.bar');
    if (!b) { tip.style.display = 'none'; return; }
    const r = b.getBoundingClientRect();
    tip.textContent = b.dataset.tip; tip.style.display = 'block';
    tip.style.left = `${r.left + r.width / 2 + window.scrollX}px`; tip.style.top = `${r.top + window.scrollY}px`;
  });
  document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('bar')) e.target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); });

  const LABEL = {
    hid_banner: 'Hid a banner without answering', paused: 'Paused CookieShield on a site', resumed: 'Resumed a site', reported: 'Reported a problem',
    check_again: 'Pressed “Check again”', undo_fixes: 'Undid page fixes', show_original: 'Switched translation off', forgot_site: 'Made CookieShield forget a site'
  };

  function render(s) {
    const S = s.summary;
    $('range-note').textContent = `Last ${s.days} days (since ${s.since}). Totals of anonymous daily summaries — no person can be identified.`;
    tiles($('tiles-use'), [
      [fmt(S.downloads), 'Downloads from your site', 'zip downloads via /api/download'],
      [fmt(S.installs), 'New installs', 'first run of a new copy'],
      [fmt(S.activeLatestDay), 'Active installs', S.activeLatestDate ? `on ${S.activeLatestDate}` : ''],
      [fmt(S.activeAvg), 'Active installs per day', 'average'],
      [fmt(S.translatedPages), 'Pages translated', '']
    ]);
    tiles($('tiles-work'), [
      [fmt(S.banners), 'Cookie banners met', ''],
      [S.successRate == null ? '–' : `${S.successRate}%`, 'Rejected successfully', `${fmt(S.rejected)} of ${fmt(S.rejected + S.needsYou + S.failed)} decided`],
      [fmt(S.verified), 'Confirmed by the site’s record', `${fmt(S.clickedOnly)} more clicked, not double-checked`],
      [fmt(S.needsYou), 'Handed back to the person', 'no safe reject — nothing accepted'],
      [fmt(S.failed), 'Site ignored the “no”', `${fmt(S.falseSuccess)} later found to be false successes`],
      [fmt(S.manual), 'Manual interventions', ''],
      [fmt(S.errors), 'Errors', ''],
      [S.avgHandleMs == null ? '–' : `${(S.avgHandleMs / 1000).toFixed(1)} s`, 'Average time to handle a banner', ''],
      [fmt(S.usOptOuts + S.pageOptOuts), 'US privacy opt-outs', `${fmt(S.pageOptOuts)} on settings pages`],
      [fmt(S.rememberedVisits), 'Visits where the “no” was remembered', '']
    ]);
    bars($('chart-active'), s.daily, 'active', 'active installs');
    bars($('chart-banners'), s.daily, 'banners', 'banners');
    table($('tbl-manual'), [{ h: 'What', v: r => LABEL[r.kind] || r.kind }, { h: 'Times', num: true, v: r => fmt(r.n) }], s.manual, 'No manual interventions recorded.');
    const reasons = [...s.reasons.map(r => ({ k: `Stopped: ${r.kind.replace(/_/g, ' ').toLowerCase()}`, n: r.n })), ...s.errors.map(e => ({ k: `Error: ${e.kind.replace(/_/g, ' ')}`, n: e.n }))];
    table($('tbl-reasons'), [{ h: 'What', v: r => r.k }, { h: 'Times', num: true, v: r => fmt(r.n) }], reasons, 'No exceptions or errors recorded.');
    const T = s.sites;
    table($('tbl-sites'), [
      { h: 'Site', v: r => r.domain }, { h: 'Banners', num: true, v: r => fmt(r.n) },
      { h: 'Rejected', num: true, v: r => fmt(r.ok) },
      { h: 'Problems', num: true, html: r => r.problems ? `<span class="badge b-bad">${fmt(r.problems)}</span>` : '0' },
      { h: 'Platform', v: r => r.cmps }
    ], T.top, 'No one has opted in to share sites yet.');
    table($('tbl-failing'), [{ h: 'Site', v: r => r.domain }, { h: 'Problems', num: true, v: r => fmt(r.problems) }, { h: 'Days', num: true, v: r => fmt(r.days) }, { h: 'Platform', v: r => r.cmps }], T.failing, 'No site is failing repeatedly. 🎉');
    table($('tbl-platforms'), [{ h: 'Platform', v: r => r.cmp }, { h: 'Seen', num: true, v: r => fmt(r.n) }, { h: 'Success', num: true, v: r => pct(r.ok, r.ok + r.problems) }, { h: 'Problems', num: true, v: r => fmt(r.problems) }], T.platforms, 'No opted-in data yet.');
    $('remembered').innerHTML = T.handledVisits || T.rememberedVisits
      ? `<div class="tile"><div class="n">${pct(T.rememberedVisits, T.rememberedVisits + T.handledVisits)}</div><div class="l">of visits to a site already had the “no” saved</div><div class="s">${fmt(T.rememberedVisits)} remembered visits vs ${fmt(T.handledVisits)} banners handled</div></div>`
      : '<p class="empty">No opted-in data yet.</p>';
    table($('tbl-report-types'), [{ h: 'Problem', v: r => String(r.type || 'other').replace(/_/g, ' ') }, { h: 'Reports', num: true, v: r => fmt(r.n) }], s.reports.byType, 'No reports yet.');
    table($('tbl-reports'), [
      { h: 'When', v: r => r.at }, { h: 'Site', v: r => r.site }, { h: 'Problem', v: r => String(r.issue_type || '').replace(/_/g, ' ') },
      { h: 'Result', html: r => r.status ? `<span class="badge ${/VERIFIED|CLICKED/.test(r.status) ? 'b-ok' : /FAILED/.test(r.status) ? 'b-bad' : 'b-warn'}">${esc(r.status)}</span>` : '' },
      { h: 'Comment', html: r => esc(r.comment || '') + (r.github_url ? ` <a href="${esc(r.github_url)}" target="_blank" rel="noopener">issue ↗</a>` : '') }
    ], s.reports.latest, 'No reports yet.');
    $('versions').textContent = s.versions.length ? s.versions.map(v => `${v.version} (${fmt(v.active)})`).join(' · ') : '–';
  }

  async function load() {
    const res = await fetch(`/api/stats?days=${days}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status === 401) { signOut('That token isn’t right.'); return; }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { signOut(j.error || `The server answered ${res.status}.`); return; }
    $('login').hidden = true; $('dash').hidden = false; $('logout').hidden = false;
    render(j);
  }

  function signOut(msg) {
    token = null; try { sessionStorage.removeItem('cs-owner-token'); } catch (e) { /* ignore */ }
    $('dash').hidden = true; $('login').hidden = false; $('logout').hidden = true;
    $('login-err').textContent = msg || '';
  }

  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    token = $('token').value.trim();
    try { sessionStorage.setItem('cs-owner-token', token); } catch (err) { /* ignore */ }
    load();
  });
  $('logout').addEventListener('click', () => signOut(''));
  document.querySelectorAll('.chip[data-days]').forEach(b => b.addEventListener('click', () => {
    days = Number(b.dataset.days);
    document.querySelectorAll('.chip[data-days]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    load();
  }));
  if (token) load();
})();
