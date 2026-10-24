/**
 * CookieShield — Site health (Priority 3: don't break websites)
 *
 * Principles:
 *  - We never delete cookies, never remove scripts, never touch forms, auth or navigation.
 *  - We only repair leftovers *of the consent banner we just handled* (scroll lock, dimmer),
 *    and only when the page is demonstrably stuck afterwards.
 *  - Every repair is recorded so the user can undo it from the popup.
 *  - A self-test checks scrolling, clickability, links and forms after handling; failures are
 *    counted as regressions so the success metric can be tracked.
 */
(function () {
  'use strict';

  const D = () => window.CookieShieldDOM;

  const LOCK_CLASSES = ['onetrust-active', 'ot-overflow-hidden', 'didomi-popup-open', 'sp-message-open',
    'qc-cmp-ui-showing', 'cmplz-blocked', 'cookie-modal-open', 'cky-modal-open', 'CybotCookiebotDialogActive',
    'cmp-open', 'cmp-shown', 'cookie-consent-open', 'cookiebanner-open', 'gdpr-modal-open'];
  const CMP_NAME = /cookie|consent|gdpr|cmp|didomi|onetrust|optanon|truste|usercentrics|cybot|qc-cmp|sp_veil|sp_message|cky-|cmplz|osano|klaro|iubenda|axeptio|borlabs/i;

  const changes = [];
  let initial = null;

  function lockState() {
    const h = getComputedStyle(document.documentElement);
    const b = document.body ? getComputedStyle(document.body) : h;
    return {
      htmlOverflow: h.overflowY, bodyOverflow: b.overflowY,
      bodyPosition: b.position,
      classes: [...document.documentElement.classList, ...(document.body ? document.body.classList : [])]
    };
  }

  /** Remember how the page looked before any banner appeared (taken at DOMContentLoaded). */
  function snapshot(bannerPresent) {
    if (!initial) initial = { ...lockState(), bannerPresent: !!bannerPresent };
  }

  function setStyle(el, prop, value) {
    changes.push({ el, prop, prev: el.style.getPropertyValue(prop), prevPriority: el.style.getPropertyPriority(prop), type: 'style' });
    el.style.setProperty(prop, value, 'important');
  }

  function removeClass(el, cls) {
    if (!el.classList.contains(cls)) return;
    changes.push({ el, cls, type: 'class' });
    el.classList.remove(cls);
  }

  function hideEl(el, why) {
    changes.push({ el, prop: 'display', prev: el.style.getPropertyValue('display'), prevPriority: el.style.getPropertyPriority('display'), type: 'style', why });
    el.style.setProperty('display', 'none', 'important');
  }

  function undo() {
    let n = 0;
    while (changes.length) {
      const c = changes.pop();
      try {
        if (c.type === 'class') c.el.classList.add(c.cls);
        else if (c.prev) c.el.style.setProperty(c.prop, c.prev, c.prevPriority);
        else c.el.style.removeProperty(c.prop);
        n++;
      } catch (e) { /* element gone */ }
    }
    return n;
  }

  function scrollable() {
    const sh = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    return sh > window.innerHeight + 60;
  }

  function otherModalOpen() {
    return D().deepQueryAll('[aria-modal="true"], dialog[open], [role="dialog"]').some(el =>
      D().isVisible(el) && !CMP_NAME.test(`${el.id} ${typeof el.className === 'string' ? el.className : ''}`) &&
      !(window.CookieShieldLexicon.cookieMention(el.innerText || '')) && !el.closest('#cookieshield-ui-host'));
  }

  /** Full-screen element at a point that has no meaningful content (a dimmer / click-catcher). */
  function blockerAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || el === document.body || el === document.documentElement) return null;
    let node = el;
    for (let i = 0; node && i < 6; i++, node = node.parentElement) {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      if ((s.position === 'fixed' || s.position === 'absolute') && r.width >= innerWidth * 0.8 && r.height >= innerHeight * 0.8) {
        const txt = (node.innerText || '').trim();
        if (txt.length < 25 && !node.querySelector('a[href], button, input, video, img, canvas, iframe')) return node;
        return null;
      }
    }
    return null;
  }

  /**
   * Non-destructive self-test. Returns {ok, issues:[...], checks:{...}}
   */
  function selfTest() {
    const issues = [];
    const checks = { scroll: true, click: true, links: true, forms: true, inert: true };
    try {
      const st = lockState();
      if (scrollable() && (st.htmlOverflow === 'hidden' || st.bodyOverflow === 'hidden' || st.bodyPosition === 'fixed')) {
        checks.scroll = false; issues.push('SCROLL_LOCKED');
      }
      const pts = [[0.5, 0.5], [0.25, 0.4], [0.75, 0.6]];
      if (pts.some(([fx, fy]) => blockerAt(innerWidth * fx, innerHeight * fy))) { checks.click = false; issues.push('CLICK_BLOCKED'); }
      const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 30);
      if (links.length && links.filter(a => getComputedStyle(a).pointerEvents === 'none').length > links.length / 2) { checks.links = false; issues.push('LINKS_DISABLED'); }
      const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]), textarea, select, button')).slice(0, 30);
      if (inputs.length && inputs.filter(i => getComputedStyle(i).pointerEvents === 'none').length > inputs.length / 2) { checks.forms = false; issues.push('FORMS_DISABLED'); }
      if (document.body && (document.body.hasAttribute('inert') || getComputedStyle(document.body).pointerEvents === 'none')) { checks.inert = false; issues.push('PAGE_INERT'); }
    } catch (e) { /* never throw from a diagnostic */ }
    return { ok: issues.length === 0, issues, checks };
  }

  /**
   * Repair leftovers of a banner we handled. Conservative: only CMP-attributed changes.
   * @returns {string[]} list of repairs made
   */
  function repairAfterBanner(rule) {
    const done = [];
    // 1. CMP lock classes (known list + rule-specific)
    const classes = [...LOCK_CLASSES, ...((rule && rule.lockClasses) || [])];
    for (const el of [document.documentElement, document.body].filter(Boolean)) {
      for (const c of classes) if (el.classList.contains(c)) { removeClass(el, c); done.push(`removed lock class .${c}`); }
    }
    // 2. Known CMP backdrops
    for (const sel of (rule && rule.backdrops) || []) {
      for (const el of D().deepQueryAll(sel)) if (D().isVisible(el)) { hideEl(el, 'cmp backdrop'); done.push(`hid CMP backdrop ${sel}`); }
    }
    // 3. Empty full-screen blockers that are CMP-named
    for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.7]]) {
      const b = blockerAt(innerWidth * fx, innerHeight * fy);
      if (b && CMP_NAME.test(`${b.id} ${typeof b.className === 'string' ? b.className : ''}`)) { hideEl(b, 'cmp dimmer'); done.push('hid leftover consent dimmer'); }
    }
    // 4. Scroll lock — only if the page wasn't locked before the banner, and no other dialog is open
    const st = lockState();
    const locked = st.htmlOverflow === 'hidden' || st.bodyOverflow === 'hidden';
    const wasLockedBefore = initial && !initial.bannerPresent && (initial.htmlOverflow === 'hidden' || initial.bodyOverflow === 'hidden');
    if (locked && scrollable() && !wasLockedBefore && !otherModalOpen()) {
      if (st.htmlOverflow === 'hidden') setStyle(document.documentElement, 'overflow-y', 'auto');
      if (st.bodyOverflow === 'hidden' && document.body) setStyle(document.body, 'overflow-y', 'auto');
      done.push('restored page scrolling');
    }
    if (st.bodyPosition === 'fixed' && document.body && !(initial && !initial.bannerPresent && initial.bodyPosition === 'fixed') && !otherModalOpen()) {
      const top = parseInt(document.body.style.top || '0', 10);
      setStyle(document.body, 'position', 'static');
      if (top < 0) window.scrollTo(0, -top);
      done.push('released fixed body (scroll lock)');
    }
    return done;
  }

  function changeCount() { return changes.length; }

  window.CookieShieldRestorer = { snapshot, selfTest, repairAfterBanner, undo, changeCount, LOCK_CLASSES };
})();
