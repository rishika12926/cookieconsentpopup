/**
 * CookieShield — In-page notices
 * Rendered inside a closed Shadow DOM so the site's CSS can't break it and ours can't break the site.
 * Shown when we could NOT reject safely (Priority 2: report the exception instead of accepting),
 * and optionally after a successful rejection.
 */
(function () {
  'use strict';

  const PIP_SVG = `
<svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
  <ellipse cx="32" cy="60" rx="16" ry="3" fill="#0b2a4a" opacity=".15"/>
  <ellipse cx="32" cy="38" rx="19" ry="21" fill="#1d3557"/>
  <ellipse cx="32" cy="42" rx="12.5" ry="15" fill="#fdfcf7"/>
  <circle cx="26" cy="31" r="3.2" fill="#fff"/><circle cx="38" cy="31" r="3.2" fill="#fff"/>
  <circle cx="26.6" cy="31.6" r="1.7" fill="#0b1b2b"/><circle cx="38.6" cy="31.6" r="1.7" fill="#0b1b2b"/>
  <path d="M29 36.5 L32 40 L35 36.5 Z" fill="#f4a259"/>
  <circle cx="22" cy="37" r="2.2" fill="#f28482" opacity=".55"/><circle cx="42" cy="37" r="2.2" fill="#f28482" opacity=".55"/>
  <path d="M13 22 Q32 4 51 22 Q52 25 49 25 L15 25 Q12 25 13 22Z" fill="#5fa8d3"/>
  <rect x="13" y="22" width="38" height="5" rx="2.5" fill="#cae9ff"/>
  <circle cx="32" cy="6.5" r="4" fill="#cae9ff"/>
</svg>`;

  const REASONS = {
    ACCEPT_ONLY: {
      title: 'This banner only offers “Accept”',
      body: 'There is no reject option, so I didn’t click anything. Nothing was accepted on your behalf.',
      tone: 'warn', canHide: true
    },
    CONSENT_OR_PAY: {
      title: 'Accept tracking or pay?',
      body: 'This site only lets you in if you accept tracking or buy a subscription. I won’t choose either for you. Nothing was accepted.',
      tone: 'warn', canHide: false
    },
    TOGGLES_STUCK: {
      title: 'Some settings wouldn’t switch off',
      body: 'I opened the cookie settings but couldn’t turn every optional category off, so I didn’t save. Nothing was accepted.',
      tone: 'warn', canHide: false
    },
    REJECT_NOT_CONFIRMED: {
      title: 'I couldn’t confirm the rejection',
      body: 'I tried the reject option but the banner stayed open, so I can’t promise it worked. Nothing was accepted — please choose manually.',
      tone: 'warn', canHide: false
    },
    NO_REJECT_OPTION: {
      title: 'No safe way to reject here',
      body: 'I couldn’t find a reject or “necessary only” option. I didn’t click anything.',
      tone: 'warn', canHide: true
    },
    UNRECOGNIZED_LANGUAGE_OR_LAYOUT: {
      title: 'I couldn’t read this banner',
      body: 'The buttons don’t match anything I recognise, so I didn’t click anything. Reporting it helps me learn this site.',
      tone: 'warn', canHide: false
    },
    OPTIONAL_STILL_GRANTED: {
      title: 'The site still shows optional cookies as allowed',
      body: 'I clicked the reject option, but the site’s own consent record still lists optional cookies as allowed. Please check its cookie settings.',
      tone: 'error', canHide: false
    }
  };

  let host = null;

  function mount() {
    if (host && host.isConnected) return host.__root;
    host = document.createElement('div');
    host.id = 'cookieshield-ui-host';
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;';
    const root = host.attachShadow({ mode: 'closed' });
    host.__root = root;
    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial}
      .card{font:14px/1.45 ui-rounded,"SF Pro Rounded","Nunito","Segoe UI",system-ui,sans-serif;color:#13293d;
        width:340px;max-width:calc(100vw - 32px);background:#f4fbff;border-radius:22px;padding:14px 14px 12px;
        box-shadow:0 14px 34px rgba(19,41,61,.22),inset 0 -4px 0 rgba(19,41,61,.06);border:2px solid #d6ecfa;
        animation:pop .28s cubic-bezier(.2,1.4,.4,1)}
      .card.warn{border-color:#f6c58b;background:#fffaf2}
      .card.error{border-color:#f2a3a3;background:#fff5f5}
      .card.ok{border-color:#a8dcc1;background:#f3fcf7}
      .row{display:flex;gap:10px;align-items:flex-start}
      .t{font-weight:800;font-size:14.5px;margin:2px 0 3px}
      .b{font-size:13px;color:#33506b}
      .site{font-size:11.5px;color:#6b8299;margin-top:4px}
      .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
      button{font:inherit;font-size:12.5px;font-weight:700;border:0;border-radius:999px;padding:7px 12px;cursor:pointer;
        background:#e3f1fb;color:#13293d;box-shadow:inset 0 -2px 0 rgba(19,41,61,.10)}
      button.primary{background:#1d3557;color:#fff}
      button:focus-visible{outline:3px solid #5fa8d3;outline-offset:2px}
      .x{margin-left:auto;background:transparent;box-shadow:none;padding:2px 6px;font-size:16px;color:#6b8299}
      label{display:flex;gap:6px;align-items:center;font-size:12px;color:#33506b;margin-top:8px}
      @keyframes pop{from{transform:translateY(12px) scale(.96);opacity:0}to{transform:none;opacity:1}}
      @media (prefers-reduced-motion:reduce){.card{animation:none}}
    `;
    root.appendChild(style);
    (document.body || document.documentElement).appendChild(host);
    return root;
  }

  function clear() {
    if (host) { host.remove(); host = null; }
  }

  function el(tag, attrs = {}, text) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    return e;
  }

  /**
   * @param outcome engine result
   * @param actions {onHide(always:boolean), onPause(), onReport(), onDismiss()}
   */
  function showException(outcome, actions = {}) {
    const info = REASONS[outcome.reason] || REASONS.NO_REJECT_OPTION;
    const root = mount();
    root.querySelectorAll('.card').forEach(c => c.remove());
    const card = el('div', { class: `card ${info.tone}`, role: 'status', 'aria-live': 'polite' });
    const row = el('div', { class: 'row' });
    const pip = el('div'); pip.innerHTML = PIP_SVG;
    const body = el('div');
    body.appendChild(el('div', { class: 't' }, info.title));
    body.appendChild(el('div', { class: 'b' }, info.body));
    body.appendChild(el('div', { class: 'site' }, `CookieShield · ${location.hostname}`));
    const x = el('button', { class: 'x', 'aria-label': 'Dismiss' }, '×');
    x.onclick = () => { clear(); actions.onDismiss && actions.onDismiss(); };
    row.append(pip, body, x);
    card.appendChild(row);

    const acts = el('div', { class: 'acts' });
    let always = null;
    if (info.canHide && actions.onHide) {
      const hide = el('button', { class: 'primary' }, 'Hide it without answering');
      hide.onclick = () => { actions.onHide(!!(always && always.checked)); clear(); };
      acts.appendChild(hide);
    }
    if (actions.onReport) {
      const rep = el('button', {}, 'Report this banner');
      rep.onclick = () => { actions.onReport(); rep.textContent = 'Thanks — saved'; rep.disabled = true; };
      acts.appendChild(rep);
    }
    if (actions.onPause) {
      const p = el('button', {}, 'Pause on this site');
      p.onclick = () => { actions.onPause(); clear(); };
      acts.appendChild(p);
    }
    card.appendChild(acts);
    if (info.canHide && actions.onHide) {
      const lab = el('label');
      always = el('input', { type: 'checkbox' });
      lab.append(always, document.createTextNode('Always hide it on this site (no answer is sent)'));
      card.appendChild(lab);
    }
    root.appendChild(card);
    setTimeout(() => { if (card.isConnected && !card.matches(':hover')) clear(); }, 20000);
  }

  function showSuccess(outcome) {
    const root = mount();
    root.querySelectorAll('.card').forEach(c => c.remove());
    const card = el('div', { class: 'card ok', role: 'status' });
    const row = el('div', { class: 'row' });
    const pip = el('div'); pip.innerHTML = PIP_SVG;
    const body = el('div');
    body.appendChild(el('div', { class: 't' }, outcome.status === 'VERIFIED' ? 'Optional cookies rejected ✓' : 'Rejected optional cookies'));
    body.appendChild(el('div', { class: 'b' }, outcome.status === 'VERIFIED'
      ? `Confirmed by ${outcome.stateSources && outcome.stateSources[0] || 'the site’s consent record'}. Only necessary cookies remain.`
      : 'I clicked the reject option. This site doesn’t publish a consent record, so I couldn’t double-check it.'));
    const x = el('button', { class: 'x', 'aria-label': 'Dismiss' }, '×');
    x.onclick = clear;
    row.append(pip, body, x);
    card.appendChild(row);
    root.appendChild(card);
    setTimeout(clear, 4500);
  }

  window.CookieShieldNotifier = { showException, showSuccess, clear, REASONS };
})();
