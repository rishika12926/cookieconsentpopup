# CookieShield end-to-end report

Run: 2026-10-24T21:51:07.653Z · 49 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (48/48); 30 verified against the platform's own consent record, 14 clicked-only (no record available).

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
| platform | 19 | 19 | 100% |
| language | 22 | 22 | 100% |
| generic | 3 | 3 | 100% |
| exception | 4 | 4 | 100% |

## Priority 2 — never silently accept

| Metric | Value |
|---|---|
| Accept/agree buttons clicked by the extension | 0 |
| Silent optional-consent acceptances | 0 |
| False reports of successful rejection | 0 |
| Exceptions reported correctly | 4/4 |

## Priority 3 — don't break sites

**0** regressions per 100 handled visits (0 of 44). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit: pass (REMEMBERED)
- Per-site pause leaves banner alone: pass (PAUSED)


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 804 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1571 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 745 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 845 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1537 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 884 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 769 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 785 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 798 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1148 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 835 | ✅ |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 736 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 815 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 784 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 726 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 778 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 761 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 757 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 756 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 744 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 774 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 808 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 825 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 788 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 825 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 844 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 875 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 899 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 848 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 884 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 863 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1220 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1170 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1144 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 822 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1178 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 997 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1155 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1051 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1093 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1081 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1550 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5806 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 762 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 541 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 460 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 706 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 843 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
