/**
 * POST /api/usage — one anonymous daily summary from an installed extension (category A).
 *
 * Body: { day:"YYYY-MM-DD", version:"2.8.0", browser:"Chrome 142", counts:{...}, events:{...} }
 * No install ID, no URLs, no domains. Each summary adds 1 to "active installs" for that day.
 */
'use strict';
const db = require('../lib/db');
const { cors, body, rateLimited, int, validDay, token, clean, fail } = require('../lib/http');

const COUNTS = ['installs', 'updates', 'banners', 'verified', 'clicked', 'needs_you', 'failed', 'false_success',
  'us_optouts', 'page_optouts', 'remembered', 'manual', 'errors', 'translated', 'handle_ms_sum', 'handle_n'];
const EVENT_RE = /^(manual|error|reason):[A-Za-z0-9_.-]{1,40}$/;

function sanitize(b) {
  const day = validDay(b.day);
  if (!day) throw new Error('day must be a recent YYYY-MM-DD');
  const version = token(b.version, 20);
  if (!version) throw new Error('version required');
  const browser = clean(b.browser, 30).replace(/[^\w .-]/g, '') || 'unknown';
  const c = b.counts || {};
  const counts = {};
  for (const k of COUNTS) counts[k] = int(c[k], k === 'handle_ms_sum' ? 1e8 : 20000);
  counts.installs = Math.min(counts.installs, 1);
  counts.updates = Math.min(counts.updates, 5);
  const events = {};
  for (const [k, v] of Object.entries(b.events || {}).slice(0, 60)) if (EVENT_RE.test(k)) events[k] = int(v, 20000);
  return { day, version, browser, counts, events };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'POST only');
  if (rateLimited(req, 'usage', 60)) return fail(res, 429, 'Too many requests');
  let u;
  try { u = sanitize(body(req)); } catch (e) { return fail(res, 400, String(e.message || e)); }
  try {
    const cols = COUNTS.join(', ');
    const vals = COUNTS.map((_, i) => `$${i + 4}`).join(', ');
    const upd = COUNTS.map(k => `${k} = usage_daily.${k} + EXCLUDED.${k}`).join(', ');
    await db.query(
      `INSERT INTO usage_daily (day, version, browser, active, ${cols}) VALUES ($1, $2, $3, 1, ${vals})
       ON CONFLICT (day, version, browser) DO UPDATE SET active = usage_daily.active + 1, ${upd}`,
      [u.day, u.version, u.browser, ...COUNTS.map(k => u.counts[k])]);
    for (const [kind, n] of Object.entries(u.events)) {
      if (!n) continue;
      await db.query(`INSERT INTO events_daily (day, kind, n) VALUES ($1, $2, $3)
        ON CONFLICT (day, kind) DO UPDATE SET n = events_daily.n + EXCLUDED.n`, [u.day, kind, n]);
    }
    return res.status(202).json({ ok: true });
  } catch (e) {
    if (e.code === 'NO_DB') return fail(res, 503, e.message);
    console.error('usage insert failed', e.message);
    return fail(res, 500, 'Could not save');
  }
};
module.exports.sanitize = sanitize;
