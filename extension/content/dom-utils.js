/**
 * CookieShield — DOM utilities
 * Shadow-DOM-aware queries (open AND closed roots via chrome.dom), visibility checks,
 * accessible-label extraction and a "safe click" that refuses to navigate away.
 */
(function () {
  'use strict';

  const CLICKABLE = 'button, a, [role="button"], [role="link"], input[type="button"], input[type="submit"], [onclick], .button, .btn';

  // Our own UI hosts — never scanned, never treated as a banner.
  const OWN_UI = new Set(['cookieshield-ui-host', 'cookieshield-translate-host']);

  function shadowOf(el) {
    if (el.shadowRoot) return el.shadowRoot;
    try {
      if (typeof chrome !== 'undefined' && chrome.dom && chrome.dom.openOrClosedShadowRoot) {
        return chrome.dom.openOrClosedShadowRoot(el) || null;
      }
    } catch (e) { /* not a host */ }
    return null;
  }

  /** Every root (document + nested shadow roots) under `start`. Capped for performance. */
  function allRoots(start = document, cap = 20000) {
    const roots = [start];
    const queue = [start];
    let visited = 0;
    while (queue.length) {
      const root = queue.shift();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode;
      while (node) {
        if (++visited > cap) return roots;
        if (node.nodeType === 1 && !OWN_UI.has(node.id)) {
          const sr = shadowOf(node);
          if (sr && !roots.includes(sr)) { roots.push(sr); queue.push(sr); }
        }
        node = walker.nextNode();
      }
    }
    return roots;
  }

  /** querySelector across shadow roots. */
  function deepQuery(selector, start = document) {
    for (const root of allRoots(start)) {
      try {
        const el = root.querySelector(selector);
        if (el) return el;
      } catch (e) { return null; }
    }
    return null;
  }

  function deepQueryAll(selector, start = document) {
    const out = [];
    for (const root of allRoots(start)) {
      try { out.push(...root.querySelectorAll(selector)); } catch (e) { return out; }
    }
    return out;
  }

  /** Is `el` actually visible to the user? (Ignores our own anti-flicker opacity.) */
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    let node = el;
    const prehide = document.documentElement.hasAttribute('data-cookieshield-prehide');
    while (node && node.nodeType === 1) {
      const s = getComputedStyle(node);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return false;
      if (!prehide && parseFloat(s.opacity) === 0) return false;
      node = node.parentElement || (node.getRootNode && node.getRootNode().host) || null;
    }
    return true;
  }

  /** Human-readable label for a clickable element. */
  function labelOf(el) {
    if (!el) return '';
    const parts = [
      el.innerText,
      el.textContent,
      el.value,
      el.getAttribute && el.getAttribute('aria-label'),
      el.getAttribute && el.getAttribute('title')
    ];
    for (const p of parts) {
      const t = (p || '').replace(/\s+/g, ' ').trim();
      if (t) return t.slice(0, 120);
    }
    return '';
  }

  /** Clickable candidates inside a container (including its shadow roots). */
  function clickablesIn(container) {
    if (!container) return [];
    const els = deepQueryAll(CLICKABLE, container);
    if (container.matches && container.matches(CLICKABLE)) els.unshift(container);
    // de-duplicate nested clickables (e.g. <button><span role=button>) – keep the outer one
    const set = new Set(els);
    return els.filter(el => {
      let p = el.parentElement;
      while (p && p !== container) {
        if (set.has(p)) return false;
        p = p.parentElement;
      }
      return isVisible(el);
    });
  }

  /**
   * Would clicking this element navigate the page somewhere else?
   * Links with a real href are only clickable if a tested rule explicitly says so.
   */
  function navigatesAway(el) {
    const a = el.closest ? el.closest('a[href]') : null;
    if (!a) return false;
    const href = (a.getAttribute('href') || '').trim();
    if (!href || href === '#' || href.startsWith('#') || /^javascript:/i.test(href)) return false;
    try {
      const u = new URL(href, location.href);
      // Same page with only a hash change is fine.
      return !(u.origin === location.origin && u.pathname === location.pathname && u.search === location.search);
    } catch (e) {
      return true;
    }
  }

  /** Click like a user would (pointer + mouse + click), without navigating away. */
  function safeClick(el, { allowNavigation = false } = {}) {
    if (!el) return false;
    if (!allowNavigation && navigatesAway(el)) return false;
    try {
      const opts = { bubbles: true, cancelable: true, composed: true, view: window };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Short, stable CSS selector for an element (for site memory / reports). No text content. */
  function selectorFor(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.id && /^[A-Za-z][\w-]{1,60}$/.test(el.id)) return `#${el.id}`;
    const cls = Array.from(el.classList || []).filter(c => /^[A-Za-z][\w-]{2,40}$/.test(c)).slice(0, 2);
    if (cls.length) return `${el.tagName.toLowerCase()}.${cls.join('.')}`;
    return null;
  }

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  /** Poll `fn` until it returns truthy or timeout. */
  async function waitFor(fn, timeout = 2000, step = 100) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try { const v = fn(); if (v) return v; } catch (e) { /* ignore */ }
      await wait(step);
    }
    try { return fn(); } catch (e) { return null; }
  }

  /** Registrable-ish domain: strips www and keeps eTLD+1 for common multi-part suffixes. */
  function siteKey(hostname = location.hostname) {
    const h = String(hostname || '').toLowerCase().replace(/^www\d?\./, '');
    const parts = h.split('.');
    if (parts.length <= 2 || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return h;
    const two = parts.slice(-2).join('.');
    const multi = /^(co|com|org|net|gov|ac|edu|gouv|gob|nic|ltd|plc|ne|or|go)\.[a-z]{2}$/;
    return multi.test(two) ? parts.slice(-3).join('.') : two;
  }

  window.CookieShieldDOM = {
    CLICKABLE, shadowOf, allRoots, deepQuery, deepQueryAll, isVisible, labelOf, clickablesIn,
    navigatesAway, safeClick, selectorFor, wait, waitFor, siteKey
  };
})();
