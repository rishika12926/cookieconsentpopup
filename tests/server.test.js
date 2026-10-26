/**
 * Server tests against a REAL Postgres (same SQL as production on Neon).
 *
 * Needs `psql` and a database: set TEST_PG_HOST / TEST_PG_PORT / TEST_PG_USER (defaults: local
 * socket dir in $TEST_PG_HOST, port 5432, user postgres). In GitHub Actions a postgres service
 * provides it. If no database is reachable the test is skipped (exit 0) with a notice.
 *
 * Run: node tests/server.test.js
 */
'use strict';
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const db = require('../lib/db');

const PG = { host: process.env.TEST_PG_HOST || '/tmp', port: process.env.TEST_PG_PORT || '5432', user: process.env.TEST_PG_USER || 'postgres', db: 'cookieshield_test' };
const psqlArgs = (dbName) => ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', PG.host, '-p', String(PG.port), '-U', PG.user, '-d', dbName];

function reachable() {
  const r = spawnSync('psql', [...psqlArgs('postgres'), '-Atc', 'select 1'], { encoding: 'utf8', env: { ...process.env, PGPASSWORD: process.env.TEST_PG_PASSWORD || '' } });
  return r.status === 0;
}

/** Executor: runs one statement through psql with \bind parameters, returns rows as objects. */
function psqlExec(text, params = []) {
  const lit = (v) => v === null || v === undefined ? "''" : `'${String(v).replace(/'/g, "''")}'`;
  const isSelect = /^\s*select/i.test(text);
  const q = isSelect ? `SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json) FROM (${text}) q` : text;
  const script = params.length ? `${q} \\bind ${params.map(lit).join(' ')} \\g\n` : `${q};\n`;
  const out = execFileSync('psql', [...psqlArgs(PG.db), '-At'], { input: script, encoding: 'utf8', env: { ...process.env, PGPASSWORD: process.env.TEST_PG_PASSWORD || '' } });
  if (!isSelect) return [];
  return JSON.parse(out.trim() || '[]');
}

function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
let ipN = 0;
const req = (body, extra = {}) => ({ method: 'POST', body, headers: { 'x-forwarded-for': `10.0.0.${++ipN % 250}` }, ...extra });
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

(async () => {
  if (!reachable()) { console.log('server tests: SKIPPED (no Postgres reachable — set TEST_PG_HOST/TEST_PG_PORT)'); return; }
  execFileSync('psql', [...psqlArgs('postgres'), '-c', `DROP DATABASE IF EXISTS ${PG.db}`, '-c', `CREATE DATABASE ${PG.db}`], { stdio: 'ignore' });
  db.setExecutor(async (t, p) => psqlExec(t, p));
  let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

  const usage = require('../api/usage');
  const sites = require('../api/sites');
  const report = require('../api/report');
  const stats = require('../api/stats');
  const download = require('../api/download');

  // ---- A: usage summaries
  let res = mockRes();
  await usage(req({ day: today, version: '2.8.0', browser: 'Chrome 142', counts: { installs: 1, banners: 7, verified: 5, clicked: 1, needs_you: 1, manual: 2, errors: 1, handle_ms_sum: 7000, handle_n: 7 }, events: { 'manual:paused': 1, 'manual:reported': 1, 'error:scan': 1, 'reason:ACCEPT_ONLY': 1, 'url:https://x.com/secret': 5 } }), res);
  ok(res.code === 202, 'usage summary accepted');
  res = mockRes();
  await usage(req({ day: today, version: '2.8.0', browser: 'Chrome 142', counts: { banners: 3, verified: 2, failed: 1 }, userId: 'abc', url: 'https://x.com/a?b' }), res);
  ok(res.code === 202, 'second install’s summary accepted');
  res = mockRes(); await usage(req({ day: '2019-01-01', version: '2.8.0', counts: {} }), res);
  ok(res.code === 400, 'old days are refused');
  res = mockRes(); await usage(req({ day: today, version: '<script>', counts: {} }), res);
  ok(res.code === 400, 'junk versions are refused');
  const u = psqlExec(`select * from usage_daily`);
  ok(u.length === 1 && u[0].active === 2 && u[0].banners === 10 && u[0].installs === 1 && u[0].failed === 1, 'daily totals add up (2 active installs, 10 banners)');
  ok(!JSON.stringify(psqlExec(`select * from events_daily`)).includes('secret'), 'unknown event keys (like a URL) are dropped');
  const cols = psqlExec(`select column_name from information_schema.columns where table_schema='public'`).map(c => c.column_name);
  ok(!cols.some(c => /(^|_)(ip|ip_address|user_id|install_id|client_id|url|page_url|path|title|cookies?|user_agent)$/i.test(c) && c !== 'github_url'), 'no column can hold an IP, user/install ID, page URL, title, cookie or user agent');

  // ---- B: opt-in site stats
  res = mockRes();
  await sites(req({ day: today, entries: [
    { domain: 'news.example.com', cmp: 'onetrust', outcome: 'verified', n: 2 },
    { domain: 'shop.example.de', cmp: 'generic', outcome: 'failed', n: 1 },
    { domain: 'shop.example.de', cmp: 'generic', outcome: 'needs_you', n: 2 },
    { domain: 'news.example.com', cmp: 'onetrust', outcome: 'remembered', n: 3 },
    { domain: 'https://evil.com/path?q=1', cmp: 'x', outcome: 'verified' },
    { domain: 'ok.com', cmp: 'x', outcome: 'hacked' }
  ] }), res);
  ok(res.code === 202 && res.body.saved === 4, 'site stats saved; full URLs and unknown outcomes rejected');
  await sites(req({ day: yesterday, entries: [{ domain: 'shop.example.de', cmp: 'generic', outcome: 'failed', n: 1 }] }), mockRes());
  ok(!JSON.stringify(psqlExec(`select * from sites_daily`)).includes('evil'), 'no URL or path is stored');

  // ---- reports
  delete process.env.GITHUB_TOKEN; delete process.env.GITHUB_REPO;
  res = mockRes();
  await report(req({ site: 'shop.example.de', issueType: 'banner_not_handled', cmpId: 'generic', status: 'NEEDS_YOU', comment: 'Banner stayed', buttons: [{ label: 'Akzeptieren', type: 'ACCEPT' }], cookies: 'SECRET' }), res);
  ok(res.code === 201 && res.body.saved, 'report saved to the database without GitHub');
  ok(!JSON.stringify(psqlExec(`select * from reports`)).includes('SECRET'), 'report fields outside the allow-list are dropped');

  // ---- downloads
  const dres = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() { this.ended = true; } };
  await download({ method: 'GET', headers: {} }, dres);
  ok(dres.statusCode === 302 && dres.headers.Location.endsWith('.zip'), 'download redirects to the zip and is counted');

  // ---- stats (owner only)
  process.env.ADMIN_TOKEN = 'test-owner-token-1234567890';
  res = mockRes(); await stats({ method: 'GET', headers: {}, query: { days: '30' } }, res);
  ok(res.code === 401, 'stats need the owner token');
  res = mockRes(); await stats({ method: 'GET', headers: { authorization: 'Bearer wrong' }, query: {} }, res);
  ok(res.code === 401, 'wrong token refused');
  res = mockRes(); await stats({ method: 'GET', headers: { authorization: 'Bearer test-owner-token-1234567890' }, query: { days: '30' } }, res);
  const s = res.body;
  ok(res.code === 200, 'owner gets stats');
  ok(s.summary.downloads === 1 && s.summary.installs === 1 && s.summary.activeLatestDay === 2, 'downloads, installs and active installs');
  ok(s.summary.banners === 10 && s.summary.rejected === 8 && s.summary.successRate === 80, `success rate = rejected / decided (${s.summary.successRate}%)`);
  ok(s.summary.avgHandleMs === 1000, 'average handling time');
  ok(s.manual.find(m => m.kind === 'paused').n === 1 && s.errors.find(e => e.kind === 'scan').n === 1, 'manual interventions and errors by kind');
  ok(s.sites.top[0].domain === 'news.example.com' && s.sites.failing[0].domain === 'shop.example.de' && s.sites.failing[0].days === 2, 'top sites and repeatedly failing sites');
  ok(s.sites.platforms.find(p => p.cmp === 'onetrust').ok === 2, 'consent platforms');
  ok(s.sites.rememberedVisits === 3, 'remembered-on-revisit counts');
  ok(s.reports.latest.length === 1 && s.reports.byType[0].type === 'banner_not_handled', 'reports listed by type');

  execFileSync('psql', [...psqlArgs('postgres'), '-c', `DROP DATABASE IF EXISTS ${PG.db}`], { stdio: 'ignore' });
  console.log(`server tests: all ${n} checks passed (real Postgres)`);
})().catch(e => { console.error(e); process.exit(1); });
