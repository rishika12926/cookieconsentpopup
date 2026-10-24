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

function listFiles(dir, base = dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(p, base)); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out.sort();
}

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zip(dir, prefix) {
  const files = listFiles(dir);
  const chunks = [], central = [];
  let offset = 0;
  const dosTime = 0, dosDate = (2026 - 1980) << 9 | 10 << 5 | 24;
  for (const rel of files) {
    const data = fs.readFileSync(path.join(dir, rel));
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const name = Buffer.from(`${prefix}/${rel}`);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, name, comp);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += 30 + name.length + comp.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cenBuf, end]);
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, 'web'), OUT);
copyDir(path.join(ROOT, 'extension', 'rules'), path.join(OUT, 'rules'));
fs.mkdirSync(path.join(OUT, 'download'), { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension', 'manifest.json'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'download', 'cookieshield-extension.zip'), zip(path.join(ROOT, 'extension'), 'cookieshield-extension'));
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ version: manifest.version, builtAt: new Date().toISOString() }, null, 2));
fs.copyFileSync(path.join(ROOT, 'extension', 'icons', 'icon128.png'), path.join(OUT, 'icon.png'));
// Latest automated test metrics (committed by `npm run test:e2e`), shown on the landing page.
const report = path.join(ROOT, 'tests', 'results', 'e2e-report.json');
if (fs.existsSync(report)) fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(JSON.parse(fs.readFileSync(report, 'utf8')).metrics, null, 2));
// Repository link (Vercel exposes these during builds from GitHub).
const owner = process.env.VERCEL_GIT_REPO_OWNER, slug = process.env.VERCEL_GIT_REPO_SLUG;
fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify({ repoUrl: owner && slug ? `https://github.com/${owner}/${slug}` : null }));
console.log(`Built public/ — extension v${manifest.version}, ${listFiles(OUT).length} files`);
