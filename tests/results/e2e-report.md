# CookieShield end-to-end report

Run: 2026-10-25T03:39:18.472Z · 55 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (54/54); 35 verified against the platform's own consent record, 14 clicked-only (no record available).

| Platform | Correct | Total | % |
|---|---|---|---|
| onetrust | 3 | 3 | 100% |
| onetrustUS | 2 | 2 | 100% |
| cookiebot | 2 | 2 | 100% |
| didomi | 1 | 1 | 100% |
| usercentrics | 1 | 1 | 100% |
| quantcast | 1 | 1 | 100% |
| googlefc | 1 | 1 | 100% |
| sourcepoint | 2 | 2 | 100% |
| iubenda | 1 | 1 | 100% |
| iubendaUS | 4 | 4 | 100% |
| klaro | 1 | 1 | 100% |
| osano | 1 | 1 | 100% |
| complianz | 1 | 1 | 100% |
| cookieyes | 1 | 1 | 100% |
| trustarc | 1 | 1 | 100% |
| shopify | 1 | 1 | 100% |
| hubspot | 1 | 1 | 100% |
| cookienotice | 1 | 1 | 100% |
| custom | 26 | 26 | 100% |
| acceptOnly | 1 | 1 | 100% |
| payWall | 1 | 1 | 100% |

| Fixture group | Correct | Total | % |
|---|---|---|---|
| platform | 24 | 24 | 100% |
| exception | 5 | 5 | 100% |
| language | 22 | 22 | 100% |
| generic | 3 | 3 | 100% |

## Priority 2 — never silently accept

| Metric | Value |
|---|---|
| Accept/agree buttons clicked by the extension | 0 |
| Silent optional-consent acceptances | 0 |
| False reports of successful rejection | 0 |
| Exceptions reported correctly | 5/5 |

## Priority 3 — don't break sites

**0** regressions per 100 handled visits (0 of 49). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit (and log it in History with origin + what was refused): pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control off by default, sent only when enabled: pass
- A toggle you switch back on yourself is left alone: pass
- Opt-out happens without the panel flashing, and a panel you open yourself is left alone: pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 836 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1571 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 736 | ✅ |
| onetrust-us-nobanner | VERIFIED | ✅ VERIFIED |  | rejected | 5105 | ✅ |
| onetrust-us-netflix | VERIFIED | ✅ VERIFIED |  | rejected | 4632 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 752 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1473 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 783 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 704 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 808 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 800 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1147 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 721 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1791 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5076 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 5015 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 815 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 773 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 812 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 759 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 713 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 735 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 723 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 704 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 703 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 766 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 842 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 799 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 735 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 734 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 817 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 807 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 863 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 768 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 798 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 773 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 814 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1132 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1169 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1219 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 904 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1178 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1159 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 994 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1024 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1056 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1120 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1534 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5839 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 818 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 528 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 512 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 710 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 790 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
