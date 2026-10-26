/**
 * GET /api/download — counts a download of the extension zip, then sends the file.
 * Only a daily total is kept (no IP, no user agent, nothing else).
 */
'use strict';
const db = require('../lib/db');

module.exports = async (req, res) => {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await db.query(`INSERT INTO downloads_daily (day, n) VALUES ($1, 1) ON CONFLICT (day) DO UPDATE SET n = downloads_daily.n + 1`, [day]);
  } catch (e) { /* never block the download because of counting */ }
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 302;
  res.setHeader('Location', '/download/cookieshield-extension.zip');
  res.end();
};
