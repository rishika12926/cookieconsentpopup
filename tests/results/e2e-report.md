# CookieShield end-to-end report

Run: 2026-10-25T02:27:35.588Z · 53 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (52/52); 33 verified against the platform's own consent record, 14 clicked-only (no record available).

| Platform | Correct | Total | % |
|---|---|---|---|
| onetrust | 3 | 3 | 100% |
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
| platform | 22 | 22 | 100% |
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

**0** regressions per 100 handled visits (0 of 47). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit (and log it in History with origin + what was refused): pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control sent (header + navigator): pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 736 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1481 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 735 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 818 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1493 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 844 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 666 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 759 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 789 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1138 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 817 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1767 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5191 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 5052 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 837 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 941 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 726 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 782 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 859 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 736 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 832 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 750 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 714 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 817 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 909 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 800 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 789 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 764 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 892 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 800 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 827 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 800 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 881 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 854 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 817 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1184 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1085 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1102 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 877 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1381 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1237 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1123 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1127 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1022 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1076 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1529 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5840 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 830 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 501 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 610 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 631 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 794 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
