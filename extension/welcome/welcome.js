/* First-run page: explains what CookieShield shares and lets the person choose. */
(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  $('pip').innerHTML = window.Pip.svg('happy', 96);
  const s = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  $('usage').checked = s.usageStats !== false;
  $('sites').checked = s.siteStats === true;
  let server = s.serverUrl;
  if (!server) { try { server = (await (await fetch(chrome.runtime.getURL('config.json'))).json()).server; } catch (e) { server = ''; } }
  if (server) $('privacy-link').href = `${server.replace(/\/+$/, '')}/privacy`;
  else $('privacy-link').href = chrome.runtime.getURL('options/options.html#about');
  $('done').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'SET_SETTINGS', payload: { usageStats: $('usage').checked, siteStats: $('sites').checked, welcomeSeen: true } });
    $('saved').textContent = 'Saved ✓ You can close this tab.';
    setTimeout(() => window.close(), 1200);
  });
})();
