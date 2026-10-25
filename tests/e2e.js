/**
 * CookieShield end-to-end test suite.
 *
 * Loads the real extension into Chromium (Playwright) and visits every fixture in
 * web/playground/fixtures.json. Each fixture simulates a consent platform with its real DOM,
 * page API and consent cookie, and records GROUND TRUTH (what was actually decided) in
 * window.__simConsent — independent of the extension.
 *
 * Measures the three success metrics:
 *   P1  % of banners handled correctly, by consent platform and by fixture group
 *   P2  incorrect optional-consent acceptances, accept-button clicks, false success reports
 *   P3  regressions attributable to the extension per 100 supported-site visits
 *       (links, forms, scrolling, sign-in persistence, SPA navigation after handling)
 *
 * Usage:  node tests/e2e.js [--only=onetrust,cookiebot] [--headed]
 * Output: tests/results/e2e-report.json and tests/results/e2e-report.md
 */
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
const WEB = path.join(ROOT, 'web');
const OUT = path.join(__dirname, 'results');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve(port) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      if (/\.html$/.test(u.pathname)) GPC_SEEN[req.headers.host.split(':')[0]] = req.headers['sec-gpc'] || null;
      let p = path.join(WEB, decodeURIComponent(u.pathname));
      if (!p.startsWith(WEB)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    }).listen(port, '127.0.0.1', () => resolve(srv));
  });
}

const GPC_SEEN = {}; // host -> value of the Sec-GPC request header on the last page load
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getSW(ctx) {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 });
  return sw;
}

async function historyFor(sw, host, since) {
  return sw.evaluate(async ({ host, since }) => {
    const { history } = await chrome.storage.local.get({ history: [] });
    return history.filter(h => h.host === host && Date.parse(h.at) >= since);
  }, { host, since });
}

async function tabStatus(sw, page) {
  return sw.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    if (!tab) return null;
    const k = `tab_${tab.id}`;
    const st = await chrome.storage.session.get(k);
    return st[k] || null;
  }, page.url().split('#')[0]);
}

/** Priority 3 functional checks. Returns {checks:{name:bool}, failures:[...]} */
async function functionalChecks(page, baseUrl) {
  const checks = {};
  const t = { timeout: 3000 };
  // Scrolling (user-style wheel)
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(400, 300);
    await page.mouse.wheel(0, 900);
    await sleep(400);
    const lockedBy = await page.evaluate(() => [getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.body).overflowY]);
    const y = await page.evaluate(() => window.scrollY);
    checks.scroll = y > 100 && !lockedBy.includes('hidden');
  } catch (e) { checks.scroll = false; }
  // Forms (Playwright refuses to click if something covers the button)
  try {
    await page.click('#contact-submit', t);
    await page.waitForFunction(() => document.getElementById('contact-result').textContent.includes('sent'), null, t);
    checks.forms = true;
  } catch (e) { checks.forms = false; }
  // Authentication: sign in, reload, still signed in (extension must not delete cookies)
  try {
    if (await page.isVisible('#login-submit')) {
      await page.click('#login-submit', t);
      await page.waitForFunction(() => document.getElementById('login-state').textContent.includes('Signed in'), null, t);
    }
    await page.reload();
    await page.waitForFunction(() => document.getElementById('login-state') && document.getElementById('login-state').textContent.includes('Signed in'), null, { timeout: 5000 });
    checks.auth = true;
  } catch (e) { checks.auth = false; }
  await sleep(1500); // let the extension finish its post-load work after the reload
  // SPA navigation
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#nav-spa', t);
    await page.waitForFunction(() => document.getElementById('route').textContent === '#/about', null, t);
    checks.spaNavigation = true;
  } catch (e) { checks.spaNavigation = false; }
  // Link navigation
  try {
    await page.click('#nav-next', t);
    await page.waitForURL(/next\.html/, t);
    checks.links = true;
    await page.goBack();
  } catch (e) { checks.links = false; }
  const failures = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  return { checks, failures };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const fixtures = JSON.parse(fs.readFileSync(path.join(WEB, 'playground', 'fixtures.json'), 'utf8'))
    .filter(f => !args.only || String(args.only).split(',').includes(f.id));

  const PORT = 8790, FRAME_PORT = 8791;
  const s1 = await serve(PORT), s2 = await serve(FRAME_PORT);

  const userDataDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cs-e2e-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: !args.headed,
    viewport: { width: 1280, height: 860 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
  });
  const sw = await getSW(ctx);
  await sw.evaluate(() => chrome.storage.sync.set({ settings: { enabled: true, pausedSites: [], translateMode: 'offer', showSuccess: false } }));

  const results = [];
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));

  for (const fx of fixtures) {
    const host = `${fx.id}.localhost`;
    const url = `http://${host}:${PORT}/playground/fixtures/${fx.id}.html?frameOrigin=http://127.0.0.1:${FRAME_PORT}`;
    await ctx.clearCookies();
    const since = Date.now() - 50;
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for the extension's verdict (or the scan window for negative/late fixtures)
    const deadline = Date.now() + (fx.id === 'late-banner' ? 16000 : 11000);
    let hist = [];
    while (Date.now() < deadline) {
      hist = await historyFor(sw, host, since);
      if (hist.length) break;
      await sleep(250);
    }
    const handledMs = hist.length ? Date.parse(hist[hist.length - 1].at) - t0 : null;
    if (hist.length) await sleep(fx.expect.includes('VERIFIED') || fx.expect.includes('CLICKED') ? 6500 : 1500); // health check + 5s re-verification
    else await sleep(500);
    hist = await historyFor(sw, host, since);
    const entry = hist[0] || null; // most recent
    const tab = await tabStatus(sw, page);
    const truth = await page.evaluate(() => JSON.parse(JSON.stringify(window.__simConsent)));

    const status = entry ? entry.status : (tab && tab.status) || 'NO_BANNER';
    const handled = status === 'VERIFIED' || status === 'CLICKED';
    const acceptClicks = (truth.clicks || []).filter(c => /accept|agree|allow|subscribe/i.test(c) && !/selection/i.test(c));
    const truthRejected = truth.decided && truth.optionalGranted === false;

    const r = {
      id: fx.id, title: fx.title, group: fx.group, cmp: fx.sim === 'custom' ? 'custom' : fx.sim,
      expected: fx.expect, expectedReason: fx.reason, status, reason: entry && entry.reason, method: entry && entry.method,
      evidence: entry && entry.evidence, clicks: entry ? entry.clicks.map(c => c.label) : [], handledMs,
      truth: { decided: truth.decided, optionalGranted: truth.optionalGranted, choice: truth.choice, simClicks: truth.clicks },
      health: entry && entry.health || null
    };
    r.correct = fx.expect.includes(status) && (!fx.reason || fx.reason === r.reason) &&
      (handled ? truthRejected : true);
    r.acceptClicked = acceptClicks.length > 0;
    r.falseSuccess = handled && !truthRejected;
    r.silentAcceptance = truth.optionalGranted === true && truth.choice !== 'stored' && status !== 'FAILED' && status !== 'NEEDS_YOU';

    // Priority 3 — only for pages where the extension acted, plus the negative control
    if (handled || fx.group === 'negative') {
      r.functional = await functionalChecks(page, url);
      r.regression = r.functional.failures.length > 0;
    }
    results.push(r);
    const mark = r.correct && !r.falseSuccess && !r.acceptClicked && !r.regression ? '✓' : '✗';
    console.log(`${mark} ${fx.id.padEnd(22)} ${status.padEnd(10)} ${(r.reason || '').padEnd(24)} ${handledMs != null ? handledMs + 'ms' : ''} ${r.regression ? 'REGRESSION: ' + r.functional.failures.join(',') : ''}`);
  }

  // ---------------- Extra scenarios: remember, pause, undo -----------------------------
  const extra = {};
  {
    // Remember: after rejecting on OneTrust, a revisit shows no banner and reports REMEMBERED.
    const host = 'remember.localhost';
    await ctx.clearCookies();
    await page.goto(`http://${host}:${PORT}/playground/fixtures/onetrust.html`);
    await sleep(7000);
    await page.reload();
    await sleep(5000);
    const tab = await tabStatus(sw, page);
    const bannerVisible = await page.evaluate(() => !!document.querySelector('#onetrust-banner-sdk'));
    await sleep(500);
    const visit = (await historyFor(sw, host, 0)).find(h => h.kind === 'visit');
    const historyOk = !!(visit && visit.status === 'REMEMBERED' && visit.origin && visit.origin.clicks.length && (visit.refused || []).length);
    extra.remember = { status: tab && tab.status, bannerVisible, historyOk, origin: visit && visit.origin, refused: visit && visit.refused, pass: !bannerVisible && tab && tab.status === 'REMEMBERED' && historyOk };
    console.log(`${extra.remember.pass ? '✓' : '✗'} remember-choice          ${tab && tab.status} · history: ${historyOk ? 'logged with origin + refused' : 'MISSING'}`);
  }
  {
    // Global Privacy Control is OPT-IN: off by default (sites that honour it lock their toggles).
    const host = 'gpc.localhost', host2 = 'gpc-on.localhost';
    await page.goto(`http://${host}:${PORT}/playground/fixtures/next.html`);
    await sleep(500);
    const offHeader = GPC_SEEN[host], offJs = await page.evaluate(() => navigator.globalPrivacyControl);
    await sw.evaluate(async () => { const { settings } = await chrome.storage.sync.get({ settings: {} }); settings.gpcSignal = true; await chrome.storage.sync.set({ settings }); });
    await sleep(1500);
    await page.goto(`http://${host2}:${PORT}/playground/fixtures/next.html`);
    await sleep(500);
    const onHeader = GPC_SEEN[host2], onJs = await page.evaluate(() => navigator.globalPrivacyControl);
    extra.gpc = { offByDefault: !offHeader && offJs !== true, whenEnabled: onHeader === '1' && onJs === true };
    extra.gpc.pass = extra.gpc.offByDefault && extra.gpc.whenEnabled;
    console.log(`${extra.gpc.pass ? '✓' : '✗'} global privacy control     default: header=${offHeader} navigator=${offJs} · enabled: header=${onHeader} navigator=${onJs}`);
  }
  {
    // Pause: banner must be left alone on a paused site.
    const host = 'paused.localhost';
    await sw.evaluate(async (h) => { const { settings } = await chrome.storage.sync.get({ settings: {} }); settings.pausedSites = [h]; await chrome.storage.sync.set({ settings }); }, host);
    await ctx.clearCookies();
    await page.goto(`http://${host}:${PORT}/playground/fixtures/cookiebot.html`);
    await sleep(4000);
    const truth = await page.evaluate(() => window.__simConsent);
    const visible = await page.evaluate(() => !!document.querySelector('#CybotCookiebotDialog'));
    const tab = await tabStatus(sw, page);
    const gpcOnPaused = await page.evaluate(() => navigator.globalPrivacyControl === true) || GPC_SEEN[host] === '1';
    extra.pause = { status: tab && tab.status, bannerVisible: visible, decided: truth.decided, gpcOnPaused, pass: visible && !truth.decided && tab && tab.status === 'PAUSED' && !gpcOnPaused };
    console.log(`${extra.pause.pass ? '✓' : '✗'} per-site pause           ${tab && tab.status}`);
    await sw.evaluate(async () => { const { settings } = await chrome.storage.sync.get({ settings: {} }); settings.pausedSites = []; settings.gpcSignal = false; await chrome.storage.sync.set({ settings }); });
  }
  {
    // Your "yes" is respected: after CookieShield opted out, the person switches "Sale" back on in
    // the site's own panel. On the next visit CookieShield must leave that choice alone.
    const host = 'respect-yes.localhost';
    await ctx.clearCookies();
    await sleep(800);
    await page.goto(`http://${host}:${PORT}/playground/fixtures/iubenda-us-revisit.html`);
    await sleep(7000);
    const first = await tabStatus(sw, page);
    await page.click('.iubenda-cs-preferences-link');
    await page.waitForSelector('#iubenda-iframe');
    await page.check('#purpose-s');
    await page.click('#iubFooterBtn');
    await sleep(300);
    await page.reload();
    await sleep(6500);
    const after = await tabStatus(sw, page);
    const sale = await page.evaluate(() => JSON.parse(decodeURIComponent(document.cookie.match(/_iub_cs-s999-uspr=([^;]*)/)[1])).s);
    extra.respectYes = { first: first && first.status, after: after && after.status, saleStillOn: sale, pass: first && first.status === 'VERIFIED' && sale === true && after && after.status === 'PREVIOUSLY_ACCEPTED' };
    console.log(`${extra.respectYes.pass ? '✓' : '✗'} your "yes" is respected    first=${first && first.status} → you switched Sale on → next visit=${after && after.status}, sale still on=${sale}`);
  }

  {
    // No flicker + panels YOU open are yours: CookieShield opts out of OneTrust's US defaults with
    // the panel kept invisible; then, on a later visit, you open "Do Not Sell or Share" yourself
    // and CookieShield must not click anything in it or report a problem.
    const host = 'user-opened.localhost';
    await ctx.clearCookies();
    await page.goto(`http://${host}:${PORT}/playground/fixtures/onetrust-us-nobanner.html`);
    await sleep(7000);
    const auto = await page.evaluate(() => ({ opacity: window.__simConsent.pcOpacity, granted: window.__simConsent.optionalGranted }));
    const first = await tabStatus(sw, page);
    await page.reload();
    await sleep(2500);
    await page.click('.ot-sdk-show-settings');
    await sleep(5000);
    const st = await page.evaluate(() => ({ open: !!document.getElementById('onetrust-pc-sdk'), clicks: window.__simConsent.clicks.slice() }));
    const tab = await tabStatus(sw, page);
    extra.userOpened = {
      autoStatus: first && first.status, autoPanelOpacity: auto.opacity, optedOut: auto.granted === false,
      panelStillOpen: st.open, clicksAfterYouOpened: st.clicks, statusAfter: tab && tab.status,
      pass: first && first.status === 'VERIFIED' && auto.opacity === '0' && auto.granted === false &&
        st.open && st.clicks.length === 1 && !['NEEDS_YOU', 'FAILED'].includes(tab && tab.status)
    };
    console.log(`${extra.userOpened.pass ? '✓' : '✗'} no flicker / your panel     auto=${first && first.status} (panel opacity while working: ${auto.opacity}) · you opened it → stays open=${st.open}, extension clicks=${st.clicks.length - 1}, status=${tab && tab.status}`);
  }

  await ctx.close();
  s1.close(); s2.close();

  // ---------------- Metrics ---------------------------------------------------------------
  const banners = results.filter(r => r.group !== 'negative');
  const byKey = (key) => {
    const m = {};
    for (const r of banners) {
      const k = r[key];
      m[k] = m[k] || { total: 0, correct: 0 };
      m[k].total++;
      if (r.correct) m[k].correct++;
    }
    for (const v of Object.values(m)) v.pct = Math.round(1000 * v.correct / v.total) / 10;
    return m;
  };
  const handledVisits = results.filter(r => r.status === 'VERIFIED' || r.status === 'CLICKED').length;
  const regressions = results.filter(r => r.regression).length;
  const metrics = {
    runAt: new Date().toISOString(),
    fixtures: results.length,
    p1: {
      correctlyHandledPct: Math.round(1000 * banners.filter(r => r.correct).length / banners.length) / 10,
      correct: banners.filter(r => r.correct).length, total: banners.length,
      byPlatform: byKey('cmp'), byGroup: byKey('group'),
      verified: results.filter(r => r.status === 'VERIFIED').length,
      clickedOnly: results.filter(r => r.status === 'CLICKED').length
    },
    p2: {
      acceptButtonClicks: results.filter(r => r.acceptClicked).length,
      silentOptionalAcceptances: results.filter(r => r.silentAcceptance).length,
      falseSuccessReports: results.filter(r => r.falseSuccess).length,
      exceptionsReportedCorrectly: results.filter(r => r.group === 'exception' && r.correct).length,
      exceptionFixtures: results.filter(r => r.group === 'exception').length
    },
    p3: {
      handledVisits, regressions,
      regressionsPer100: handledVisits ? Math.round(10000 * regressions / (handledVisits + 1)) / 100 : 0,
      checks: ['scroll', 'forms', 'auth', 'spaNavigation', 'links'],
      failingFixtures: results.filter(r => r.regression).map(r => ({ id: r.id, failures: r.functional.failures }))
    },
    extra,
    pageErrors: consoleErrors.slice(0, 20)
  };
  metrics.p3.regressionsPer100 = handledVisits ? Math.round(10000 * regressions / handledVisits) / 100 : 0;

  fs.writeFileSync(path.join(OUT, 'e2e-report.json'), JSON.stringify({ metrics, results }, null, 2));

  const md = [];
  md.push(`# CookieShield end-to-end report\n\nRun: ${metrics.runAt} · ${results.length} fixtures · real Chromium with the extension loaded\n`);
  md.push(`## Priority 1 — coverage\n\n**${metrics.p1.correctlyHandledPct}%** of banners handled correctly (${metrics.p1.correct}/${metrics.p1.total}); ${metrics.p1.verified} verified against the platform's own consent record, ${metrics.p1.clickedOnly} clicked-only (no record available).\n`);
  md.push('| Platform | Correct | Total | % |\n|---|---|---|---|');
  for (const [k, v] of Object.entries(metrics.p1.byPlatform)) md.push(`| ${k} | ${v.correct} | ${v.total} | ${v.pct}% |`);
  md.push('\n| Fixture group | Correct | Total | % |\n|---|---|---|---|');
  for (const [k, v] of Object.entries(metrics.p1.byGroup)) md.push(`| ${k} | ${v.correct} | ${v.total} | ${v.pct}% |`);
  md.push(`\n## Priority 2 — never silently accept\n\n| Metric | Value |\n|---|---|\n| Accept/agree buttons clicked by the extension | ${metrics.p2.acceptButtonClicks} |\n| Silent optional-consent acceptances | ${metrics.p2.silentOptionalAcceptances} |\n| False reports of successful rejection | ${metrics.p2.falseSuccessReports} |\n| Exceptions reported correctly | ${metrics.p2.exceptionsReportedCorrectly}/${metrics.p2.exceptionFixtures} |\n`);
  md.push(`## Priority 3 — don't break sites\n\n**${metrics.p3.regressionsPer100}** regressions per 100 handled visits (${metrics.p3.regressions} of ${metrics.p3.handledVisits}). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.\n`);
  if (metrics.p3.failingFixtures.length) md.push(metrics.p3.failingFixtures.map(f => `- ${f.id}: ${f.failures.join(', ')}`).join('\n'));
  md.push(`\n## Extra scenarios\n\n- Remember choice on revisit (and log it in History with origin + what was refused): ${extra.remember.pass ? 'pass' : 'FAIL'} (${extra.remember.status})\n- Per-site pause leaves banner alone (and sends no GPC): ${extra.pause.pass ? 'pass' : 'FAIL'} (${extra.pause.status})\n- Global Privacy Control off by default, sent only when enabled: ${extra.gpc.pass ? 'pass' : 'FAIL'}\n- A toggle you switch back on yourself is left alone: ${extra.respectYes.pass ? 'pass' : 'FAIL'}\n- Opt-out happens without the panel flashing, and a panel you open yourself is left alone: ${extra.userOpened.pass ? 'pass' : 'FAIL'}\n`);
  md.push('\n## All fixtures\n\n| Fixture | Expected | Got | Reason | Truth | ms | P3 |\n|---|---|---|---|---|---|---|');
  for (const r of results) md.push(`| ${r.id} | ${r.expected.join('/')} | ${r.correct ? '✅' : '❌'} ${r.status} | ${r.reason || ''} | ${r.truth.decided ? (r.truth.optionalGranted ? 'granted' : 'rejected') : 'undecided'} | ${r.handledMs ?? ''} | ${r.functional ? (r.regression ? '❌ ' + r.functional.failures.join(',') : '✅') : '–'} |`);
  fs.writeFileSync(path.join(OUT, 'e2e-report.md'), md.join('\n') + '\n');

  console.log('\n' + JSON.stringify({ p1: { pct: metrics.p1.correctlyHandledPct, correct: metrics.p1.correct, total: metrics.p1.total }, p2: metrics.p2, p3: { per100: metrics.p3.regressionsPer100, regressions } }, null, 1));
  const failed = metrics.p2.acceptButtonClicks || metrics.p2.silentOptionalAcceptances || metrics.p2.falseSuccessReports || regressions || metrics.p1.correct < metrics.p1.total || !extra.remember.pass || !extra.pause.pass || !extra.gpc.pass || !extra.respectYes.pass || !extra.userOpened.pass;
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
