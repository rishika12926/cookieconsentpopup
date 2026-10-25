/**
 * CookieShield — Privacy settings pages (e.g. amazon.com/privacyprefs "Your Ads Privacy Choices")
 *
 * Some sites have no cookie banner at all. Instead they offer a settings page with an
 * "Allow …" / "Opt out of …" choice, saved on their own servers. Policy, as the person asked:
 *   • the FIRST time CookieShield sees such a page on a site, it selects the opt-out and saves;
 *   • after that it never touches the page again, so switching back to "Allow" sticks.
 * Saving usually reloads the page, so the opt-out is marked "pending" before clicking Save and
 * confirmed on the reloaded page (the opt-out must still be selected there).
 *
 * Known pages come from rules/cmp-rules.json → "optOutPages" (data only). Other pages are
 * recognised only when the wording is unambiguous: a 2–3 option radio group with one "Allow …"
 * and one "Opt out of … / Do not sell or share …" option, about ads / selling / sharing, plus a
 * Save button. Accept-style buttons are never clicked.
 */
(function () {
  'use strict';

  const D = () => window.CookieShieldDOM;
  const L = () => window.CookieShieldLexicon;
  const V = () => window.CookieShieldVerifier;

  const OPT_OUT_RE = /^\s*(opt[\s-]?out|do not (sell|share)|don.?t (sell|share)|turn off (personali[sz]ed|targeted|interest)|limit (the )?use)/i;
  const ALLOW_RE = /^\s*(allow|opt[\s-]?in|yes\b|turn on|enable|personali[sz]ed)/i;
  const CONTEXT_RE = /advertis|\bads?\b|\bsell\b|\bsale\b|\bshare\b|sharing|personal (information|data)|cross[\s-]context|targeted|interest[\s-]based/i;

  function textOf(input) {
    const root = input.getRootNode();
    const l = (input.id && root.querySelector && root.querySelector(`label[for="${CSS.escape(input.id)}"]`)) || input.closest('label');
    return ((l && l.textContent) || input.getAttribute('aria-label') || input.value || '').replace(/\s+/g, ' ').trim();
  }

  function labelEl(input) {
    const root = input.getRootNode();
    return (input.id && root.querySelector && root.querySelector(`label[for="${CSS.escape(input.id)}"]`)) || input.closest('label') || input;
  }

  function findSave(scope, selectors) {
    for (const sel of selectors || []) {
      const el = scope.querySelector(sel) || document.querySelector(sel);
      if (el) return el;
    }
    const cands = Array.from(scope.querySelectorAll('button, input[type="submit"], [role="button"]'));
    return cands.find(b => L().classify(D().labelOf(b) || b.value || '').type === 'SAVE') || null;
  }

  /** Which opt-out choice is on this page, if any. */
  function findTarget(pageRules) {
    for (const r of pageRules || []) {
      if (r.path && !new RegExp(r.path).test(location.pathname)) continue;
      const inputs = Array.from(document.querySelectorAll(r.group));
      if (inputs.length < 2) continue;
      const optOut = inputs.find(i => i.value === r.optOutValue);
      if (!optOut) continue;
      const scope = optOut.closest('form') || document;
      return { key: r.id, name: r.name, label: r.label, inputs, optOut, save: findSave(scope, r.save), confirm: r.confirm || [], tested: !!r.tested };
    }
    // Generic, strict: one radio group that clearly reads Allow … / Opt out of …
    const byName = new Map();
    for (const i of document.querySelectorAll('input[type="radio"][name]')) {
      if (!byName.has(i.name)) byName.set(i.name, []);
      byName.get(i.name).push(i);
    }
    for (const [name, inputs] of byName) {
      if (inputs.length < 2 || inputs.length > 3) continue;
      const optOut = inputs.find(i => OPT_OUT_RE.test(textOf(i)));
      const allow = inputs.find(i => i !== optOut && ALLOW_RE.test(textOf(i)));
      if (!optOut || !allow) continue;
      if (inputs.some(i => i !== optOut && i !== allow && !ALLOW_RE.test(textOf(i)) && !OPT_OUT_RE.test(textOf(i)))) continue;
      const scope = optOut.closest('form') || optOut.closest('fieldset, section') || document;
      const ctxText = `${textOf(optOut)} ${textOf(allow)} ${(scope.innerText || '').slice(0, 1500)}`;
      if (!CONTEXT_RE.test(ctxText)) continue;
      const save = findSave(scope);
      if (!save) continue;
      const label = textOf(optOut).replace(OPT_OUT_RE, '').replace(/^\s*(of|from)\s+/i, '').trim() || 'personalised ads';
      return { key: `page:${location.pathname}:${name}`, name: `${location.hostname.replace(/^www\./, '')} privacy settings`, label, inputs, optOut, save, confirm: [], tested: false };
    }
    return null;
  }

  function confirmationText(t) {
    for (const sel of t.confirm || []) {
      const el = document.querySelector(sel);
      if (el && D().isVisible(el) && el.innerText.trim()) return el.innerText.trim().slice(0, 120);
    }
    return null;
  }

  /**
   * Returns null (no settings page here), or
   *   {kind:'left-alone', status, evidence, refused, allowed}  — already decided earlier
   *   an outcome object {status: VERIFIED|FAILED|NEEDS_YOU, …}   — we opted out (or tried)
   *   {kind:'reloading'}                                        — Save is reloading the page
   */
  async function run({ memory, pageRules, send, onFound }) {
    // Settings forms are often drawn a moment after the page loads: look for up to ~3 s.
    let t = null;
    for (let i = 0; i < 12 && !(t = findTarget(pageRules)); i++) await D().wait(250);
    if (!t) return null;
    if (onFound) onFound(t);
    const mem = (memory && memory.pageOptOuts && memory.pageOptOuts[t.key]) || null;
    const current = t.inputs.find(i => i.checked) || null;
    const isOff = current === t.optOut;
    const curText = current ? textOf(current) : 'nothing selected';
    const optText = textOf(t.optOut);
    const base = {
      cmpId: t.key, cmpName: t.name, method: 'page_optout', clicks: [], turnedOff: [], essentialKept: [],
      usOptOut: [t.label], supported: !!t.tested, buttons: []
    };

    // Back after our own Save reloaded the page: confirm.
    if (mem && mem.pending) {
      const msg = confirmationText(t);
      await send('PAGE_OPTOUT_DONE', { key: t.key, ok: isOff });
      return {
        ...base, clicks: mem.clicks || [],
        status: isOff ? 'VERIFIED' : 'FAILED', reason: isOff ? null : 'OPTOUT_NOT_SAVED',
        evidence: isOff ? `After saving, the page shows “${optText}” selected${msg ? ` and says “${msg}”` : ''}.` : `After saving, the page still shows “${curText}”.`,
        refused: isOff ? [t.label] : null
      };
    }

    // Decided before (by CookieShield once, or by you since): never touch it again.
    if (mem || isOff) {
      if (!mem) await send('PAGE_OPTOUT_DONE', { key: t.key, ok: true, already: true });
      return {
        kind: 'left-alone', status: isOff ? 'REMEMBERED' : 'PREVIOUSLY_ACCEPTED',
        evidence: `${t.name}: “${curText}” is selected.`,
        refused: isOff ? [t.label] : [], allowed: isOff ? [] : [t.label]
      };
    }

    // First visit: select the opt-out and save.
    if (!t.save || !V().canClick(t.save, 'SAVE', { fromRule: t.tested }).ok) {
      return { ...base, status: 'NEEDS_YOU', reason: 'OPTOUT_NOT_SAVED', evidence: `Found “${optText}”, but no safe Save button.` };
    }
    const lbl = labelEl(t.optOut);
    D().safeClick(lbl);
    await D().wait(120);
    if (!t.optOut.checked) { t.optOut.click(); await D().wait(120); }
    if (!t.optOut.checked) return { ...base, status: 'NEEDS_YOU', reason: 'OPTOUT_NOT_SAVED', evidence: `Couldn’t select “${optText}”.` };
    const saveLabel = (D().labelOf(t.save) || t.save.value || 'Save').trim().slice(0, 40);
    const clicks = [{ label: optText.slice(0, 60), kind: 'select opt-out' }, { label: saveLabel, kind: 'save' }];
    await send('PAGE_OPTOUT_PENDING', { key: t.key, clicks });   // before the page reloads
    D().safeClick(t.save);

    // Saved in place (no reload)? Confirm here. If the page reloads, this script ends and the
    // next page load confirms instead.
    await D().wait(2500);
    const msg = confirmationText(t);
    const ok = t.optOut.isConnected && t.optOut.checked;
    await send('PAGE_OPTOUT_DONE', { key: t.key, ok });
    return {
      ...base, clicks, status: ok ? 'VERIFIED' : 'FAILED', reason: ok ? null : 'OPTOUT_NOT_SAVED',
      evidence: ok ? `The page shows “${optText}” selected after saving${msg ? ` and says “${msg}”` : ''}.` : 'After saving, the opt-out was no longer selected.',
      refused: ok ? [t.label] : null
    };
  }

  window.CookieShieldOptOutPages = { run, findTarget };
})();
