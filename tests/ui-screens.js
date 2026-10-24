/** Renders popup + dashboard screenshots after visiting a few fixtures (visual QA). */
const { chromium } = require('playwright'); const path = require('path'); const http = require('http'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), WEB = path.join(ROOT, 'web'), EXT = path.join(ROOT, 'extension'), OUT = path.join(__dirname, 'results', 'screens');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'); const p = path.join(WEB, u.pathname); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(p).pipe(r); }).listen(8796);
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, colorScheme: process.env.DARK ? 'dark' : 'light', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = sw.url().split('/')[2];
  const tabs = {};
  for (const fx of (process.argv[2] || 'onetrust,custom-de,accept-only,mislabeled,leftover-lock').split(',')) {
    const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 });
    await p.goto(`http://${fx}.localhost:8796/playground/fixtures/${fx}.html`); await p.waitForTimeout(7000);
    await p.screenshot({ path: path.join(OUT, `page-${fx}.png`) });
    tabs[fx] = await sw.evaluate(async (u) => (await chrome.tabs.query({ url: u }))[0].id, p.url().split('#')[0]);
  }
  for (const [fx, tabId] of Object.entries(tabs)) {
    const pp = await ctx.newPage(); await pp.setViewportSize({ width: 372, height: 700 });
    await pp.goto(`chrome-extension://${id}/popup/popup.html?tabId=${tabId}`); await pp.waitForTimeout(2200);
    if (fx === Object.keys(tabs)[0]) await pp.click('#status-details summary').catch(() => {});
    await pp.screenshot({ path: path.join(OUT, `popup-${fx}${process.env.DARK ? '-dark' : ''}.png`), fullPage: true });
    await pp.close();
  }
  for (const t of ['history', 'metrics', 'coverage', 'settings']) {
    const o = await ctx.newPage(); await o.setViewportSize({ width: 1280, height: 900 });
    await o.goto(`chrome-extension://${id}/options/options.html#${t}`); await o.waitForTimeout(800);
    if (t === 'history') await o.click('.entry summary').catch(() => {});
    await o.screenshot({ path: path.join(OUT, `options-${t}${process.env.DARK ? '-dark' : ''}.png`) });
  }
  await ctx.close(); srv.close();
})();
