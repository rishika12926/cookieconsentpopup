# CookieShield end-to-end report

Run: 2026-10-25T04:15:26.824Z · 57 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (56/56); 37 verified against the platform's own consent record, 14 clicked-only (no record available).

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
| optOutPage | 2 | 2 | 100% |
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
| platform | 25 | 25 | 100% |
| generic | 4 | 4 | 100% |
| exception | 5 | 5 | 100% |
| language | 22 | 22 | 100% |

## Priority 2 — never silently accept

| Metric | Value |
|---|---|
| Accept/agree buttons clicked by the extension | 0 |
| Silent optional-consent acceptances | 0 |
| False reports of successful rejection | 0 |
| Exceptions reported correctly | 5/5 |

## Priority 3 — don't break sites

**0** regressions per 100 handled visits (0 of 51). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit (and log it in History with origin + what was refused): pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control off by default, sent only when enabled: pass
- A toggle you switch back on yourself is left alone: pass
- Privacy settings pages (e.g. Amazon) are opted out once, then your own choice is left alone: pass
- Opt-out happens without the panel flashing, and a panel you open yourself is left alone: pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 809 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1502 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 832 | ✅ |
| onetrust-us-nobanner | VERIFIED | ✅ VERIFIED |  | rejected | 5034 | ✅ |
| onetrust-us-netflix | VERIFIED | ✅ VERIFIED |  | rejected | 4653 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 893 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1663 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 781 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 805 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 831 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 745 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1292 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 752 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1813 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5079 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 5030 | ✅ |
| amazon-privacyprefs | VERIFIED | ✅ VERIFIED |  | rejected | 997 | ✅ |
| settings-page-generic | VERIFIED | ✅ VERIFIED |  | rejected | 762 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 781 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 736 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 831 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 765 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 799 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 725 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 738 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 778 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 835 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 809 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 884 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 979 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 939 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 894 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 913 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 887 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 915 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 936 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 793 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 930 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 830 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1244 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1071 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1100 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 839 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1041 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1167 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1076 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1142 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1099 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1097 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1585 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5894 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 799 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 505 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 622 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 784 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 832 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
