/**
 * CookieShield — Rejection engine
 *
 * Policy (Priority 2): rejection is the only action. Accept-all, "OK", consent-or-pay and
 * ambiguous buttons are never clicked, whatever a rule says. If no verifiable rejection path
 * exists, we stop and report the exception instead of making the banner disappear.
 *
 * Outcome statuses:
 *   VERIFIED  – we rejected and the platform's own consent record confirms nothing optional is on
 *   CLICKED   – we clicked a reject-labelled button and the banner closed; no record to double-check
 *   NEEDS_YOU – we could not reject safely (accept-only, consent-or-pay, unrecognised, toggles stuck…)
 *   FAILED    – after our rejection the site STILL reports optional consent as granted
 */
(function () {
  'use strict';

  const D = () => window.CookieShieldDOM;
  const V = () => window.CookieShieldVerifier;
  const G = () => window.CookieShieldGeneric;
  const Det = () => window.CookieShieldDetector;

  const MAX_CLICKS = 4;

  function findRuleEl(selectors, scope) {
    for (const sel of selectors || []) {
      const local = D().deepQueryAll(sel, scope).find(e => D().isVisible(e));
      if (local) return local;
    }
    for (const sel of selectors || []) {
      const global = D().deepQueryAll(sel).find(e => D().isVisible(e));
      if (global) return global;
    }
    return null;
  }

  /** After a click: wait for the banner to close, then read the platform's consent record. */
  async function verifyAfter(container, rule, ctx) {
    const gone = await D().waitFor(() => V().bannerGone(container), 3000, 120);
    await D().wait(250);
    const state = await V().readState(rule && rule.state);
    ctx.evidence = state.summary || ctx.evidence;
    ctx.stateSources = state.sources.map(s => s.source);
    if (state.anyGranted) return { status: 'FAILED', reason: 'OPTIONAL_STILL_GRANTED', gone: !!gone, state };
    if (state.allDenied && gone) return { status: 'VERIFIED', gone: true, state };
    if (state.allDenied && !gone) return { status: 'PENDING', gone: false, state };
    if (gone) return { status: 'CLICKED', gone: true, state };
    return { status: 'PENDING', gone: false, state };
  }

  function record(ctx, el, kind) {
    ctx.clicks.push({ label: D().labelOf(el).slice(0, 60), kind });
  }

  function result(ctx, status, reason, method) {
    return {
      status,
      reason: reason || null,
      method: method || ctx.method || null,
      cmpId: ctx.cmpId,
      cmpName: ctx.cmpName,
      clicks: ctx.clicks,
      turnedOff: ctx.turnedOff,
      essentialKept: ctx.essentialKept,
      evidence: ctx.evidence || null,
      stateSources: ctx.stateSources || [],
      buttons: ctx.summary ? ctx.summary.buttons : [],
      bannerLang: ctx.bannerLang || null,
      translatedLabels: ctx.translatedLabels || null
    };
  }

  async function clickAndVerify(el, kind, container, rule, ctx) {
    if (ctx.clicks.length >= MAX_CLICKS) return { status: 'PENDING' };
    if (!D().safeClick(el)) return { status: 'PENDING' };
    record(ctx, el, kind);
    ctx.decisiveClicks = (ctx.decisiveClicks || 0) + 1;
    // Inside a CMP iframe the frame usually disappears right after the click and the consent
    // record lives in the top page — so the top frame does the verification.
    if (window.top !== window) return { status: 'FRAME_CLICKED' };
    return verifyAfter(container, rule, ctx);
  }

  /** Find the preference-centre root after clicking "settings". */
  async function findPreferenceRoot(rule, oldContainer) {
    await D().wait(500);
    return await D().waitFor(() => {
      if (rule) {
        const el = Det().firstVisible(rule.container);
        if (el) return el;
      }
      if (oldContainer && D().isVisible(oldContainer)) return oldContainer;
      const g = Det().detectGeneric();
      return g ? g.container : null;
    }, 2500, 150);
  }

  /**
   * Main entry. `det` = {kind, rule, container}
   */
  async function handle(det) {
    const rule = det.rule || null;
    const ctx = {
      cmpId: rule ? rule.id : 'generic',
      cmpName: rule ? rule.name : 'Custom banner',
      clicks: [], turnedOff: [], essentialKept: [], evidence: null, method: null
    };
    let container = det.container;

    const text = (container.innerText || container.textContent || '').slice(0, 2000);
    ctx.bannerLang = await G().detectLanguage(text);

    let items = G().inventory(container);
    ctx.summary = G().summarize(items);

    // ---- Step 1: first-layer reject ------------------------------------------------
    let rejectEl = null;
    if (rule) {
      const r = findRuleEl(rule.reject, container);
      if (r && V().canClick(r, 'REJECT', { fromRule: true }).ok && !D().navigatesAway(r)) rejectEl = r;
    }
    if (!rejectEl) {
      const p = G().pickReject(items);
      if (p && V().canClick(p.el, 'REJECT').ok) rejectEl = p.el;
    }

    // Consent-or-pay wall: there is a pay route and no free reject. Never accept, never hide.
    if (!rejectEl && ctx.summary.hasPay) {
      return result(ctx, 'NEEDS_YOU', 'CONSENT_OR_PAY');
    }

    if (rejectEl) {
      ctx.method = 'reject_button';
      let v = await clickAndVerify(rejectEl, 'reject', container, rule, ctx);
      // Some banners ask "Are you sure?" or show a 2nd layer – handle one follow-up reject.
      if (v.status === 'PENDING' && D().isVisible(container)) {
        const follow = G().pickReject(G().inventory(container));
        if (follow && follow.el !== rejectEl && V().canClick(follow.el, 'REJECT').ok) {
          v = await clickAndVerify(follow.el, 'reject (confirm)', container, rule, ctx);
        }
      }
      if (v.status === 'VERIFIED' || v.status === 'CLICKED' || v.status === 'FRAME_CLICKED') return result(ctx, v.status);
      if (v.status === 'FAILED') return result(ctx, 'FAILED', v.reason);
      // Still visible → fall through to the preference centre route.
      items = G().inventory(container);
    }

    // ---- Step 2: preference centre --------------------------------------------------
    let settingsEl = null;
    if (rule) {
      const s = findRuleEl(rule.settings, container);
      if (s && V().canClick(s, 'SETTINGS', { fromRule: true }).ok && !D().navigatesAway(s)) settingsEl = s;
    }
    if (!settingsEl) {
      const p = G().pickByType(items, 'SETTINGS');
      if (p) settingsEl = p.el;
    }

    if (settingsEl && ctx.clicks.length < MAX_CLICKS) {
      D().safeClick(settingsEl);
      record(ctx, settingsEl, 'open settings');
      const pc = await findPreferenceRoot(rule, container);
      if (pc) {
        container = pc;
        const pcItems = G().inventory(pc);

        // 2a. "Reject all" inside the preference centre
        let pcReject = null;
        if (rule) {
          const r = findRuleEl(rule.settingsReject, pc);
          if (r && V().canClick(r, 'REJECT', { fromRule: true }).ok) pcReject = r;
        }
        if (!pcReject) {
          const p = G().pickReject(pcItems);
          if (p && V().canClick(p.el, 'REJECT').ok) pcReject = p.el;
        }
        if (pcReject) {
          ctx.method = 'settings_reject_all';
          const v = await clickAndVerify(pcReject, 'reject all (settings)', pc, rule, ctx);
          if (v.status === 'VERIFIED' || v.status === 'CLICKED' || v.status === 'FRAME_CLICKED') return result(ctx, v.status);
          if (v.status === 'FAILED') return result(ctx, 'FAILED', v.reason);
        }

        // 2b. Turn every optional category off, re-check, then save.
        if (D().isVisible(pc)) {
          const t = await V().deselectOptional(pc, rule && rule.toggles);
          ctx.turnedOff = t.turnedOff;
          ctx.essentialKept = t.essential;
          if (t.stillOn.length) {
            ctx.evidence = `Could not switch off: ${t.stillOn.slice(0, 4).join('; ')}`;
            return result(ctx, 'NEEDS_YOU', 'TOGGLES_STUCK', 'settings_deselect');
          }
          if (t.total > 0) {
            let saveEl = null;
            if (rule) {
              const s = findRuleEl(rule.save, pc);
              if (s && V().canClick(s, 'SAVE', { fromRule: true }).ok) saveEl = s;
            }
            if (!saveEl) {
              const p = G().pickByType(G().inventory(pc), 'SAVE');
              if (p && V().canClick(p.el, 'SAVE').ok) saveEl = p.el;
            }
            if (saveEl) {
              ctx.method = 'settings_all_off_saved';
              const v = await clickAndVerify(saveEl, 'save (all optional off)', pc, rule, ctx);
              if (v.status === 'VERIFIED' || v.status === 'CLICKED' || v.status === 'FRAME_CLICKED') return result(ctx, v.status);
              if (v.status === 'FAILED') return result(ctx, 'FAILED', v.reason);
            }
          }
        }
      }
    }

    // ---- Step 3: translation-assisted fallback (unknown language) ---------------------
    if (ctx.summary.allUnknown && D().isVisible(det.container)) {
      const pick = await G().translatedReject(G().inventory(det.container), ctx.bannerLang);
      if (pick && V().canClick(pick.el, 'REJECT', { fromRule: true }).ok) {
        ctx.method = 'translated_reject';
        ctx.translatedLabels = [{ original: pick.label, english: pick.translated }];
        const v = await clickAndVerify(pick.el, `reject (translated: "${pick.translated}")`, det.container, rule, ctx);
        if (v.status === 'VERIFIED' || v.status === 'CLICKED' || v.status === 'FRAME_CLICKED') return result(ctx, v.status);
        if (v.status === 'FAILED') return result(ctx, 'FAILED', v.reason);
      }
    }

    // ---- Nothing safe worked → exception, never accept --------------------------------
    let reason = 'NO_REJECT_OPTION';
    if (ctx.summary.hasPay) reason = 'CONSENT_OR_PAY';
    else if (ctx.decisiveClicks) reason = 'REJECT_NOT_CONFIRMED';
    else if (ctx.summary.hasAccept && !ctx.summary.hasReject) reason = 'ACCEPT_ONLY';
    else if (ctx.summary.allUnknown) reason = 'UNRECOGNIZED_LANGUAGE_OR_LAYOUT';
    return result(ctx, 'NEEDS_YOU', reason);
  }

  window.CookieShieldEngine = { handle, verifyAfter };
})();
