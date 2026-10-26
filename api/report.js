/**
 * POST /api/report — receives an opt-in, anonymized problem report from the extension (or the
 * web form) and files it as a GitHub issue labelled "site-report", so new site patterns can be
 * added to extension/rules/cmp-rules.json.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   GITHUB_TOKEN  fine-grained token with "Issues: Read and write" on your repository only
 *   GITHUB_REPO   "your-username/cookieshield"
 *
 * Privacy: only whitelisted fields are kept. No IP addresses are stored or forwarded.
 */
'use strict';
const db = require('../lib/db');

const ISSUE_TYPES = new Set(['banner_not_handled', 'wrong_choice', 'site_broken', 'translation', 'other']);
const recent = new Map(); // best-effort, per warm instance: ip-hash -> timestamps

function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max).trim(); }

function sanitize(b) {
  const site = clean(b.site, 120).toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$|^[a-z0-9.-]+\.localhost$/.test(site)) throw new Error('site must be a bare hostname, e.g. example.com');
  const issueType = ISSUE_TYPES.has(b.issueType) ? b.issueType : 'other';
  return {
    site, issueType,
    comment: clean(b.comment, 500),
    cmpId: clean(b.cmpId, 40) || null,
    status: clean(b.status, 30) || null,
    reason: clean(b.reason, 60) || null,
    method: clean(b.method, 60) || null,
    buttons: (Array.isArray(b.buttons) ? b.buttons : []).slice(0, 12).map(x => ({ label: clean(x && x.label, 60), type: clean(x && x.type, 20) })),
    bannerLang: clean(b.bannerLang, 10) || null,
    pageLang: clean(b.pageLang, 10) || null,
    siteType: clean(b.siteType, 30) || null,
    health: Array.isArray(b.health) ? b.health.slice(0, 8).map(h => clean(h, 30)) : null,
    selector: clean(b.selector, 120) || null,
    extensionVersion: clean(b.extensionVersion, 20) || null,
    browser: clean(b.browser, 30) || null
  };
}

function rateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const key = require('crypto').createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const now = Date.now();
  const list = (recent.get(key) || []).filter(t => now - t < 60 * 60 * 1000);
  list.push(now);
  recent.set(key, list);
  return list.length > 20;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req)) return res.status(429).json({ error: 'Too many reports, try again later' });

  let report;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    report = sanitize(body);
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }

  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  const hasDb = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || process.env.NEON_DATABASE_URL || db.injected());
  if (!hasDb && (!token || !repo)) {
    return res.status(503).json({ error: 'Report server not configured (add Neon from the Vercel Marketplace, and/or set GITHUB_TOKEN and GITHUB_REPO)' });
  }
  // 1. Save to the database (shown on the /admin dashboard).
  let saved = false;
  if (hasDb) {
    try {
      await db.query(`INSERT INTO reports (site, issue_type, cmp, status, reason, method, buttons, banner_lang, page_lang, site_type, health, comment, version, browser)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14)`,
        [report.site, report.issueType, report.cmpId, report.status, report.reason, report.method, JSON.stringify(report.buttons),
         report.bannerLang, report.pageLang, report.siteType, JSON.stringify(report.health || []), report.comment, report.extensionVersion, report.browser]);
      saved = true;
    } catch (e) { console.error('report insert failed', e.message); }
  }
  // 2. Optionally also file it as a GitHub issue.
  if (!token || !repo) return saved ? res.status(201).json({ ok: true, saved }) : res.status(500).json({ error: 'Could not save the report' });

  const title = `[${report.issueType.replace(/_/g, ' ')}] ${report.site}${report.cmpId ? ` (${report.cmpId})` : ''}`;
  const lines = [
    `**Site:** ${report.site}`,
    `**Problem:** ${report.issueType.replace(/_/g, ' ')}`,
    `**Outcome:** ${report.status || '–'} ${report.reason ? `(${report.reason})` : ''}`,
    `**Platform:** ${report.cmpId || 'unknown'} · **Method:** ${report.method || '–'}`,
    `**Banner language:** ${report.bannerLang || '–'} · **Website type:** ${report.siteType || '–'}`,
    report.comment ? `\n> ${report.comment.replace(/\n/g, '\n> ')}` : '',
    report.buttons.length ? `\n**Buttons seen:**\n${report.buttons.map(b => `- \`${b.type}\` “${b.label}”`).join('\n')}` : '',
    report.health && report.health.length ? `\n**Page check after handling:** ${report.health.join(', ')}` : '',
    `\n<details><summary>Raw report</summary>\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n</details>`,
    '\n_Filed automatically from an opt-in, anonymized CookieShield report. To fix: add or adjust a rule in `extension/rules/cmp-rules.json` and a fixture in `web/playground/`._'
  ].filter(Boolean).join('\n');

  try {
    const gh = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'cookieshield-report' },
      body: JSON.stringify({ title, body: lines, labels: ['site-report', report.issueType] })
    });
    if (!gh.ok) return saved ? res.status(201).json({ ok: true, saved, github: `GitHub answered ${gh.status}` }) : res.status(502).json({ error: `GitHub answered ${gh.status}` });
    const issue = await gh.json();
    if (saved) { try { await db.query(`UPDATE reports SET github_url = $1 WHERE id = (SELECT max(id) FROM reports WHERE site = $2)`, [issue.html_url, report.site]); } catch (e) { /* ignore */ } }
    return res.status(201).json({ ok: true, saved, issueUrl: issue.html_url });
  } catch (e) {
    return saved ? res.status(201).json({ ok: true, saved, github: 'Could not reach GitHub' }) : res.status(502).json({ error: 'Could not reach GitHub' });
  }
};
