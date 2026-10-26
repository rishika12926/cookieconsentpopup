/**
 * GET /api/stats?days=30 — owner-only insights for the /admin dashboard.
 * Protected by the ADMIN_TOKEN environment variable (Authorization: Bearer <token>).
 * Returns only aggregates already stored as daily totals.
 */
'use strict';
const crypto = require('crypto');
const db = require('../lib/db');
const { cors, rateLimited, fail } = require('../lib/http');

function authorized(req) {
  const want = process.env.ADMIN_TOKEN || '';
  const got = String((req.headers && req.headers.authorization) || '').replace(/^Bearer\s+/i, '');
  if (want.length < 16 || !got) return false;
  const a = Buffer.from(crypto.createHash('sha256').update(want).digest('hex'));
  const b = Buffer.from(crypto.createHash('sha256').update(got).digest('hex'));
  return crypto.timingSafeEqual(a, b);
}

const num = (v) => Number(v || 0);

async function stats(days) {
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const P = [since];
  const [tot] = await db.query(`SELECT
      COALESCE(SUM(installs),0) installs, COALESCE(SUM(updates),0) updates, COALESCE(SUM(banners),0) banners,
      COALESCE(SUM(verified),0) verified, COALESCE(SUM(clicked),0) clicked, COALESCE(SUM(needs_you),0) needs_you,
      COALESCE(SUM(failed),0) failed, COALESCE(SUM(false_success),0) false_success, COALESCE(SUM(us_optouts),0) us_optouts,
      COALESCE(SUM(page_optouts),0) page_optouts, COALESCE(SUM(remembered),0) remembered, COALESCE(SUM(manual),0) manual,
      COALESCE(SUM(errors),0) errors, COALESCE(SUM(translated),0) translated,
      COALESCE(SUM(handle_ms_sum),0) ms_sum, COALESCE(SUM(handle_n),0) ms_n
    FROM usage_daily WHERE day >= $1`, P);
  const daily = await db.query(`SELECT to_char(day,'YYYY-MM-DD') AS day, SUM(active) active, SUM(installs) installs, SUM(banners) banners,
      SUM(verified) verified, SUM(clicked) clicked, SUM(needs_you) needs_you, SUM(failed) failed, SUM(errors) errors, SUM(manual) manual
    FROM usage_daily WHERE day >= $1 GROUP BY day ORDER BY day`, P);
  const versions = await db.query(`SELECT version, SUM(active) active FROM usage_daily WHERE day >= $1 GROUP BY version ORDER BY 2 DESC LIMIT 10`, P);
  const events = await db.query(`SELECT kind, SUM(n) n FROM events_daily WHERE day >= $1 GROUP BY kind ORDER BY 2 DESC LIMIT 60`, P);
  const downloads = await db.query(`SELECT COALESCE(SUM(n),0) n FROM downloads_daily WHERE day >= $1`, P);
  const dlDaily = await db.query(`SELECT to_char(day,'YYYY-MM-DD') AS day, n FROM downloads_daily WHERE day >= $1 ORDER BY day`, P);
  // Opt-in site data
  const topSites = await db.query(`SELECT domain, SUM(n) n,
      SUM(CASE WHEN outcome IN ('verified','clicked','us_optout','page_optout') THEN n ELSE 0 END) ok,
      SUM(CASE WHEN outcome IN ('needs_you','failed') THEN n ELSE 0 END) problems,
      SUM(CASE WHEN outcome = 'remembered' THEN n ELSE 0 END) remembered,
      string_agg(DISTINCT cmp, ', ') cmps
    FROM sites_daily WHERE day >= $1 GROUP BY domain ORDER BY 2 DESC LIMIT 50`, P);
  const failing = await db.query(`SELECT domain, string_agg(DISTINCT cmp, ', ') cmps, SUM(n) problems, COUNT(DISTINCT day) days
    FROM sites_daily WHERE day >= $1 AND outcome IN ('needs_you','failed')
    GROUP BY domain HAVING SUM(n) >= 2 ORDER BY 3 DESC LIMIT 30`, P);
  const platforms = await db.query(`SELECT cmp, SUM(n) n,
      SUM(CASE WHEN outcome IN ('verified','clicked','us_optout','page_optout') THEN n ELSE 0 END) ok,
      SUM(CASE WHEN outcome IN ('needs_you','failed') THEN n ELSE 0 END) problems
    FROM sites_daily WHERE day >= $1 AND outcome <> 'remembered' GROUP BY cmp ORDER BY 2 DESC LIMIT 30`, P);
  const remembered = await db.query(`SELECT
      COALESCE(SUM(CASE WHEN outcome='remembered' THEN n ELSE 0 END),0) remembered,
      COALESCE(SUM(CASE WHEN outcome IN ('verified','clicked') THEN n ELSE 0 END),0) handled
    FROM sites_daily WHERE day >= $1`, P);
  const reportTypes = await db.query(`SELECT issue_type, COUNT(*) n FROM reports WHERE created_at >= $1::date GROUP BY 1 ORDER BY 2 DESC`, P);
  const reports = await db.query(`SELECT to_char(created_at,'YYYY-MM-DD HH24:MI') AS at, site, issue_type, cmp, status, reason, comment, version, github_url
    FROM reports WHERE created_at >= $1::date ORDER BY created_at DESC LIMIT 50`, P);

  const t = Object.fromEntries(Object.entries(tot || {}).map(([k, v]) => [k, num(v)]));
  const handled = t.verified + t.clicked;
  const decided = handled + t.needs_you + t.failed;
  const latest = daily.length ? daily[daily.length - 1] : null;
  return {
    days, since,
    summary: {
      downloads: num(downloads[0] && downloads[0].n), installs: t.installs, updates: t.updates,
      activeLatestDay: latest ? num(latest.active) : 0, activeLatestDate: latest ? latest.day : null,
      activeAvg: daily.length ? Math.round(daily.reduce((s, d) => s + num(d.active), 0) / daily.length) : 0,
      banners: t.banners, rejected: handled, verified: t.verified, clickedOnly: t.clicked, needsYou: t.needs_you, failed: t.failed,
      falseSuccess: t.false_success, successRate: decided ? Math.round(1000 * handled / decided) / 10 : null,
      usOptOuts: t.us_optouts, pageOptOuts: t.page_optouts, rememberedVisits: t.remembered, manual: t.manual,
      errors: t.errors, translatedPages: t.translated, avgHandleMs: t.ms_n ? Math.round(t.ms_sum / t.ms_n) : null
    },
    daily: daily.map(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, k === 'day' ? v : num(v)]))),
    downloadsDaily: dlDaily.map(d => ({ day: d.day, n: num(d.n) })),
    versions: versions.map(v => ({ version: v.version, active: num(v.active) })),
    manual: events.filter(e => e.kind.startsWith('manual:')).map(e => ({ kind: e.kind.slice(7), n: num(e.n) })),
    errors: events.filter(e => e.kind.startsWith('error:')).map(e => ({ kind: e.kind.slice(6), n: num(e.n) })),
    reasons: events.filter(e => e.kind.startsWith('reason:')).map(e => ({ kind: e.kind.slice(7), n: num(e.n) })),
    sites: {
      top: topSites.map(s => ({ domain: s.domain, n: num(s.n), ok: num(s.ok), problems: num(s.problems), remembered: num(s.remembered), cmps: s.cmps })),
      failing: failing.map(s => ({ domain: s.domain, cmps: s.cmps, problems: num(s.problems), days: num(s.days) })),
      platforms: platforms.map(p => ({ cmp: p.cmp, n: num(p.n), ok: num(p.ok), problems: num(p.problems) })),
      rememberedVisits: num(remembered[0] && remembered[0].remembered), handledVisits: num(remembered[0] && remembered[0].handled)
    },
    reports: { byType: reportTypes.map(r => ({ type: r.issue_type, n: num(r.n) })), latest: reports }
  };
}

module.exports = async (req, res) => {
  cors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return fail(res, 405, 'GET only');
  if (rateLimited(req, 'stats', 300)) return fail(res, 429, 'Too many requests');
  if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 16) return fail(res, 503, 'Set ADMIN_TOKEN (16+ characters) in Vercel to use the dashboard');
  if (!authorized(req)) return fail(res, 401, 'Wrong or missing owner token');
  const q = (req.query && req.query.days) || new URL(req.url || '/', 'http://x').searchParams.get('days');
  const days = Math.min(Math.max(parseInt(q, 10) || 30, 1), 365);
  try {
    return res.status(200).json(await stats(days));
  } catch (e) {
    if (e.code === 'NO_DB') return fail(res, 503, e.message);
    console.error('stats failed', e.message);
    return fail(res, 500, 'Could not load stats');
  }
};
module.exports.stats = stats;
