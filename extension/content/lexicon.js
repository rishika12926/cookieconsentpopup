/**
 * CookieShield — Multilingual consent lexicon
 *
 * Classifies the label of a button/link on a consent banner into one of:
 *   REJECT      – refuses optional consent ("Reject all", "Only necessary", "Alle ablehnen")
 *   ACCEPT_ALL  – grants all optional consent ("Accept all", "Tout accepter")   → NEVER clicked
 *   ACCEPT      – any other form of agreement ("OK", "Got it", "Agree")        → NEVER clicked
 *   PAY         – consent-or-pay / subscription routes ("Subscribe", "Pur-Abo")  → NEVER clicked
 *   SETTINGS    – opens a preference centre ("Manage options", "Einstellungen")
 *   SAVE        – saves the current selection ("Save choices", "Auswahl speichern")
 *   UNKNOWN
 *
 * The same lexicon recognises cookie-banner context text and essential-category labels.
 * 30+ languages. Text and phrases are normalised identically (lower-case, accents stripped),
 * so "Refuser" and "refuser" and "REFUSER" all match.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Phrase lists. Order of evaluation in classify():
  //   STRONG_REJECT (negations, "only necessary") → PAY → ACCEPT_ALL → ACCEPT → REJECT → SAVE → SETTINGS
  // ---------------------------------------------------------------------------

  /** Phrases that mean "refuse" even though they may contain an accept-word. */
  const STRONG_REJECT = [
    // English
    'only necessary', 'necessary only', 'only essential', 'essential only', 'essentials only',
    'only required', 'required only', 'strictly necessary only', 'necessary cookies only',
    'use necessary cookies only', 'use essential cookies only', 'only allow essential',
    'allow only essential', 'allow essential cookies only', 'allow necessary cookies only',
    'accept only necessary', 'accept only essential', 'accept necessary only', 'accept essential only',
    'accept required only', 'accept only required', 'only accept necessary', 'only accept essential',
    'continue without accepting', 'continue without agreeing', 'continue without consent',
    'do not accept', "don't accept", 'dont accept', 'do not agree', "don't agree", 'i do not agree',
    'do not consent', "don't consent", 'do not allow', "don't allow", 'decline optional',
    'reject optional', 'reject non-essential', 'reject non essential', 'refuse non-essential',
    'deny optional', 'decline non-essential', 'no, thanks', 'no thanks',
    // German
    'nur notwendige', 'nur essenzielle', 'nur essentielle', 'nur erforderliche', 'nur technisch notwendige',
    'nur notwendige cookies', 'nur notwendige akzeptieren', 'nur essenzielle akzeptieren',
    'nur erforderliche akzeptieren', 'notwendige akzeptieren', 'nicht einverstanden', 'nicht zustimmen',
    'nicht akzeptieren', 'weiter ohne einwilligung', 'ohne zustimmung fortfahren', 'fortfahren ohne zu akzeptieren',
    // French
    'continuer sans accepter', 'continuer sans consentir', 'uniquement necessaires', 'uniquement les necessaires',
    'uniquement les cookies necessaires', 'accepter uniquement les cookies necessaires', 'seulement necessaires',
    'ne pas accepter', 'je refuse', 'non merci', "n'accepter que les cookies necessaires",
    // Spanish / Catalan
    'continuar sin aceptar', 'solo necesarias', 'solo las necesarias', 'solo esenciales', 'solo cookies necesarias',
    'aceptar solo necesarias', 'aceptar solo las necesarias', 'aceptar solo esenciales', 'no aceptar',
    'no acepto', 'nomes necessaries', 'continuar sense acceptar',
    // Italian
    'continua senza accettare', 'solo necessari', 'solo essenziali', 'solo i necessari', 'accetta solo necessari',
    'accetta solo i necessari', 'accetta solo essenziali', 'non accetto', 'non accettare',
    // Portuguese
    'continuar sem aceitar', 'apenas necessarios', 'apenas essenciais', 'somente necessarios',
    'aceitar apenas necessarios', 'aceitar apenas essenciais', 'nao aceitar', 'nao aceito',
    // Dutch
    'alleen noodzakelijk', 'alleen noodzakelijke', 'alleen essentiele', 'alleen functionele',
    'doorgaan zonder te accepteren', 'niet akkoord', 'niet accepteren', 'alleen noodzakelijke cookies',
    // Polish
    'tylko niezbedne', 'tylko wymagane', 'nie zgadzam sie', 'kontynuuj bez akceptacji',
    // Scandinavian
    'endast nodvandiga', 'bara nodvandiga', 'kun nodvendige', 'kun nodvendig', 'bare nodvendige',
    'kun pakolliset', 'vain valttamattomat', 'vain pakolliset',
    // Czech / Slovak
    'pouze nezbytne', 'jen nezbytne', 'len nevyhnutne', 'iba nevyhnutne', 'nesouhlasim', 'nesuhlasim',
    // Hungarian / Romanian
    'csak a szukseges', 'csak szukseges', 'nem fogadom el', 'doar necesare', 'doar cele necesare', 'nu accept',
    // Greek / Bulgarian / Russian / Ukrainian
    'μονο τα απαραιτητα', 'μονο απαραιτητα', 'δεν αποδεχομαι', 'само необходимите', 'само задължителните',
    'только необходимые', 'только обязательные', 'не принимаю', 'лише необхідні', 'тільки необхідні', 'не приймаю',
    // Croatian / Slovenian / Baltic / Turkish
    'samo nuzni', 'samo nuzne', 'samo nujni', 'samo nujne', 'tikai nepieciesamas', 'tik butini', 'tik butinieji',
    'ainult vajalikud', 'ainult hadavajalikud', 'sadece gerekli', 'sadece zorunlu', 'kabul etmiyorum',
    // Asian / Middle-Eastern
    '必要なcookieのみ', '必要なもののみ', '必須のみ', '同意しない', '同意しません',
    '仅必要', '僅必要', '只接受必要', '仅接受必要', '不同意',
    '필수만', '필수 쿠키만', '동의하지 않음', '동의 안함',
    'الضرورية فقط', 'لا أوافق', 'רק הכרחיים', 'לא מסכים', 'केवल आवश्यक', 'असहमत'
  ];

  /** Consent-or-pay / subscription buttons. Never clicked automatically. */
  const PAY = [
    'subscribe', 'subscription', 'pay', 'purchase', 'buy', 'ad-free', 'ad free', 'without ads', 'go ad-free',
    'abonnieren', 'abonnement', 'abo ', 'pur-abo', 'pur abo', 'werbefrei', 'jetzt abonnieren', 'bezahlen',
    "s'abonner", 'sabonner', 'abonnez-vous', 'sans publicite', 'suscribirse', 'suscribete', 'suscripcion',
    'sin publicidad', 'abbonati', 'abbonamento', 'senza pubblicita', 'assinar', 'assinatura', 'sem anuncios',
    'abonneren', 'zonder advertenties', 'subskrybuj', 'subskrypcja', 'prenumerera', 'abonner', 'tilaa',
    'predplatne', 'elofizetes', 'aboneaza', 'подписаться', 'подписка', '購読', '订阅', '구독'
  ];

  /** Accept-everything wording. */
  const ACCEPT_ALL = [
    'accept all', 'accept all cookies', 'accept cookies', 'accept & close', 'accept and close',
    'accept and continue', 'accept & continue', 'agree to all', 'agree and close', 'agree & close',
    'agree and continue', 'agree & continue', 'agree and proceed', 'allow all', 'allow all cookies',
    'allow cookies', 'enable all', 'consent to all', 'yes, i agree', 'i accept all', 'select all',
    'accept recommended', 'accept optional', 'confirm all', 'activate all',
    'alle akzeptieren', 'alles akzeptieren', 'allen zustimmen', 'alle zulassen', 'alle cookies akzeptieren',
    'akzeptieren und weiter', 'zustimmen und weiter', 'alle annehmen', 'alle erlauben', 'alle auswahlen',
    'tout accepter', 'accepter tout', 'accepter et fermer', 'accepter et continuer', 'tout autoriser',
    'accepter les cookies', 'aceptar todo', 'aceptar todas', 'aceptar todos', 'aceptar y continuar',
    'aceptar y cerrar', 'permitir todas', 'aceptar cookies', 'acceptar-ho tot', 'accetta tutti', 'accetta tutto',
    'accetta e chiudi', 'accetta e continua', 'consenti tutti', 'aceitar todos', 'aceitar tudo',
    'aceitar e fechar', 'permitir todos', 'alles accepteren', 'alle accepteren', 'alles toestaan',
    'akkoord en doorgaan', 'zaakceptuj wszystkie', 'zaakceptuj wszystko', 'akceptuj wszystkie',
    'akceptuje wszystkie', 'zgadzam sie na wszystkie', 'acceptera alla', 'godkann alla', 'tillat alla',
    'accepter alle', 'godta alle', 'tillat alle', 'hyvaksy kaikki', 'salli kaikki', 'prijmout vse',
    'prijmout vsechny', 'povolit vse', 'prijat vsetky', 'osszes elfogadasa', 'accepta tot', 'accepta toate',
    'αποδοχη ολων', 'приемане на всички', 'принять все', 'разрешить все', 'прийняти все', 'прийняти всі',
    'prihvati sve', 'sprejmi vse', 'sprejmem vse', 'pienemt visas', 'priimti visus', 'noustu koigiga',
    'kõik vastu', 'tumunu kabul et', 'tumunu kabul ediyorum', 'hepsini kabul et',
    'すべて受け入れる', 'すべて同意', '全て同意', 'すべてのcookieを受け入れる', '全部接受', '接受全部', '全部同意',
    '接受所有', '全部允許', '모두 동의', '모두 수락', '모두 허용', 'قبول الكل', 'קבל הכל', 'सभी स्वीकार करें'
  ];

  /** Any other agreement wording. */
  const ACCEPT = [
    'accept', 'i accept', 'agree', 'i agree', 'allow', 'consent', 'i consent', 'ok', 'okay', 'got it',
    'understood', 'yes', 'continue', 'sounds good', 'fine', 'proceed', 'i understand', 'that\'s ok', 'alright',
    'akzeptieren', 'zustimmen', 'einverstanden', 'annehmen', 'verstanden', 'erlauben', 'ich stimme zu', 'zulassen',
    'accepter', "j'accepte", 'jaccepte', "d'accord", 'daccord', 'compris', 'autoriser', 'valider', 'oui',
    'aceptar', 'acepto', 'de acuerdo', 'entendido', 'permitir', 'consentir', 'si', 'acceptar', "d'acord",
    'accetta', 'accetto', 'accettare', 'consenti', 'ho capito', 'va bene', 'aceitar', 'aceito', 'concordo',
    'concordar', 'entendi', 'accepteren', 'akkoord', 'toestaan', 'begrepen', 'ik ga akkoord', 'zgadzam sie',
    'akceptuje', 'akceptuj', 'zaakceptuj', 'rozumiem', 'acceptera', 'godkann', 'jag godkanner', 'accepter',
    'godta', 'jeg accepterer', 'hyvaksy', 'hyvaksyn', 'souhlasim', 'prijmout', 'rozumim', 'suhlasim',
    'prijat', 'elfogadom', 'elfogad', 'rendben', 'accept', 'accepta', 'sunt de acord', 'αποδοχη', 'αποδεχομαι',
    'συμφωνω', 'приемам', 'съгласен', 'принять', 'принимаю', 'согласен', 'понятно', 'прийняти', 'погоджуюсь',
    'prihvacam', 'prihvati', 'sprejmem', 'sprejmi', 'piekritu', 'sutinku', 'noustun', 'kabul et', 'kabul ediyorum',
    'tamam', '同意する', '同意します', '同意', '受け入れる', '接受', '我同意', '确定', '確定', '동의', '수락', '확인',
    'موافق', 'أوافق', 'قبول', 'מסכים', 'אני מסכים', 'אישור', 'स्वीकार करें', 'सहमत'
  ];

  /** Reject wording. */
  const REJECT = [
    'reject', 'reject all', 'reject cookies', 'reject all cookies', 'decline', 'decline all', 'decline cookies',
    'refuse', 'refuse all', 'deny', 'deny all', 'disagree', 'disagree to all', 'disagree and close', 'opt out',
    'opt-out', 'object to all', 'object all', 'no', 'withdraw consent',
    'ablehnen', 'alle ablehnen', 'alles ablehnen', 'verweigern', 'alle verweigern', 'zuruckweisen', 'widersprechen',
    'refuser', 'tout refuser', 'refuser tout', 'refuser les cookies', 'je refuse', 'interdire',
    'rechazar', 'rechazar todo', 'rechazar todas', 'rechazar todos', 'denegar', 'rebutjar', 'rebutja-ho tot',
    'rifiuta', 'rifiuta tutto', 'rifiuta tutti', 'rifiuto', 'nega', 'rejeitar', 'rejeitar todos', 'recusar',
    'recusar todos', 'weigeren', 'alles weigeren', 'alle weigeren', 'afwijzen', 'alles afwijzen', 'odrzuc',
    'odrzuc wszystkie', 'odrzuc wszystko', 'odmow', 'avvisa', 'avvisa alla', 'neka', 'neka alla', 'afvis',
    'afvis alle', 'avvis', 'avvis alle', 'avsla', 'hylkaa', 'hylkaa kaikki', 'kiella', 'odmitnout',
    'odmitnout vse', 'odmietnut', 'odmietnut vsetky', 'elutasit', 'osszes elutasitasa', 'elutasitom',
    'refuza', 'refuz', 'resping', 'respinge', 'respinge tot', 'απορριψη', 'απορριψη ολων', 'αρνουμαι',
    'отказ', 'отхвърляне', 'отхвърли всички', 'отклонить', 'отклонить все', 'отказаться', 'запретить',
    'відхилити', 'відхилити все', 'відмовитися', 'odbij', 'odbij sve', 'odbijam', 'zavrni', 'zavrni vse',
    'noraidit', 'noraidit visus', 'atmesti', 'atmesti visus', 'keeldu', 'keeldu koigist', 'loobu',
    'reddet', 'tumunu reddet', 'hepsini reddet', 'kabul etme',
    '拒否', 'すべて拒否', '全て拒否', '拒否する', '拒绝', '全部拒绝', '拒絕', '全部拒絕', '拒绝所有',
    '거부', '모두 거부', '거절', 'رفض', 'رفض الكل', 'דחה', 'דחה הכל', 'סרב', 'अस्वीकार', 'सभी अस्वीकार करें'
  ];

  /** Saving the current (minimal) selection. */
  const SAVE = [
    'save', 'save settings', 'save preferences', 'save choices', 'save my choices', 'save selection',
    'save and close', 'save & exit', 'save and exit', 'confirm choices', 'confirm my choices', 'confirm selection',
    'confirm', 'apply', 'submit', 'done', 'update', 'accept selected', 'allow selection', 'accept selection',
    'speichern', 'auswahl speichern', 'einstellungen speichern', 'auswahl bestatigen', 'bestatigen',
    'auswahl akzeptieren', 'enregistrer', 'sauvegarder', 'valider mes choix', 'confirmer mes choix', 'confirmer',
    'enregistrer mes choix', 'enregistrer et fermer', 'guardar', 'guardar configuracion', 'guardar preferencias',
    'confirmar seleccion', 'confirmar', 'desa', 'salva', 'salva preferenze', 'salva le scelte', 'conferma',
    'conferma le scelte', 'salvar', 'salvar preferencias', 'confirmar escolhas', 'opslaan', 'keuze opslaan',
    'voorkeuren opslaan', 'bevestigen', 'zapisz', 'zapisz wybor', 'zapisz ustawienia', 'potwierdz', 'spara',
    'spara val', 'bekrafta', 'gem', 'gem valg', 'lagre', 'lagre valg', 'tallenna', 'tallenna valinnat',
    'ulozit', 'ulozit nastaveni', 'potvrdit', 'ulozit vyber', 'mentes', 'beallitasok mentese', 'salveaza',
    'αποθηκευση', 'запази', 'сохранить', 'подтвердить', 'зберегти', 'spremi', 'shrani', 'saglabat',
    'issaugoti', 'salvesta', 'kaydet', 'secimleri kaydet', '保存', '設定を保存', '选择を保存', '保存设置',
    '确认选择', '저장', '설정 저장', 'حفظ', 'שמור', 'सहेजें'
  ];

  /** Opening a preference centre. */
  const SETTINGS = [
    'settings', 'cookie settings', 'preferences', 'cookie preferences', 'preference', 'manage', 'manage options',
    'manage preferences', 'manage cookies', 'manage settings', 'manage choices', 'customize', 'customise',
    'customize settings', 'more options', 'options', 'configure', 'set preferences', 'privacy settings',
    'let me choose', 'show purposes', 'view purposes', 'learn more', 'more information', 'details', 'show details',
    'einstellungen', 'cookie-einstellungen', 'mehr optionen', 'optionen', 'anpassen', 'verwalten', 'konfigurieren',
    'individuelle einstellungen', 'details anzeigen', 'praferenzen', 'zwecke anzeigen', 'parametres', 'parametrer',
    'personnaliser', 'gerer', 'gerer mes choix', 'plus d\'options', 'en savoir plus', 'configurer', 'preferences',
    'configuracion', 'configurar', 'personalizar', 'gestionar', 'mas opciones', 'preferencias', 'administrar',
    'impostazioni', 'personalizza', 'gestisci', 'gestisci opzioni', 'piu opzioni', 'preferenze', 'configuracoes',
    'definicoes', 'gerir', 'gerenciar', 'mais opcoes', 'instellingen', 'aanpassen', 'beheren', 'meer opties',
    'voorkeuren', 'ustawienia', 'dostosuj', 'zarzadzaj', 'wiecej opcji', 'preferencje', 'installningar',
    'anpassa', 'hantera', 'indstillinger', 'tilpas', 'administrer', 'innstillinger', 'tilpass', 'asetukset',
    'muokkaa', 'hallitse', 'nastaveni', 'prizpusobit', 'spravovat', 'nastavenia', 'prisposobit', 'beallitasok',
    'testreszabas', 'kezeles', 'setari', 'personalizeaza', 'gestionare', 'ρυθμισεις', 'προσαρμογη', 'настройки',
    'персонализиране', 'управление', 'настроить', 'налаштування', 'postavke', 'prilagodi', 'nastavitve',
    'iestatijumi', 'nustatymai', 'seaded', 'ayarlar', 'ozellestir', 'yonet', '設定', '詳細設定', 'カスタマイズ',
    '设置', '管理', '自定义', '設定', '자세히', '설정', '관리', 'إعدادات', 'تخصيص', 'הגדרות', 'सेटिंग्स'
  ];

  /** Words that indicate a cookie / consent context (banner detection). */
  const CONTEXT = [
    'cookie', 'cookies', 'consent', 'gdpr', 'tracking', 'trackers', 'privacy', 'personal data', 'your data',
    'partners', 'vendors', 'personalised ads', 'personalized ads', 'advertising', 'analytics', 'ccpa',
    'do not sell', 'legitimate interest', 'datenschutz', 'einwilligung', 'zustimmung', 'tracker', 'werbung',
    'personenbezogene', 'donnees personnelles', 'consentement', 'vie privee', 'traceurs', 'confidentialite',
    'privacidad', 'consentimiento', 'datos personales', 'galletas', 'privacy', 'consenso', 'dati personali',
    'privacidade', 'consentimento', 'dados pessoais', 'toestemming', 'persoonsgegevens', 'prywatnosc',
    'zgoda', 'dane osobowe', 'ciasteczka', 'samtycke', 'integritet', 'samtykke', 'personoplysninger',
    'evasteet', 'evaste', 'tietosuoja', 'suostumus', 'souhlas', 'osobni udaje', 'sutikimas', 'suhlas',
    'adatvedelem', 'suti', 'sutik', 'hozzajarulas', 'consimtamant', 'confidentialitate', 'απορρητο',
    'συγκαταθεση', 'бисквитки', 'поверителност', 'согласие', 'конфиденциальность', 'файлы cookie',
    'куки', 'згода', 'конфіденційність', 'kolacici', 'kolacic', 'privatnost', 'piskotki', 'sikdatnes',
    'slapukai', 'kupsised', 'cerez', 'cerezler', 'gizlilik', 'クッキー', 'cookie', 'プライバシー', '同意',
    '隐私', '隱私', '饼干', '쿠키', '개인정보', 'ملفات تعريف الارتباط', 'الخصوصية', 'עוגיות', 'פרטיות',
    'कुकीज़', 'गोपनीयता'
  ];

  /** Labels for categories that are strictly necessary (never need to be toggled off). */
  const ESSENTIAL = [
    'necessary', 'essential', 'strictly necessary', 'required', 'functional only', 'technical', 'mandatory',
    'notwendig', 'essenziell', 'essentiell', 'erforderlich', 'technisch notwendig', 'unbedingt erforderlich',
    'necessaires', 'essentiels', 'strictement necessaires', 'obligatoires', 'necesarias', 'esenciales',
    'estrictamente necesarias', 'necessari', 'essenziali', 'tecnici', 'necessarios', 'essenciais',
    'estritamente necessarios', 'noodzakelijk', 'noodzakelijke', 'essentieel', 'functioneel', 'niezbedne',
    'wymagane', 'nodvandiga', 'nodvendige', 'valttamattomat', 'pakolliset', 'nezbytne', 'nevyhnutne',
    'szukseges', 'necesare', 'απαραιτητα', 'необходимые', 'необходими', 'необхідні', 'nuzni', 'nujni',
    'nepieciesamas', 'butini', 'vajalikud', 'gerekli', 'zorunlu', '必要', '必須', '必要的', '필수',
    'ضرورية', 'הכרחיים', 'आवश्यक'
  ];

  // ---------------------------------------------------------------------------

  function normalize(text) {
    return String(text || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')       // strip Latin/Greek/Cyrillic accents only
      .replace(/[’`´]/g, "'")
      .replace(/[\s ]+/g, ' ')
      .replace(/[“”"«»„]/g, '')
      .trim()
      .toLowerCase();
  }

  // CJK / Thai / etc. don't use spaces — use substring matching there.
  const NO_SPACE_SCRIPT = /[぀-ヿ㐀-鿿가-힯฀-๿]/;

  function compile(list) {
    const out = [];
    for (const raw of list) {
      const p = normalize(raw);
      if (!p) continue;
      if (NO_SPACE_SCRIPT.test(p)) {
        out.push({ p, re: null });
      } else {
        const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out.push({ p, re: new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'u') });
      }
    }
    // Longest phrases first so explanations show the most specific match.
    return out.sort((a, b) => b.p.length - a.p.length);
  }

  const C = {
    STRONG_REJECT: compile(STRONG_REJECT),
    PAY: compile(PAY),
    ACCEPT_ALL: compile(ACCEPT_ALL),
    ACCEPT: compile(ACCEPT),
    REJECT: compile(REJECT),
    SAVE: compile(SAVE),
    SETTINGS: compile(SETTINGS),
    CONTEXT: compile(CONTEXT),
    ESSENTIAL: compile(ESSENTIAL)
  };

  function firstMatch(norm, compiled) {
    for (const c of compiled) {
      if (c.re ? c.re.test(norm) : norm.includes(c.p)) return c.p;
    }
    return null;
  }

  /**
   * Classify a button label.
   * @returns {{type:string, matched:string|null, label:string}}
   */
  const OR_WORD = / (or|oder|ou|o|of|eller|tai|lub|nebo|alebo|vagy|sau|ili|или|або|veya|ya da|ή|或|또는|または|أو|או|या) /;

  function classify(label) {
    const norm = normalize(label);
    if (!norm || norm.length > 90) return { type: 'UNKNOWN', matched: null, label: norm };

    let m;
    if ((m = firstMatch(norm, C.STRONG_REJECT))) {
      // "Reject & subscribe" style buttons go to a payment page: PAY wins.
      const pay = firstMatch(norm, C.PAY);
      if (pay) return { type: 'PAY', matched: pay, label: norm };
      return { type: 'REJECT', matched: m, label: norm };
    }
    if ((m = firstMatch(norm, C.PAY))) return { type: 'PAY', matched: m, label: norm };

    const acceptAll = firstMatch(norm, C.ACCEPT_ALL);
    const reject = firstMatch(norm, C.REJECT);
    const accept = acceptAll || firstMatch(norm, C.ACCEPT);

    if (accept && reject) {
      // e.g. "Accept or reject" — never guess.
      return { type: 'AMBIGUOUS', matched: `${accept} / ${reject}`, label: norm };
    }
    // "Einstellungen oder ablehnen" / "Settings or reject" / "Paramétrer ou refuser": this opens a
    // settings screen where you can reject — it is not itself a reject button.
    if (reject && OR_WORD.test(` ${norm} `)) {
      const set = firstMatch(norm, C.SETTINGS);
      if (set) return { type: 'SETTINGS', matched: `${set} / ${reject}`, label: norm };
    }
    if (acceptAll) return { type: 'ACCEPT_ALL', matched: acceptAll, label: norm };
    if (accept) return { type: 'ACCEPT', matched: accept, label: norm };
    if (reject) {
      // Bare "necessary"/"essential" as a whole label is a reject-equivalent; inside longer
      // text (e.g. "Learn about necessary cookies") it is not.
      if (reject === 'no' && norm.split(' ').length > 3) {
        return { type: 'UNKNOWN', matched: null, label: norm };
      }
      return { type: 'REJECT', matched: reject, label: norm };
    }
    if ((m = firstMatch(norm, C.SAVE))) return { type: 'SAVE', matched: m, label: norm };
    if ((m = firstMatch(norm, C.SETTINGS))) return { type: 'SETTINGS', matched: m, label: norm };
    return { type: 'UNKNOWN', matched: null, label: norm };
  }

  /** Does free text look like a cookie / consent notice? Returns number of distinct context hits. */
  function contextScore(text) {
    const norm = normalize(text).slice(0, 4000);
    if (!norm) return 0;
    let score = 0;
    const seen = new Set();
    for (const c of C.CONTEXT) {
      if (seen.has(c.p)) continue;
      if (c.re ? c.re.test(norm) : norm.includes(c.p)) { score++; seen.add(c.p); }
      if (score >= 6) break;
    }
    return score;
  }

  function isEssentialLabel(text) {
    return !!firstMatch(normalize(text).slice(0, 300), C.ESSENTIAL);
  }

  /** Strong signal: the text talks about cookies / consent specifically (any language). */
  const COOKIE_WORD = /cooki|consent|gdpr|rgpd|dsgvo|einwillig|zustimmung|tracking|tracker|kakor|evaste|sutik|\bsuti|kolacic|piskot|sikdatn|slapuk|kupsis|cerez|galleta|ciastecz|toestemming|samtyck|samtykk|suostum|souhlas|suhlas|hozzajarul|consimtam|consenso|consentim|consentem|συγκαταθ|μπισκοτ|бисквит|куки|файлы cookie|згода|クッキー|cookie|쿠키|ملفات تعريف|ملفات الارتباط|עוגיות|कुकी/;
  function cookieMention(text) {
    const raw = String(text || '').slice(0, 5000);
    return COOKIE_WORD.test(normalize(raw)) || COOKIE_WORD.test(raw.toLowerCase());
  }

  const api = { classify, contextScore, isEssentialLabel, normalize, cookieMention };

  if (typeof window !== 'undefined') window.CookieShieldLexicon = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
