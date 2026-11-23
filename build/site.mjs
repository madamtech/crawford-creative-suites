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
  // Gold, brass, champagne and bronze -> metallic rose gold matched to the rose
  // gold in the Madam Allure photo (#cb9671: warm copper-blush, not pink).
  if (h >= 22 && h <= 52 && s >= 0.18 && l > 0.08 && l < 0.97) return hslToRgb(24, Math.min(s, 0.5) * 0.9, l);
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
.digital-directory b{color:#daa681}
.memorial-grid article{min-height:0}
.ccs-sent{position:fixed;z-index:2147483000;left:50%;bottom:24px;transform:translateX(-50%);width:min(440px,calc(100% - 32px));padding:18px 20px;background:rgba(12,11,14,.97);color:#fff;border:1px solid rgba(255,255,255,.25);border-top:3px solid #cb9671;box-shadow:0 20px 60px rgba(0,0,0,.6);font:14px/1.5 Arial,Helvetica,sans-serif}
.ccs-sent strong{display:block;font:400 1.1rem Georgia,serif;margin-bottom:6px}
.ccs-sent p{margin:0 0 12px;color:#e6dcd6}
.ccs-sent a{color:#9cc0ff;text-decoration:underline}
.ccs-sent div{display:flex;gap:8px;flex-wrap:wrap}
.ccs-sent button{cursor:pointer;padding:9px 14px;border:1px solid #cb9671;background:transparent;color:#fff;font-size:.8rem}
.ccs-sent button[data-copy]{background:linear-gradient(135deg,#eccbb0,#b9805d);color:#21150d;border-color:#daa681;font-weight:700}
`;

// Building-only layout: lobby digital board, desk signage, Madam Allure rose gold,
// concierge voice button.
const building = `
/* Lobby: welcome + directory on one digital board */
.lobby-board{position:absolute;z-index:3;left:50.6%;top:5%;width:clamp(270px,19.5%,360px);background:rgba(8,8,11,.93);border:1px solid rgba(255,255,255,.22);box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 38px rgba(203,150,113,.16),0 24px 60px rgba(0,0,0,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.lobby-board .lobby-title{position:static!important;transform:none!important;width:auto!important;height:auto!important;display:block!important;padding:18px 16px 12px!important;background:none!important;border:0!important;text-align:center;overflow:visible!important}
.lobby-board .lobby-title h1{font-size:clamp(1.35rem,2.1vw,1.9rem)!important;margin:0 0 .5rem!important;line-height:1.05!important}
.lobby-board .lobby-title .brand-statement{margin-bottom:.35rem!important}
.lobby-board .digital-directory{position:static!important;transform:none!important;width:auto!important;display:block!important;inset:auto!important;max-height:none!important;overflow:visible!important;background:none!important;border:0!important;border-top:1px solid rgba(255,255,255,.16)!important;box-shadow:none!important;padding:4px 10px 10px!important}
.lobby-board .screen-header{padding:.5rem .3rem .45rem!important;font-size:.55rem;justify-content:center}
.lobby-board .screen-header i{display:none}
.lobby-board .digital-directory>button{display:grid!important;grid-template-columns:46px 1fr 16px!important;min-height:0!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.12)!important;padding:.62rem .35rem!important}
.lobby-board .digital-directory>button:last-child{border-bottom:0!important}
.lobby-board .digital-directory b{display:none}
.lobby-board .suite-no{font-size:1.4rem}
.lobby-board .digital-directory strong{font-size:1.02rem!important}
.lobby-board .digital-directory small{font-size:.68rem!important;white-space:normal}
@media (max-width:850px){.lobby-board{left:4%;right:4%;width:auto;top:auto;bottom:3%}.upgraded .concierge-card{top:3%!important;bottom:auto!important}}

/* Suites: name and tagline on the reception desk front; floor/suite plaque low */
.suite-sign{left:var(--desk-x,50%)!important;top:var(--desk-y,57%)!important;transform:translate(-50%,-50%);width:var(--sign-w,34%);max-width:none!important;text-align:center;pointer-events:none;z-index:2}
.suite-sign h1{font-size:clamp(1.7rem,3.1vw,3.2rem)!important;margin:0 0 .45rem!important;letter-spacing:.02em!important;line-height:1!important;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 0 18px rgba(0,0,0,.55),0 0 26px color-mix(in srgb,var(--suite-accent) 45%,transparent)}
.suite-sign p{font:italic 600 clamp(.78rem,1.05vw,1.05rem)/1.25 "Crimson Pro",Georgia,serif!important;letter-spacing:.03em!important;text-transform:none!important;margin:0!important;color:color-mix(in srgb,var(--suite-accent) 55%,#fff);text-shadow:0 1px 8px rgba(0,0,0,.9)}
/* Each sign sits in a solid area of its desk (never across the light wave). */
/* Owner choice: desks show the business title only; taglines are hidden (remove this line to show them). */
.suite-sign p{display:none!important}
.reception-scene[data-suite="217"]{--desk-y:56%;--sign-w:min(35%,560px)}
.reception-scene[data-suite="305"]{--desk-x:57%;--desk-y:45%;--sign-w:17%}
.reception-scene[data-suite="412"]{--desk-x:42%;--desk-y:51%;--sign-w:24%}
.suite-plaque{position:absolute;z-index:3;left:50%;bottom:3%;transform:translateX(-50%);padding:.5rem 1rem;background:rgba(10,9,12,.82);border:1px solid var(--suite-accent);color:var(--suite-accent);font-size:.6rem;letter-spacing:.22em;white-space:nowrap}
@media (max-width:560px){.suite-sign{top:4%!important;transform:translateX(-50%);width:92%;background:rgba(10,9,12,.55);padding:.6rem .8rem}.suite-plaque{display:none}}

/* Madam Allure's desk is white marble: deep rose-gold lettering, like engraved metal */
.suite-sign h1:has(.suite-logo){margin:0 0 .3rem!important;text-shadow:none}
.suite-logo{display:block;width:100%;height:auto;margin:0 auto;filter:drop-shadow(0 1px 0 rgba(255,255,255,.55)) drop-shadow(0 2px 3px rgba(70,40,25,.35))}
.reception-scene:not([data-suite="217"]) .suite-logo{filter:drop-shadow(0 0 10px color-mix(in srgb,var(--suite-accent) 35%,transparent))}
.reception-scene:not([data-suite="217"]) .suite-sign p{color:#e9f2f2;text-shadow:0 1px 6px #000}
@media (min-width:561px){
.reception-scene[data-suite="217"] .suite-sign p{color:#7a4e38;text-shadow:0 1px 0 rgba(255,255,255,.75);font-weight:700}
}
@media (max-width:560px){.suite-logo{width:78%;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}}

/* Madam Allure: rose gold from the boutique photo, not pink */
.reception-scene[data-suite="217"] .business-showroom header small{color:#daa681}
.reception-scene[data-suite="217"] .reception-desk,.reception-scene[data-suite="217"] .business-showroom{border-top-color:#cb9671;box-shadow:rgba(185,128,93,.24) 0 18px 55px}
.reception-scene[data-suite="217"] .guided-form>button,.reception-scene[data-suite="217"] .education-card button{color:#22150c;background:linear-gradient(125deg,#eccbb0,#b9805d 55%,#efd3bb);border-color:#cb9671}

/* Lounges: walk past reception into the back room before the tips appear.
   AI Clarity Lounge = glass meeting room (Floor 4); Maker's Lounge = studio with the 3D printer (Floor 3). */
.reception-scene>img{transition:transform 1.5s cubic-bezier(.45,.05,.3,1),filter 1.5s ease;transform-origin:var(--room,50% 40%)}
.reception-scene[data-suite="412"]{--room:96% 30%}
.reception-scene[data-suite="305"]{--room:90% 20%}
.reception-scene:has(.lounge)>img{transform:scale(1.65);filter:brightness(.72) blur(1.5px)}
.reception-scene:has(.lounge) .reception-desk,.reception-scene:has(.lounge) .suite-sign,.reception-scene:has(.lounge) .suite-plaque,.reception-scene:has(.lounge) .scene-actions{opacity:0;pointer-events:none;transition:opacity .4s ease}
.business-showroom.lounge{animation:loungeIn .6s ease 1.25s both}
@keyframes loungeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.reception-scene>img{transition:none}.business-showroom.lounge{animation:none}}

/* Office text uses the portal fonts: Instrument Serif headings, Lora body, Crimson Pro labels. */
.reception-scene .reception-heading strong,.reception-scene .business-showroom h2,.reception-scene .business-showroom h3,.reception-scene .business-showroom h4,.reception-scene .education-card h2{font-family:"Instrument Serif",Georgia,serif!important;font-weight:400!important;letter-spacing:.005em}
.reception-scene .reception-desk>p,.reception-scene .business-showroom p,.reception-scene .product-copy>p,.reception-scene .education-card>p{font-family:"Lora",Georgia,serif!important}
.reception-scene .reception-options button,.reception-scene .business-showroom header small,.reception-scene .reception-heading small{font-family:"Crimson Pro",Georgia,serif!important;font-style:italic;font-weight:600;letter-spacing:.06em}

/* Concierge voice and the sound switch (also shown on phones) */
.concierge-voice{display:inline-block;margin-top:.6rem;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid rgba(218,166,129,.6);color:#f4e6da;padding:.45rem .75rem;font-size:.68rem;letter-spacing:.04em}
.concierge-voice:hover,.concierge-voice:focus-visible{background:rgba(218,166,129,.18)}
@media (max-width:900px){.header-actions button:first-child{display:inline-block!important}}
`;

// ---------- building page ----------
writeFileSync(here('../suites/styles.css'), recolor(read('../src/ccs-styles.css')) + extras + building);
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@1,600&family=Instrument+Serif:ital@0;1&family=Lora:ital,wght@0,500;0,600;1,500&display=swap">
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
