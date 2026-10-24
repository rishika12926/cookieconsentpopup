/** Unit test for api/report.js with a mocked GitHub API. Run: node tests/api.test.js */
'use strict';
const assert = require('assert');
const handler = require('../api/report.js');

function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
const req = (body, method = 'POST') => ({ method, body, headers: { 'x-forwarded-for': '1.2.3.' + Math.random() } });

(async () => {
  let sent = null;
  global.fetch = async (url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return { ok: true, json: async () => ({ html_url: 'https://github.com/x/y/issues/1' }) }; };

  // Not configured → 503
  delete process.env.GITHUB_TOKEN;
  let res = mockRes(); await handler(req({ site: 'example.com', issueType: 'site_broken' }), res);
  assert.strictEqual(res.code, 503);

  process.env.GITHUB_TOKEN = 't'; process.env.GITHUB_REPO = 'me/cookieshield';
  // Bad site (full URL) → 400
  res = mockRes(); await handler(req({ site: 'https://example.com/path?q=secret' }), res);
  assert.strictEqual(res.code, 400);
  // Good report → issue created, unknown fields dropped
  res = mockRes(); await handler(req({ site: 'news.example.co.uk', issueType: 'banner_not_handled', cookies: 'SECRET', buttons: [{ label: 'Alle akzeptieren', type: 'ACCEPT_ALL' }], comment: 'hi' }), res);
  assert.strictEqual(res.code, 201);
  assert.strictEqual(res.body.issueUrl, 'https://github.com/x/y/issues/1');
  assert.ok(sent.url.endsWith('/repos/me/cookieshield/issues'));
  assert.ok(!JSON.stringify(sent.body).includes('SECRET'), 'unknown fields must be dropped');
  assert.ok(sent.body.labels.includes('site-report'));
  // OPTIONS preflight
  res = mockRes(); await handler(req(null, 'OPTIONS'), res);
  assert.strictEqual(res.code, 204);
  console.log('api/report.js: all 5 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
