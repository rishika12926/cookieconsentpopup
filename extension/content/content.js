/**
 * CookieShield — Content orchestrator
 * Detect → reject (never accept) → verify → repair leftovers → self-test → report.
 */
(async function () {
  'use strict';

  const D = window.CookieShieldDOM;
  const isTop = window.top === window;
  const site = D.siteKey(location.hostname);
  if (!/^https?:$/.test(location.protocol) && location.protocol !== 'file:') return;

  const SCAN_WINDOW_MS = 20000;
  const NO_BANNER_CHECK_MS = 3500;

  let settings = null;
  let rules = [];
  let busy = false;
  let finished = false;          // a banner was handled (or an exception raised) on this page
  let lastOutcome = null;
  let lastDetection = null;
  let observer = null;
  let prehideStyle = null;
  const startedAt = Date.now();

  const pageStatus = {
    site, host: location.hostname, status: 'SCANNING', frame: isTop ? 'top' : 'sub',
    outcome: null, health: null, siteType: null, language: null
  };

  function send(type, payload) {
    try { return chrome.runtime.sendMessage({ type, payload }); } catch (e) { return Promise.resolve(); }
  }

  // ---------------------------------------------------------------------------------------
  // Settings / memory / rules
  // ---------------------------------------------------------------------------------------
  async function loadAll() {
    const sync = await chrome.storage.sync.get({ settings: {} });
    settings = Object.assign({
      enabled: true, pausedSites: [], showSuccess: false, translateMode: 'offer', targetLang: 'en', translateNeverSites: []
    }, sync.settings || {});
    const local = await chrome.storage.local.get({ siteMemory: {} });
    // Rules come from the background (bundled + optional remote updates, data only).
    try { rules = (await chrome.runtime.sendMessage({ type: 'GET_RULES' })) || []; } catch (e) { rules = []; }
    return local.siteMemory[site] || null;
  }

  // Anti-flicker: on sites where we've already handled this platform, keep its banner
  // transparent while we reject it again. Removed as soon as we're done (success or not).
  function prehide(selectors) {
    if (!selectors || !selectors.length) return;
    prehideStyle = document.createElement('style');
    prehideStyle.textContent = `${selectors.join(',')}{opacity:0 !important;transition:none !important}`;
    document.documentElement.setAttribute('data-cookieshield-prehide', '');
    (document.head || document.documentElement).appendChild(prehideStyle);
    setTimeout(endPrehide, 8000);
  }
  function endPrehide() {
    if (prehideStyle) { prehideStyle.remove(); prehideStyle = null; }
    document.documentElement.removeAttribute('data-cookieshield-prehide');
  }

  // "Hide without answering" chosen by the user for this site.
  function applyUserHide(selector) {
    if (!selector) return;
    const st = document.createElement('style');
    st.id = 'cookieshield-user-hide';
    st.textContent = `${selector}{display:none !important}`;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------------------------------------------------------------------------------------
  // Website type (for metric segmentation) – coarse, local, no network
  // ---------------------------------------------------------------------------------------
  function classifySite() {
    const h = location.hostname;
    if (/(\.gov|\.gouv\.|\.gob\.|\.gv\.at|\.bund\.de|\.gc\.ca|\.admin\.ch|\.europa\.eu|\.gov\.[a-z]{2})$/.test(h) || /\.gov\./.test(h)) return 'government';
    if (/(\.edu|\.ac\.[a-z]{2}|\.edu\.[a-z]{2})$/.test(h) || /univ|school|college/.test(h)) return 'education';
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).join(' ').slice(0, 20000);
    const og = (document.querySelector('meta[property="og:type"]') || {}).content || '';
    if (/"@type"\s*:\s*"(Product|Offer|AggregateOffer)"/.test(ld) || /og:product|product/.test(og) || document.querySelector('[href*="/cart"], [href*="/basket"], [data-add-to-cart], form[action*="cart"]')) return 'shopping';
    if (/"@type"\s*:\s*"(NewsArticle|ReportageNewsArticle)"/.test(ld) || og === 'article' || /news|times|post|zeitung|journal|herald|tribune|gazette|spiegel|monde|tagesschau|bbc|cnn/.test(h)) return 'news-media';
    if (/bank|finance|insur|invest|pay|credit/.test(h)) return 'finance';
    if (/travel|hotel|flight|airline|booking|rail|bahn/.test(h)) return 'travel';
    if (document.querySelector('input[type="password"]')) return 'account-login';
    if (/blog|wiki|docs|medium/.test(h) || /"@type"\s*:\s*"(BlogPosting|Article)"/.test(ld)) return 'blog-reference';
    return 'other';
  }

  // ---------------------------------------------------------------------------------------
  // Core flow
  // ---------------------------------------------------------------------------------------
  async function scan() {
    if (busy || finished) return;
    busy = true;
    try {
      const det = window.CookieShieldDetector.detect(rules);
      if (!det) return;

      if (det.kind === 'delegated') {
        if (pageStatus.status !== 'WAITING_FRAME') {
          pageStatus.status = 'WAITING_FRAME';
          lastDetection = det;
          send('STATUS', { ...pageStatus, cmpId: det.rule.id, cmpName: det.rule.name });
        }
        return;
      }

      lastDetection = det;
      pageStatus.status = 'HANDLING';
      const outcome = await window.CookieShieldEngine.handle(det);
      outcome.supported = !!det.rule;
      outcome.ruleTested = !!(det.rule && det.rule.tested);
      outcome.selector = det.rule ? (det.rule.container || [])[0] || null : D.selectorFor(det.container);
      await finish(outcome, det);
    } catch (e) {
      console.warn('[CookieShield] scan error', e);
    } finally {
      busy = false;
    }
  }

  async function finish(outcome, det) {
    finished = true;
    if (outcome.status === 'FRAME_CLICKED') {
      // We clicked reject inside a CMP iframe; the top frame verifies against the page's record.
      send('FRAME_ACTION', { outcome: { ...outcome, frameHost: location.hostname } });
      return;
    }
    lastOutcome = outcome;
    endPrehide();
    pageStatus.status = outcome.status;
    pageStatus.outcome = outcome;
    pageStatus.siteType = pageStatus.siteType || classifySite();
    send('OUTCOME', { ...pageStatus, outcome, at: Date.now(), ms: Date.now() - startedAt });

    if (outcome.status === 'VERIFIED' || outcome.status === 'CLICKED') {
      if (settings.showSuccess && isTop) window.CookieShieldNotifier.showSuccess(outcome);
      if (isTop) postHandlingHealth(det && det.rule);
      setTimeout(() => recheck(outcome, det), 5000);
    } else if (isTop && !outcome.quiet) {
      showNotice(outcome);
    }
  }

  /** Priority 3: after handling, make sure the page still works; repair CMP leftovers only. */
  async function postHandlingHealth(rule) {
    await D.wait(1200);
    const before = window.CookieShieldRestorer.selfTest();
    let repairs = [];
    let after = before;
    if (!before.ok) {
      repairs = window.CookieShieldRestorer.repairAfterBanner(rule);
      await D.wait(300);
      after = window.CookieShieldRestorer.selfTest();
    }
    pageStatus.health = { before: before.issues, repairs, after: after.issues, ok: after.ok, checks: after.checks };
    send('HEALTH', { site, health: pageStatus.health, cmpId: rule ? rule.id : 'generic', siteType: pageStatus.siteType });
  }

  /** Priority 2: a few seconds later, check that the result still holds (catches false successes). */
  async function recheck(outcome, det) {
    const state = await window.CookieShieldVerifier.readState(det && det.rule && det.rule.state);
    const reappeared = det && det.container && det.container.isConnected && D.isVisible(det.container);
    if (state.anyGranted || reappeared) {
      const downgraded = { ...outcome, status: state.anyGranted ? 'FAILED' : 'NEEDS_YOU', reason: state.anyGranted ? 'OPTIONAL_STILL_GRANTED' : 'REJECT_NOT_CONFIRMED', evidence: state.summary || outcome.evidence, downgradedFrom: outcome.status };
      lastOutcome = downgraded;
      pageStatus.status = downgraded.status;
      pageStatus.outcome = downgraded;
      send('FALSE_SUCCESS', { site, outcome: downgraded, siteType: pageStatus.siteType });
      if (isTop) showNotice(downgraded);
    }
  }

  function showNotice(outcome) {
    window.CookieShieldNotifier.showException(outcome, {
      onHide: (always) => {
        const sel = outcome.selector || (lastDetection && D.selectorFor(lastDetection.container));
        if (lastDetection && lastDetection.container) lastDetection.container.style.setProperty('display', 'none', 'important');
        window.CookieShieldRestorer.repairAfterBanner(lastDetection && lastDetection.rule);
        send('USER_HID_BANNER', { site, always, selector: sel, cmpId: outcome.cmpId });
      },
      onPause: () => send('SET_PAUSED', { site, paused: true }),
      onReport: () => send('SUBMIT_REPORT', { report: buildReport('banner_not_handled', '') })
    });
  }

  function buildReport(issueType, comment) {
    const o = lastOutcome || {};
    return {
      site, issueType, comment: String(comment || '').slice(0, 500),
      cmpId: o.cmpId || null, status: o.status || pageStatus.status, reason: o.reason || null, method: o.method || null,
      buttons: (o.buttons || []).map(b => ({ label: b.label, type: b.type })),
      bannerLang: o.bannerLang || null, pageLang: pageStatus.language && pageStatus.language.code,
      siteType: pageStatus.siteType || classifySite(), health: pageStatus.health ? pageStatus.health.after : null,
      selector: o.selector || null
    };
  }

  /** No banner after a while: tell the user whether an earlier choice is still in effect. */
  async function checkRemembered() {
    if (finished || busy || !isTop || pageStatus.status === 'WAITING_FRAME') return;
    const state = await window.CookieShieldVerifier.readState();
    if (finished || busy) return;
    pageStatus.siteType = pageStatus.siteType || classifySite();
    // No banner, but the site says you haven't opted out of sale / sharing / targeted ads
    // (US opt-out laws make that the default). Opt out the same way a person would.
    if (state.usGranted && !state.otherGranted) {
      busy = true;
      try {
        const rule = rules.find(r => r.usOptOut && (r.detect || []).concat(r.usOptOut.open || [], r.usOptOut.present || []).some(sel => { try { return document.querySelector(sel); } catch (e) { return false; } })) || null;
        const ctx = { cmpId: rule ? rule.id : 'us-privacy', cmpName: rule ? rule.name : 'US privacy choices', clicks: [], turnedOff: [], essentialKept: [], evidence: null, method: 'us_optout' };
        const v = await window.CookieShieldEngine.usOptOut(rule, ctx);
        const outcome = window.CookieShieldEngine.result(ctx, v.status, v.reason, 'us_optout');
        outcome.supported = !!rule;
        outcome.ruleTested = !!(rule && rule.tested);
        // If there is no opt-out link at all, tell the popup but don't interrupt the page.
        outcome.quiet = v.status === 'NEEDS_YOU' && v.reason === 'US_OPTOUT_NOT_FOUND';
        await finish(outcome, null);
      } catch (e) { console.warn('[CookieShield] US opt-out error', e); }
      finally { busy = false; }
      return;
    }
    if (state.decided && state.allDenied) pageStatus.status = 'REMEMBERED';
    else if (state.decided && state.anyGranted) pageStatus.status = 'PREVIOUSLY_ACCEPTED';
    else pageStatus.status = 'NO_BANNER';
    pageStatus.evidence = state.summary || null;
    send('STATUS', { ...pageStatus });
  }

  function startObserving() {
    let t = null;
    observer = new MutationObserver(() => {
      if (finished) return;
      clearTimeout(t);
      t = setTimeout(scan, 250);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open'] });
    for (const ms of [600, 1500, 3000, 6000, 10000, 15000]) setTimeout(scan, ms);
    setTimeout(() => {
      if (observer) observer.disconnect();
      observer = null;
      endPrehide();
    }, SCAN_WINDOW_MS);
  }

  // ---------------------------------------------------------------------------------------
  // Messages from popup / background
  // ---------------------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_PAGE_STATUS') {
      if (!isTop) return false;
      sendResponse({ ...pageStatus, translator: window.CookieShieldTranslator.status(), fixesApplied: window.CookieShieldRestorer.changeCount() });
      return false;
    }
    if (!isTop && msg.type !== 'RESCAN') return false;
    switch (msg.type) {
      case 'RESCAN':
        finished = false; lastOutcome = null; pageStatus.status = 'SCANNING';
        scan().then(() => sendResponse({ ok: true, status: pageStatus.status }));
        return true;
      case 'RUN_SELF_TEST':
        sendResponse(window.CookieShieldRestorer.selfTest());
        return false;
      case 'UNDO_FIXES':
        sendResponse({ undone: window.CookieShieldRestorer.undo() });
        return false;
      case 'TRANSLATE_PAGE':
        window.CookieShieldTranslator.translatePage(msg.target || settings.targetLang).then(r => sendResponse(r));
        return true;
      case 'SHOW_ORIGINAL':
        window.CookieShieldTranslator.showOriginal();
        sendResponse({ ok: true });
        return false;
      case 'BUILD_REPORT':
        sendResponse(buildReport(msg.issueType, msg.comment));
        return false;
      case 'VERIFY_FRAME_ACTION': {
        // A CMP iframe clicked reject. Verify here, where the consent APIs live.
        const det = lastDetection || { rule: null, container: null };
        const ctx = { evidence: null };
        (async () => {
          const frule = det.rule || (msg.outcome.cmpId ? rules.find(r => r.id === msg.outcome.cmpId) : null);
          let v = await window.CookieShieldEngine.verifyAfter(det.container, frule, ctx);
          if (v.status === 'US_PENDING') {
            ctx.clicks = [...(msg.outcome.clicks || [])]; ctx.turnedOff = [];
            v = await window.CookieShieldEngine.usOptOut(frule, ctx);
            msg.outcome.clicks = ctx.clicks;
            msg.outcome.usOptOut = ctx.usOptOut || null;
          }
          const status = v.status === 'PENDING' ? (v.state && v.state.allDenied ? 'VERIFIED' : 'NEEDS_YOU') : v.status;
          const outcome = { ...msg.outcome, status, reason: status === 'NEEDS_YOU' ? (v.reason || 'REJECT_NOT_CONFIRMED') : (v.reason || null), evidence: ctx.evidence, stateSources: ctx.stateSources || [], supported: true, selector: det.rule ? (det.rule.detect || [])[0] : null };
          await finish(outcome, det.container ? det : null);
        })();
        sendResponse({ ok: true });
        return false;
      }
      case 'FRAME_OUTCOME':
        // A CMP inside an iframe finished. Top frame repairs leftovers / shows notices.
        pageStatus.status = msg.outcome.status;
        pageStatus.outcome = msg.outcome;
        lastOutcome = msg.outcome;
        finished = true;
        if (msg.outcome.status === 'VERIFIED' || msg.outcome.status === 'CLICKED') postHandlingHealth(lastDetection && lastDetection.rule);
        else showNotice(msg.outcome);
        sendResponse({ ok: true });
        return false;
      default:
        return false;
    }
  });

  // ---------------------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------------------
  const memory = await loadAll();

  if (!settings.enabled) { pageStatus.status = 'OFF'; if (isTop) send('STATUS', pageStatus); return; }
  if ((settings.pausedSites || []).includes(site)) { pageStatus.status = 'PAUSED'; if (isTop) send('STATUS', pageStatus); return; }

  if (memory && memory.hideAlways && memory.hideSelector) {
    applyUserHide(memory.hideSelector);
  } else if (memory && memory.prehide && memory.prehide.length) {
    prehide(memory.prehide);
  }

  const onReady = async () => {
    const pre = window.CookieShieldDetector.detect(rules);
    window.CookieShieldRestorer.snapshot(!!pre);
    if (isTop) {
      pageStatus.siteType = classifySite();
      if (memory && memory.hideAlways) { pageStatus.status = 'HIDDEN_BY_YOU'; send('STATUS', pageStatus); }
      // Language (for the translate feature and for reports)
      setTimeout(async () => {
        pageStatus.language = await window.CookieShieldTranslator.detectPageLanguage();
        const lang = pageStatus.language.code;
        const target = (settings.targetLang || 'en').split('-')[0];
        if (lang && lang !== 'und' && lang !== target && !(settings.translateNeverSites || []).includes(site)) {
          window.CookieShieldTranslator.state.targetLang = target;
          if (settings.translateMode === 'auto') {
            const avail = await window.CookieShieldTranslator.availability(target);
            if (avail === 'available') window.CookieShieldTranslator.translatePage(target);
            else window.CookieShieldTranslator.bar('offer');
          } else if (settings.translateMode === 'offer') {
            window.CookieShieldTranslator.bar('offer');
          }
        }
      }, 1200);
    }
    if (memory && memory.hideAlways) return;
    scan();
    startObserving();
    if (isTop) setTimeout(checkRemembered, NO_BANNER_CHECK_MS);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once: true });
  else onReady();
})();
