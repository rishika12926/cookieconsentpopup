/** Fast unit tests (no browser): lexicon safety + rules file. Run: node tests/unit.test.js */
'use strict';
const assert = require('assert');
const L = require('../extension/content/lexicon.js');
const rules = require('../extension/rules/cmp-rules.json');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// Priority 2 safety: accept-type labels must NEVER classify as REJECT/SAVE/SETTINGS.
const mustBlock = ['Accept all', 'Accept All Cookies', 'I agree', 'Agree', 'OK', 'Got it!', 'Allow all', 'Allow all cookies', 'Yes, I agree',
  'Alle akzeptieren', 'Akzeptieren und weiter', 'Zustimmen', 'Tout accepter', 'Accepter & Fermer', 'J’accepte', 'Aceptar todo', 'Aceptar',
  'Accetta tutti', 'Aceitar todos', 'Alles accepteren', 'Akkoord', 'Zaakceptuj wszystkie', 'Acceptera alla', 'Hyväksy kaikki', 'Přijmout vše',
  'Принять все', 'Tümünü kabul et', 'すべて受け入れる', '同意する', '全部接受', '모두 동의', 'قبول الكل', 'קבל הכל', 'Continue', 'Consent', 'Accept and continue',
  'Subscribe', 'Jetzt Pur-Abo abschließen', 'Ablehnen und abonnieren', 'Accept or reject'];
for (const s of mustBlock) {
  const t = L.classify(s).type;
  ok(['ACCEPT', 'ACCEPT_ALL', 'PAY', 'AMBIGUOUS'].includes(t), `"${s}" must be blocked, got ${t}`);
}

const mustReject = ['Reject all', 'Reject All', 'Decline', 'Deny', 'Do not consent', 'Only necessary', 'Accept only necessary', 'Use necessary cookies only',
  'Required Only', 'Continue without accepting', 'I decline', 'No, thanks', 'Disagree', 'Alle ablehnen', 'Nur notwendige Cookies akzeptieren', 'Tout refuser',
  'Continuer sans accepter →', 'Rechazar todo', 'Rifiuta tutto', 'Rejeitar todos', 'Alles weigeren', 'Odrzuć wszystkie', 'Avvisa alla', 'Hylkää kaikki',
  'Odmítnout vše', 'Összes elutasítása', 'Απόρριψη όλων', 'Отклонить все', 'Відхилити все', 'Tümünü reddet', 'すべて拒否', '全部拒绝', '모두 거부', 'رفض الكل', 'דחה הכל', 'सभी अस्वीकार करें'];
for (const s of mustReject) ok(L.classify(s).type === 'REJECT', `"${s}" should be REJECT, got ${L.classify(s).type}`);

for (const s of ['Cookie Settings', 'Manage options', 'Einstellungen', 'Paramétrer', 'Personalizar', 'Customise', 'More options']) ok(L.classify(s).type === 'SETTINGS', `"${s}" settings`);
for (const s of ['Save & Exit', 'Confirm My Choices', 'Auswahl speichern', 'Enregistrer']) ok(L.classify(s).type === 'SAVE', `"${s}" save`);
ok(L.classify('Necessary').type !== 'REJECT', 'a bare category name is not a reject button');
ok(L.cookieMention('Wir verwenden Cookies') && L.cookieMention('당사는 쿠키를 사용합니다') && !L.cookieMention('Get the Polar Weekly newsletter'), 'cookie context');
ok(L.isEssentialLabel('Strictly Necessary Cookies') && L.isEssentialLabel('Unbedingt erforderlich') && !L.isEssentialLabel('Marketing cookies'), 'essential labels');

// Rules file
const ids = new Set();
for (const r of rules.platforms) {
  ok(r.id && r.name && Array.isArray(r.detect) && r.detect.length, `rule ${r.id} basic fields`);
  ok(!ids.has(r.id), `duplicate rule ${r.id}`); ids.add(r.id);
  for (const k of ['detect', 'container', 'reject', 'settings', 'settingsReject', 'save']) for (const sel of r[k] || []) {
    ok(!/accept[-_]?all|allow[-_]?all|(^|[^s])agree(?!ing)/i.test(sel.replace(/:not\([^)]*\)/g, '')) || /selection|selected/i.test(sel) || k === 'detect', `rule ${r.id}.${k} must not target accept buttons: ${sel}`);
  }
}
ok(rules.platforms.length >= 30, '30+ platforms');
console.log(`unit tests: ${n} checks passed`);
