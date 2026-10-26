/**
 * CookieShield — Read any site in your language
 *
 * Uses Chrome's built-in, ON-DEVICE Translator API (Chrome 138+). Page text never leaves the
 * computer — important for a privacy tool. Only text nodes are swapped, so links, buttons,
 * forms and event listeners keep working, and "Show original" restores the exact text.
 *
 * Where the API isn't available, we explain how to use Chrome's own Translate instead.
 */
(function () {
  'use strict';

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG', 'MATH', 'KBD', 'SAMP']);
  const LANG_NAMES = (() => { try { return new Intl.DisplayNames(['en'], { type: 'language' }); } catch (e) { return null; } })();

  const state = {
    pageLang: null, targetLang: 'en', translated: false, busy: false, originals: new Map(), observer: null, count: 0, failed: 0, applying: false, translator: null
  };

  function langName(code) {
    try { return (LANG_NAMES && LANG_NAMES.of(code)) || code; } catch (e) { return code; }
  }

  async function detectPageLanguage() {
    const attr = (document.documentElement.getAttribute('lang') || '').split(/[-_]/)[0].toLowerCase();
    const sample = (document.body ? document.body.innerText : '').slice(0, 4000);
    let detected = null, reliable = false;
    if (sample.length > 80 && chrome.i18n && chrome.i18n.detectLanguage) {
      try {
        const res = await new Promise(r => chrome.i18n.detectLanguage(sample, r));
        if (res && res.languages && res.languages[0]) {
          detected = res.languages[0].language.split('-')[0];
          reliable = !!res.isReliable;
        }
      } catch (e) { /* ignore */ }
    }
    // Trust the text over the attribute when detection is reliable (many sites mis-declare lang).
    state.pageLang = (reliable && detected) || attr || detected || 'und';
    return { code: state.pageLang, name: langName(state.pageLang), declared: attr || null, detected, reliable };
  }

  function apiAvailable() { return typeof Translator !== 'undefined'; }

  async function availability(target) {
    if (!apiAvailable() || !state.pageLang || state.pageLang === 'und') return 'unsupported';
    // Some Chrome builds never answer this call; treat a hang as "not available" so we fall
    // back to pointing at Chrome's own Translate instead of stalling silently.
    try {
      return await Promise.race([
        Translator.availability({ sourceLanguage: state.pageLang, targetLanguage: target }),
        new Promise(r => setTimeout(() => r('unsupported'), 4000))
      ]);
    } catch (e) { return 'unsupported'; }
  }

  function collectTextNodes(root) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || SKIP.has(p.tagName) || p.closest('[contenteditable=""], [contenteditable="true"], #cookieshield-ui-host, #cookieshield-translate-host, [translate="no"], .notranslate')) return NodeFilter.FILTER_REJECT;
        const t = n.nodeValue;
        if (!t || t.trim().length < 2 || !/\p{L}/u.test(t)) return NodeFilter.FILTER_REJECT;
        if (state.originals.has(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  // Same sentence → same translation, once. Also lets us re-apply a translation instantly when a
  // site puts its original text back (frameworks that re-render after load).
  const cache = new Map();      // original (trimmed) → translated
  const translatedSet = new Set();  // translated strings, so we never "translate" our own output
  let lastError = null;

  async function translateOne(translator, node) {
    const original = node.nodeValue;
    const key = original.trim();
    if (!key || translatedSet.has(key)) return false;
    let out = cache.get(key);
    if (out === undefined) {
      try { out = await translator.translate(key); }
      catch (e) { lastError = e; state.failed++; return false; }
      if (!state.sample) state.sample = { input: key.slice(0, 40), output: String(out || '').slice(0, 40) };
      if (out && out.trim() !== key) { cache.set(key, out); translatedSet.add(out.trim()); }
      else state.unchanged++;
    }
    if (!out || out.trim() === key || !node.isConnected) return false;
    const lead = original.match(/^\s*/)[0], trail = original.match(/\s*$/)[0];
    if (!state.originals.has(node)) state.originals.set(node, original);
    state.applying = true;
    node.nodeValue = lead + out + trail;
    state.applying = false;
    state.count++;
    return true;
  }

  async function translateNodes(translator, nodes, onProgress) {
    let done = 0;
    const CONC = 4;
    let i = 0;
    async function worker() {
      while (i < nodes.length) {
        const node = nodes[i++];
        await translateOne(translator, node);
        done++;
        if (onProgress && done % 10 === 0) onProgress(done / nodes.length);
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
  }

  /** The page's own Translator, reached through page-bridge.js (MAIN world). */
  let trSeq = 0;
  function pageTranslator(src, tgt) {
    return {
      kind: 'page',
      translate(text) {
        return new Promise((resolve, reject) => {
          const id = `tr-${Date.now()}-${++trSeq}`;
          const onRes = (ev) => {
            let d = {};
            try { d = JSON.parse(ev.detail || '{}'); } catch (e) { return; }
            if (d.id !== id) return;
            document.removeEventListener('cookieshield:tr-response', onRes);
            clearTimeout(timer);
            if (d.error) { const err = new Error(d.message || d.error); err.name = d.error; reject(err); }
            else resolve((d.out || [])[0]);
          };
          const timer = setTimeout(() => { document.removeEventListener('cookieshield:tr-response', onRes); const e = new Error('page translator timed out'); e.name = 'TimeoutError'; reject(e); }, 30000);
          document.addEventListener('cookieshield:tr-response', onRes);
          document.dispatchEvent(new CustomEvent('cookieshield:tr-request', { detail: JSON.stringify({ id, src, tgt, texts: [text] }) }));
        });
      }
    };
  }

  /** One full pass with a given translator: watch, translate, catch up. Returns passages changed. */
  async function runWith(translator) {
    state.translator = translator;
    startObserver(translator);
    await translateNodes(translator, collectTextNodes(document.body), p => bar('working', p));
    for (let pass = 0; pass < 3 && state.count > 0; pass++) {
      await new Promise(r => setTimeout(r, 700));
      const left = collectTextNodes(document.body);
      if (!left.length) break;
      await translateNodes(translator, left);
    }
    return state.count;
  }

  /** Must be called from a user gesture if the language model still needs downloading. */
  async function translatePage(target = state.targetLang) {
    if (state.busy || state.translated) return { ok: state.translated };
    state.targetLang = target;
    if (!state.pageLang) await detectPageLanguage();
    const avail = await availability(target);
    if (avail === 'unsupported' || avail === 'unavailable') {
      bar('unsupported');
      return { ok: false, reason: 'unsupported' };
    }
    state.busy = true;
    state.count = 0; state.failed = 0; lastError = null;
    bar('working', 0);
    state.unchanged = 0; state.sample = null; state.engine = null;
    try {
      // 1. The extension's own translator (private: the page can't see it).
      let ext = null, extErr = null;
      try {
        ext = await Translator.create({
          sourceLanguage: state.pageLang, targetLanguage: target,
          monitor(m) { m.addEventListener('downloadprogress', e => bar('downloading', e.loaded)); }
        });
      } catch (e) {
        if (String(e && e.name) === 'NotAllowedError') throw e;
        extErr = e;
      }
      if (ext) { state.engine = 'extension'; await runWith(ext); }
      // 2. Nothing changed (the translator handed the text back as it was, as seen on
      //    ridder.com) or it couldn't start: use the page's own on-device translator instead.
      if (state.count === 0) {
        stopObserver();
        const firstTry = { sample: state.sample, unchanged: state.unchanged, failed: state.failed, error: extErr || lastError };
        cache.clear(); state.unchanged = 0; state.failed = 0; state.sample = null; lastError = null;
        state.engine = 'page';
        await runWith(pageTranslator(state.pageLang, target));
        if (state.count === 0) state.firstTry = firstTry;
      }
      // Only claim success if text actually changed on the page.
      if (state.count === 0) {
        state.translated = false;
        stopObserver();
        const why = lastError ? String(lastError.name || lastError)
          : state.sample ? `translator returned “${state.sample.output}” for “${state.sample.input}”`
          : 'no text to translate';
        console.warn('[CookieShield] translation produced no changes', { why, lastError, sample: state.sample, firstTry: state.firstTry, pageLang: state.pageLang, target });
        bar('failed', why);
        return { ok: false, reason: why };
      }
      state.translated = true;
      bar('done');
      return { ok: true, count: state.count, failed: state.failed, engine: state.engine };
    } catch (e) {
      stopObserver();
      const notAllowed = String(e && e.name) === 'NotAllowedError';
      if (!notAllowed) { console.warn('[CookieShield] translation failed', e); bar('failed', String(e && e.name || e)); }
      return { ok: false, reason: notAllowed ? 'needs-gesture' : String(e && e.message || e) };
    } finally {
      state.busy = false;
    }
  }

  function startObserver(translator) {
    stopObserver();
    state.observer = new MutationObserver(muts => {
      if (state.applying) return;
      const fresh = [];
      for (const m of muts) {
        if (m.type === 'characterData') {
          // The site wrote its original text back into a node we had translated: re-apply.
          const n = m.target;
          if (n.parentElement && !translatedSet.has((n.nodeValue || '').trim())) fresh.push(n);
          continue;
        }
        for (const a of m.addedNodes) {
          if (a.nodeType === 1) fresh.push(...collectTextNodes(a));
          else if (a.nodeType === 3 && a.parentElement) fresh.push(...collectTextNodes(a.parentElement));
        }
      }
      if (fresh.length) translateNodes(translator, [...new Set(fresh)].slice(0, 400));
    });
    state.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function stopObserver() { if (state.observer) { state.observer.disconnect(); state.observer = null; } }

  /**
   * Translate without asking. If the language pack is already on this computer it starts right
   * away. Chrome only allows the one-time pack download after a real user action (script-made
   * clicks don't count), so in that case we silently start on your first click / key press
   * anywhere on the page — no prompt and no note.
   */
  async function autoTranslate(target = state.targetLang) {
    state.targetLang = target;
    if (!state.pageLang) await detectPageLanguage();
    const avail = await availability(target);
    if (avail === 'unsupported' || avail === 'unavailable') {
      // Say it once per site and browsing session, not on every page.
      let told = false;
      try { told = sessionStorage.getItem('cookieshield-tr-unsupported') === '1'; sessionStorage.setItem('cookieshield-tr-unsupported', '1'); } catch (e) { /* ignore */ }
      if (!told) bar('unsupported');
      return { ok: false, reason: 'unsupported' };
    }
    if (avail === 'available') return translatePage(target);
    // 'downloadable' / 'downloading': try straight away (works if Chrome allows it), else wait for a gesture.
    try {
      const r = await translatePage(target);
      if (r && r.ok) return r;
    } catch (e) { /* fall through */ }
    // No note, no question: wait silently for the first click or key press you make anyway
    // while browsing, and use it to start the one-time download (Chrome refuses downloads
    // triggered by script-made clicks, so a real one is required).
    const go = (e) => {
      if (!e.isTrusted) return;
      document.removeEventListener('pointerdown', go, true);
      document.removeEventListener('keydown', go, true);
      translatePage(target);
    };
    document.addEventListener('pointerdown', go, true);
    document.addEventListener('keydown', go, true);
    return { ok: false, reason: 'waiting-for-first-click' };
  }

  function showOriginal() {
    stopObserver();
    state.applying = true;
    for (const [node, text] of state.originals) { try { node.nodeValue = text; } catch (e) { /* gone */ } }
    state.applying = false;
    state.originals.clear();
    state.translated = false;
    state.count = 0;
    bar('original');
  }

  // --- The little in-page bar ----------------------------------------------------------

  let host = null, root = null;
  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'cookieshield-translate-host';
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483646;left:16px;bottom:16px;';
    root = host.attachShadow({ mode: 'closed' });
    const st = document.createElement('style');
    st.textContent = `
      .bar{font:13px/1.4 ui-rounded,"SF Pro Rounded","Nunito","Segoe UI",system-ui,sans-serif;color:#13293d;background:#f4fbff;
        border:2px solid #d6ecfa;border-radius:999px;padding:6px 8px 6px 14px;display:flex;gap:10px;align-items:center;
        box-shadow:0 10px 26px rgba(19,41,61,.18);max-width:calc(100vw - 24px)}
      b{font-weight:800}
      button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:6px 12px;cursor:pointer;background:#1d3557;color:#fff}
      button.ghost{background:#e3f1fb;color:#13293d}
      .x{background:transparent;color:#6b8299;padding:2px 8px;font-size:15px}
      .bar span.msg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      progress{width:90px;height:8px}
    `;
    root.appendChild(st);
    (document.body || document.documentElement).appendChild(host);
  }

  function bar(mode, value) {
    if (window.top !== window) return;
    ensureHost();
    root.querySelectorAll('.bar').forEach(b => b.remove());
    const b = document.createElement('div');
    b.className = 'bar';
    b.setAttribute('role', 'status');
    const msg = document.createElement('span');
    msg.className = 'msg';
    const from = langName(state.pageLang), to = langName(state.targetLang);
    const btn = (label, fn, cls) => { const x = document.createElement('button'); x.textContent = label; if (cls) x.className = cls; x.onclick = fn; return x; };
    const close = btn('×', () => { host.remove(); host = null; }, 'x');
    close.setAttribute('aria-label', 'Close');

    if (mode === 'offer') {
      msg.innerHTML = `🐧 This page is in <b></b>. Read it in <b></b>?`;
      msg.querySelectorAll('b')[0].textContent = from; msg.querySelectorAll('b')[1].textContent = to;
      b.append(msg, btn('Translate', () => translatePage()), close);
    } else if (mode === 'auto-pending') {
      msg.innerHTML = `🐧 Translating <b></b> → <b></b> starts with your first click on the page (one-time language download, stays on your computer).`;
      msg.querySelectorAll('b')[0].textContent = from; msg.querySelectorAll('b')[1].textContent = to;
      b.append(msg, close);
    } else if (mode === 'needs-click' || mode === 'downloading') {
      msg.textContent = mode === 'downloading' ? `Downloading the ${from} → ${to} language pack…` : `One click to download the ${from} language pack (stays on your computer).`;
      b.append(msg);
      if (mode === 'downloading') { const p = document.createElement('progress'); p.max = 1; p.value = value || 0; b.append(p); }
      else b.append(btn('Download & translate', () => translatePage()));
      b.append(close);
    } else if (mode === 'working') {
      msg.textContent = `Translating ${from} → ${to} on your device…`;
      const p = document.createElement('progress'); p.max = 1; p.value = value || 0;
      b.append(msg, p);
    } else if (mode === 'done') {
      msg.innerHTML = `Translated from <b></b> on your device.`;
      msg.querySelector('b').textContent = from;
      msg.title = `${state.count} passages translated`;
      b.append(msg, btn('Show original', showOriginal, 'ghost'), close);
    } else if (mode === 'original') {
      msg.innerHTML = `Showing the original <b></b> text.`;
      msg.querySelector('b').textContent = from;
      b.append(msg, btn(`Translate to ${to}`, () => translatePage()), close);
    } else if (mode === 'failed') {
      msg.textContent = `Couldn’t translate this page from ${from}${value ? ` (${value})` : ''}. Right-click the page → “Translate to ${to}” instead.`;
      b.append(msg, btn('Try again', () => { state.translated = false; translatePage(); }, 'ghost'), close);
    } else if (mode === 'unsupported') {
      msg.textContent = `On-device translation isn’t available for ${from} in this Chrome. Right-click the page → “Translate to ${to}”.`;
      b.append(msg, close);
    }
    root.appendChild(b);
    // Offers fade away on their own so they never sit on top of the page for long.
    if (mode === 'offer' || mode === 'done' || mode === 'original' || mode === 'unsupported' || mode === 'failed') {
      clearTimeout(bar._t);
      bar._t = setTimeout(() => { if (host && !state.busy) { host.remove(); host = null; } }, 15000);
    }
  }

  function status() {
    return { pageLang: state.pageLang, pageLangName: state.pageLang ? langName(state.pageLang) : null, translated: state.translated, count: state.count, failed: state.failed, apiAvailable: apiAvailable(), targetLang: state.targetLang };
  }

  window.CookieShieldTranslator = { detectPageLanguage, translatePage, autoTranslate, showOriginal, bar, status, langName, availability, state };
})();
