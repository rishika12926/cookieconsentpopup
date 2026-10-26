# CookieShield end-to-end report

Run: 2026-10-26T01:43:11.160Z · 59 fixtures · real Chromium with the extension loaded

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
- Opt-out happens without the panel flashing, and a panel you open yourself is left alone: pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 872 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1540 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 834 | ✅ |
| onetrust-us-nobanner | VERIFIED | ✅ VERIFIED |  | rejected | 5134 | ✅ |
| onetrust-us-netflix | VERIFIED | ✅ VERIFIED |  | rejected | 4791 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 861 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1655 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 948 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 913 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 797 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 895 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1535 | ✅ |
| tealium-stepstone | VERIFIED | ✅ VERIFIED |  | rejected | 1407 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 816 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1907 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5271 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 5235 | ✅ |
| amazon-privacyprefs | VERIFIED | ✅ VERIFIED |  | rejected | 1000 | ✅ |
| settings-page-generic | VERIFIED | ✅ VERIFIED |  | rejected | 1081 | ✅ |
| settings-or-reject | VERIFIED | ✅ VERIFIED |  | rejected | 4888 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 856 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 890 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 859 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 859 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 848 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 856 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 892 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 829 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 801 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 887 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 882 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 988 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 921 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 893 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 907 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 912 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1070 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1011 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1037 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1044 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1141 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1201 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1379 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1246 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 949 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1314 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1343 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1259 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1324 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1335 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1252 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1701 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5922 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 902 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 674 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 625 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 945 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 906 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
