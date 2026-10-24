# CookieShield end-to-end report

Run: 2026-10-24T22:32:01.008Z · 52 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (51/51); 32 verified against the platform's own consent record, 14 clicked-only (no record available).

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
| iubendaUS | 3 | 3 | 100% |
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
| platform | 21 | 21 | 100% |
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

**0** regressions per 100 handled visits (0 of 46). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit: pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control sent (header + navigator): pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 848 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1449 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 761 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 727 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1440 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 911 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 777 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 735 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 721 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1118 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 732 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1784 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5057 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 802 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 818 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 744 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 785 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 813 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 856 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 833 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 699 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 785 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 730 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 767 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 887 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 788 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 881 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 877 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 798 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 869 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 915 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 862 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 913 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 956 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 956 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1202 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1024 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 884 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1187 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1043 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1404 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1392 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1058 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1128 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1453 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5846 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 901 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 650 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 568 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 720 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 782 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
