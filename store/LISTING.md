# CookieShield: Chrome Web Store submission kit

Everything to copy and paste into the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).

- Package to upload: `store/cookieshield-store-v2.8.1.zip` (rebuild any time with `npm run build:store`)
- Images: `store/assets/` (four 1280×800 screenshots, one 440×280 promo tile)
- Icon: comes from the package (128×128)

---

## 1. Store listing tab

**Title** (from the package): CookieShield — Reject Cookie Pop-ups

**Summary** (from the package, 127 characters):
Rejects optional cookies on pop-ups, checks the site saved your 'no', tells you when it can't, and never clicks Accept for you.

**Description:**

```
Cookie pop-ups make saying "yes" easy and saying "no" hard. CookieShield says "no" for you.

WHAT IT DOES
• Rejects optional cookies on cookie pop-ups: clicks "Reject", or switches off every optional toggle.
• Never clicks "Accept" just to make a pop-up go away. If there is no safe way to say no (only an "Accept" button, or "pay or accept"), it stops and leaves the choice to you.
• Double-checks: after rejecting, it reads the website's own consent record (IAB TCF, OneTrust, Cookiebot, Didomi, Google Consent Mode and more) to confirm your "no" was saved.
• Tells you in plain words what happened on every site: rejected and confirmed, needs your choice, or the site ignored your "no".
• US privacy choices: also turns off "sale", "sharing" and "targeted advertising" where sites offer them.
• Remembers each site and keeps a searchable history of what was refused.
• Works in 25+ languages and can translate pages to English on your device with Chrome's built-in translator.
• You stay in control: want to say "yes" on a site? Switch that toggle back on and CookieShield respects it. Pause it on any site with one click.
• Checks the page still works after the pop-up is handled (scrolling, links, forms).

PRIVACY
• Your history and settings stay in your browser. No account, no ads.
• By default it sends one anonymous daily count (banners met, rejected, problems). Numbers only: no website names, no addresses, no ID. Switch it off in Settings.
• Sharing which websites show cookie banners is off unless you turn it on.
• Page text is never sent anywhere; translation happens on your device.

Open source: https://github.com/rishika12926/cookieconsentpopup
Website and test bench: https://cookieconsentpopup.vercel.app
```

**Category:** Privacy & Security (if not offered: Tools)
**Language:** English

**Graphic assets:** upload `promo-small-440x280.png` as the small promo tile, then `screenshot-1-rejected.png` to `screenshot-4-settings.png` in that order.

**Additional fields**
- Official URL / Homepage: https://cookieconsentpopup.vercel.app
- Support URL: https://cookieconsentpopup.vercel.app/report

---

## 2. Privacy practices tab

**Single purpose:**
CookieShield handles cookie consent pop-ups for the user: it rejects optional cookies, verifies the rejection was saved, and tells the user the result.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| storage | Saves the user's settings, the per-site history of rejected banners, and remembered choices so the same site is not handled again. |
| alarms | Runs a once-a-day task that sends the anonymous daily usage count (if enabled) and clears old data. |
| activeTab | Lets the popup show the result for the current tab and re-check that tab when the user presses "Check again". |
| declarativeNetRequest | Adds the Global Privacy Control header ("Sec-GPC: 1") to requests, only when the user switches that setting on. Off by default. |
| scripting | Registers a small script that sets navigator.globalPrivacyControl, only when the user turns on the Global Privacy Control setting. |
| Host permission (all sites) | Cookie consent pop-ups appear on any website, so the extension must run on every page to find the pop-up, click the reject option and read the site's consent record. It does not read or send page content. |

**Remote code:** No, I am not using remote code. (The rule file it can refresh is JSON data listing button selectors, not executable code.)

**Data usage — what to tick:**
- Web history: YES, only if the user opts in to "Share which websites show cookie banners" (domain names only, e.g. example.com, plus the consent tool and outcome). Off by default.
- Everything else (personally identifiable information, health, financial, authentication, personal communications, location, user activity, website content): NO.

**Certify all three:** not sold to third parties · not used for unrelated purposes · not used for creditworthiness or lending.

**Privacy policy URL:** https://cookieconsentpopup.vercel.app/privacy

---

## 3. Distribution tab

- Visibility: **Public** (or **Unlisted** if you only want people with the link to find it while you test)
- Regions: All regions

---

## 4. After it is approved

- Replace "Download the extension" on the website with the Chrome Web Store link.
- The dashboard shows official install and uninstall counts next to the numbers in /admin.
- For every update: bump `version` in `extension/manifest.json`, run `npm run build:store`, upload the new zip under Package.
