/** Renders the annotated "where to click" pictures for /install from Chromium's real chrome://extensions page.
 *  Output: web/install/*.png. Needs full Chromium (Playwright channel "chromium"). */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'web', 'install');
const toolbar = () => document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar').shadowRoot;
(async () => {
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 1280, height: 200 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('chrome://extensions'); await p.waitForTimeout(1500);
  // Hide test-machine noise ("managed by your organization", search box focus) so only the controls show.
  await p.evaluate(() => {
    document.activeElement && document.activeElement.blur();
    const walk = (root) => { for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) walk(el.shadowRoot); if (/managed/i.test(el.id || '') || (/by your organization/i.test(el.textContent) && el.textContent.trim().length < 80)) el.style.visibility = 'hidden'; } };
    walk(document);
    const t = document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar').shadowRoot;
    const s = t.querySelector('#search'); if (s) s.blur();
  });
  const ring = async (sel, label, file, clip) => {
    await p.evaluate(([sel, label]) => {
      document.getElementById('cs-ring')?.remove(); document.getElementById('cs-label')?.remove();
      const t = document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar').shadowRoot;
      const el = t.querySelector(sel); const r = el.getBoundingClientRect();
      const box = (id, css) => { const d = document.createElement('div'); d.id = id; d.style.cssText = `position:fixed;z-index:99999;pointer-events:none;${css}`; document.body.appendChild(d); return d; };
      const pad = sel === '#devMode' ? { l: 118, r: 10, v: 10 } : { l: 8, r: 8, v: 8 };
      box('cs-ring', `left:${r.left - pad.l}px;top:${r.top - pad.v}px;width:${r.width + pad.l + pad.r}px;height:${r.height + 2 * pad.v}px;border:4px solid #f4a259;border-radius:14px;box-shadow:0 0 0 6px rgba(244,162,89,.25)`);
      const lab = box('cs-label', `top:${r.bottom + pad.v + 14}px;background:#16294a;color:#fff;font:700 15px system-ui,sans-serif;padding:8px 12px;border-radius:10px`);
      lab.textContent = label;
      if (sel === '#devMode') lab.style.right = '12px'; else lab.style.left = `${r.left}px`;
    }, [sel, label]);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file), clip });
  };
  await ring('#devMode', 'Switch this on (top right)', 'step-devmode.png', { x: 700, y: 0, width: 580, height: 130 });
  await p.evaluate(() => document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar').shadowRoot.querySelector('#devMode').click());
  await p.waitForTimeout(1200);
  await ring('#loadUnpacked', 'Then click "Load unpacked"', 'step-load.png', { x: 0, y: 0, width: 580, height: 170 });
  await ctx.close();
  console.log('ok');
})();
