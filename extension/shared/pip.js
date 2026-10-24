/**
 * Pip — CookieShield's penguin mascot (original character).
 * A round claymation-style penguin in a sky-blue knitted beanie. Moods follow the page status.
 */
(function () {
  'use strict';

  function eyes(mood) {
    switch (mood) {
      case 'happy':
        return `<path d="M40 62 q6 -7 12 0" stroke="#0b1b2b" stroke-width="3.4" fill="none" stroke-linecap="round"/>
                <path d="M68 62 q6 -7 12 0" stroke="#0b1b2b" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
      case 'sleepy':
        return `<path d="M40 63 q6 4 12 0" stroke="#0b1b2b" stroke-width="3.2" fill="none" stroke-linecap="round"/>
                <path d="M68 63 q6 4 12 0" stroke="#0b1b2b" stroke-width="3.2" fill="none" stroke-linecap="round"/>
                <text x="92" y="38" font-size="13" font-weight="800" fill="#5fa8d3" class="pip-z">z</text>
                <text x="101" y="28" font-size="10" font-weight="800" fill="#5fa8d3" class="pip-z pip-z2">z</text>`;
      case 'worried':
        return `<path d="M39 52 l11 4" stroke="#0b1b2b" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M81 52 l-11 4" stroke="#0b1b2b" stroke-width="2.6" stroke-linecap="round"/>
                <g class="pip-eyes"><circle cx="46" cy="64" r="6.5" fill="#fff"/><circle cx="74" cy="64" r="6.5" fill="#fff"/>
                <circle cx="46" cy="66" r="3.6" fill="#0b1b2b"/><circle cx="74" cy="66" r="3.6" fill="#0b1b2b"/></g>`;
      case 'thinking':
        return `<path d="M68 51 q7 -4 13 1" stroke="#0b1b2b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
                <g class="pip-eyes"><circle cx="46" cy="63" r="6.5" fill="#fff"/><circle cx="74" cy="63" r="6.5" fill="#fff"/>
                <circle cx="48" cy="61" r="3.6" fill="#0b1b2b"/><circle cx="76" cy="61" r="3.6" fill="#0b1b2b"/>
                <circle cx="49.3" cy="59.6" r="1.2" fill="#fff"/><circle cx="77.3" cy="59.6" r="1.2" fill="#fff"/></g>`;
      default:
        return `<g class="pip-eyes"><circle cx="46" cy="63" r="6.5" fill="#fff"/><circle cx="74" cy="63" r="6.5" fill="#fff"/>
                <circle cx="47" cy="64" r="3.8" fill="#0b1b2b"/><circle cx="75" cy="64" r="3.8" fill="#0b1b2b"/>
                <circle cx="48.4" cy="62.4" r="1.3" fill="#fff"/><circle cx="76.4" cy="62.4" r="1.3" fill="#fff"/></g>`;
    }
  }

  function svg(mood = 'calm', size = 96) {
    const flap = mood === 'happy' ? 'pip-wave' : '';
    return `
<svg class="pip pip-${mood}" viewBox="0 0 120 130" width="${size}" height="${size * 130 / 120}" role="img" aria-label="Pip the penguin, feeling ${mood}">
  <defs>
    <radialGradient id="pipBody" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#2f5185"/><stop offset="1" stop-color="#16294a"/></radialGradient>
    <radialGradient id="pipBelly" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2ea"/></radialGradient>
  </defs>
  <ellipse cx="60" cy="124" rx="30" ry="5" fill="#0b2a4a" opacity=".13"/>
  <ellipse cx="46" cy="120" rx="10" ry="5" fill="#f4a259"/><ellipse cx="74" cy="120" rx="10" ry="5" fill="#f4a259"/>
  <path class="pip-wing-l" d="M22 78 q-12 14 -6 30 q8 -4 14 -14z" fill="#1d3557"/>
  <path class="pip-wing-r ${flap}" d="M98 78 q12 14 6 30 q-8 -4 -14 -14z" fill="#1d3557"/>
  <ellipse cx="60" cy="76" rx="40" ry="44" fill="url(#pipBody)"/>
  <path d="M60 44c-19 0-30 13-30 32 0 21 13 38 30 38s30-17 30-38c0-19-11-32-30-32z" fill="url(#pipBelly)"/>
  ${eyes(mood)}
  <path d="M53 72 L60 ${mood === 'worried' ? 79 : 81} L67 72 Q60 69 53 72Z" fill="#f4a259"/>
  <circle cx="37" cy="74" r="5" fill="#f28482" opacity=".45"/><circle cx="83" cy="74" r="5" fill="#f28482" opacity=".45"/>
  <path d="M17 46 Q60 -2 103 46 Q105 53 98 53 L22 53 Q15 53 17 46Z" fill="#5fa8d3"/>
  <path d="M30 28 Q60 8 90 28" stroke="#4a90bd" stroke-width="2" fill="none" opacity=".6"/>
  <path d="M24 38 Q60 16 96 38" stroke="#4a90bd" stroke-width="2" fill="none" opacity=".6"/>
  <rect x="16" y="45" width="88" height="12" rx="6" fill="#cae9ff"/>
  <circle cx="60" cy="12" r="9" fill="#cae9ff"/>
</svg>`;
  }

  window.Pip = { svg };
})();
