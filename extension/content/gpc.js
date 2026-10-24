/**
 * CookieShield — Global Privacy Control (runs in the page's MAIN world at document_start)
 *
 * GPC is a browser signal meaning "do not sell or share my personal information". Several US
 * state laws (California, Colorado, Connecticut, New Jersey, Oregon, Texas…) require sites to
 * treat it as a valid opt-out, and many consent platforms (iubenda, OneTrust, Osano…) apply it
 * automatically. The matching `Sec-GPC: 1` request header is set by rules/gpc-dnr.json.
 * Registered by the service worker only while the setting is on, and never on paused sites.
 */
(function () {
  'use strict';
  try {
    if (navigator.globalPrivacyControl === true) return;
    Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true, enumerable: true });
  } catch (e) { /* ignore */ }
})();
