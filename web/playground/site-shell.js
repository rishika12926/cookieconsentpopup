/**
 * Test-bench page shell.
 * Every fixture is a small but realistic "website": navigation links, a long article to scroll,
 * a login form (cookie session), a contact form and client-side (SPA) navigation — so we can
 * check after banner handling that links, forms, scrolling, authentication and navigation
 * still work (Priority 3).
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);

  // Ground truth recorded by the simulated consent platform (independent of the extension).
  window.__simConsent = { cmp: null, decided: false, optionalGranted: null, choice: null, clicks: [] };

  function css() {
    const s = document.createElement('style');
    s.textContent = `
      *{box-sizing:border-box}
      body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2a38;background:#fbfdff}
      header.site{display:flex;gap:18px;align-items:center;padding:14px 24px;background:#1d3557;color:#fff}
      header.site a{color:#cae9ff;text-decoration:none;font-weight:600}
      header.site .brand{font-weight:800;margin-right:auto}
      main{max-width:760px;margin:0 auto;padding:24px}
      article p{margin:0 0 14px}
      .panel{border:1px solid #d6e4f0;border-radius:12px;padding:16px;margin:22px 0;background:#fff}
      .panel h3{margin:0 0 8px}
      label{display:block;margin:6px 0}
      input,textarea{font:inherit;padding:8px;border:1px solid #b9cde0;border-radius:8px;width:100%}
      button.site-btn{font:inherit;padding:8px 14px;border-radius:8px;border:0;background:#2a9d8f;color:#fff;cursor:pointer}
      #route{font-weight:700}
      footer{padding:40px 24px;color:#6b8299;text-align:center}
    `;
    document.head.appendChild(s);
  }

  function lorem(n) {
    const base = 'Penguins huddle together to stay warm through the long polar night, taking turns on the windy edge of the group. ' +
      'Researchers have tracked colonies for decades and found that sea-ice changes ripple through the whole food web. ' +
      'This paragraph exists so the page is long enough to scroll, which lets the test bench check that scrolling still works. ';
    return Array.from({ length: n }, (_, i) => `<p>${i + 1}. ${base}</p>`).join('');
  }

  function renderShell(title) {
    const loggedIn = /(?:^|;\s*)sim_session=ok/.test(document.cookie);
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="site">
        <span class="brand">🐧 Polar News — ${title}</span>
        <a href="next.html" id="nav-next">Next page</a>
        <a href="#/about" id="nav-spa" data-spa>About (SPA)</a>
        <a href="../" id="nav-bench">Test bench</a>
      </header>
      <main>
        <p>Route: <span id="route">${location.hash || '#/'}</span></p>
        <section class="panel" id="login-panel">
          <h3>Account</h3>
          <div id="login-state">${loggedIn ? 'Signed in ✅' : 'Signed out'}</div>
          <form id="login-form" ${loggedIn ? 'hidden' : ''}>
            <label>Email <input name="email" type="email" value="pip@example.com"></label>
            <label>Password <input name="password" type="password" value="hunter2"></label>
            <button class="site-btn" type="submit" id="login-submit">Sign in</button>
          </form>
          <button class="site-btn" id="logout" ${loggedIn ? '' : 'hidden'}>Sign out</button>
        </section>
        <article>${lorem(28)}</article>
        <section class="panel">
          <h3>Contact us</h3>
          <form id="contact-form">
            <label>Message <textarea name="msg">Hello!</textarea></label>
            <button class="site-btn" type="submit" id="contact-submit">Send</button>
          </form>
          <div id="contact-result"></div>
        </section>
      </main>
      <footer>Simulated website for CookieShield testing · <a href="next.html">Next page</a> · <button class="site-btn" id="reset-demo" type="button">Reset demo cookies &amp; reload</button></footer>
    `);

    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      document.cookie = 'sim_session=ok; path=/; SameSite=Lax';
      document.getElementById('login-state').textContent = 'Signed in ✅';
      e.target.hidden = true;
      document.getElementById('logout').hidden = false;
    });
    document.getElementById('logout').addEventListener('click', () => {
      document.cookie = 'sim_session=; path=/; max-age=0';
      location.reload();
    });
    document.getElementById('contact-form').addEventListener('submit', e => {
      e.preventDefault();
      document.getElementById('contact-result').textContent = 'Message sent ✅';
    });
    document.getElementById('reset-demo').addEventListener('click', () => {
      for (const c of document.cookie.split(';')) { const n = c.split('=')[0].trim(); if (n) document.cookie = `${n}=; path=/; max-age=0`; }
      location.reload();
    });
    document.querySelectorAll('[data-spa]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      history.pushState({}, '', a.getAttribute('href'));
      document.getElementById('route').textContent = location.hash;
    }));
  }

  /** Simulates a CMP locking the page while its banner is open. */
  function lockPage(cls) {
    if (cls) document.documentElement.classList.add(cls);
    document.body.style.overflow = 'hidden';
  }
  function unlockPage(cls) {
    if (cls) document.documentElement.classList.remove(cls);
    document.body.style.overflow = '';
  }

  window.SimSite = { params, css, renderShell, lockPage, unlockPage };

  document.addEventListener('DOMContentLoaded', () => {
    css();
    renderShell(document.title || 'Fixture');
  });
})();
