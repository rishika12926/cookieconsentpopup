/** Small helpers shared by the API functions. */
'use strict';
const crypto = require('crypto');

function cors(res, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

function body(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
  return req.body;
}

/**
 * Best-effort abuse limit per warm instance. The IP is only hashed in memory to count requests
 * in the last hour; it is never stored or logged by this code.
 */
const buckets = new Map();
function rateLimited(req, name, max) {
  const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '').split(',')[0].trim() || 'x';
  const key = name + ':' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const now = Date.now();
  const list = (buckets.get(key) || []).filter(t => now - t < 3600 * 1000);
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) buckets.clear();
  return list.length > max;
}

const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max).trim();
const int = (v, max = 100000) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0; };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Accept only "today or the last 14 days" (UTC) so old or future data can't be injected. */
function validDay(d) {
  if (!DAY_RE.test(String(d))) return null;
  const t = Date.parse(d + 'T00:00:00Z');
  const now = Date.now();
  if (!Number.isFinite(t) || t > now + 36 * 3600 * 1000 || t < now - 15 * 86400 * 1000) return null;
  return d;
}
/** Registrable-looking hostname only: letters, digits, dots, dashes. No paths, ports or queries. */
const DOMAIN_RE = /^(?=.{3,120}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const domain = (d) => { const s = String(d || '').toLowerCase(); return DOMAIN_RE.test(s) ? s : null; };
const token = (s, max = 40) => { const v = clean(s, max); return /^[\w.:-]+$/.test(v) ? v : null; };

function fail(res, code, msg) { return res.status(code).json({ error: msg }); }

module.exports = { cors, body, rateLimited, clean, int, validDay, domain, token, fail };
