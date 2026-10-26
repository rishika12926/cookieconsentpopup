/**
 * Builds the static site for Vercel into ./public:
 *   web/**                      → public/
 *   extension/rules/*.json      → public/rules/   (rule-update feed the extension can subscribe to)
 *   extension/**                → public/download/cookieshield-extension.zip
 * No dependencies — includes a tiny ZIP writer.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

const { zip, listFiles } = require('./zip');

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, 'web'), OUT);
copyDir(path.join(ROOT, 'extension', 'rules'), path.join(OUT, 'rules'));
fs.mkdirSync(path.join(OUT, 'download'), { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension', 'manifest.json'), 'utf8'));
// The statistics/report server built into the downloadable extension: your production site on
// Vercel (VERCEL_PROJECT_PRODUCTION_URL), or CS_SERVER_URL to override. Empty = never sends.
const prodHost = process.env.CS_SERVER_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
const configJson = JSON.stringify({ server: prodHost.replace(/\/+$/, '') }, null, 2) + '\n';
fs.writeFileSync(path.join(OUT, 'download', 'cookieshield-extension.zip'), zip(path.join(ROOT, 'extension'), 'cookieshield-extension', { 'config.json': configJson }));
console.log(`Extension zip: statistics server = ${prodHost || '(none — this zip never sends anything)'}`);
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ version: manifest.version, builtAt: new Date().toISOString() }, null, 2));
fs.copyFileSync(path.join(ROOT, 'extension', 'icons', 'icon128.png'), path.join(OUT, 'icon.png'));
// Latest automated test metrics (committed by `npm run test:e2e`), shown on the landing page.
const report = path.join(ROOT, 'tests', 'results', 'e2e-report.json');
if (fs.existsSync(report)) fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(JSON.parse(fs.readFileSync(report, 'utf8')).metrics, null, 2));
// Repository link (Vercel exposes these during builds from GitHub).
const owner = process.env.VERCEL_GIT_REPO_OWNER, slug = process.env.VERCEL_GIT_REPO_SLUG;
fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify({ repoUrl: owner && slug ? `https://github.com/${owner}/${slug}` : null }));
console.log(`Built public/ — extension v${manifest.version}, ${listFiles(OUT).length} files`);
