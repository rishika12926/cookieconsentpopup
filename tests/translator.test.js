/**
 * Translator tests (no Chrome translator needed): loads extension/content/translator.js into a
 * real Chromium page with a fake on-device Translator, then simulates what modern sites do.
 *
 *  1. plain page                      → every Dutch passage becomes English
 *  2. site re-draws mid-translation   → re-drawn text is translated too (ridder.com-style hydration)
 *  3. site writes its text back later → re-applied
 *  4. translator fails on every call  → NO "Translated" claim; an honest failure message instead
 *  5. "Show original" restores the exact text
 *
 * Run: node tests/translator.test.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'extension', 'content', 'translator.js'), 'utf8');
const DICT = { 'Jouw rol': 'Your role', 'Over ons': 'About us', 'Solliciteer nu': 'Apply now', 'Als ervaren Product Manager bepaal je de koers.': 'As an experienced product manager you set the course.', 'Contactinformatie': 'Contact information', 'Nieuwe vacatures': 'New vacancies' };

function setup(page, { fail = false, unchanged = false } = {}) {
  return page.evaluate(({ DICT, fail, unchanged }) => {
    // Stand-in for page-bridge.js (the page's own translator). Works unless `fail`.
    document.addEventListener('cookieshield:tr-request', (ev) => {
      const req = JSON.parse(ev.detail);
      const reply = (o) => document.dispatchEvent(new CustomEvent('cookieshield:tr-response', { detail: JSON.stringify({ id: req.id, ...o }) }));
      setTimeout(() => fail ? reply({ error: 'UnknownError', message: 'model crashed' }) : reply({ out: req.texts.map(t => DICT[t] || t) }), 10);
    });
    window.chrome = { i18n: { detectLanguage: (t, cb) => cb({ isReliable: true, languages: [{ language: 'nl' }] }) } };
    window.Translator = {
      availability: async () => 'available',
      // `unchanged`: what we saw on ridder.com — the extension-side translator hands text back as-is.
      create: async () => ({ translate: async (t) => { await new Promise(r => setTimeout(r, 15)); if (fail) throw new DOMException('model crashed', 'UnknownError'); return unchanged ? t : (DICT[t] || t); } })
    };
  }, { DICT, fail, unchanged });
}

const HTML = `<!doctype html><html lang="nl"><body><nav><a href="#">Over ons</a></nav><main id="app">
  <h2>Jouw rol</h2><p>Als ervaren Product Manager bepaal je de koers.</p><aside><h3>Contactinformatie</h3><button>Solliciteer nu</button></aside></main></body></html>`;

let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log('✗', m); } else console.log('✓', m); };

(async () => {
  const browser = await chromium.launch();
  const T = async (page) => page.evaluate(() => window.CookieShieldTranslator);

  // 1 + 5
  {
    const page = await browser.newPage(); await page.setContent(HTML); await setup(page); await page.addScriptTag({ content: SRC });
    const r = await page.evaluate(() => window.CookieShieldTranslator.translatePage('en'));
    const text = await page.evaluate(() => document.body.innerText);
    ok(r.ok && /Your role/.test(text) && /Apply now/.test(text) && !/Jouw rol/.test(text), `plain page translated (${r.count} passages)`);
    await page.evaluate(() => window.CookieShieldTranslator.showOriginal());
    ok(/Jouw rol/.test(await page.evaluate(() => document.body.innerText)), '“Show original” restores the Dutch text');
    await page.close();
  }
  // 2: hydration replaces the whole app right after translation starts
  {
    const page = await browser.newPage(); await page.setContent(HTML); await setup(page); await page.addScriptTag({ content: SRC });
    const r = await page.evaluate(async () => {
      const p = window.CookieShieldTranslator.translatePage('en');
      setTimeout(() => { const app = document.getElementById('app'); app.outerHTML = app.outerHTML.replace(/Your role|As an experienced product manager you set the course\.|Contact information|Apply now/g, m => ({ 'Your role': 'Jouw rol', 'Apply now': 'Solliciteer nu', 'Contact information': 'Contactinformatie' }[m] || 'Als ervaren Product Manager bepaal je de koers.')) + ''; }, 40);
      return p;
    });
    await page.waitForTimeout(1200);
    const text = await page.evaluate(() => document.body.innerText);
    ok(r.ok && /Your role/.test(text) && /Apply now/.test(text) && !/Jouw rol|Solliciteer/.test(text), 'text re-drawn by the site mid-translation is translated too');
    await page.close();
  }
  // 3: framework writes the original text back into the same node later
  {
    const page = await browser.newPage(); await page.setContent(HTML); await setup(page); await page.addScriptTag({ content: SRC });
    await page.evaluate(() => window.CookieShieldTranslator.translatePage('en'));
    await page.evaluate(() => { document.querySelector('h2').firstChild.nodeValue = 'Jouw rol'; const p = document.createElement('p'); p.textContent = 'Nieuwe vacatures'; document.getElementById('app').appendChild(p); });
    await page.waitForTimeout(300);
    const text = await page.evaluate(() => document.body.innerText);
    ok(/Your role/.test(text) && /New vacancies/.test(text), 'text the site writes back, and new content, get translated');
    await page.close();
  }
  // 4: honest failure
  {
    const page = await browser.newPage(); await page.setContent(HTML); await setup(page, { fail: true }); await page.addScriptTag({ content: SRC });
    const r = await page.evaluate(() => window.CookieShieldTranslator.translatePage('en'));
    const st = await page.evaluate(() => window.CookieShieldTranslator.status());
    ok(!r.ok && !st.translated, 'when nothing could be translated it does NOT claim “Translated”');
    await page.close();
  }
  // 6: extension-side translator returns the text unchanged → the page's translator is used
  {
    const page = await browser.newPage(); await page.setContent(HTML); await setup(page, { unchanged: true }); await page.addScriptTag({ content: SRC });
    const r = await page.evaluate(() => window.CookieShieldTranslator.translatePage('en'));
    const text = await page.evaluate(() => document.body.innerText);
    ok(r.ok && r.engine === 'page' && /Your role/.test(text) && !/Jouw rol/.test(text), 'when the extension translator hands text back unchanged, the page’s on-device translator is used (ridder.com)');
    await page.close();
  }
  // 7: ridder.com marks the whole page "do not translate" — translate anyway; keep marked bits
  {
    const page = await browser.newPage();
    await page.setContent(HTML.replace('<html lang="nl">', '<html lang="nl" translate="no"><head><meta name="google" content="notranslate"></head>').replace('<h2>Jouw rol</h2>', '<h2>Jouw rol</h2><span translate="no">Over ons</span>'));
    await setup(page); await page.addScriptTag({ content: SRC });
    const r = await page.evaluate(() => window.CookieShieldTranslator.translatePage('en'));
    const kept = await page.evaluate(() => document.querySelector('span[translate="no"]').textContent);
    const text = await page.evaluate(() => document.body.innerText);
    ok(r.ok && /Your role/.test(text) && kept === 'Over ons', 'a site-wide “do not translate” flag (ridder.com) is ignored; parts marked individually stay as they are');
    await page.close();
  }
  await browser.close();
  console.log(failures ? `translator: ${failures} FAILED` : 'translator: all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
