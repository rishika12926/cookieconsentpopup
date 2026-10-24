# CookieShield end-to-end report

Run: 2026-10-24T22:39:16.775Z · 7 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (6/6); 5 verified against the platform's own consent record, 0 clicked-only (no record available).

| Platform | Correct | Total | % |
|---|---|---|---|
| onetrust | 1 | 1 | 100% |
| iubenda | 1 | 1 | 100% |
| iubendaUS | 4 | 4 | 100% |

| Fixture group | Correct | Total | % |
|---|---|---|---|
| platform | 5 | 5 | 100% |
| exception | 1 | 1 | 100% |

## Priority 2 — never silently accept

| Metric | Value |
|---|---|
| Accept/agree buttons clicked by the extension | 0 |
| Silent optional-consent acceptances | 0 |
| False reports of successful rejection | 0 |
| Exceptions reported correctly | 1/1 |

## Priority 3 — don't break sites

**0** regressions per 100 handled visits (0 of 5). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


## Extra scenarios

- Remember choice on revisit: pass (REMEMBERED)
- Per-site pause leaves banner alone (and sends no GPC): pass (PAUSED)
- Global Privacy Control sent (header + navigator): pass


## All fixtures

| Fixture | Expected | Got | Reason | Truth | ms | P3 |
|---|---|---|---|---|---|---|
| onetrust-us-optout | VERIFIED | ✅ VERIFIED |  | rejected | 729 | ✅ |
| iubenda | VERIFIED | ✅ VERIFIED |  | rejected | 762 | ✅ |
| iubenda-us | VERIFIED | ✅ VERIFIED |  | rejected | 1838 | ✅ |
| iubenda-us-revisit | VERIFIED | ✅ VERIFIED |  | rejected | 5014 | ✅ |
| iubenda-us-hidden | VERIFIED | ✅ VERIFIED |  | rejected | 4998 | ✅ |
| us-no-optout-link | NEEDS_YOU | ✅ NEEDS_YOU | US_OPTOUT_NOT_FOUND | granted | 754 | – |
| newsletter | NO_BANNER | ✅ NO_BANNER |  | undecided |  | ✅ |
