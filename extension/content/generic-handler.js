/**
 * CookieShield — Button inventory & pickers
 * Builds a classified inventory of every clickable in a banner and picks the best
 * reject / settings / save candidates. Also provides a translation-assisted fallback for
 * languages the built-in lexicon doesn't cover (uses Chrome's on-device Translator API).
 */
(function () {
  'use strict';

  const D = () => window.CookieShieldDOM;
  const L = () => window.CookieShieldLexicon;

  /** [{el, label, type, matched, navigates}] */
  function inventory(container) {
    return D().clickablesIn(container).map(el => {
      const label = D().labelOf(el);
      const c = L().classify(label);
      return { el, label, type: c.type, matched: c.matched, navigates: D().navigatesAway(el) };
    }).filter(b => b.label);
  }

  /** Prefer "reject all" over a bare "reject"; never pick links that leave the page. */
  function pickReject(items) {
    const rejects = items.filter(b => b.type === 'REJECT' && !b.navigates);
    if (!rejects.length) return null;
    const score = (b) => {
      const l = L().normalize(b.label);
      let s = 0;
      if (/\ball\b|alle|tout|todo|tutto|todos|wszystk|kaikki|alla|vse|visus|всё|все|すべて|全部|모두/.test(l)) s += 3;
      if (b.el.tagName === 'BUTTON') s += 1;
      return s;
    };
    return rejects.sort((a, b) => score(b) - score(a))[0];
  }

  function pickByType(items, type) {
    return items.find(b => b.type === type && !b.navigates) || null;
  }

  function summarize(items) {
    const has = (t) => items.some(b => b.type === t);
    return {
      hasReject: has('REJECT'),
      hasAccept: has('ACCEPT') || has('ACCEPT_ALL'),
      hasPay: has('PAY'),
      hasSettings: has('SETTINGS'),
      allUnknown: items.length > 0 && items.every(b => b.type === 'UNKNOWN'),
      buttons: items.slice(0, 12).map(b => ({ label: b.label.slice(0, 60), type: b.type }))
    };
  }

  // --- Translation-assisted fallback --------------------------------------------------

  async function detectLanguage(text) {
    try {
      if (chrome.i18n && chrome.i18n.detectLanguage) {
        const res = await new Promise(r => chrome.i18n.detectLanguage(text.slice(0, 2000), r));
        if (res && res.languages && res.languages[0]) return res.languages[0].language.split('-')[0];
      }
    } catch (e) { /* ignore */ }
    return (document.documentElement.lang || 'und').split('-')[0].toLowerCase();
  }

  /**
   * Translate button labels to English on-device and re-classify.
   * Only used when NO label was recognised. Only returns a candidate whose English translation
   * is an unambiguous reject phrase; the click is still verified afterwards.
   */
  async function translatedReject(items, lang) {
    if (typeof Translator === 'undefined' || !lang || lang === 'en' || lang === 'und') return null;
    try {
      const avail = await Translator.availability({ sourceLanguage: lang, targetLanguage: 'en' });
      if (avail !== 'available') return null; // downloading a model needs a user gesture; don't block
      const tr = await Translator.create({ sourceLanguage: lang, targetLanguage: 'en' });
      let pick = null;
      for (const b of items) {
        if (b.navigates) continue;
        const en = await tr.translate(b.label);
        const c = L().classify(en);
        b.translated = en;
        b.translatedType = c.type;
        if (c.type === 'ACCEPT' || c.type === 'ACCEPT_ALL' || c.type === 'PAY') continue;
        if (c.type === 'REJECT' && !pick) pick = b;
      }
      tr.destroy && tr.destroy();
      return pick;
    } catch (e) {
      return null;
    }
  }

  window.CookieShieldGeneric = { inventory, pickReject, pickByType, summarize, detectLanguage, translatedReject };
})();
