/**
 * POST /api/sites — OPT-IN daily site statistics (category B). Only sent by extensions whose
 * user switched on "Share which sites show cookie banners".
 *
 * Body: { day, entries: [{ domain:"example.com", cmp:"onetrust", outcome:"verified", n:2 }] }
 * Domain only (registrable hostname) — never paths, full URLs, titles or anything typed.
 * outcome: verified | clicked | needs_you | failed | remembered | us_optout | page_optout
 */
'use strict';
const db = require('../lib/db');
const { cors, body, rateLimited, int, validDay, domain, token, fail } = require('../lib/http');

const OUTCOMES = new Set(['verified', 'clicked', 'needs_you', 'failed', 'remembered', 'us_optout', 'page_optout', 'previously_accepted']);

function sanitize(b) {
  const day = validDay(b.day);
  if (!day) throw new Error('day must be a recent YYYY-MM-DD');
  const entries = [];
  for (const e of (Array.isArray(b.entries) ? b.entries : []).slice(0, 300)) {
    const d = domain(e && e.domain);
    const outcome = String(e && e.outcome || '');
    if (!d || !OUTCOMES.has(outcome)) continue;
    entries.push({ domain: d, cmp: token(e.cmp, 40) || 'unknown', outcome, n: Math.max(1, int(e.n, 500)) });
  }
  return { day, entries };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'POST only');
  if (rateLimited(req, 'sites', 60)) return fail(res, 429, 'Too many requests');
  let s;
  try { s = sanitize(body(req)); } catch (e) { return fail(res, 400, String(e.message || e)); }
  try {
    for (const e of s.entries) {
      await db.query(`INSERT INTO sites_daily (day, domain, cmp, outcome, n, reporters) VALUES ($1, $2, $3, $4, $5, 1)
        ON CONFLICT (day, domain, cmp, outcome) DO UPDATE SET n = sites_daily.n + EXCLUDED.n, reporters = sites_daily.reporters + 1`,
        [s.day, e.domain, e.cmp, e.outcome, e.n]);
    }
    return res.status(202).json({ ok: true, saved: s.entries.length });
  } catch (e) {
    if (e.code === 'NO_DB') return fail(res, 503, e.message);
    console.error('sites insert failed', e.message);
    return fail(res, 500, 'Could not save');
  }
};
module.exports.sanitize = sanitize;
