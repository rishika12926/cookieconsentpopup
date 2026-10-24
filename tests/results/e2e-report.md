# CookieShield end-to-end report

Run: 2026-10-24T22:48:48.959Z · 53 fixtures · real Chromium with the extension loaded

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

- Remember choice on revisit: pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control sent (header + navigator): pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 826 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1462 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 767 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 808 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1472 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 733 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 703 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 727 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 760 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1138 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 774 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1786 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5031 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 4991 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 754 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 781 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 705 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 759 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 730 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 754 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 680 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 723 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 763 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 780 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 851 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 760 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 787 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 731 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 712 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 773 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 796 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 805 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 823 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 855 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 806 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1153 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1156 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1124 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 826 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1128 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1034 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1141 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1068 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1125 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1116 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1531 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5822 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 781 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 487 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 511 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 700 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 857 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
