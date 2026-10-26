/**
 * Database access for the Vercel functions.
 *
 * Production: Neon Postgres (Vercel Marketplace → Neon sets DATABASE_URL automatically).
 * Tests: any executor `(text, params) => rows` can be injected with setExecutor().
 *
 * Privacy by design — what is NOT stored anywhere in this schema:
 *   no IP addresses, no user or install IDs, no full URLs, page titles, cookies or page text.
 * Usage data is stored only as daily totals per (day, extension version, browser major).
 */
'use strict';

let exec = null;
let schemaReady = null;

function setExecutor(fn) { exec = fn; schemaReady = null; }

function getExec() {
  if (exec) return exec;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  // Neon's serverless driver talks to Postgres over HTTPS — ideal for short-lived functions.
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);
  exec = async (text, params = []) => {
    const r = typeof sql.query === 'function' ? await sql.query(text, params) : await sql(text, params);
    return Array.isArray(r) ? r : (r && r.rows) || [];
  };
  return exec;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS usage_daily (
     day date NOT NULL, version text NOT NULL, browser text NOT NULL,
     active int NOT NULL DEFAULT 0, installs int NOT NULL DEFAULT 0, updates int NOT NULL DEFAULT 0,
     banners int NOT NULL DEFAULT 0, verified int NOT NULL DEFAULT 0, clicked int NOT NULL DEFAULT 0,
     needs_you int NOT NULL DEFAULT 0, failed int NOT NULL DEFAULT 0, false_success int NOT NULL DEFAULT 0,
     us_optouts int NOT NULL DEFAULT 0, page_optouts int NOT NULL DEFAULT 0, remembered int NOT NULL DEFAULT 0,
     manual int NOT NULL DEFAULT 0, errors int NOT NULL DEFAULT 0, translated int NOT NULL DEFAULT 0,
     handle_ms_sum bigint NOT NULL DEFAULT 0, handle_n int NOT NULL DEFAULT 0,
     PRIMARY KEY (day, version, browser))`,
  // Keyed daily counters: manual interventions ("manual:paused"), errors ("error:scan"), outcome reasons ("reason:ACCEPT_ONLY").
  `CREATE TABLE IF NOT EXISTS events_daily (
     day date NOT NULL, kind text NOT NULL, n int NOT NULL DEFAULT 0, PRIMARY KEY (day, kind))`,
  // OPT-IN only: which sites show banners, which platform, what happened. Domain only (e.g. "example.com").
  `CREATE TABLE IF NOT EXISTS sites_daily (
     day date NOT NULL, domain text NOT NULL, cmp text NOT NULL, outcome text NOT NULL,
     n int NOT NULL DEFAULT 0, reporters int NOT NULL DEFAULT 0,
     PRIMARY KEY (day, domain, cmp, outcome))`,
  `CREATE TABLE IF NOT EXISTS downloads_daily (day date PRIMARY KEY, n int NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS reports (
     id bigserial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
     site text, issue_type text, cmp text, status text, reason text, method text,
     buttons jsonb, banner_lang text, page_lang text, site_type text, health jsonb,
     comment text, version text, browser text, github_url text)`,
  `CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at DESC)`
];

async function ensureSchema() {
  const q = getExec();
  if (!q) throw Object.assign(new Error('Database not configured: add Neon from the Vercel Marketplace (sets DATABASE_URL)'), { code: 'NO_DB' });
  if (!schemaReady) {
    schemaReady = (async () => { for (const s of SCHEMA) await q(s, []); })().catch(e => { schemaReady = null; throw e; });
  }
  await schemaReady;
  return q;
}

async function query(text, params = []) {
  const q = await ensureSchema();
  return q(text, params);
}

module.exports = { query, setExecutor, ensureSchema, SCHEMA, injected: () => !!exec };
