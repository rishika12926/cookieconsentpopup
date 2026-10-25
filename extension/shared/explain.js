/**
 * Plain-language explanations shared by the popup and the dashboard.
 * The #1 problem in our user survey was "not knowing what happens when I accept or reject",
 * so every result says, in everyday words, what was refused, what was kept and how sure we are.
 */
(function () {
  'use strict';

  const STATUS = {
    VERIFIED: {
      icon: '✓', tone: 'ok', label: 'Rejected · confirmed',
      headline: 'Optional cookies rejected',
      mood: 'happy',
      say: 'All done! I said no to the extras — and the site’s own records agree.',
      what: 'The site was told “no” to optional cookies: advertising, tracking across sites, analytics and personalisation. We then read the site’s own consent record and it confirms nothing optional is switched on.',
      kept: 'Necessary cookies stay — the ones that keep you signed in, remember your basket and keep the site secure.'
    },
    CLICKED: {
      icon: '✓', tone: 'okish', label: 'Rejected · not double-checked',
      headline: 'Reject clicked',
      mood: 'happy',
      say: 'I clicked the reject option for you. This site doesn’t publish a record I can double-check.',
      what: 'We clicked the site’s reject / “necessary only” option and the banner closed. This site doesn’t expose a consent record, so we can’t independently confirm what it stored.',
      kept: 'Necessary cookies stay so the site keeps working.'
    },
    REMEMBERED: {
      icon: '✓', tone: 'ok', label: 'Earlier rejection still active',
      headline: 'Your “no” is remembered',
      mood: 'happy',
      say: 'No banner today — your earlier “no” is still in effect here.',
      what: 'This site already has a “no” saved, so it didn’t ask again. We read its own consent record to check. Below: what is refused, and where that “no” came from.',
      kept: 'Necessary cookies stay.'
    },
    NEEDS_YOU: {
      icon: '!', tone: 'warn', label: 'Needs your choice',
      headline: 'I didn’t accept anything',
      mood: 'thinking',
      say: 'I couldn’t reject safely here, so I left the choice to you. Nothing was accepted.',
      what: 'We only ever click reject. When there is no clear way to do that, we stop and tell you rather than clicking “Accept” to make the pop-up go away.',
      kept: 'No new consent was given by CookieShield.'
    },
    FAILED: {
      icon: '!', tone: 'bad', label: 'Site still allows extras',
      headline: 'The site didn’t take the “no”',
      mood: 'worried',
      say: 'I clicked reject, but the site still lists optional cookies as allowed. Please check its cookie settings.',
      what: 'After our reject click, the site’s own consent record still shows optional cookies as allowed. We report this instead of pretending it worked.',
      kept: 'Open the site’s cookie settings (often a link in the footer) to withdraw consent.'
    },
    PREVIOUSLY_ACCEPTED: {
      icon: 'i', tone: 'calm', label: 'Your “yes” is respected',
      headline: 'Some extras are allowed here',
      mood: 'calm',
      say: 'This site has a “yes” saved for some extras. If that was you, I’m leaving it alone.',
      what: 'The site’s consent record allows some optional cookies or data uses. CookieShield only says “no” when a site asks for the first time. It never undoes a choice that was changed later, so you can switch any toggle back on yourself.',
      kept: 'To change it, use the site’s own cookie or “Your Privacy Choices” settings (often linked in the footer).'
    },
    HIDDEN_BY_YOU: {
      icon: '–', tone: 'muted', label: 'Hidden by you',
      headline: 'Banner hidden — no answer sent',
      mood: 'calm',
      say: 'As you asked, I’m hiding this banner. The site gets neither a yes nor a no.',
      what: 'You chose to hide this site’s banner. No consent was given.',
      kept: 'You can undo this in the dashboard under “Sites”.'
    },
    PAUSED: {
      icon: '❚❚', tone: 'muted', label: 'Paused here',
      headline: 'Paused on this site',
      mood: 'sleepy',
      say: 'I’m taking a nap on this site. Banners here are all yours.',
      what: 'CookieShield won’t touch this site until you resume it.',
      kept: ''
    },
    OFF: {
      icon: 'off', tone: 'muted', label: 'Turned off',
      headline: 'CookieShield is off',
      mood: 'sleepy', say: 'I’m switched off everywhere. Flip the switch to wake me.', what: '', kept: ''
    },
    NO_BANNER: {
      icon: '·', tone: 'calm', label: 'No banner',
      headline: 'No cookie banner here',
      mood: 'calm', say: 'Nothing to do on this page. I’m keeping watch.', what: 'We didn’t find a cookie banner on this page.', kept: ''
    },
    WAITING_FRAME: { icon: '…', tone: 'calm', label: 'Working…', headline: 'Working on it…', mood: 'calm', say: 'Dealing with a banner inside a frame…', what: '', kept: '' },
    HANDLING: { icon: '…', tone: 'calm', label: 'Working…', headline: 'Working on it…', mood: 'calm', say: 'Reading the banner…', what: '', kept: '' },
    SCANNING: { icon: '…', tone: 'calm', label: 'Checking…', headline: 'Checking this page…', mood: 'calm', say: 'Looking for cookie banners…', what: '', kept: '' },
    UNSUPPORTED: { icon: '·', tone: 'muted', label: 'Not available', headline: 'Not available on this page', mood: 'calm', say: 'Browser pages and the Web Store are off-limits for extensions.', what: '', kept: '' }
  };

  const REASON = {
    ACCEPT_ONLY: 'The banner only offered “Accept” / “OK”. There was nothing to reject with.',
    CONSENT_OR_PAY: 'The site asks you to either accept tracking or pay for a subscription. That’s your call, not ours.',
    TOGGLES_STUCK: 'Some optional categories wouldn’t switch off, so we didn’t save.',
    REJECT_NOT_CONFIRMED: 'We tried the reject option but the banner stayed, so we can’t confirm it worked.',
    NO_REJECT_OPTION: 'We couldn’t find a reject or “necessary only” option.',
    UNRECOGNIZED_LANGUAGE_OR_LAYOUT: 'We couldn’t recognise the buttons on this banner.',
    OPTIONAL_STILL_GRANTED: 'The site’s consent record still lists optional cookies as allowed.',
    US_OPTOUT_NOT_FOUND: 'Under US state privacy laws this site sells, shares or uses your data for targeted ads until you opt out, and we couldn’t find its “Your Privacy Choices” / “Do Not Sell or Share” option. Your browser is sending the Global Privacy Control opt-out signal, which many US sites must honour.',
    OPTOUT_NOT_SAVED: 'We selected the opt-out on the site’s privacy settings page, but it wasn’t saved.',
    US_OPTOUT_NOT_SAVED: 'We switched off sale, sharing and targeted advertising in the site’s privacy choices, but the site still reports them as allowed.'
  };

  const METHOD = {
    reject_button: 'Clicked the reject button on the banner',
    settings_reject_all: 'Opened the settings and clicked “reject all” there',
    settings_all_off_saved: 'Opened the settings, switched every optional category off, then saved',
    translated_reject: 'Translated the buttons on your device, then clicked the reject option',
    us_optout: 'Opened the site’s “Your Privacy Choices” panel, switched everything off and saved',
    page_optout: 'Selected the “opt out” option on the site’s privacy settings page and saved it — only this once, so you can switch it back'
  };

  // Consent-record codes → everyday words. Items arrive as "reader:item" from the content script.
  const ITEM = {
    ad_storage: 'Advertising cookies', analytics_storage: 'Analytics cookies',
    ad_user_data: 'Sending your data to Google for ads', ad_personalization: 'Personalised ads',
    personalization_storage: 'Personalisation cookies', functionality_storage: 'Functionality cookies',
    C0002: 'Performance & analytics cookies', C0003: 'Functional cookies', C0004: 'Targeting & advertising cookies', C0005: 'Social media cookies',
    preferences: 'Preference cookies', statistics: 'Statistics cookies', marketing: 'Marketing cookies',
    'purpose 2': 'Functionality', 'purpose 3': 'Experience', 'purpose 4': 'Measurement (analytics)', 'purpose 5': 'Marketing',
    SSPD_BG: 'Sale or sharing of your personal data', SPD_BG: 'Sale of your personal data', STDF: 'Targeted advertising', 'SSPD': 'Sale or sharing of your personal data',
    sale: 'Sale of your personal information', sharing: 'Sharing of your personal information',
    'targeted advertising': 'Targeted advertising', 'sensitive data': 'Use of sensitive data'
  };
  function humanize(list) {
    const out = [];
    let tcf = 0;
    for (const raw of list || []) {
      const i = String(raw).indexOf(':');
      const item = (i >= 0 ? String(raw).slice(i + 1) : String(raw)).replace(/ \(us[a-z]*\)$/, '');
      if (/^Purpose \d+$/.test(item)) { tcf++; continue; }
      if (/^V2STACK|^STACK|^ISF|^ISP/i.test(item)) continue;
      const label = ITEM[item] || ITEM[item.toLowerCase()] || item.replace(/_/g, ' ');
      if (!out.includes(label)) out.push(label);
    }
    if (tcf) out.push(`${tcf} ad-industry (IAB TCF) purpose${tcf > 1 ? 's' : ''}`);
    return out;
  }

  /** Where a remembered "no" came from. */
  function originText(o) {
    if (!o) return 'It was already saved on this site before CookieShield handled it here — by you, by the site’s own settings, or by another tool.';
    const when = new Date(o.at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const how = o.clicks && o.clicks.length ? `clicked ${o.clicks.map(c => `“${c}”`).join(' → ')}` : (METHOD[o.method] || 'rejected the banner').replace(/^./, c => c.toLowerCase());
    return `CookieShield, on ${when}: ${how}${o.cmpName ? ` on the ${o.cmpName} banner` : ''}.`;
  }

  function langName(code) {
    if (!code || code === 'und') return null;
    try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); } catch (e) { return code; }
  }

  function timeAgo(iso) {
    const s = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24); if (d < 7) return `${d} d ago`;
    return new Date(iso).toLocaleDateString();
  }

  /** Bullet list of facts for a history entry / page status. */
  function details(e) {
    const out = [];
    if (e.status === 'REMEMBERED' || e.status === 'PREVIOUSLY_ACCEPTED') {
      if (e.status === 'REMEMBERED') out.push(['Where this “no” came from', originText(e.origin)]);
      const r = humanize(e.refused);
      if (r.length) out.push(['Refused', r.join(', ')]);
      const a = humanize(e.allowed);
      if (a.length) out.push(['Still allowed', a.join(', ')]);
      if (e.visits > 1) out.push(['Visits', `${e.visits} visits in the last 12 hours`]);
      if (e.evidence) out.push(['Proof', e.evidence]);
      return out;
    }
    if (e.cmpName) out.push(['Banner type', e.supported === false || e.cmpId === 'generic' ? 'Custom banner (recognised by its wording)' : e.cmpName]);
    if (e.method && METHOD[e.method]) out.push(['What we did', METHOD[e.method]]);
    if (e.clicks && e.clicks.length) out.push(['Buttons clicked', e.clicks.map(c => `“${c.label}”`).join(' → ')]);
    if (e.turnedOff && e.turnedOff.length) out.push(['Switched off', e.turnedOff.slice(0, 8).join(', ')]);
    if (e.usOptOut && e.usOptOut.length) out.push(['US privacy opt-out', `Turned off: ${e.usOptOut.join(', ').replace(/, ([^,]*)$/, ' and $1')}`]);
    if ((e.status === 'VERIFIED' || e.status === 'CLICKED') && e.refused && e.refused.length) out.push(['Refused', humanize(e.refused).join(', ')]);
    if (e.reason && REASON[e.reason]) out.push(['Why we stopped', REASON[e.reason]]);
    if (e.evidence) out.push(['Proof', e.evidence]);
    const ln = langName(e.bannerLang);
    if (ln && e.bannerLang !== 'en') out.push(['Banner language', ln]);
    if (e.translatedLabels && e.translatedLabels.length) out.push(['Translated on device', e.translatedLabels.map(t => `“${t.original}” = “${t.english}”`).join(', ')]);
    if (e.health && e.health.repairs && e.health.repairs.length) out.push(['Page fixes', e.health.repairs.join('; ')]);
    if (e.health && e.health.after && e.health.after.length) out.push(['Page check', `Problems remain: ${e.health.after.join(', ').toLowerCase().replace(/_/g, ' ')}`]);
    if (e.downgradedFrom) out.push(['Re-check', `First looked like “${e.downgradedFrom.toLowerCase()}”, but a check 5 seconds later disagreed.`]);
    return out;
  }

  window.CSExplain = { STATUS, REASON, METHOD, details, timeAgo, langName, humanize, originText };
})();
