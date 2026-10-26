# CookieShield end-to-end report

Run: 2026-10-26T01:23:01.855Z · 1 fixtures · real Chromium with the extension loaded

## Priority 1 — coverage

**100%** of banners handled correctly (1/1); 1 verified against the platform's own consent record, 0 clicked-only (no record available).

| Platform | Correct | Total | % |
|---|---|---|---|
| tealium | 1 | 1 | 100% |

| Fixture group | Correct | Total | % |
|---|---|---|---|
| platform | 1 | 1 | 100% |

## Priority 2 — never silently accept

| Metric | Value |
|---|---|
| Accept/agree buttons clicked by the extension | 0 |
| Silent optional-consent acceptances | 0 |
| False reports of successful rejection | 0 |
| Exceptions reported correctly | 0/0 |

## Priority 3 — don't break sites

**0** regressions per 100 handled visits (0 of 1). Checks after handling: scrolling, form submit, sign-in survives reload, SPA navigation, link navigation.


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
| tealium-stepstone | VERIFIED | ✅ VERIFIED |  | rejected | 1492 | ✅ |
