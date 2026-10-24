/**
 * CookieShield — Detector (Priority 1: coverage)
 *
 * 1. Known consent platforms (30 rules in rules/cmp-rules.json), including banners inside
 *    open AND closed shadow roots and CMPs that render inside iframes.
 * 2. Generic detection for custom banners in any language: find buttons whose label means
 *    accept/reject (multilingual lexicon), climb to the floating container around them, and
 *    require cookie/consent wording in that container.
 */
(function () {
  'use strict';

  const D = () => window.CookieShieldDOM;
  const L = () => window.CookieShieldLexicon;
  const isTop = window.top === window;

  function firstVisible(selectors, scope = document) {
    for (const sel of selectors || []) {
      const els = D().deepQueryAll(sel, scope);
      for (const el of els) if (D().isVisible(el)) return el;
    }
    return null;
  }

  /** A shadow host counts as visible if anything inside its shadow root is. */
  function hostVisible(host) {
    if (D().isVisible(host)) return true;
    const sr = D().shadowOf(host);
    if (!sr) return false;
    return Array.from(sr.querySelectorAll('div, section, dialog, aside')).some(e => D().isVisible(e));
  }

  function matchesFrameHost(rule) {
    const h = location.hostname;
    return (rule.frameHosts || []).some(fh => h === fh || h.endsWith('.' + fh));
  }

  /** Try the known-platform rules. */
  function detectKnown(rules) {
    for (const rule of rules || []) {
      if (!isTop) {
        // Inside an iframe only frame-capable rules apply.
        const hostHit = matchesFrameHost(rule);
        const domHit = (rule.frameDetect || []).some(sel => D().deepQuery(sel));
        if (!hostHit && !domHit) continue;
        const container = firstVisible(rule.container) || document.body;
        if (container && D().isVisible(container)) return { kind: 'known', rule, container, inFrame: true };
        continue;
      }

      for (const sel of rule.detect || []) {
        const el = D().deepQuery(sel);
        if (!el) continue;
        const visible = rule.shadow ? hostVisible(el) : D().isVisible(el);
        if (!visible) continue;

        if (rule.delegatesToFrame) {
          // e.g. Sourcepoint: the buttons live in a cross-origin iframe; our script inside that
          // frame does the work. The top frame only waits and later restores the page.
          return { kind: 'delegated', rule, container: el };
        }
        const container = (rule.shadow ? (firstVisible(rule.container) || el) : firstVisible(rule.container)) || el;
        return { kind: 'known', rule, container };
      }
    }
    return null;
  }

  const CONTAINER_HINT = /cookie|consent|gdpr|cmp|privacy|banner|notice|disclaimer|didomi|onetrust|truste|usercentrics|cky|cmplz/i;

  function isFloating(el) {
    const s = getComputedStyle(el);
    if (s.position === 'fixed' || s.position === 'sticky') return true;
    const role = el.getAttribute && el.getAttribute('role');
    if (role === 'dialog' || role === 'alertdialog' || el.getAttribute('aria-modal') === 'true' || el.tagName === 'DIALOG') return true;
    return false;
  }

  function parentAcrossShadow(el) {
    if (el.parentElement) return el.parentElement;
    const root = el.getRootNode && el.getRootNode();
    return root && root.host ? root.host : null;
  }

  /** Generic heuristic detection for unknown / bespoke banners. */
  function detectGeneric() {
    const clickables = D().deepQueryAll(D().CLICKABLE).slice(0, 4000);
    const containers = new Map();

    for (const btn of clickables) {
      const label = D().labelOf(btn);
      if (!label || label.length > 90) continue;
      const cls = L().classify(label);
      if (!['ACCEPT', 'ACCEPT_ALL', 'REJECT'].includes(cls.type)) continue;
      if (!D().isVisible(btn)) continue;

      // Climb to the banner container: the outermost *visible* floating / consent-named
      // ancestor within a few levels of the first one we meet.
      let node = parentAcrossShadow(btn);
      let best = null;
      let firstDepth = -1;
      for (let depth = 0; node && depth < 16; depth++, node = parentAcrossShadow(node)) {
        if (node === document.body || node === document.documentElement) break;
        if (firstDepth >= 0 && depth - firstDepth > 3) break;
        const hint = CONTAINER_HINT.test(`${node.id || ''} ${typeof node.className === 'string' ? node.className : ''} ${node.getAttribute('aria-label') || ''}`);
        if ((isFloating(node) || hint) && D().isVisible(node)) {
          if (firstDepth < 0) firstDepth = depth;
          best = node;
        }
      }
      if (!best) continue;
      const text = best.innerText || best.textContent || '';
      if (text.length > 6000) continue;                    // that's a page, not a banner
      if (!L().cookieMention(text)) continue;              // must talk about cookies/consent
      const entry = containers.get(best) || { container: best, buttons: 0 };
      entry.buttons++;
      containers.set(best, entry);
    }

    let pick = null;
    for (const e of containers.values()) if (!pick || e.buttons > pick.buttons) pick = e;
    return pick ? { kind: 'generic', rule: null, container: pick.container } : null;
  }

  /** In an iframe, only run generic detection if the frame looks like a consent frame. */
  function frameLooksLikeConsent() {
    if (isTop) return true;
    if (/consent|cmp|cookie|privacy|gdpr/i.test(location.hostname + location.pathname)) return true;
    const t = (document.body && document.body.innerText || '').slice(0, 3000);
    return t.length > 0 && t.length < 3000 && L().cookieMention(t);
  }

  function detect(rules) {
    const known = detectKnown(rules);
    if (known) return known;
    if (!frameLooksLikeConsent()) return null;
    return detectGeneric();
  }

  window.CookieShieldDetector = { detect, detectKnown, detectGeneric, firstVisible, hostVisible, isTop };
})();
