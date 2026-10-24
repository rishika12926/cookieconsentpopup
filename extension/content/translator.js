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
    pageLang: null, targetLang: 'en', translated: false, busy: false, originals: new Map(), observer: null, count: 0
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
    try { return await Translator.availability({ sourceLanguage: state.pageLang, targetLanguage: target }); }
    catch (e) { return 'unsupported'; }
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

  async function translateNodes(translator, nodes, onProgress) {
    let done = 0;
    const CONC = 6;
    let i = 0;
    async function worker() {
      while (i < nodes.length) {
        const node = nodes[i++];
        const original = node.nodeValue;
        try {
          const lead = original.match(/^\s*/)[0], trail = original.match(/\s*$/)[0];
          const out = await translator.translate(original.trim());
          if (out && node.isConnected) {
            state.originals.set(node, original);
            node.nodeValue = lead + out + trail;
            state.count++;
          }
        } catch (e) { /* skip this node */ }
        done++;
        if (onProgress && done % 10 === 0) onProgress(done / nodes.length);
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
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
    bar('working', 0);
    try {
      const translator = await Translator.create({
        sourceLanguage: state.pageLang, targetLanguage: target,
        monitor(m) { m.addEventListener('downloadprogress', e => bar('downloading', e.loaded)); }
      });
      const nodes = collectTextNodes(document.body);
      await translateNodes(translator, nodes, p => bar('working', p));
      state.translated = true;
      // Keep translating content that loads later (infinite scroll, SPA views).
      state.observer = new MutationObserver(muts => {
        if (!state.translated) return;
        const fresh = [];
        for (const m of muts) for (const a of m.addedNodes) {
          if (a.nodeType === 1) fresh.push(...collectTextNodes(a));
          else if (a.nodeType === 3 && a.parentElement) fresh.push(...collectTextNodes(a.parentElement));
        }
        if (fresh.length) translateNodes(translator, fresh.slice(0, 300));
      });
      state.observer.observe(document.body, { childList: true, subtree: true });
      bar('done');
      return { ok: true, count: state.count };
    } catch (e) {
      bar(String(e && e.name) === 'NotAllowedError' ? 'needs-click' : 'unsupported');
      return { ok: false, reason: String(e && e.message || e) };
    } finally {
      state.busy = false;
    }
  }

  function showOriginal() {
    if (state.observer) { state.observer.disconnect(); state.observer = null; }
    for (const [node, text] of state.originals) { try { node.nodeValue = text; } catch (e) { /* gone */ } }
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
      b.append(msg, btn('Show original', showOriginal, 'ghost'), close);
    } else if (mode === 'original') {
      msg.innerHTML = `Showing the original <b></b> text.`;
      msg.querySelector('b').textContent = from;
      b.append(msg, btn(`Translate to ${to}`, () => translatePage()), close);
    } else if (mode === 'unsupported') {
      msg.textContent = `On-device translation isn’t available for ${from} in this Chrome. Right-click the page → “Translate to ${to}”.`;
      b.append(msg, close);
    }
    root.appendChild(b);
    // Offers fade away on their own so they never sit on top of the page for long.
    if (mode === 'offer' || mode === 'done' || mode === 'original' || mode === 'unsupported') {
      clearTimeout(bar._t);
      bar._t = setTimeout(() => { if (host && !state.busy) { host.remove(); host = null; } }, 15000);
    }
  }

  function status() {
    return { pageLang: state.pageLang, pageLangName: state.pageLang ? langName(state.pageLang) : null, translated: state.translated, count: state.count, apiAvailable: apiAvailable(), targetLang: state.targetLang };
  }

  window.CookieShieldTranslator = { detectPageLanguage, translatePage, showOriginal, bar, status, langName, availability, state };
})();
