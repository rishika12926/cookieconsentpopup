# CookieShield end-to-end report

Run: 2026-10-26T02:46:31.469Z · 59 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (58/58); 39 verified against the platform's own consent record, 14 clicked-only (no record available).

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
| tealium | 1 | 1 | 100% |
| iubenda | 1 | 1 | 100% |
| iubendaUS | 4 | 4 | 100% |
| optOutPage | 2 | 2 | 100% |
| stepstone | 1 | 1 | 100% |
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
| platform | 26 | 26 | 100% |
| generic | 5 | 5 | 100% |
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

**0** regressions per 100 handled visits (0 of 53). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit (and log it in History with origin + what was refused): pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control off by default, sent only when enabled: pass
- A toggle you switch back on yourself is left alone: pass
- Privacy settings pages (e.g. Amazon) are opted out once, then your own choice is left alone: pass
- Anonymous statistics: counts only by default; website names only after opting in; nothing after opting out; no URLs, paths, query strings or IDs: pass
- Opt-out happens without the panel flashing, and a panel you open yourself is left alone: pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 997 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1672 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 874 | ✅ |
| onetrust-us-nobanner | VERIFIED | ✅ VERIFIED |  | rejected | 5150 | ✅ |
| onetrust-us-netflix | VERIFIED | ✅ VERIFIED |  | rejected | 4795 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 894 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1657 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 986 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 882 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 940 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 947 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1395 | ✅ |
| tealium-stepstone | VERIFIED | ✅ VERIFIED |  | rejected | 1526 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 927 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1977 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5230 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 5260 | ✅ |
| amazon-privacyprefs | VERIFIED | ✅ VERIFIED |  | rejected | 925 | ✅ |
| settings-page-generic | VERIFIED | ✅ VERIFIED |  | rejected | 1348 | ✅ |
| settings-or-reject | VERIFIED | ✅ VERIFIED |  | rejected | 4804 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 1056 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 1019 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 1018 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 850 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 1046 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 962 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 930 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 1000 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 994 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 918 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1032 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 901 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 966 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 933 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 906 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 996 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 928 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 946 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 930 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1072 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1001 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1270 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1403 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1231 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1093 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1309 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1272 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1356 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1340 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1352 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1454 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1709 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 6018 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 909 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 594 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 634 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 949 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 982 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
