/**
 * CookieShield test bench — simulated consent platforms.
 *
 * Each simulator reproduces the real platform's DOM ids/classes, its page-level JavaScript API
 * (e.g. __tcfapi, OneTrust, Cookiebot, Didomi, UC_UI) and its consent cookie, so the extension
 * runs exactly the code path it would run on a real site. These are simulations for repeatable
 * testing; real-site checks are listed in README → "Manual test plan".
 *
 * Ground truth is written to window.__simConsent by the simulator itself:
 *   { decided, optionalGranted, choice }  — the test harness compares this with what the
 *   extension *claims*, to measure incorrect acceptances and false success reports.
 */
(function () {
  'use strict';

  const T = () => window.__simConsent;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const delay = Number(new URLSearchParams(location.search).get('delay') || 0);

  function setCookie(name, value, days = 180) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}; SameSite=Lax`;
  }
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function decide(cmp, granted, choice) {
    Object.assign(T(), { cmp, decided: true, optionalGranted: granted, choice });
  }
  function log(label) { T().clicks.push(label); }

  // ---------------------------------------------------------------- TCF v2 stub
  function tcfStub(state) {
    window.__tcfapi = function (cmd, ver, cb) {
      if (cmd === 'getTCData' || cmd === 'addEventListener') {
        const on = state.granted;
        const purposes = {}; for (let i = 1; i <= 10; i++) purposes[i] = !!on;
        cb({
          tcString: state.decided ? 'CPsim' + (on ? 'ALL' : 'NONE') : '',
          eventStatus: state.decided ? 'useractioncomplete' : 'cmpuishown',
          cmpStatus: 'loaded', gdprApplies: true,
          purpose: { consents: purposes, legitimateInterests: { 2: !on && state.li ? true : !!on } },
          vendor: { consents: on ? { 755: true, 793: true } : {}, legitimateInterests: {} }
        }, true);
      } else if (cb) cb(null, false);
    };
  }

  // ---------------------------------------------------------------- simulators
  const SIMS = {};

  SIMS.onetrust = function (o) {
    const decided = !!getCookie('OptanonAlertBoxClosed');
    const defaultGroups = o.optOut ? ',C0001,C0002,C0003,C0004,' : ',C0001,';
    window.OnetrustActiveGroups = decided ? (getCookie('sim_ot_groups') || ',C0001,') : defaultGroups;
    window.OneTrust = { IsAlertBoxClosed: () => !!getCookie('OptanonAlertBoxClosed') };
    if (decided) { decide('onetrust', window.OnetrustActiveGroups !== ',C0001,', 'stored'); return; }

    const sdk = $(`
      <div id="onetrust-consent-sdk">
        <div class="onetrust-pc-dark-filter" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000"></div>
        <div id="onetrust-banner-sdk" role="region" aria-label="Cookie banner" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483001;background:#fff;padding:20px;box-shadow:0 -4px 20px rgba(0,0,0,.2)">
          <p id="onetrust-policy-text">We and our partners use cookies to personalise content and ads and to analyse traffic. <a href="#policy">Cookie Policy</a></p>
          <div id="onetrust-button-group">
            <button id="onetrust-pc-btn-handler">Cookie Settings</button>
            ${o.noLayer1Reject ? '' : '<button id="onetrust-reject-all-handler">Reject All</button>'}
            <button id="onetrust-accept-btn-handler">Accept All Cookies</button>
          </div>
        </div>
        <div id="onetrust-pc-sdk" role="dialog" aria-modal="true" style="display:none;position:fixed;inset:10% 20%;z-index:2147483002;background:#fff;padding:20px;overflow:auto">
          <h2>Privacy Preference Center</h2>
          <p>When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies.</p>
          <div class="ot-sdk-row"><h4>Strictly Necessary Cookies</h4><span>Always Active</span></div>
          ${[['C0002', 'Performance Cookies'], ['C0003', 'Functional Cookies'], ['C0004', 'Targeting Cookies']].map(([id, n]) =>
            `<div class="ot-sdk-row"><label for="ot-group-id-${id}">${n}</label>
              <span class="ot-tgl"><input type="checkbox" class="category-switch-handler" id="ot-group-id-${id}" data-optanongroupid="${id}" ${o.prechecked ? 'checked' : ''}></span></div>`).join('')}
          <div class="ot-pc-footer">
            ${o.pcReject ? '<button class="ot-pc-refuse-all-handler">Reject All</button>' : ''}
            <button class="save-preference-btn-handler onetrust-close-btn-handler">Confirm My Choices</button>
            <button id="accept-recommended-btn-handler">Allow All</button>
          </div>
        </div>
      </div>`);
    const finish = (groups, choice) => {
      setCookie('OptanonAlertBoxClosed', new Date().toISOString());
      setCookie('OptanonConsent', `isGpcEnabled=0&groups=${groups.map(g => g + ':' + (g === 'C0001' || window.__otOn.has(g) ? 1 : 0)).join(',')}`);
      window.OnetrustActiveGroups = ',' + ['C0001', ...[...window.__otOn]].join(',') + ',';
      setCookie('sim_ot_groups', window.OnetrustActiveGroups);
      decide('onetrust', window.__otOn.size > 0, choice);
      sdk.remove();
      SimSite.unlockPage('ot-overflow-hidden');
    };
    window.__otOn = new Set(o.optOut ? ['C0002', 'C0003', 'C0004'] : []);
    const all = ['C0001', 'C0002', 'C0003', 'C0004'];
    sdk.querySelector('#onetrust-accept-btn-handler').onclick = () => { log('accept'); window.__otOn = new Set(['C0002', 'C0003', 'C0004']); finish(all, 'accept'); };
    const rej = sdk.querySelector('#onetrust-reject-all-handler');
    if (rej) rej.onclick = () => { log('reject'); window.__otOn = new Set(); finish(all, 'reject'); };
    sdk.querySelector('#onetrust-pc-btn-handler').onclick = () => {
      log('settings');
      sdk.querySelector('#onetrust-banner-sdk').style.display = 'none';
      sdk.querySelector('#onetrust-pc-sdk').style.display = 'block';
    };
    sdk.querySelector('#accept-recommended-btn-handler').onclick = () => { log('allow all'); window.__otOn = new Set(['C0002', 'C0003', 'C0004']); finish(all, 'accept'); };
    const pcRej = sdk.querySelector('.ot-pc-refuse-all-handler');
    if (pcRej) pcRej.onclick = () => { log('pc reject'); window.__otOn = new Set(); finish(all, 'reject'); };
    sdk.querySelector('.save-preference-btn-handler').onclick = () => {
      log('save');
      window.__otOn = new Set([...sdk.querySelectorAll('.category-switch-handler')].filter(i => i.checked).map(i => i.dataset.optanongroupid));
      finish(all, window.__otOn.size ? 'partial' : 'reject');
    };
    document.body.appendChild(sdk);
    SimSite.lockPage('ot-overflow-hidden');
  };

  SIMS.cookiebot = function (o) {
    const stored = getCookie('CookieConsent');
    const parse = (s) => ({ necessary: true, preferences: /preferences:true/.test(s), statistics: /statistics:true/.test(s), marketing: /marketing:true/.test(s) });
    window.Cookiebot = { consent: stored ? parse(stored) : { necessary: true, preferences: false, statistics: false, marketing: false }, hasResponse: !!stored };
    if (stored) { decide('cookiebot', /true/.test(stored.replace('necessary:true', '')), 'stored'); return; }
    const d = $(`
      <div id="CybotCookiebotDialog" role="dialog" aria-modal="true" style="position:fixed;left:50%;bottom:20px;transform:translateX(-50%);width:min(900px,95vw);background:#fff;padding:20px;z-index:2147483001;box-shadow:0 10px 40px rgba(0,0,0,.3)">
        <h2 id="CybotCookiebotDialogBodyContentTitle">This website uses cookies</h2>
        <div id="CybotCookiebotDialogBodyContentText">We use cookies to personalise content and ads, to provide social media features and to analyse our traffic.</div>
        <div id="CybotCookiebotDialogBodyLevelWrapper" style="${o.customize ? 'display:none' : 'display:none'}">
          ${['Preferences', 'Statistics', 'Marketing'].map(n => `<label><input type="checkbox" id="CybotCookiebotDialogBodyLevelButton${n}" ${o.prechecked ? 'checked' : ''}> ${n}</label>`).join('')}
          <label><input type="checkbox" id="CybotCookiebotDialogBodyLevelButtonNecessary" checked disabled> Necessary</label>
        </div>
        <div id="CybotCookiebotDialogFooter">
          ${o.customize ? '' : '<button id="CybotCookiebotDialogBodyButtonDecline">Deny</button>'}
          <button id="CybotCookiebotDialogBodyLevelButtonCustomize">Customize</button>
          <button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection" style="display:none">Allow selection</button>
          <button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll">Allow all</button>
        </div>
      </div>`);
    const finish = (c, choice) => {
      window.Cookiebot.consent = { necessary: true, ...c };
      window.Cookiebot.hasResponse = true;
      setCookie('CookieConsent', `{stamp:'sim',necessary:true,preferences:${c.preferences},statistics:${c.statistics},marketing:${c.marketing},method:'explicit',ver:1}`);
      decide('cookiebot', c.preferences || c.statistics || c.marketing, choice);
      d.remove();
      SimSite.unlockPage('CybotCookiebotDialogActive');
    };
    const dec = d.querySelector('#CybotCookiebotDialogBodyButtonDecline');
    if (dec) dec.onclick = () => { log('deny'); finish({ preferences: false, statistics: false, marketing: false }, 'reject'); };
    d.querySelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll').onclick = () => { log('allow all'); finish({ preferences: true, statistics: true, marketing: true }, 'accept'); };
    d.querySelector('#CybotCookiebotDialogBodyLevelButtonCustomize').onclick = () => {
      log('customize');
      d.querySelector('#CybotCookiebotDialogBodyLevelWrapper').style.display = 'block';
      d.querySelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection').style.display = '';
      d.querySelector('#CybotCookiebotDialogBodyLevelButtonCustomize').style.display = 'none';
    };
    d.querySelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection').onclick = () => {
      log('allow selection');
      const v = (n) => d.querySelector('#CybotCookiebotDialogBodyLevelButton' + n).checked;
      const c = { preferences: v('Preferences'), statistics: v('Statistics'), marketing: v('Marketing') };
      finish(c, (c.preferences || c.statistics || c.marketing) ? 'partial' : 'reject');
    };
    document.body.appendChild(d);
    SimSite.lockPage('CybotCookiebotDialogActive');
  };

  SIMS.didomi = function (o) {
    const stored = getCookie('didomi_token');
    const purposes = ['cookies', 'select_basic_ads', 'measure_content_performance', 'market_research'];
    let enabled = stored === 'all' ? purposes : [];
    window.Didomi = {
      shouldConsentBeCollected: () => !getCookie('didomi_token'),
      getCurrentUserStatus: () => ({ purposes: Object.fromEntries(purposes.map(p => [p, { id: p, enabled: enabled.includes(p) }])) })
    };
    if (stored) { decide('didomi', stored === 'all', 'stored'); return; }
    const host = $(`
      <div id="didomi-host"><div id="didomi-notice" class="didomi-notice-banner" role="dialog" aria-label="Consentement" style="position:fixed;bottom:0;left:0;right:0;background:#fff;padding:20px;z-index:2147483001;box-shadow:0 -4px 20px rgba(0,0,0,.2)">
        <div style="text-align:right"><span class="didomi-continue-without-agreeing" style="cursor:pointer;text-decoration:underline">Continuer sans accepter →</span></div>
        <p>Avec votre accord, nos partenaires et nous utilisons des cookies ou technologies similaires pour stocker et accéder à des informations personnelles comme votre visite sur ce site.</p>
        <button id="didomi-notice-learn-more-button">Paramétrer</button>
        <button id="didomi-notice-agree-button">Accepter &amp; Fermer</button>
      </div></div>`);
    const finish = (all, choice) => { enabled = all ? purposes : []; setCookie('didomi_token', all ? 'all' : 'none'); decide('didomi', all, choice); host.remove(); SimSite.unlockPage('didomi-popup-open'); };
    host.querySelector('.didomi-continue-without-agreeing').addEventListener('click', () => { log('continue without'); finish(false, 'reject'); });
    host.querySelector('#didomi-notice-agree-button').onclick = () => { log('agree'); finish(true, 'accept'); };
    host.querySelector('#didomi-notice-learn-more-button').onclick = () => log('settings (not simulated)');
    document.body.appendChild(host);
    SimSite.lockPage('didomi-popup-open');
  };

  SIMS.usercentrics = function () {
    const stored = getCookie('uc_sim');
    const services = [{ name: 'Usercentrics CMP', categorySlug: 'essential' }, { name: 'Google Analytics', categorySlug: 'marketing' }, { name: 'Hotjar', categorySlug: 'functional' }];
    let granted = stored === 'all';
    window.UC_UI = {
      isConsentRequired: () => !getCookie('uc_sim'),
      getServicesBaseInfo: () => services.map(s => ({ ...s, consent: { status: s.categorySlug === 'essential' || granted, history: [] } }))
    };
    if (stored) { decide('usercentrics', granted, 'stored'); return; }
    const host = document.createElement('div');
    host.id = 'usercentrics-root';
    const root = host.attachShadow({ mode: 'closed' });   // real UC uses shadow DOM
    root.innerHTML = `
      <style>.b{position:fixed;bottom:0;left:0;right:0;background:#fff;padding:20px;z-index:2147483001;box-shadow:0 -4px 20px rgba(0,0,0,.2)}</style>
      <div class="b" data-testid="uc-default-banner">
        <h2>Privacy Settings</h2>
        <p>This site uses third-party website tracking technologies to provide and continually improve our services.</p>
        <button data-testid="uc-more-button">More Information</button>
        <button data-testid="uc-deny-all-button">Deny</button>
        <button data-testid="uc-accept-all-button">Accept All</button>
      </div>`;
    const finish = (all, choice) => { granted = all; setCookie('uc_sim', all ? 'all' : 'none'); decide('usercentrics', all, choice); host.remove(); };
    root.querySelector('[data-testid=uc-deny-all-button]').onclick = () => { log('deny'); finish(false, 'reject'); };
    root.querySelector('[data-testid=uc-accept-all-button]').onclick = () => { log('accept'); finish(true, 'accept'); };
    document.body.appendChild(host);
  };

  function tcfCmp(id, markup, buttons, lockCls) {
    const stored = getCookie('sim_tcf_' + id);
    const st = { decided: !!stored, granted: stored === 'all' };
    tcfStub(st);
    if (stored) { decide(id, st.granted, 'stored'); return; }
    const el = $(markup);
    const finish = (all, choice) => { st.decided = true; st.granted = all; setCookie('sim_tcf_' + id, all ? 'all' : 'none'); decide(id, all, choice); el.remove(); SimSite.unlockPage(lockCls); };
    for (const [sel, action] of buttons) {
      const b = el.querySelector(sel);
      if (b) b.addEventListener('click', () => { log(action); if (action === 'accept') finish(true, 'accept'); else if (action === 'reject') finish(false, 'reject'); });
    }
    document.body.appendChild(el);
    SimSite.lockPage(lockCls);
  }

  SIMS.quantcast = () => tcfCmp('quantcast', `
    <div id="qc-cmp2-container" class="qc-cmp2-container"><div id="qc-cmp2-ui" role="dialog" aria-label="qc-cmp2-ui" style="position:fixed;inset:auto 0 0 0;background:#fff;padding:20px;z-index:2147483001">
      <p>We value your privacy. We and our partners store and/or access information on a device, such as cookies and process personal data.</p>
      <div class="qc-cmp2-summary-buttons">
        <button mode="secondary" size="large">MORE OPTIONS</button>
        <button mode="secondary" size="large">DISAGREE</button>
        <button mode="primary" size="large">AGREE</button>
      </div></div></div>`,
    [['button[mode=primary]', 'accept'], ['button[mode=secondary]:nth-child(2)', 'reject']], 'qc-cmp-ui-showing');

  SIMS.googlefc = () => tcfCmp('googlefc', `
    <div class="fc-consent-root"><div class="fc-dialog-container" style="position:fixed;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.4);z-index:2147483001">
      <div class="fc-dialog" role="dialog" style="background:#fff;padding:24px;max-width:520px">
        <h1 class="fc-dialog-headline">This site asks for consent to use your data</h1>
        <p>Personalised advertising and content, advertising and content measurement, audience research and services development. Store and/or access information on a device (cookies).</p>
        <button class="fc-button fc-cta-consent fc-primary-button">Consent</button>
        <button class="fc-button fc-cta-do-not-consent fc-secondary-button">Do not consent</button>
        <button class="fc-button fc-cta-manage-options">Manage options</button>
      </div></div></div>`,
    [['.fc-cta-consent', 'accept'], ['.fc-cta-do-not-consent', 'reject']], null);

  SIMS.iubenda = () => tcfCmp('iubenda', `
    <div id="iubenda-cs-banner" style="position:fixed;bottom:0;left:0;right:0;background:#fff;padding:18px;z-index:2147483001">
      <div id="iubenda-cs-title">Notice</div>
      <p>We and selected third parties use cookies or similar technologies for technical purposes and, with your consent, for other purposes as specified in the cookie policy.</p>
      <button class="iubenda-cs-customize-btn">Learn more and customize</button>
      <button class="iubenda-cs-reject-btn">Reject</button>
      <button class="iubenda-cs-accept-btn">Accept</button>
    </div>`, [['.iubenda-cs-accept-btn', 'accept'], ['.iubenda-cs-reject-btn', 'reject']], null);

  /** Sourcepoint: buttons live in an iframe (cross-origin in the e2e harness). */
  SIMS.sourcepoint = function (o) {
    const stored = getCookie('sim_tcf_sourcepoint');
    const st = { decided: !!stored, granted: stored === 'all' };
    tcfStub(st);
    if (stored) { decide('sourcepoint', st.granted, 'stored'); return; }
    const origin = SimSite.params.get('frameOrigin') || location.origin;
    const variant = o.pay ? 'pay' : 'reject';
    const wrap = $(`<div id="sp_message_container_1204" class="sp-message-container" style="position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center">
        <div class="sp_veil" style="position:fixed;inset:0;background:rgba(0,0,0,.5)"></div>
        <iframe id="sp_message_iframe_1204" title="SP Consent Message" style="position:relative;width:min(560px,92vw);height:360px;border:0;border-radius:12px;background:#fff"
          src="${origin}/playground/fixtures/sp-frame.html?variant=${variant}"></iframe></div>`);
    window.addEventListener('message', (ev) => {
      if (!ev.data || ev.data.sp !== 'choice') return;
      if (ev.data.choice === 11) { st.decided = true; st.granted = true; setCookie('sim_tcf_sourcepoint', 'all'); decide('sourcepoint', true, 'accept'); }
      else if (ev.data.choice === 13) { st.decided = true; st.granted = false; setCookie('sim_tcf_sourcepoint', 'none'); decide('sourcepoint', false, 'reject'); }
      else return;
      wrap.remove();
      SimSite.unlockPage('sp-message-open');
    });
    document.body.appendChild(wrap);
    SimSite.lockPage('sp-message-open');
  };

  /** Generic "cookie state in a first-party cookie" platform factory. */
  function cookieCmp(id, markup, onReject, onAccept, buttons, lockCls) {
    const stored = getCookie('sim_' + id);
    if (stored) { decide(id, stored === 'all', 'stored'); if (stored === 'all') onAccept(); else onReject(); return; }
    const el = $(markup);
    const finish = (all, choice) => { setCookie('sim_' + id, all ? 'all' : 'none'); (all ? onAccept : onReject)(); decide(id, all, choice); el.remove(); SimSite.unlockPage(lockCls); };
    for (const [sel, action] of buttons) {
      const b = el.querySelector(sel);
      if (b) b.addEventListener('click', (e) => { e.preventDefault(); log(action); if (action === 'accept') finish(true, 'accept'); if (action === 'reject') finish(false, 'reject'); });
    }
    document.body.appendChild(el);
    if (lockCls !== false) SimSite.lockPage(lockCls);
  }

  SIMS.klaro = function () {
    const services = [{ name: 'session', required: true }, { name: 'analytics' }, { name: 'ads' }];
    const consents = { session: true, analytics: false, ads: false };
    let confirmed = false;
    window.klaro = { getManager: () => ({ confirmed, consents, config: { services } }) };
    cookieCmp('klaro', `
      <div class="klaro"><div class="cookie-notice" style="position:fixed;bottom:16px;right:16px;max-width:420px;background:#333;color:#fff;padding:18px;z-index:2147483001">
        <div class="cn-body"><p>Hi! Could we please enable some additional services for analytics and ads? You can always change or withdraw your consent later. Cookies may be set.</p>
        <div class="cn-ok"><button class="cm-btn cm-btn-lern-more cn-learn-more">Let me choose</button>
        <div class="cn-buttons"><button class="cm-btn cm-btn-danger cn-decline">I decline</button><button class="cm-btn cm-btn-success">That's ok</button></div></div></div></div></div>`,
      () => { confirmed = true; consents.analytics = false; consents.ads = false; },
      () => { confirmed = true; consents.analytics = true; consents.ads = true; },
      [['.cn-decline', 'reject'], ['.cm-btn-success', 'accept']], false);
  };

  SIMS.osano = function () {
    const consent = { ESSENTIAL: 'ACCEPT', ANALYTICS: 'DENY', MARKETING: 'DENY', PERSONALIZATION: 'DENY' };
    const cm = { dialogOpen: true, getConsent: () => ({ ...consent }) };
    window.Osano = { cm };
    cookieCmp('osano', `
      <div class="osano-cm-window"><div class="osano-cm-dialog osano-cm-dialog--position_bottom" role="dialog" aria-label="Cookie Consent Banner" style="position:fixed;bottom:0;left:0;right:0;background:#fff;padding:18px;z-index:2147483001">
        <span class="osano-cm-content">This website stores data such as cookies to enable essential site functionality, as well as marketing, personalization, and analytics.</span>
        <button class="osano-cm-manage osano-cm-link">Manage Preferences</button>
        <button class="osano-cm-denyAll osano-cm-button">Deny</button>
        <button class="osano-cm-accept-all osano-cm-button">Accept</button>
      </div></div>`,
      () => { cm.dialogOpen = false; },
      () => { cm.dialogOpen = false; consent.ANALYTICS = consent.MARKETING = consent.PERSONALIZATION = 'ACCEPT'; },
      [['.osano-cm-denyAll', 'reject'], ['.osano-cm-accept-all', 'accept']], false);
  };

  SIMS.complianz = () => cookieCmp('complianz', `
    <div id="cmplz-cookiebanner-container"><div class="cmplz-cookiebanner cmplz-show" role="dialog" style="position:fixed;bottom:16px;left:16px;max-width:460px;background:#fff;padding:18px;z-index:2147483001;box-shadow:0 6px 30px rgba(0,0,0,.25)">
      <div class="cmplz-title">Manage Cookie Consent</div>
      <div class="cmplz-message">To provide the best experiences, we use technologies like cookies to store and/or access device information.</div>
      <button class="cmplz-btn cmplz-accept">Accept</button>
      <button class="cmplz-btn cmplz-deny">Deny</button>
      <button class="cmplz-btn cmplz-view-preferences">View preferences</button>
    </div></div>`,
    () => { ['marketing', 'statistics', 'preferences'].forEach(k => setCookie('cmplz_' + k, 'deny')); },
    () => { ['marketing', 'statistics', 'preferences'].forEach(k => setCookie('cmplz_' + k, 'allow')); },
    [['.cmplz-accept', 'accept'], ['.cmplz-deny', 'reject']], false);

  SIMS.cookieyes = () => cookieCmp('cookieyes', `
    <div class="cky-consent-container cky-banner-bottom" style="position:fixed;bottom:0;left:0;right:0;z-index:2147483001"><div class="cky-consent-bar" style="background:#fff;padding:18px">
      <p class="cky-title">We value your privacy</p>
      <div class="cky-notice-des">We use cookies to enhance your browsing experience, serve personalised ads or content, and analyse our traffic.</div>
      <button class="cky-btn cky-btn-customize">Customise</button>
      <button class="cky-btn cky-btn-reject">Reject All</button>
      <button class="cky-btn cky-btn-accept">Accept All</button>
    </div></div>`,
    () => setCookie('cookieyes-consent', 'consentid:sim,consent:no,action:yes,necessary:yes,functional:no,analytics:no,performance:no,advertisement:no'),
    () => setCookie('cookieyes-consent', 'consentid:sim,consent:yes,action:yes,necessary:yes,functional:yes,analytics:yes,performance:yes,advertisement:yes'),
    [['.cky-btn-accept', 'accept'], ['.cky-btn-reject', 'reject']], false);

  SIMS.trustarc = () => cookieCmp('trustarc', `
    <div id="truste-consent-track" style="position:fixed;bottom:0;left:0;right:0;background:#fff;padding:18px;z-index:2147483001">
      <div id="truste-consent-content"><div id="truste-consent-text">This site uses cookies and related technologies, as described in our privacy statement, for purposes that may include site operation, analytics, enhanced user experience, or advertising.</div>
      <div id="truste-consent-buttons"><button id="truste-consent-required">Required Only</button><button id="truste-show-consent">Manage Preferences</button><button id="truste-consent-button">Accept All</button></div></div>
    </div>`,
    () => setCookie('notice_gdpr_prefs', '0:'),
    () => setCookie('notice_gdpr_prefs', '0,1,2:'),
    [['#truste-consent-button', 'accept'], ['#truste-consent-required', 'reject']], false);

  SIMS.shopify = () => cookieCmp('shopify', `
    <section id="shopify-pc__banner" class="shopify-pc__banner__dialog" role="alertdialog" style="position:fixed;bottom:16px;left:16px;right:16px;background:#fff;padding:18px;z-index:2147483001;box-shadow:0 6px 30px rgba(0,0,0,.25)">
      <h2>Cookie preferences</h2><p id="shopify-pc__banner__body">We use cookies and similar technologies to provide the best experience on our website.</p>
      <button id="shopify-pc__banner__btn-manage-prefs">Manage preferences</button>
      <button id="shopify-pc__banner__btn-decline">Decline</button>
      <button id="shopify-pc__banner__btn-accept">Accept</button>
    </section>`,
    () => setCookie('_tracking_consent', JSON.stringify({ v: '2.1', reg: 'GDPR', purposes: { a: false, p: false, m: false, t: false } })),
    () => setCookie('_tracking_consent', JSON.stringify({ v: '2.1', reg: 'GDPR', purposes: { a: true, p: true, m: true, t: true } })),
    [['#shopify-pc__banner__btn-accept', 'accept'], ['#shopify-pc__banner__btn-decline', 'reject']], false);

  SIMS.hubspot = () => cookieCmp('hubspot', `
    <div id="hs-eu-cookie-confirmation" style="position:fixed;top:0;left:0;right:0;background:#fff;padding:18px;z-index:2147483001;box-shadow:0 4px 20px rgba(0,0,0,.2)">
      <div id="hs-eu-cookie-confirmation-inner"><p>This website stores cookies on your computer. These cookies are used to collect information about how you interact with our website.</p>
      <div id="hs-eu-cookie-confirmation-buttons-area"><a id="hs-eu-confirmation-button" href="#" role="button">Accept</a><a id="hs-eu-decline-button" href="#" role="button">Decline</a></div></div>
    </div>`, () => {}, () => {}, [['#hs-eu-confirmation-button', 'accept'], ['#hs-eu-decline-button', 'reject']], false);

  SIMS.cookienotice = () => cookieCmp('cookienotice', `
    <div id="cookie-notice" role="dialog" class="cookie-notice-visible cn-position-bottom" aria-label="Cookie Notice" style="position:fixed;bottom:0;left:0;right:0;background:#32323a;color:#fff;padding:14px;z-index:2147483001">
      <div class="cookie-notice-container"><span id="cn-notice-text">We use cookies to ensure that we give you the best experience on our website.</span>
      <span id="cn-notice-buttons"><a href="#" id="cn-accept-cookie" class="cn-set-cookie cn-button">Ok</a><a href="#" id="cn-refuse-cookie" class="cn-set-cookie cn-button">No</a></span></div>
    </div>`, () => {}, () => {}, [['#cn-accept-cookie', 'accept'], ['#cn-refuse-cookie', 'reject']], false);

  // ---------------------------------------------------------------- custom (no CMP) banners
  const LANG = {
    en: ['We use cookies to improve your experience and to show personalised ads.', 'Accept all', 'Reject all', 'Settings'],
    de: ['Wir verwenden Cookies, um Ihr Erlebnis zu verbessern und personalisierte Werbung anzuzeigen.', 'Alle akzeptieren', 'Alle ablehnen', 'Einstellungen'],
    fr: ['Nous utilisons des cookies pour améliorer votre expérience et afficher des publicités personnalisées.', 'Tout accepter', 'Tout refuser', 'Personnaliser'],
    es: ['Utilizamos cookies para mejorar su experiencia y mostrar publicidad personalizada.', 'Aceptar todas', 'Rechazar todas', 'Configurar'],
    it: ['Utilizziamo i cookie per migliorare la tua esperienza e mostrare annunci personalizzati.', 'Accetta tutti', 'Rifiuta tutti', 'Personalizza'],
    nl: ['Wij gebruiken cookies om uw ervaring te verbeteren.', 'Alles accepteren', 'Alles weigeren', 'Instellingen'],
    pt: ['Usamos cookies para melhorar a sua experiência.', 'Aceitar todos', 'Rejeitar todos', 'Configurações'],
    pl: ['Używamy plików cookie, aby poprawić Twoje wrażenia.', 'Zaakceptuj wszystkie', 'Odrzuć wszystkie', 'Ustawienia'],
    sv: ['Vi använder cookies för att förbättra din upplevelse.', 'Acceptera alla', 'Avvisa alla', 'Inställningar'],
    fi: ['Käytämme evästeitä parantaaksemme kokemustasi.', 'Hyväksy kaikki', 'Hylkää kaikki', 'Asetukset'],
    cs: ['Používáme soubory cookie ke zlepšení vašeho zážitku.', 'Přijmout vše', 'Odmítnout vše', 'Nastavení'],
    hu: ['Sütiket használunk az élmény javítására.', 'Összes elfogadása', 'Összes elutasítása', 'Beállítások'],
    el: ['Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας.', 'Αποδοχή όλων', 'Απόρριψη όλων', 'Ρυθμίσεις'],
    ru: ['Мы используем файлы cookie, чтобы улучшить ваш опыт.', 'Принять все', 'Отклонить все', 'Настройки'],
    uk: ['Ми використовуємо файли cookie, щоб покращити ваш досвід.', 'Прийняти всі', 'Відхилити все', 'Налаштування'],
    tr: ['Deneyiminizi geliştirmek için çerezler kullanıyoruz.', 'Tümünü kabul et', 'Tümünü reddet', 'Ayarlar'],
    ja: ['当サイトでは、利便性向上のためにCookieを使用しています。', 'すべて受け入れる', 'すべて拒否', '設定'],
    zh: ['我们使用 Cookie 来改善您的体验。', '全部接受', '全部拒绝', '设置'],
    ko: ['당사는 사용자 경험 향상을 위해 쿠키를 사용합니다.', '모두 수락', '모두 거부', '설정'],
    ar: ['نستخدم ملفات تعريف الارتباط لتحسين تجربتك.', 'قبول الكل', 'رفض الكل', 'إعدادات'],
    he: ['אנו משתמשים בעוגיות כדי לשפר את החוויה שלך.', 'קבל הכל', 'דחה הכל', 'הגדרות'],
    hi: ['हम आपके अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग करते हैं।', 'सभी स्वीकार करें', 'सभी अस्वीकार करें', 'सेटिंग्स']
  };

  function gtagConsent(granted) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(['consent', 'update', { ad_storage: granted ? 'granted' : 'denied', analytics_storage: granted ? 'granted' : 'denied', ad_user_data: granted ? 'granted' : 'denied', ad_personalization: granted ? 'granted' : 'denied' }]);
  }

  /** Bespoke banner: no CMP, optional Google Consent Mode, optional preference modal. */
  SIMS.custom = function (o) {
    const lang = o.lang || SimSite.params.get('lang') || 'en';
    const [text, acc, rej, set] = LANG[lang] || LANG.en;
    document.documentElement.lang = lang;
    if (['ar', 'he'].includes(lang)) document.documentElement.dir = 'rtl';
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(['consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' }]);
    const stored = getCookie('site_consent');
    if (stored) { decide('custom', stored === 'all', 'stored'); if (o.gcm) gtagConsent(stored === 'all'); return; }
    const noReject = o.noReject;
    const el = $(`<div class="privacy-popup" role="dialog" aria-label="Privacy" style="position:fixed;bottom:20px;left:20px;max-width:440px;background:#fff;padding:20px;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);z-index:99999">
      <p>${text}</p>
      <div class="actions">
        <button class="pp-accept">${acc}</button>
        ${noReject ? '' : `<button class="pp-reject">${rej}</button>`}
        <button class="pp-settings">${o.settingsLabel || set}</button>
      </div></div>`);
    const modal = $(`<div class="privacy-modal" role="dialog" aria-modal="true" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100000">
      <div style="background:#fff;max-width:520px;margin:10vh auto;padding:22px;border-radius:14px">
        <h3>Cookie preferences</h3>
        <label><input type="checkbox" disabled checked> Strictly necessary cookies</label>
        <label><input type="checkbox" class="cat" data-cat="analytics" checked> Analytics cookies</label>
        <label><input type="checkbox" class="cat" data-cat="marketing" checked> Marketing cookies</label>
        <div role="switch" aria-checked="true" tabindex="0" class="cat-switch" aria-label="Personalisation cookies" style="display:inline-block;width:40px;height:22px;background:#2a9d8f;border-radius:11px;cursor:pointer"></div> Personalisation
        <p><button class="pm-save">Save preferences</button> <button class="pm-accept">Accept all</button></p>
      </div></div>`);
    modal.querySelector('.cat-switch').addEventListener('click', e => { const s = e.currentTarget; s.setAttribute('aria-checked', s.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); });
    if (o.leaveLock) {
      // Buggy CMP: locks the page and forgets to unlock it after the choice, leaving a dimmer behind.
      document.body.classList.add('cookie-modal-open');
      document.body.style.overflow = 'hidden';
      document.body.appendChild($('<div class="cookie-consent-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99990"></div>'));
    }
    const finish = (all, choice) => { setCookie('site_consent', all ? 'all' : 'none'); if (o.gcm) gtagConsent(all); decide('custom', all, choice); el.remove(); modal.remove(); };
    el.querySelector('.pp-accept').onclick = () => { log('accept'); finish(true, 'accept'); };
    const r = el.querySelector('.pp-reject');
    if (r) r.onclick = () => { log('reject'); if (o.mislabeled) { finish(true, 'accept (mislabeled)'); } else finish(false, 'reject'); };
    el.querySelector('.pp-settings').onclick = () => { log('settings'); el.style.display = 'none'; modal.style.display = 'block'; };
    modal.querySelector('.pm-accept').onclick = () => { log('accept all'); finish(true, 'accept'); };
    modal.querySelector('.pm-save').onclick = () => {
      log('save');
      const any = [...modal.querySelectorAll('.cat')].some(c => c.checked) || modal.querySelector('.cat-switch').getAttribute('aria-checked') === 'true';
      finish(any, any ? 'partial' : 'reject');
    };
    document.body.append(el, modal);
  };

  /** Only an "OK / Accept" button. Expected: exception, nothing clicked. */
  SIMS.acceptOnly = () => {
    const el = $(`<div id="cookie-bar" style="position:fixed;bottom:0;left:0;right:0;background:#222;color:#fff;padding:16px;z-index:99999">
      This website uses cookies to ensure you get the best experience. <button class="ok">Got it!</button></div>`);
    el.querySelector('.ok').onclick = () => { log('accept'); decide('acceptOnly', true, 'accept'); el.remove(); };
    document.body.appendChild(el);
  };

  /** Consent-or-pay wall. Expected: exception, nothing clicked, page NOT unlocked by us. */
  SIMS.payWall = () => {
    const el = $(`<div id="consent-wall" role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(10,20,30,.85);z-index:99999;display:grid;place-items:center">
      <div style="background:#fff;padding:28px;max-width:520px;border-radius:12px">
        <h2>Read with advertising or subscribe</h2>
        <p>Use our site with advertising and tracking (cookies) or subscribe to our ad-free plan for €2.99/month.</p>
        <button class="accept">Accept and continue</button>
        <button class="sub">Subscribe ad-free</button>
      </div></div>`);
    el.querySelector('.accept').onclick = () => { log('accept'); decide('payWall', true, 'accept'); el.remove(); SimSite.unlockPage(); };
    el.querySelector('.sub').onclick = () => { log('subscribe'); };
    document.body.appendChild(el);
    SimSite.lockPage();
  };

  /**
   * iubenda in US mode — reproduced from granola.ai (Oct 2026). The banner's "Reject all" only
   * declines the EU-style purposes; sale / sharing / targeted advertising stay ON in the separate
   * _iub_cs-<id>-uspr cookie and in the GPP usnat section until "Your Privacy Choices" is used.
   * opts.answered: the banner was already answered with "Reject all" on an earlier visit.
   * opts.noLink:   the site exposes no "Your Privacy Choices" control at all.
   */
  SIMS.iubendaUS = function (o) {
    const ID = 's999', P = `_iub_cs-${ID}`, U = `${P}-uspr`;
    document.documentElement.classList.add('ccpa', 'iubenda');
    if (o.answered && !getCookie('sim_seeded')) {
      setCookie('sim_seeded', '1');
      setCookie(P, JSON.stringify({ purposes: { 1: true, 4: false, 5: false }, id: 99 }));
    }
    if (!getCookie(U)) setCookie(U, JSON.stringify({ s: true, sh: true, adv: true }));
    const purposes = () => { try { return JSON.parse(getCookie(P)).purposes; } catch (e) { return null; } };
    const uspr = () => JSON.parse(getCookie(U));
    let uspOptedOut = !!purposes();
    const truth = () => {
      const p = purposes(), u = uspr();
      Object.assign(T(), { cmp: 'iubenda', decided: !!p, optionalGranted: !!p && (!!(p[4] || p[5]) || u.s || u.sh || u.adv) });
    };
    window.__uspapi = (cmd, v, cb) => cb({ version: 1, uspString: uspOptedOut ? '1YY-' : '1YN-' }, true);
    window.__gpp = (cmd, cb) => {
      const u = uspr(), f = (b) => (b ? 2 : 1);
      if (cmd === 'ping') cb({ gppVersion: '1.1', cmpStatus: 'loaded', signalStatus: 'ready', applicableSections: [7], parsedSections: { usnat: { Version: 1, SaleOptOut: f(u.s), SharingOptOut: f(u.sh), TargetedAdvertisingOptOut: f(u.adv), SaleOptOutNotice: 2 } } }, true);
    };
    truth();

    // Floating US widget (always present) + preference panel
    if (!o.noLink) {
      const w = $(`<div class="iub__us-widget" style="position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:2147483000;background:#fff;padding:6px 10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2)">
        <a class="iub__us-widget__link iubenda-cs-uspr-link" href="/playground/fixtures/next.html">Notice at collection</a>
        <button class="iub__us-widget__link iub__us-widget__link--privacy-choices iubenda-cs-preferences-link">Your Privacy Choices</button></div>`);
      w.querySelector('.iubenda-cs-preferences-link').onclick = () => { log('open privacy choices'); openPanel(); };
      document.body.appendChild(w);
    }
    function openPanel() {
      const u = uspr(), p = purposes() || { 1: true, 4: false, 5: false };
      const row = (k, label, on, locked) => `<div class="purposes-item"><label for="purpose-${k}">${label}</label><input type="checkbox" id="purpose-${k}" class="style1${locked ? ' locked' : ''}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}></div>`;
      const panel = $(`<div id="iubenda-iframe" class="iubenda-iframe-visible" style="position:fixed;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.5);z-index:2147483002">
        <div style="background:#fff;padding:24px;width:min(760px,95vw);max-height:90vh;overflow:auto">
          <button class="iub-btn iub-btn-cp purposes-btn">See full Privacy Policy</button>
          <p>To deny your consent to, or where applicable opt out of, the specific processing activities described below, switch the toggles to off or use the “Reject all” button and confirm you want to save your choices.</p>
          <button class="iub-btn iub-btn-consent iub-btn-reject purposes-btn">Reject all</button>
          <button class="iub-btn iub-btn-consent iub-btn-accept purposes-btn">Accept all</button>
          <h2>Your privacy rights under US state privacy laws</h2>
          ${row('s', '<b>Sale</b> of my personal information', u.s)}
          ${row('sh', '<b>Sharing</b> of my personal information', u.sh)}
          ${row('adv', 'Processing of my personal information for <b>targeted advertising</b>', u.adv)}
          <h2>Your consent preferences for tracking technologies</h2>
          ${row('1', 'Necessary', true, true)}${row('4', 'Measurement', p[4])}${row('5', 'Marketing', p[5])}
          <button id="iubRejectBtn">Reject all</button> <button id="iubFooterBtn">Save and continue</button>
        </div></div>`);
      const box = (k) => panel.querySelector('#purpose-' + k);
      panel.querySelector('.iub-btn-reject').onclick = panel.querySelector('#iubRejectBtn').onclick = () => { log('panel reject all'); for (const k of ['s', 'sh', 'adv', '4', '5']) box(k).checked = false; };
      panel.querySelector('.iub-btn-accept').onclick = () => {
        log('panel accept all');
        setCookie(U, JSON.stringify({ s: true, sh: true, adv: true }));
        setCookie(P, JSON.stringify({ purposes: { 1: true, 4: true, 5: true }, id: 99 }));
        panel.remove(); truth(); T().choice = 'accept';
      };
      panel.querySelector('#iubFooterBtn').onclick = () => {
        log('panel save');
        setCookie(U, JSON.stringify({ s: box('s').checked, sh: box('sh').checked, adv: box('adv').checked }));
        setCookie(P, JSON.stringify({ purposes: { 1: true, 4: box('4').checked, 5: box('5').checked }, id: 99 }));
        uspOptedOut = !box('s').checked;
        panel.remove(); truth(); T().choice = 'save';
      };
      document.body.appendChild(panel);
    }

    if (purposes()) { T().choice = 'stored'; return; }
    const banner = $(`<div id="iubenda-cs-banner" class="iubenda-cs-default-floating iubenda-cs-visible" style="position:fixed;bottom:60px;left:50%;transform:translateX(-50%);width:min(560px,95vw);background:#fff;padding:20px;z-index:2147483001;box-shadow:0 10px 30px rgba(0,0,0,.3)">
      <h2 id="iubenda-cs-title">OK with Cookies?</h2>
      <div id="iubenda-cs-paragraph"><p>We use cookies to keep things running, understand how people use our site, and improve the experience over time. Some are essential and the site needs them to work. Others are optional and you're in control of those.</p></div>
      <button class="iubenda-cs-customize-btn">Manage my preferences</button>
      <button class="iubenda-cs-reject-btn iubenda-cs-btn-primary">Reject all</button>
      <button class="iubenda-cs-accept-btn iubenda-cs-btn-primary">Accept all</button></div>`);
    banner.querySelector('.iubenda-cs-reject-btn').onclick = () => {
      log('reject');
      setCookie(P, JSON.stringify({ purposes: { 1: true, 4: false, 5: false }, id: 99 }));
      uspOptedOut = true;            // the CCPA string flips…
      banner.remove(); truth(); T().choice = 'reject'; // …but uspr / GPP stay "not opted out"
    };
    banner.querySelector('.iubenda-cs-accept-btn').onclick = () => {
      log('accept');
      setCookie(P, JSON.stringify({ purposes: { 1: true, 4: true, 5: true }, id: 99 }));
      banner.remove(); truth(); T().choice = 'accept';
    };
    banner.querySelector('.iubenda-cs-customize-btn').onclick = () => { log('settings'); banner.remove(); openPanel(); };
    document.body.appendChild(banner);
  };

  /** Not a cookie banner at all. Expected: untouched. */
  SIMS.newsletter = () => {
    const el = $(`<div id="newsletter" role="dialog" aria-modal="true" style="position:fixed;inset:auto 20px 20px auto;width:360px;background:#fff;padding:18px;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.25)">
      <h3>Get the Polar Weekly</h3><p>Penguin news in your inbox every Friday.</p>
      <button class="subscribe">Subscribe</button> <button class="nothanks">No thanks</button></div>`);
    el.querySelector('.nothanks').onclick = () => { log('newsletter dismissed'); el.remove(); };
    el.querySelector('.subscribe').onclick = () => log('newsletter subscribe');
    document.body.appendChild(el);
    window.__simConsent.cmp = 'none';
  };

  window.CMPSim = {
    mount(name, opts = {}) {
      const go = () => setTimeout(() => SIMS[name](opts), delay || opts.delay || 0);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(go, 0));
      else go();
    },
    LANG
  };
})();
