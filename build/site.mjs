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
.ccs-ask{position:fixed;z-index:2147483000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,calc(100% - 32px));padding:20px;background:rgba(12,11,14,.97);color:#fff;border:1px solid rgba(255,255,255,.25);border-top:3px solid #cb9671;box-shadow:0 20px 60px rgba(0,0,0,.6);font:14px/1.5 Arial,Helvetica,sans-serif}
.ccs-ask strong{display:block;font:400 1.15rem Georgia,serif;margin-bottom:6px}
.ccs-ask p{margin:0 0 14px;color:#e6dcd6}
.ccs-ask label{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.85rem;font-size:.75rem;color:#e4dee8}
.ccs-ask .field-pair{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.ccs-ask input{color:#fff;width:100%;font:inherit;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.28);padding:.72rem}
.ccs-ask form>div:last-child{display:flex;gap:8px;flex-wrap:wrap;margin-top:.4rem}
.ccs-ask button{cursor:pointer;padding:9px 14px;border:1px solid #cb9671;background:transparent;color:#fff;font-size:.8rem}
.ccs-ask button[type=submit]{background:linear-gradient(135deg,#eccbb0,#b9805d);color:#21150d;border-color:#daa681;font-weight:700}
@media (max-width:560px){.ccs-ask .field-pair{grid-template-columns:1fr}}
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
.lobby-board.scaled{transform-origin:0 0;right:auto}
.lobby-board.scaled .lobby-title h1{font-size:30.4px!important}
@media (max-width:850px){.lobby-board{left:4%;right:4%;width:auto;top:auto;bottom:3%}.upgraded .concierge-card{top:3%!important;bottom:auto!important}}

/* Lobby board: directory heading centered (owner, Nov 23). Board size/position stays locked. */
.lobby-board .screen-header{text-align:center}
/* Header: building name only; the three focuses already appear on the lobby board */
.building-name small{display:none!important}

/* AI AuthoriTech services: list and request form scroll together as one page
   (the form had been squeezed into a ~38px strip with its own scroll bar). */
.reception-scene .ai-grid{display:block!important;overflow-y:auto!important}
.reception-scene .ai-grid>.guided-form{overflow:visible!important;height:auto!important;max-height:none!important;border-top:1px solid rgba(255,255,255,.18);margin-top:.5rem;padding-top:1.1rem}

/* Readability (owner, Nov 23): panels use comfortable text sizes and less oversized headings. */
@media (min-width:851px){.reception-scene .business-showroom.business-showroom{width:min(640px,46vw)!important;bottom:calc(3% + 60px)!important}}
.reception-scene .business-showroom header h2{font-size:clamp(1.6rem,2.3vw,2.2rem)!important}
.reception-scene .business-showroom header p{font-size:.98rem!important;line-height:1.5!important}
.reception-scene .business-showroom header small{font-size:.72rem!important}
.reception-scene .business-showroom article h3,.reception-scene .business-showroom .service-strip h3{font-size:1.15rem!important;line-height:1.25!important}
.reception-scene .business-showroom article p,.reception-scene .business-showroom .service-strip p,.reception-scene .business-showroom .policy-notice p,.reception-scene .business-showroom label,.reception-scene .business-showroom legend{font-size:.95rem!important;line-height:1.55!important}
.reception-scene .business-showroom article strong{font-size:1rem!important}
.reception-scene .business-showroom article span{font-size:.8rem}
.reception-scene .business-showroom article{padding:1rem!important}
.reception-scene .education-card h2{font-size:clamp(1.6rem,2.4vw,2.3rem)!important;line-height:1.1!important}
.reception-scene .education-card>p{font-size:1rem!important;line-height:1.65!important}
.reception-scene .education-card .related{font-size:.9rem!important}
.reception-scene .education-card>small{font-size:.72rem!important}
.reception-scene .category-tabs button{font-size:.82rem!important;padding:.45rem .7rem!important}
.reception-scene .lounge-controls,.reception-scene .lounge-controls button{font-size:.85rem!important}
.reception-scene .lounge-notice{font-size:.82rem!important;line-height:1.5!important}
.card-guide ol{font-size:1rem!important}
.card-guide dl{font-size:.95rem!important}
.card-guide h3{font-size:1.4rem!important}

.reception-scene .scene-actions button{font-size:.85rem!important;padding:.65rem 1rem!important;letter-spacing:.06em}

/* Lounge buttons: translucent gradient in the suite's own color with a soft LED glow (owner, Nov 23). */
.reception-scene .lounge-controls button,.reception-scene .return-reception{background:linear-gradient(135deg,color-mix(in srgb,var(--suite-accent) 42%,transparent),color-mix(in srgb,var(--suite-accent) 14%,transparent))!important;border:1px solid color-mix(in srgb,var(--suite-accent) 75%,#fff)!important;color:#fff!important;font-weight:600;letter-spacing:.04em;border-radius:999px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 0 10px color-mix(in srgb,var(--suite-accent) 55%,transparent),inset 0 0 8px color-mix(in srgb,var(--suite-accent) 30%,transparent);transition:box-shadow .25s ease,transform .25s ease}
.reception-scene .lounge-controls button:hover,.reception-scene .return-reception:hover,.reception-scene .lounge-controls button:focus-visible,.reception-scene .return-reception:focus-visible{box-shadow:0 0 18px color-mix(in srgb,var(--suite-accent) 80%,transparent),inset 0 0 10px color-mix(in srgb,var(--suite-accent) 40%,transparent);transform:translateY(-1px)}
.reception-scene[data-suite="217"] .lounge-controls button,.reception-scene[data-suite="217"] .return-reception{color:#4a2a1a!important;background:linear-gradient(135deg,rgba(236,203,176,.55),rgba(203,150,113,.22))!important;border-color:rgba(203,150,113,.9)!important;box-shadow:0 0 12px rgba(214,160,120,.6),inset 0 0 8px rgba(255,236,214,.5)}
.reception-scene .lounge-controls button{padding:.5rem 1.15rem!important}
.reception-scene .return-reception{font-size:.8rem!important;padding:.45rem 1rem!important;width:auto!important;min-height:0!important;margin:.3rem 0 0 auto}
.reception-scene .lounge-controls span{color:#fff3e6!important;font-size:.85rem!important;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.5)}

.reception-scene .lounge-controls button.arrow-btn{width:2.6rem;height:2.6rem;padding:0!important;display:grid;place-items:center;font-size:1.25rem!important;line-height:1;border-radius:50%}
.reception-scene .lounge-controls{gap:1rem!important}


/* CCS seal glows until the real logo is ready (owner, Nov 24) */
.brand-seal,.building-name>span{color:#fbe7d3!important;border-color:#e2b28c!important;text-shadow:0 0 6px rgba(240,190,140,.9),0 0 14px rgba(214,150,105,.6);box-shadow:0 0 10px rgba(224,168,120,.55),inset 0 0 8px rgba(224,168,120,.35);animation:sealGlow 3.2s ease-in-out infinite}
@keyframes sealGlow{0%,100%{box-shadow:0 0 8px rgba(224,168,120,.45),inset 0 0 6px rgba(224,168,120,.3)}50%{box-shadow:0 0 18px rgba(236,185,140,.85),inset 0 0 10px rgba(236,185,140,.45)}}
@media(prefers-reduced-motion:reduce){.brand-seal,.building-name>span{animation:none}}

/* Audit (Nov 24) */
/* Header: the CCS seal only; the building name is on the lobby board. */
.building-name div{display:none!important}
.building-name>span{display:grid!important}
/* Lounge category tabs: same translucent glow family as the lounge buttons. */
.reception-scene .category-tabs button{background:linear-gradient(135deg,color-mix(in srgb,var(--suite-accent) 26%,transparent),color-mix(in srgb,var(--suite-accent) 8%,transparent))!important;border:1px solid color-mix(in srgb,var(--suite-accent) 60%,transparent)!important;color:#fff!important;border-radius:999px;box-shadow:0 0 6px color-mix(in srgb,var(--suite-accent) 35%,transparent);transition:box-shadow .25s ease}
.reception-scene .category-tabs button[aria-selected=true]{background:linear-gradient(135deg,color-mix(in srgb,var(--suite-accent) 60%,transparent),color-mix(in srgb,var(--suite-accent) 30%,transparent))!important;box-shadow:0 0 12px color-mix(in srgb,var(--suite-accent) 70%,transparent)}
.reception-scene[data-suite="217"] .category-tabs button{color:#4a2a1a!important;background:linear-gradient(135deg,rgba(236,203,176,.42),rgba(203,150,113,.14))!important;border-color:rgba(203,150,113,.75)!important}
.reception-scene[data-suite="217"] .category-tabs button[aria-selected=true]{background:linear-gradient(135deg,rgba(236,203,176,.75),rgba(203,150,113,.4))!important}
@media (max-width:560px){
  .building-header .header-actions button{font-size:.55rem!important;padding:.45rem .55rem!important}
  .reception-scene .lounge-body .category-tabs.category-tabs{flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:.3rem}
  .reception-scene .category-tabs::-webkit-scrollbar{display:none}
  .reception-scene .category-tabs button{flex:0 0 auto;white-space:nowrap}
}

/* Lobby concierge card: see-through glass like the other panels, kept clear of the concierge's face. */
.concierge-card{background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 45%),rgba(14,13,18,.42)!important;backdrop-filter:blur(14px) saturate(1.15);-webkit-backdrop-filter:blur(14px) saturate(1.15);border:1px solid rgba(255,255,255,.22)!important;box-shadow:0 18px 45px rgba(0,0,0,.35)}
.concierge-card p{color:rgba(255,255,255,.88)!important}
@media (min-width:851px){.upgraded .concierge-card,.concierge-card{left:2vw!important;width:min(360px,24vw)!important;min-width:290px}}

/* Lounge cards: the button opens the card's own ritual or explainer (build/lounge.js) */
.card-guide{margin-top:.9rem;padding:1rem 1.1rem;border-left:2px solid var(--suite-accent);background:rgba(0,0,0,.38);animation:guideIn .3s ease both}
@keyframes guideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.card-guide h3{margin:0 0 .6rem;font:400 1.35rem/1.15 "Instrument Serif",Georgia,serif;color:#fff}
.card-guide ol{margin:0;padding-left:1.25rem;color:rgba(255,255,255,.92);font-size:.86rem;line-height:1.6}
.card-guide li{margin:.2rem 0}
.card-guide dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:.55rem 1rem;font-size:.84rem;line-height:1.55}
.card-guide dt{font-weight:700;color:color-mix(in srgb,var(--suite-accent) 70%,#fff)}
.card-guide dd{margin:0;color:rgba(255,255,255,.92)}
.card-guide .guide-note{margin:.75rem 0 0;font-size:.78rem;color:rgba(255,255,255,.8)!important;font-style:italic}
.card-guide .guide-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.9rem}
.reception-scene .card-guide .guide-actions button{margin:0}
.reception-scene .card-guide [data-guide-close]{background:transparent!important;color:#fff!important;border:1px solid rgba(255,255,255,.4)!important}
.education-card.guided>button{display:none}
@media (max-width:560px){.card-guide dl{grid-template-columns:1fr;gap:.15rem}.card-guide dd{margin-bottom:.5rem}}

/* Elevator: four floor buttons on the car's own brass keypad (build/board.js places it) */
.upgraded .elevator-panel.on-wall{right:auto!important;bottom:auto!important;transform:none!important;padding:0!important;gap:0!important;display:flex!important;flex-direction:column-reverse;justify-content:space-evenly;align-items:center;background:linear-gradient(180deg,rgb(52,36,22),rgb(36,25,16) 35%,rgb(25,18,11))!important;border:0!important;box-shadow:inset 0 0 6px rgba(0,0,0,.5)}
.upgraded .elevator-panel.on-wall p{display:none}
/* Nov 25: business names and check-in screens are part of the reception photos (img/*-desk.jpg).
   The text sign stays for screen readers (and as the title strip on phones); the tablet button is an invisible tap area over the screen in the photo. */
@media (min-width:0px){.reception-scene .suite-sign{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;padding:0!important;margin:-1px!important;opacity:1!important}}
@media (min-width:0px){
.reception-scene[data-kiosk-inview] .checkin-tablet{left:var(--kiosk-x)!important;top:var(--kiosk-y)!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-100%)!important;width:var(--kiosk-w,90px)!important;height:var(--kiosk-h,68px)!important;aspect-ratio:auto!important;padding:0!important;background:transparent!important;border:0!important;border-radius:8px!important;box-shadow:none!important;transition:box-shadow .25s ease}
.reception-scene[data-kiosk-inview] .checkin-tablet:after,.reception-scene[data-kiosk-inview] .checkin-tablet .checkin-screen{display:none!important}
.reception-scene[data-kiosk-inview] .checkin-tablet:hover,.reception-scene[data-kiosk-inview] .checkin-tablet:focus-visible,.reception-scene[data-kiosk-inview] .checkin-tablet[aria-expanded="true"]{box-shadow:0 0 0 2px color-mix(in srgb,var(--suite-accent) 70%,#fff),0 0 18px color-mix(in srgb,var(--suite-accent) 70%,transparent)!important;outline:none}
}
.reception-scene[data-kiosk-inview] .reception-desk{left:var(--panel-x,var(--kiosk-x))!important;top:var(--kiosk-y)!important;right:auto!important;bottom:auto!important}
body[data-kiosk-open] .reception-scene[data-kiosk-inview] .reception-desk{bottom:auto!important}
.reception-scene[data-kiosk-inview] .reception-desk{transform-origin:50% calc(100% + 40px);transform:translate(-50%,calc(-100% - var(--kiosk-h,66px) - 8px)) scale(.12)!important}
body[data-kiosk-open] .reception-scene[data-kiosk-inview] .reception-desk{transform:translate(-50%,calc(-100% - var(--kiosk-h,66px) - 8px)) scale(1)!important}
.reception-scene[data-kiosk-inview][data-kiosk-below] .reception-desk{transform-origin:50% -10px;transform:translate(-50%,10px) scale(.12)!important}
body[data-kiosk-open] .reception-scene[data-kiosk-inview][data-kiosk-below] .reception-desk{transform:translate(-50%,10px) scale(1)!important}
/* Phones: show enough of the reception photo for the whole business name (about 620 photo px wide), fading into the dark band with the buttons. */
@media (max-width:560px){.reception-scene>img{height:min(100%,calc(100vw * 941 / 620))!important;bottom:auto!important;-webkit-mask-image:linear-gradient(to bottom,#000 88%,transparent);mask-image:linear-gradient(to bottom,#000 88%,transparent)}.reception-scene{background:#0b0a0d}}
/* Nov 25: the black "Select a destination" box over the doors is gone (still read aloud by screen readers). */
.elevator-status{position:absolute!important;width:1px!important;height:1px!important;min-width:0!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;border:0!important;white-space:nowrap}
.upgraded .elevator-panel.on-wall button{width:52%!important;min-width:0!important;min-height:0!important;aspect-ratio:1/1;padding:0;display:grid;place-items:center;font-size:1em!important;font-family:Georgia,serif;color:#e9c79a;background:radial-gradient(circle,rgb(30,22,15) 60%,rgb(24,17,11))!important;border:1.5px solid #c9a06c!important;border-radius:50%;box-shadow:0 0 4px rgba(233,190,130,.35),inset 0 0 3px rgba(0,0,0,.6);cursor:pointer}
.upgraded .elevator-panel.on-wall button:hover:not(:disabled){box-shadow:0 0 10px rgba(240,200,140,.8),inset 0 0 4px rgba(0,0,0,.5);color:#fff3dd}
.upgraded .elevator-panel.on-wall button[data-current]{opacity:1!important;color:#fff3dd;border-color:#f0cf9a!important;box-shadow:0 0 10px rgba(240,200,140,.9)}
/* Nov 25: floor keys are Art Deco diamonds (bronze glass, rose-gold edge; current floor lit) instead of round buttons. */
.upgraded .elevator-panel>button{position:relative;isolation:isolate;background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#f3dcb8!important;font:400 .95em/1 Georgia,serif!important;letter-spacing:0;text-shadow:0 1px 2px rgba(0,0,0,.8);transition:color .25s ease}
.upgraded .elevator-panel>button:before{content:"";position:absolute;inset:15%;z-index:-1;transform:rotate(45deg);border-radius:3px;background:linear-gradient(135deg,rgba(74,52,34,.95),rgba(26,18,12,.95) 55%,rgba(48,34,22,.95));border:1px solid #c98b6f;box-shadow:0 2px 5px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,225,200,.25),inset 0 0 0 2px rgba(20,14,9,.9),inset 0 0 0 3px rgba(201,139,111,.35);transition:box-shadow .25s ease,background .25s ease}
.upgraded .elevator-panel>button:hover:not(:disabled):before,.upgraded .elevator-panel>button:focus-visible:before{box-shadow:0 0 12px rgba(232,170,140,.75),inset 0 1px 0 rgba(255,225,200,.35),inset 0 0 0 2px rgba(20,14,9,.9),inset 0 0 0 3px rgba(232,170,140,.6)}
.upgraded .elevator-panel>button:hover:not(:disabled){color:#fff3e6!important}
.upgraded .elevator-panel>button:disabled{opacity:1!important;cursor:default!important}
.upgraded .elevator-panel>button[data-current]{color:#2a1a12!important;text-shadow:0 1px 0 rgba(255,235,220,.5)}
.upgraded .elevator-panel>button[data-current]:before{background:linear-gradient(135deg,#f6d2bf,#d99b84 50%,#b9755f);border-color:#f6d2bf;box-shadow:0 0 14px rgba(232,170,140,.85),inset 0 1px 0 rgba(255,255,255,.5)}
.upgraded .elevator-panel.on-wall>button{width:56%!important}
.lobby-question{margin:.3em 0 .8em;padding:.55em .75em;border-left:2px solid var(--suite-accent,#c49e84);background:rgba(255,255,255,.06);border-radius:4px;font:400 .78rem/1.55 Lora,Georgia,serif;color:#c7c0b8}
.lobby-question small{display:block;font:600 .55rem/1.4 "Crimson Pro",Georgia,serif;letter-spacing:.16em;color:#c49e84}
.lobby-question .lq-q{margin:.3em 0 .35em;font-style:italic;color:#eee6dd}
.lobby-question .lq-a{margin:0}
.upgraded .catalog-scroll>.catalog-section>div:first-child{position:sticky;top:-1px;z-index:2;background:linear-gradient(180deg,#2a1e16 85%,rgba(42,30,22,0));padding-top:.4em;padding-bottom:.6em}
.product-card.jump-hit{outline:2px solid #d99b84;outline-offset:3px;box-shadow:0 0 0 6px rgba(217,155,132,.18),0 8px 24px rgba(0,0,0,.25);transition:outline-color 1s ease,box-shadow 1s ease}
@media (max-width:850px){.upgraded .elevator-panel:not(.on-wall)>button{min-width:56px!important;min-height:56px!important;font-size:1.15rem!important}}

/* Suites: name and tagline on the reception desk front; floor/suite plaque low */
.suite-sign:not(.pinned){opacity:0!important}
.suite-sign.pinned{transition:opacity .35s ease}
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
.reception-scene[data-suite="217"]{--room:8% 38%}
/* Dedicated room photo (img/lounge-<id>.jpg): fades in after the walk toward the back. */
.lounge-room{position:absolute;inset:0;z-index:1;background:center/cover no-repeat;opacity:0;transition:opacity .9s ease;pointer-events:none}
.reception-scene:has(.lounge) .lounge-room.ready{opacity:1;transition:opacity .9s ease .8s}
.reception-scene:has(.lounge-room.ready) .business-showroom.lounge{background:rgba(10,10,14,.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
@keyframes loungeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.reception-scene>img{transition:none}.business-showroom.lounge{animation:none}}

/* Check-in tablet on the desk: the reception options stay hidden until it is tapped. */
.reception-scene .reception-desk{opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .3s ease,transform .3s ease,visibility 0s linear .3s}
body[data-kiosk-open] .reception-scene .reception-desk{opacity:1;visibility:visible;transform:none;transition:opacity .3s ease,transform .3s ease}
.kiosk-close{position:absolute;top:.5rem;right:.6rem;width:30px;height:30px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.35);color:#fff;font-size:1.1rem;line-height:1;cursor:pointer}
.checkin-tablet{position:absolute;z-index:4;left:var(--kiosk-x,64%);top:var(--kiosk-y,44%);transform:translate(-50%,-100%) perspective(500px) rotateX(10deg);width:clamp(74px,5.6vw,104px);aspect-ratio:4/3;padding:4px;border:1px solid rgba(255,255,255,.35);border-radius:7px;background:linear-gradient(160deg,#2a2a30,#0c0c10);box-shadow:0 6px 14px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.6);cursor:pointer}
.checkin-tablet:after{content:"";position:absolute;left:50%;bottom:-9px;width:14%;height:9px;transform:translateX(-50%);background:linear-gradient(90deg,#3a3a40,#16161a);border-radius:0 0 3px 3px}
.checkin-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;height:100%;border-radius:4px;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--suite-accent) 38%,#0b0b10),#07070a 75%);box-shadow:inset 0 0 12px color-mix(in srgb,var(--suite-accent) 45%,transparent);animation:kioskPulse 2.6s ease-in-out infinite}
.checkin-dot{width:7px;height:7px;border-radius:50%;background:var(--suite-accent);box-shadow:0 0 8px var(--suite-accent)}
.checkin-text{font:italic 600 clamp(.72rem,.95vw,.95rem)/1 "Crimson Pro",Georgia,serif;color:#fff;letter-spacing:.03em}
.checkin-sub{font-size:clamp(.45rem,.55vw,.56rem);letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.checkin-tablet:hover .checkin-screen,.checkin-tablet:focus-visible .checkin-screen,.checkin-tablet[aria-expanded="true"] .checkin-screen{animation:none;box-shadow:inset 0 0 18px var(--suite-accent),0 0 16px color-mix(in srgb,var(--suite-accent) 60%,transparent)}
@keyframes kioskPulse{0%,100%{box-shadow:inset 0 0 10px color-mix(in srgb,var(--suite-accent) 35%,transparent),0 0 0 transparent}50%{box-shadow:inset 0 0 16px color-mix(in srgb,var(--suite-accent) 60%,transparent),0 0 14px color-mix(in srgb,var(--suite-accent) 45%,transparent)}}
@media (prefers-reduced-motion:reduce){.checkin-screen{animation:none}}
/* Tablet sits on the counter at one end of each desk, clear of the receptionist. */
.reception-scene[data-suite="217"]{--kiosk-x:68%;--kiosk-y:44%}
.reception-scene[data-suite="305"]{--kiosk-x:32%;--kiosk-y:39%}
.reception-scene[data-suite="412"]{--kiosk-x:70%;--kiosk-y:43.5%}
.reception-scene:has(.lounge) .checkin-tablet,.reception-scene:has(.business-showroom) .checkin-tablet{opacity:0;pointer-events:none}
@media (max-width:850px){body[data-kiosk-open] .reception-scene .reception-desk{bottom:calc(3% + 104px)!important}}
/* Larger screens: the check-in panel grows out of the tablet, just above it. */
@media (min-width:851px){
.reception-scene .reception-desk{left:var(--panel-x,var(--kiosk-x,64%))!important;top:var(--kiosk-y,44%)!important;bottom:auto!important;width:min(440px,34vw)!important;transform-origin:50% calc(100% + 70px);transform:translate(-50%,calc(-100% - var(--kiosk-h,66px) - 8px)) scale(.12)!important;transition:opacity .35s ease,transform .35s cubic-bezier(.2,.8,.2,1),visibility 0s linear .35s!important}
body[data-kiosk-open] .reception-scene .reception-desk{transform:translate(-50%,calc(-100% - var(--kiosk-h,66px) - 8px)) scale(1)!important;transition:opacity .35s ease,transform .35s cubic-bezier(.2,.8,.2,1)!important}
}
@media (max-width:850px){.checkin-tablet{left:auto;right:5%;top:auto;bottom:3%;transform:none;width:118px}.checkin-tablet:after{display:none}.checkin-text{font-size:1rem}.checkin-sub{font-size:.55rem}}

/* Office text uses the portal fonts: Instrument Serif headings, Lora body, Crimson Pro labels. */
.reception-scene .reception-heading strong,.reception-scene .business-showroom h2,.reception-scene .business-showroom h3,.reception-scene .business-showroom h4,.reception-scene .education-card h2{font-family:"Instrument Serif",Georgia,serif!important;font-weight:400!important;letter-spacing:.005em}
.reception-scene .reception-desk>p,.reception-scene .business-showroom p,.reception-scene .product-copy>p,.reception-scene .education-card>p{font-family:"Lora",Georgia,serif!important}
.reception-scene .reception-options button,.reception-scene .business-showroom header small,.reception-scene .reception-heading small{font-family:"Crimson Pro",Georgia,serif!important;font-style:italic;font-weight:600;letter-spacing:.06em}

/* "Entrance" in the header: back out to the arrival page. Styled like the header buttons. */
.header-actions .entrance-link{display:inline-flex;align-items:center;letter-spacing:.08em;text-transform:uppercase;font-size:.62rem;padding:.6rem .8rem;border:1px solid rgba(255,255,255,.3);color:#fff;text-decoration:none}
.header-actions .entrance-link:hover,.header-actions .entrance-link:focus-visible{border-color:#daa681;color:#daa681}
@media (max-width:560px){.header-actions .entrance-link{padding:.55rem;font-size:.5rem}}

/* Frosted glass instead of black boxes: panels slide in from the side, the room stays visible. */
.reception-scene .business-showroom,.reception-scene .reception-desk{background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 45%),rgba(14,13,18,.42)!important;backdrop-filter:blur(18px) saturate(1.15);-webkit-backdrop-filter:blur(18px) saturate(1.15);border:1px solid rgba(255,255,255,.24)!important;border-radius:14px;box-shadow:0 0 0 1px rgba(0,0,0,.18),0 0 34px color-mix(in srgb,var(--suite-accent) 22%,transparent),0 22px 50px rgba(0,0,0,.35)!important;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.reception-scene .business-showroom{border-left:2px solid var(--suite-accent)!important;overflow:hidden;animation:glassIn .45s cubic-bezier(.2,.8,.2,1) both}
.reception-scene .business-showroom.lounge{animation:glassIn .55s cubic-bezier(.2,.8,.2,1) 1.25s both}
.reception-scene .reception-desk{border-top:2px solid var(--suite-accent)!important}
@keyframes glassIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}
@media (min-width:851px){.reception-scene .business-showroom{inset:2.5% 2% 6% auto!important;width:min(600px,40vw)!important}}
.reception-scene .business-showroom>header{border-bottom-color:rgba(255,255,255,.18)}
.reception-scene .education-card,.reception-scene .gift-set-grid article,.reception-scene .memorial-grid article,.reception-scene .offering-grid article{background:rgba(0,0,0,.26)!important;border-color:rgba(255,255,255,.18)!important;backdrop-filter:none}
.reception-scene .education-card{min-height:0}
.reception-scene .product-grid,.reception-scene .ai-grid,.reception-scene .gift-set-grid,.reception-scene .memorial-grid,.reception-scene .offering-grid{grid-template-columns:1fr!important}
.reception-scene .product-card{background:rgba(255,255,255,.92)}
.reception-scene .policy-notice,.reception-scene .service-strip{background:rgba(0,0,0,.22)}
.reception-scene .guided-form input,.reception-scene .guided-form select,.reception-scene .guided-form textarea{background:rgba(0,0,0,.3)!important;border-color:rgba(255,255,255,.28)!important;color:#fff}
.reception-scene:has(.lounge-room.ready) .business-showroom.lounge{background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 45%),rgba(14,13,18,.42)!important}
@media (prefers-reduced-motion:reduce){.reception-scene .business-showroom{animation:none!important}}
/* Bright rooms (Madam Allure): a deeper tint so text stays easy to read. */
.reception-scene[data-suite="217"] .business-showroom,.reception-scene[data-suite="217"] .reception-desk,.reception-scene[data-suite="217"]:has(.lounge-room.ready) .business-showroom.lounge{background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02) 45%),rgba(34,24,18,.62)!important}
.reception-scene .business-showroom p,.reception-scene .lounge-notice{color:rgba(255,255,255,.9)!important}
.reception-scene .business-showroom header small{color:color-mix(in srgb,var(--suite-accent) 70%,#fff)!important}
.reception-scene .category-tabs{flex-wrap:wrap!important;overflow:visible!important;gap:.4rem}
.reception-scene .product-card{text-shadow:none}
.reception-scene .product-card p{color:#5e5860!important}

/* Concierge voice and the sound switch (also shown on phones) */
.concierge-voice{display:inline-block;margin-top:.6rem;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid rgba(218,166,129,.6);color:#f4e6da;padding:.45rem .75rem;font-size:.68rem;letter-spacing:.04em}
.concierge-voice:hover,.concierge-voice:focus-visible{background:rgba(218,166,129,.18)}
.concierge-search:has(.concierge-mic){grid-template-columns:minmax(0,1fr) auto auto}
.concierge-search .concierge-mic{display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(218,166,129,.6);color:#f0c9ad;padding:.45rem .6rem;line-height:1}
.concierge-search .concierge-mic:hover,.concierge-search .concierge-mic:focus-visible{background:rgba(218,166,129,.18)}
.concierge-search .concierge-mic.listening{background:rgba(218,166,129,.3);box-shadow:0 0 0 2px rgba(218,166,129,.5),0 0 14px rgba(255,190,150,.55);animation:micPulse 1.2s ease-in-out infinite}
@keyframes micPulse{50%{box-shadow:0 0 0 4px rgba(218,166,129,.25),0 0 20px rgba(255,190,150,.7)}}
.concierge-go{display:inline-block;margin-top:.5rem;cursor:pointer;background:linear-gradient(135deg,rgba(218,166,129,.28),rgba(255,255,255,.06));border:1px solid rgba(218,166,129,.75);color:#fff3e8;padding:.5rem .8rem;font-size:.7rem;letter-spacing:.03em;box-shadow:0 0 12px rgba(255,190,150,.25)}
.concierge-go:hover,.concierge-go:focus-visible{background:rgba(218,166,129,.32)}
.reception-ask{position:absolute;z-index:6;left:2vw;top:3%;width:min(360px,24vw);box-sizing:border-box;padding:1rem 1.1rem;border-radius:14px;color:#fff;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 45%),rgba(14,13,18,.42);backdrop-filter:blur(14px) saturate(1.15);-webkit-backdrop-filter:blur(14px) saturate(1.15);border:1px solid rgba(255,255,255,.22);border-top:2px solid var(--suite-accent,rgba(218,166,129,.8));box-shadow:0 18px 45px rgba(0,0,0,.35);transition:opacity .3s ease}
.reception-ask small{display:block;font-size:.62rem;letter-spacing:.18em;color:rgba(255,255,255,.7)}
.reception-ask strong{display:block;margin:.25rem 0 .6rem;font-family:Lora,Georgia,serif;font-weight:400;font-size:1.05rem}
.reception-ask .concierge-search{margin-top:0}
.reception-ask .reception-answer{margin:.6rem 0 0;max-height:40vh;overflow:auto}
/* The receptionist card sits opposite the check-in panel: Allure Fusions' panel opens on the left. */
.reception-scene[data-suite="305"] .reception-ask{left:auto;right:2vw}
.reception-scene:has(.lounge) .reception-ask,.reception-scene:has(.business-showroom) .reception-ask{opacity:0;pointer-events:none}
@media (max-width:850px){.reception-ask{position:relative;left:auto;top:auto;width:auto;min-width:0;margin:12px 16px}}
@media (max-width:900px){.header-actions button:first-child{display:inline-block!important}}
`;

// ---------- building page ----------
writeFileSync(here('../suites/styles.css'), recolor(read('../src/ccs-styles.css')) + extras + building);
writeFileSync(here('../suites/index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
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
  // The source file itself now points at suites/; the split above is kept
  // so an older preview copy would still build correctly.
  .replaceAll("url('assets/crawford-exterior.png')", "url('img/crawford-exterior.jpg')")
  .replaceAll("url('assets/crawford-lobby.png')", "url('img/crawford-lobby-tv.jpg')")
  // ChatGPT's hosting injected this bot-check script; it does nothing off ChatGPT.
  .replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script>/, '')
  .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" href="favicon.svg">\n  <meta property="og:image" content="img/crawford-exterior.jpg">')
  .replace(/<style>([\s\S]*?)<\/style>/, (m, css) => `<style>${recolor(css)}\n    .descriptor{color:#fbeee9}.note{color:#b9aca3}${extras}</style>`);
if (home.includes('chatgpt.site') || home.includes('assets/')) throw new Error('arrival page still points at ChatGPT');
writeFileSync(here('../index.html'), home);

// Favicon (same seal as the original, in rose gold).
// List of recorded clips, so the voice player skips lines that are not recorded yet.
{ const { readdirSync } = await import('node:fs');
  writeFileSync(here('../audio/clips.json'), JSON.stringify(readdirSync(here('../audio')).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort())); }
writeFileSync(here('../favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="9" fill="#100e0d"/><circle cx="32" cy="32" r="21" fill="none" stroke="#c98b93" stroke-width="2"/><text x="32" y="39" font-size="16" text-anchor="middle" fill="#f8f4ec" font-family="serif">CCS</text></svg>`);
console.log('site built');
