/* Marks phones and tablets (including iPads that report a Mac) so pages can say CookieShield is laptop/desktop only,
   and wires any [data-share-install] button to share or copy the install link for opening on a computer. */
(function () {
  var ua = navigator.userAgent || '';
  var mobile = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints > 1 || (window.matchMedia && matchMedia('(pointer: coarse)').matches)));
  if (mobile) document.documentElement.classList.add('is-mobile');
  window.CS_IS_MOBILE = mobile;
  var LINK = 'https://cookieconsentpopup.vercel.app/install';
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share-install]');
    if (!b) return;
    e.preventDefault();
    var done = function () { var old = b.textContent; b.textContent = 'Link copied. Open it on your laptop'; setTimeout(function () { b.textContent = old; }, 3000); };
    if (navigator.share) { navigator.share({ title: 'Install CookieShield', text: 'Open this on my laptop to install CookieShield:', url: LINK }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(LINK).then(done, function () { prompt('Copy this link and open it on your laptop:', LINK); });
    else prompt('Copy this link and open it on your laptop:', LINK);
  });
})();
