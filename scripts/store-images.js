/** Renders Chrome Web Store images (1280x800 screenshots, 440x280 promo tile) from the UI screenshots
 *  made by `npm run screens`. Output: store/assets/. */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'), SHOTS = path.join(ROOT, 'tests', 'results', 'screens'), OUT = path.join(ROOT, 'store', 'assets');
global.window = global; require(path.join(ROOT, 'web', 'pip.js'));
const pip = (m) => window.PipArt(m);
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, f)).toString('base64')}`;
const css = `*{box-sizing:border-box;margin:0}body{width:1280px;height:800px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(135deg,#eaf4fb,#d4e8f6);color:#16294a;display:flex;align-items:center;gap:56px;padding:0 72px;overflow:hidden}
.t{flex:1}.t h1{font-size:52px;line-height:1.1;font-weight:800;letter-spacing:-.02em}.t p{font-size:24px;line-height:1.45;color:#3d4f66;margin-top:20px}.t .pip{width:120px;margin-bottom:20px}
.shot{border-radius:22px;box-shadow:0 20px 60px rgba(22,41,74,.22);background:#fff}`;
const slides = [
  ['1-rejected', 'Cookie pop-ups, politely declined', 'CookieShield clicks “Reject” for you, then reads the site’s own record to check your “no” was saved.', 'popup-onetrust.png', 'height:740px'],
  ['2-never-accepts', 'It never clicks “Accept”', 'No safe way to say no? It stops and leaves the choice to you. Nothing is ever accepted for you.', 'popup-accept-only.png', 'height:640px'],
  ['3-history', 'See every site it handled', 'What it did, what was refused and how sure it is. Want to say yes somewhere? Just switch the toggle back on.', 'options-history.png', 'width:760px'],
  ['4-settings', 'Any language, your rules', 'Reads cookie pop-ups in 25+ languages, translates pages on your device, and shares nothing about where you browse unless you choose.', 'options-settings.png', 'width:760px']
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  for (const [name, h, s, file, size] of slides) {
    await p.setContent(`<style>${css}</style><div class="t"><div class="pip">${pip('happy')}</div><h1>${h}</h1><p>${s}</p></div><img class="shot" style="${size}" src="${img(file)}">`);
    await p.screenshot({ path: path.join(OUT, `screenshot-${name}.png`) });
  }
  await p.setViewportSize({ width: 440, height: 280 });
  await p.setContent(`<style>*{margin:0;box-sizing:border-box}body{width:440px;height:280px;background:#16294a;color:#f3f7fa;font-family:'Segoe UI',Roboto,Arial,sans-serif;display:flex;align-items:center;gap:18px;padding:0 28px}.pip{width:130px;flex:none}h1{font-size:34px;font-weight:800}p{font-size:19px;color:#f4a259;margin-top:6px;font-weight:700}</style><div class="pip">${pip('happy')}</div><div><h1>CookieShield</h1><p>Cookie pop-ups, politely declined.</p></div>`);
  await p.screenshot({ path: path.join(OUT, 'promo-small-440x280.png') });
  await b.close();
  console.log(fs.readdirSync(OUT).join('\n'));
})();
