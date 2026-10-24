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
      say: 'No banner today — your earlier rejection is still in effect here.',
      what: 'This site remembered the rejection from a previous visit, so it didn’t ask again. We checked its consent record.',
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
      icon: 'i', tone: 'warn', label: 'Earlier “accept” stored',
      headline: 'This site remembers an “accept”',
      mood: 'thinking',
      say: 'This site has an older “accept” saved — maybe from before you installed me.',
      what: 'The site’s consent record shows optional cookies were accepted in the past. We never change an existing choice by ourselves.',
      kept: 'To change it, open the site’s cookie settings (often linked in the footer), or clear this site’s cookies and reload.'
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
    US_OPTOUT_NOT_SAVED: 'We switched off sale, sharing and targeted advertising in the site’s privacy choices, but the site still reports them as allowed.'
  };

  const METHOD = {
    reject_button: 'Clicked the reject button on the banner',
    settings_reject_all: 'Opened the settings and clicked “reject all” there',
    settings_all_off_saved: 'Opened the settings, switched every optional category off, then saved',
    translated_reject: 'Translated the buttons on your device, then clicked the reject option',
    us_optout: 'Opened the site’s “Your Privacy Choices” panel, switched everything off and saved'
  };

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
    if (e.cmpName) out.push(['Banner type', e.supported === false || e.cmpId === 'generic' ? 'Custom banner (recognised by its wording)' : e.cmpName]);
    if (e.method && METHOD[e.method]) out.push(['What we did', METHOD[e.method]]);
    if (e.clicks && e.clicks.length) out.push(['Buttons clicked', e.clicks.map(c => `“${c.label}”`).join(' → ')]);
    if (e.turnedOff && e.turnedOff.length) out.push(['Switched off', e.turnedOff.slice(0, 8).join(', ')]);
    if (e.usOptOut && e.usOptOut.length) out.push(['US privacy opt-out', `Turned off: ${e.usOptOut.join(', ').replace(/, ([^,]*)$/, ' and $1')} of your personal information`]);
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

  window.CSExplain = { STATUS, REASON, METHOD, details, timeAgo, langName };
})();
