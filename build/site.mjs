// Builds the public pages from the original ChatGPT files in src/:
//   index.html          arrival + preview lobby (was crawford-creative-suites)
//   suites/index.html   the full building (was tanika-creative-ventures)
//   suites/styles.css   original styling, recolored to the brand palette
// Brand recolor: gold/brass -> metallic rose gold, cool greys -> taupe,
// live indicators -> teal. Layout, sizes and images are unchanged.
import { readFileSync, writeFileSync } from 'node:fs';

const here = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(here(p), 'utf8');

// ---------- color helpers ----------
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  h /= 360;
  if (s === 0) return [l, l, l].map((v) => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const t = (x) => {
    if (x < 0) x += 1; if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [t(h + 1 / 3), t(h), t(h - 1 / 3)].map((v) => Math.round(v * 255));
}

// Returns a new [r,g,b] or null to leave the color alone.
function brand(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  // Gold, brass, champagne and bronze -> metallic rose gold (same lightness).
  if (h >= 22 && h <= 52 && s >= 0.18 && l > 0.08 && l < 0.97) return hslToRgb(352, Math.min(s, 0.55) * 0.85, l);
  // Mint "live" indicator dots -> teal.
  if (r === 110 && g === 217 && b === 154) return [33, 184, 176];
  // Cool/purple greys used for muted text -> warm taupe.
  if (s < 0.12 && l > 0.45 && l < 0.85 && !(r === g && g === b)) return hslToRgb(30, 0.12, l);
  return null;
}

const hex = (n) => n.toString(16).padStart(2, '0');
function recolor(css) {
  css = css.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*[\d.]+)?\)/g, (m, r, g, b, a) => {
    const c = brand(+r, +g, +b);
    if (!c) return m;
    return a ? `rgba(${c.join(', ')}${a})` : `rgb(${c.join(', ')})`;
  });
  css = css.replace(/#([0-9a-fA-F]{6})\b/g, (m, h6) => {
    const c = brand(parseInt(h6.slice(0, 2), 16), parseInt(h6.slice(2, 4), 16), parseInt(h6.slice(4), 16));
    return c ? '#' + c.map(hex).join('') : m;
  });
  return css;
}

// Shared additions: contrast, sapphire focus rings, request notice.
const extras = `
/* --- Crawford Creative Suites publishing fixes --- */
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
:focus-visible{outline-color:#4f7fe0}
.digital-directory small{color:#efe7e4!important;font-size:.66rem!important;line-height:1.45}
.digital-directory b{color:#e7b9bd}
.memorial-grid article{min-height:0}
.ccs-sent{position:fixed;z-index:2147483000;left:50%;bottom:24px;transform:translateX(-50%);width:min(440px,calc(100% - 32px));padding:18px 20px;background:rgba(12,11,14,.97);color:#fff;border:1px solid rgba(255,255,255,.25);border-top:3px solid #c98b93;box-shadow:0 20px 60px rgba(0,0,0,.6);font:14px/1.5 Arial,Helvetica,sans-serif}
.ccs-sent strong{display:block;font:400 1.1rem Georgia,serif;margin-bottom:6px}
.ccs-sent p{margin:0 0 12px;color:#e6dcd6}
.ccs-sent a{color:#9cc0ff;text-decoration:underline}
.ccs-sent div{display:flex;gap:8px;flex-wrap:wrap}
.ccs-sent button{cursor:pointer;padding:9px 14px;border:1px solid #c98b93;background:transparent;color:#fff;font-size:.8rem}
.ccs-sent button[data-copy]{background:linear-gradient(135deg,#e8bcc0,#b0707c);color:#1a1012;border-color:#e0aab0;font-weight:700}
`;

// ---------- building page ----------
writeFileSync(here('../suites/styles.css'), recolor(read('../src/ccs-styles.css')) + extras);
writeFileSync(here('../suites/index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Crawford Creative Suites</title>
<meta name="description" content="Explore Crawford Creative Suites—an immersive virtual business property featuring Madam Allure, Allure Fusions, and AI AuthoriTech.">
<meta property="og:title" content="Crawford Creative Suites">
<meta property="og:description" content="Beauty. Fabrication. Intelligence. One building. Three distinct destinations.">
<meta property="og:type" content="website">
<meta property="og:image" content="../img/main-lobby.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg">
<link rel="stylesheet" href="styles.css">
</head>
<body class="antialiased">
<div id="app"></div>
<noscript><p style="padding:2rem;font-family:Georgia,serif">Please turn on JavaScript to tour Crawford Creative Suites.</p></noscript>
<script src="app.js"></script>
</body>
</html>
`);

// ---------- arrival page ----------
let home = read('../src/ccs-preview.html');
const fullSite = 'https://tanika-creative-ventures.madamallure.chatgpt.site/';
home = home
  .split(fullSite).join('suites/')
  .replaceAll("url('assets/crawford-exterior.png')", "url('img/crawford-exterior.jpg')")
  .replaceAll("url('assets/crawford-lobby.png')", "url('img/crawford-lobby.jpg')")
  // ChatGPT's hosting injected this bot-check script; it does nothing off ChatGPT.
  .replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script>/, '')
  .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" href="favicon.svg">\n  <meta property="og:image" content="img/crawford-exterior.jpg">')
  .replace(/<style>([\s\S]*?)<\/style>/, (m, css) => `<style>${recolor(css)}\n    .descriptor{color:#fbeee9}.note{color:#b9aca3}${extras}</style>`);
if (home.includes('chatgpt.site') || home.includes('assets/')) throw new Error('arrival page still points at ChatGPT');
writeFileSync(here('../index.html'), home);

// Favicon (same seal as the original, in rose gold).
writeFileSync(here('../favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="9" fill="#100e0d"/><circle cx="32" cy="32" r="21" fill="none" stroke="#c98b93" stroke-width="2"/><text x="32" y="39" font-size="20" text-anchor="middle" fill="#f8f4ec" font-family="serif">CC</text></svg>`);
console.log('site built');
