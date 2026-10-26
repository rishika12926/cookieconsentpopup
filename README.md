# 🐧 CookieShield

**Browse without cookie pop-ups. CookieShield rejects optional cookies when it can verify the choice, tells you when it can't, and never clicks "Accept" for you.**

A Chrome extension (Manifest V3) with a friendly penguin guide, Pip, plus a small website (landing page, live test bench and problem-report form) that you can host on Vercel.

---

## What it does

| | |
|---|---|
| **US privacy opt-outs too** | In US "opt-out" states, sites often sell or share your data and use it for targeted ads until you say no, even after you reject cookies. CookieShield opens the site's *Your Privacy Choices* / *Do Not Sell or Share* panel, switches everything off and saves, then checks the site's US privacy signals (GPP, the CCPA string and iubenda's US cookie). This also covers OneTrust's no-banner US mode (e.g. newbalance.com), including sites with no "Reject all" where each switch has to be turned off for real (e.g. jobs.netflix.com). It works out of sight, with no pop-up flashing, and never touches a privacy window you open yourself. It only says “no” the first time: if you switch a toggle back on yourself, CookieShield leaves it on. An optional **Global Privacy Control** signal is off by default, because sites that honour it lock their toggles off. |
| **Privacy settings pages** | Some sites have no banner, only a settings page such as Amazon's *Your Ads Privacy Choices* ("Allow" / "Opt out of cross-context behavioral ads"). The **first time** you open such a page, CookieShield selects the opt-out, saves it, and confirms on the reloaded page. After that it never touches that page again, so if you switch back to "Allow", your choice stays. |
| **Rejects, never accepts** | Clicks "Reject all", "Only necessary" and similar options, or opens the settings panel and switches every optional category off. "Accept", "Agree", "OK" and "Subscribe" buttons are hard-blocked in code. |
| **Checks the result** | After clicking, it reads the site's own consent record (the consent platform's API or cookie) and only shows a green *Rejected · confirmed* when that record says nothing optional is on. |
| **Says when it can't** | Accept-only banners, "pay or consent" walls and banners it can't read confidently are left for you, with a short note: *"I didn't accept anything."* |
| **Remembers** | Once a site is handled, the site's own consent cookie keeps the banner away next time. CookieShield also remembers the platform so it can handle it again quietly if the site asks again. |
| **Keeps sites working** | After handling a banner it checks scrolling, clicking, links, forms and the page itself, and repairs only what the cookie banner left behind (scroll locks, invisible overlays). |
| **Pause per site** | One click in the pop-up turns CookieShield off for a site. *Undo page fixes* and *Report a problem* are right next to it. |
| **History** | Every site where it rejected cookies **or found your “no” already in place**: what it did, what was refused (in plain words), where a remembered “no” came from, the proof, filters, search and a CSV export. |
| **Any language** | Recognizes reject, accept and settings buttons in 25+ languages, and offers to translate the whole page into your language with Chrome's on-device translator (nothing leaves your computer). |

---

## How the three priorities are covered

### Priority 1: Better website coverage
- **Support matrix of 30 consent platforms** in `extension/rules/cmp-rules.json`: OneTrust, Cookiebot, Didomi, Usercentrics (shadow DOM), Tealium Consent Manager, Quantcast, Google Funding Choices, Sourcepoint (iframe), TrustArc, Klaro, Axeptio, Osano, Complianz, CookieYes, Borlabs, iubenda, consentmanager, CookieLawInfo, Cookie Notice, Moove GDPR, Civic, Shopify, HubSpot, Cookie Script, Termly, Ketch, Evidon, Commanders Act, plus Amazon, Google and Microsoft's own banners. Rules marked `tested` are covered by the end-to-end suite.
- **Generic fallback** for custom banners: it finds the banner by its wording and position, then classifies its buttons with the multilingual vocabulary in `content/lexicon.js`.
- **Handles hard cases:** banners inside iframes, shadow DOM, banners that appear late or after scrolling, and single-page apps.
- **New site patterns from opt-in, anonymized reports:** *Report a problem* sends only the hostname, platform, button labels and outcome (never full URLs, cookies or page text) to `/api/report`, which files a GitHub issue labelled `site-report`. Sending is off until the user turns it on in Settings. Rules can also be updated from your Vercel site (`/rules/cmp-rules.json`, opt-in and data only, never code).
- **Metric:** % of banners handled correctly, broken down by consent platform and website type (news, shopping, government and so on), in **Dashboard → My stats** and in the test report.

### Priority 2: Never silently accept optional consent
- Rejection is the only policy. Every click passes `CookieShieldVerifier.canClick()`, which refuses anything that reads as accept, agree, pay or ambiguous, whether by label or by id/class.
- Three levels of evidence, shown honestly in the UI:
  - **Rejected · confirmed:** the site's own consent record says nothing optional is on.
  - **Rejected · not double-checked:** a clear reject button was clicked and the banner closed, but the site exposes no record to read.
  - **Needs your choice / Site still allows extras:** no safe reject, or the record contradicts the click. This is reported, never called a success.
- **US state privacy laws are checked too.** A banner's "Reject all" doesn't always cover sale, sharing and targeted advertising. On granola.ai (iubenda), for example, they stayed on after the banner closed. CookieShield reads the US signals after every rejection and completes the opt-out in *Your Privacy Choices*, including on return visits where the site no longer shows a banner. If the link isn't drawn, it opens the same panel through the platform's own API (an allow-list of open-only calls). This was tested live on granola.ai. If a site offers no way to opt out, it reports *Needs your choice* instead of success.
- A second check 5 seconds later downgrades a result if the record changes or the banner comes back. This is how false success reports are caught.
- **Metrics:** accept-button clicks, silent optional-consent acceptances and false success reports, all measured by the test suite against independent ground truth.

### Priority 3: Prevent broken website functionality
- After every handled banner, a self-test checks scrolling, clicking, links, forms and that the page is active. Only banner leftovers are repaired, and every repair can be undone from the pop-up.
- **Per-site pause** in the pop-up, and a site list in Settings.
- **Report a problem** in the pop-up, with "site broke" as one of the choices.
- **Metric:** regressions attributable to the extension per 100 supported-site visits, measured end to end (scrolling, a real form submit, sign-in surviving a reload, SPA navigation, link navigation).

---

## What the user survey changed

17 people answered the survey (`Cookie_pop_up_survey.xlsx`). What they said, and what we built in response:

| Survey finding | What CookieShield does |
|---|---|
| **Finding the reject option** (4 of 17 named it their biggest problem). *"Hard to find reject"*, *"didn't have a quick 'only essential' option"* | Finds reject even when it's hidden in a second layer: it opens settings, switches optional categories off and saves. |
| **"Not knowing what happens when I accept or reject"** (the most-cited problem, 5 of 17). 8 of 17 clicked "Accept all" the last time they saw a pop-up | Every result is explained in plain words in the pop-up and history: what was refused (ads, cross-site tracking, analytics), what stays on (sign-in, basket, security) and the proof found. |
| **"Some websites didn't even have the option to opt out"**, *"won't let me use the site without accepting"* | Accept-only banners and pay-or-consent walls are detected and handed to you (*"I didn't accept anything"*), with a *Hide without answering* option. |
| **Seeing pop-ups repeatedly** | Remembers each handled site and re-handles it quietly (no flicker) if the site asks again. |
| **"Pop-ups interfere with website functionality"**, *"article didn't show up after accepting, had to refresh"* | Post-banner health check repairs scroll locks and invisible overlays, with undo and per-site pause. |
| People mention **Brave, Firefox's auto-reject and uBlock Origin** | Positioned as "reject *and* verify, then show the proof", which those tools don't do for Chrome users. Chrome was the most-used browser (9 of 17). |
| *"Accepting all is quicker, that's how people are tricked"* | Zero-effort default: install it and it works with nothing to configure. |

---

## Install the extension (2 minutes)

1. Download the extension: either `cookieshield-extension.zip` from your Vercel site (**Download the extension**) or the `extension/` folder from this repo. Unzip it if needed.
2. Open **chrome://extensions** in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the `extension` folder (the one that contains `manifest.json`).
5. Pin CookieShield from the puzzle-piece menu so Pip is always visible.

Requires Chrome 120 or later. Page translation uses Chrome's built-in on-device translator (Chrome 138 or later). On older versions, CookieShield points you to Chrome's own *Translate* option.

---

## Test it

### A. Automatic tests (recommended)
```bash
npm install                          # installs Playwright
npx playwright install chromium      # first time only
npm test                             # unit tests: 362 lexicon/rule checks + report API
npm run test:e2e                     # real Chromium with the extension loaded, 57 scenarios
```
The end-to-end run writes `tests/results/e2e-report.md` and `.json` with all three metrics. Latest run:

| Metric | Result |
|---|---|
| P1: banners handled correctly | **56 / 56 (100%)** across 16 consent platforms (including iubenda's US privacy choices, copied from a real site), custom banners in 22 languages and edge cases |
| P2: accept buttons clicked / silent acceptances / false success reports | **0 / 0 / 0** |
| P2: exceptions correctly reported to the user | **5 / 5** (accept-only, pay-or-consent ×2, mislabeled reject, US opt-out with no opt-out link) |
| P3: regressions per 100 handled visits | **0** |
| Remember choice on revisit (logged in History with origin + what was refused) / per-site pause / GPC off by default and only sent when enabled / a toggle you switch back on is left alone / no flicker and your own panels left alone / settings pages opted out once, then left to you | pass / pass / pass / pass / pass / pass |

Run a subset with `node tests/e2e.js --only=onetrust,cookiebot`. Add `--headed` to watch it run.

### B. The test bench (in your browser)
With the extension installed, open `https://<your-vercel-site>/playground/`. Every card opens a simulated site with a real-looking banner (OneTrust, Cookiebot, Didomi and more, in 22 languages, plus trick cases such as an accept-only banner, a pay wall and a mislabeled button). Each page shows the ground truth (what the site actually recorded), so you can check CookieShield's answer yourself.

To run the test bench locally: `npm run build && npx serve public`, then open http://localhost:3000/playground/.

### C. Real-site checklist (manual)
Use a fresh Chrome profile, or clear a site's cookies first. Then visit a few sites, for example:

| Site type | Try | What to check |
|---|---|---|
| News (OneTrust, Sourcepoint) | a large EU news site | banner disappears; pop-up shows *Rejected · confirmed* |
| German or French site | spiegel.de, lemonde.fr | rejects in the local language; Pip offers to translate the page |
| Shopping | an EU retailer | add to basket and checkout still work |
| Accept-only banner | any site with only "OK" | pop-up says *Needs your choice*, and nothing was accepted |
| Sign-in site | a site you log into | stay signed in after reloading |

For each site, open the pop-up, read Pip's message, open *What exactly happened?*, try **Pause on this site**, then check **Dashboard → History**.

---

## Put it on GitHub

```bash
cd cookieshield               # this folder
git init -b main              # skip if a .git folder already exists
git add -A
git commit -m "CookieShield v2"
# Create an empty repo named "cookieshield" at https://github.com/new (no README), then:
git remote add origin https://github.com/<your-username>/cookieshield.git
git push -u origin main
```
GitHub Actions (`.github/workflows/ci.yml`) then runs the unit and end-to-end tests on every push. Pushing a tag (`git tag v2.0.0 && git push --tags`) creates a GitHub Release with the extension zip attached.

## Host on Vercel

1. Go to **https://vercel.com/new** and sign in with GitHub.
2. **Import** your `cookieshield` repo. Vercel reads `vercel.json`, so keep the defaults (no framework, build command `node scripts/build-web.js`, output directory `public`).
3. Click **Deploy**. You get a site like `https://cookieshield-<you>.vercel.app` with:
   - `/`: the landing page and the **Download the extension** button (the zip is built from `extension/` on every deploy)
   - `/playground/`: the test bench
   - `/report`: the problem-report form
   - `/rules/cmp-rules.json`: the rule-update feed
   - `/api/report`: the endpoint for anonymized reports
4. *(Optional: turn reports into GitHub issues.)* In Vercel, open **Project → Settings → Environment Variables** and add:
   - `GITHUB_TOKEN`: a fine-grained token with **Issues: Read and write** on this repo only
   - `GITHUB_REPO`: `<your-username>/cookieshield`

   Redeploy. Without these variables, reports are still accepted and logged, but no issue is created.
5. In the extension, open **Dashboard → Settings → Helping CookieShield learn new sites**. Set **Report server** to `https://<your-site>/api/report` and turn on sharing (opt-in).

Every push to `main` redeploys automatically.

Using the CLI instead: `npm i -g vercel && vercel` from this folder, then `vercel --prod`.

---

## Project layout

```
extension/                 the Chrome extension (load this folder)
  manifest.json
  background/service-worker.js   history, per-site memory, badge, stats, reports, rule updates
  content/
    page-bridge.js         reads consent platforms' own APIs (__tcfapi, OneTrust, Cookiebot…) for verification
    lexicon.js             25+ language vocabulary for reject / accept / settings / save / pay
    cmp-detector.js        finds known platforms and custom banners (shadow DOM, iframes, late banners)
    cmp-handlers.js        runs rules: reject → or settings → switch optional off → save
    generic-handler.js     fallback for custom banners
    verifier.js            click safety gate + consent-record checks (Priority 2)
    site-restorer.js       post-banner self-test + undoable repairs (Priority 3)
    translator.js          on-device page translation
    ui-notifier.js         small in-page notices for exceptions
    content.js             orchestrator
  popup/  options/  shared/      Pip, the pop-up, dashboard (history, stats, sites, platforms, reports, settings)
  rules/cmp-rules.json     support matrix (data only)
web/                       landing page, test bench (playground/) and report form
api/report.js              Vercel serverless function for reports → GitHub issues
scripts/build-web.js       builds public/ (site + extension zip + rules feed)
tests/                     unit tests, API tests, end-to-end suite, UI screenshots
```

## Privacy
- Everything runs on your computer. History, settings and site memory are stored in Chrome's extension storage.
- No analytics, no tracking, and no network calls unless you turn on reports or rule updates.
- Reports contain the hostname, platform, button labels and result only.
- Translation uses Chrome's on-device model, so page text never leaves your computer.

## Limits worth knowing
- "Rejected · not double-checked" means the site has no readable consent record. The reject button was clicked, but we can't prove what the site stored.
- New or heavily customized banners may need a rule. Use **Report a problem**, and the issue lands in GitHub with what's needed to add it.
- Some TCF platforms still claim purposes under "legitimate interest" after a rejection. CookieShield shows this in the proof when the platform exposes it.

MIT License. Pip is an original character inspired by the warmth of claymation penguins. CookieShield isn't affiliated with any cartoon or consent platform.
