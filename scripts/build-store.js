/**
 * Builds the package to upload to the Chrome Web Store:
 *   store/cookieshield-store-v<version>.zip   (manifest.json at the zip root, as the store requires)
 * The statistics/report server is baked in from CS_SERVER_URL (default: the production site).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { zip, listFiles } = require('./zip');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
const OUT = path.join(ROOT, 'store');
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
const server = (process.env.CS_SERVER_URL || 'https://cookieconsentpopup.vercel.app').replace(/\/+$/, '');
const configJson = JSON.stringify({ server }, null, 2) + '\n';

fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, `cookieshield-store-v${manifest.version}.zip`);
fs.writeFileSync(file, zip(EXT, '', { 'config.json': configJson }));
console.log(`${path.relative(ROOT, file)}: ${listFiles(EXT).length} files, version ${manifest.version}, statistics server ${server}`);
