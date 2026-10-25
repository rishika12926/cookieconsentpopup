# CookieShield end-to-end report

Run: 2026-10-25T03:16:56.987Z · 54 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (53/53); 34 verified against the platform's own consent record, 14 clicked-only (no record available).

| Platform | Correct | Total | % |
|---|---|---|---|
| onetrust | 3 | 3 | 100% |
| onetrustUS | 1 | 1 | 100% |
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
| platform | 23 | 23 | 100% |
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

**0** regressions per 100 handled visits (0 of 48). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit (and log it in History with origin + what was refused): pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control off by default, sent only when enabled: pass
- A toggle you switch back on yourself is left alone: pass
- Opt-out happens without the panel flashing, and a panel you open yourself is left alone: pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust | VERIFIED | ✅ VERIFIED |  | rejected | 808 | ✅ |
| onetrust-settings | VERIFIED | ✅ VERIFIED |  | rejected | 1400 | ✅ |
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 715 | ✅ |
| onetrust-us-nobanner | VERIFIED | ✅ VERIFIED |  | rejected | 5012 | ✅ |
| cookiebot | VERIFIED | ✅ VERIFIED |  | rejected | 743 | ✅ |
| cookiebot-customize | VERIFIED | ✅ VERIFIED |  | rejected | 1445 | ✅ |
| didomi | VERIFIED | ✅ VERIFIED |  | rejected | 804 | ✅ |
| usercentrics | VERIFIED | ✅ VERIFIED |  | rejected | 720 | ✅ |
| quantcast | VERIFIED | ✅ VERIFIED |  | rejected | 720 | ✅ |
| googlefc | VERIFIED | ✅ VERIFIED |  | rejected | 792 | ✅ |
| sourcepoint | VERIFIED | ✅ VERIFIED |  | rejected | 1149 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 713 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1762 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5084 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 5029 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 853 | – |
| klaro | VERIFIED | ✅ VERIFIED |  | rejected | 771 | ✅ |
| osano | VERIFIED | ✅ VERIFIED |  | rejected | 766 | ✅ |
| complianz | VERIFIED | ✅ VERIFIED |  | rejected | 749 | ✅ |
| cookieyes | VERIFIED | ✅ VERIFIED |  | rejected | 828 | ✅ |
| trustarc | VERIFIED | ✅ VERIFIED |  | rejected | 652 | ✅ |
| shopify | VERIFIED | ✅ VERIFIED |  | rejected | 725 | ✅ |
| hubspot | CLICKED | ✅ CLICKED |  | rejected | 706 | ✅ |
| cookienotice | CLICKED | ✅ CLICKED |  | rejected | 708 | ✅ |
| custom-en | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 783 | ✅ |
| custom-de | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 819 | ✅ |
| custom-fr | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 859 | ✅ |
| custom-es | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 783 | ✅ |
| custom-it | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 776 | ✅ |
| custom-nl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 852 | ✅ |
| custom-pt | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 859 | ✅ |
| custom-pl | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 799 | ✅ |
| custom-sv | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 915 | ✅ |
| custom-fi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 842 | ✅ |
| custom-cs | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 847 | ✅ |
| custom-hu | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 749 | ✅ |
| custom-el | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1016 | ✅ |
| custom-ru | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1095 | ✅ |
| custom-uk | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1073 | ✅ |
| custom-tr | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 898 | ✅ |
| custom-ja | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1107 | ✅ |
| custom-zh | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1194 | ✅ |
| custom-ko | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1166 | ✅ |
| custom-ar | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1138 | ✅ |
| custom-he | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1028 | ✅ |
| custom-hi | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 1013 | ✅ |
| custom-settings | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 1535 | ✅ |
| late-banner | VERIFIED/CLICKED | ✅ CLICKED |  | rejected | 5819 | ✅ |
| leftover-lock | VERIFIED/CLICKED | ✅ VERIFIED |  | rejected | 742 | ✅ |
| accept-only | NEEDS_YOU | ✅ NEEDS_YOU | ACCEPT_ONLY | undecided | 497 | – |
| pay-wall | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 548 | – |
| sourcepoint-pay | NEEDS_YOU | ✅ NEEDS_YOU | CONSENT_OR_PAY | undecided | 677 | – |
| mislabeled | FAILED | ✅ FAILED | OPTIONAL_STILL_GRANTED | granted | 782 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
