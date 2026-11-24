// Applies the publishing fixes to the original ChatGPT-built building code.
// src/ccs-app.js stays untouched; the patched copy goes to build/app.patched.js.
import { readFileSync, writeFileSync } from 'node:fs';

let src = readFileSync(new URL('../src/ccs-app.js', import.meta.url), 'utf8');

const patches = [
  // Scene images now live in /img and are referenced relative to /suites/.
  ['src:`/main-lobby.png`', 'src:`../img/main-lobby.jpg`'],
  ['src:`/elevator.png`', 'src:`../img/elevator.jpg`'],
  ['image:`/madam-allure-rose-gold.png`', 'image:`../img/madam-allure.jpg`'],
  ['image:`/allure-fusions-gallery.png`', 'image:`../img/allure-fusions.jpg`'],
  ['image:`/reception-303.jpg`', 'image:`../img/ai-authoritech.jpg`'],

  // Sound (chime, concierge voice, floor announcements) is off until the visitor
  // turns it on; the choice is remembered on their device (build/voice.js).
  ['[b,x]=(0,r.useState)(!0)', '[b,x]=(0,r.useState)(()=>window.ccsVoice.isOn())'],
  ['onClick:()=>x(e=>!e)', 'onClick:()=>x(e=>window.ccsVoice.setOn(!e))'],

  // Elevator announces the floor as the car arrives (before the doors open),
  // then the receptionist greets the visitor once the doors have opened.
  ['t(`traveling`);', 't(`traveling`),window.ccsVoice.approach(e);'],
  ['z(),y(!1)', 'z(),window.ccsVoice.arrive(e),y(!1)'],

  // Concierge speaks: a "Hear the concierge" button, and spoken replies.
  ['(0,i.jsx)(`p`,{children:`Tell me what you need or choose a destination below.`}),',
   '(0,i.jsx)(`p`,{children:`Tell me what you need, or choose a suite on the board.`}),(0,i.jsx)(`button`,{type:`button`,className:`concierge-voice`,onClick:()=>{x(window.ccsVoice.setOn(!0)),window.ccsVoice.greet()},children:b?`🔊 Hear the greeting again`:`🔊 Hear the concierge`}),'],
  ['D({217:`', 'D(window.ccsVoice.say({217:`'],
  // FAQ concierge (build/faq.js): answer common questions first, and offer a
  // button to the matching suite instead of whisking the visitor away.
  ['H=e=>{e.preventDefault();let t=w.trim(),', 'H=e=>{e.preventDefault();let t=w.trim();window.ccsFaqGo=null;{let f=window.ccsFaq&&window.ccsFaq.answer(t);if(f){window.ccsFaqGo=f.suite;D(f.text);return}}let '],
  ['E&&(0,i.jsx)(`p`,{className:`concierge-reply`,"aria-live":`polite`,children:E})', 'E&&(0,i.jsx)(`p`,{className:`concierge-reply`,"aria-live":`polite`,children:E}),E&&window.ccsFaqGo&&c[window.ccsFaqGo]&&(0,i.jsx)(`button`,{type:`button`,className:`concierge-go`,onClick:()=>{let s=window.ccsFaqGo;window.ccsFaqGo=null;V(s)},children:`Take me to `+c[window.ccsFaqGo].name+` →`})'],
  // The concierge finishes her answer before the visitor is taken to the elevator.
  ['}[r]),window.setTimeout(()=>V(r),700)', '}[r])),window.ccsVoice.afterSpeech(()=>V(r),700)'],

  // Lounges: Previous and Next are enough; no Surprise Me button.
  ['(0,i.jsx)(`button`,{onClick:q,children:`Surprise Me`}),', ''],

  // Lounges: arrow-only Previous / Next (labels kept for screen readers).
  ['(0,i.jsx)(`button`,{onClick:()=>F(e=>(e-1+W.length)%W.length),children:`← Previous`})', '(0,i.jsx)(`button`,{className:`arrow-btn`,"aria-label":`Previous card`,title:`Previous`,onClick:()=>F(e=>(e-1+W.length)%W.length),children:`←`})'],
  ['(0,i.jsx)(`button`,{onClick:()=>F(e=>(e+1)%W.length),children:`Next →`})', '(0,i.jsx)(`button`,{className:`arrow-btn`,"aria-label":`Next card`,title:`Next`,onClick:()=>F(e=>(e+1)%W.length),children:`→`})'],

  // Audit (Nov 24): say the building name once in the lobby, and shorter lounge intros.
  ['(0,i.jsx)(`span`,{children:`CRAWFORD CREATIVE SUITES DIRECTORY`})', '(0,i.jsx)(`span`,{children:`DIRECTORY`})'],
  ['welcome:`Welcome to The Powder Room—a quiet place to explore beauty rituals, fragrance, body care, grooming, and the ingredients behind the Madam Allure experience.`', 'welcome:`Self-care rituals and tips, made for the herbs, oils, and butters we love.`'],
  ['welcome:`Welcome to The Maker’s Lounge—where ideas, images, materials, and technology come together to create something dimensional.`', 'welcome:`Ideas and know-how for custom 3D printing and laser design.`'],
  ['welcome:`Welcome to The AI Clarity Lounge—a practical space for separating AI facts from hype and discovering where intelligent tools can genuinely support your business.`', 'welcome:`Plain-language AI facts, myths, and first steps for your business.`'],

  // Lounges: extra tip cards (build/lounge-guides.js) so every topic has at least three.
  ['W=A?l[A].cards.filter', 'W=A?l[A].cards.concat(window.ccsExtraCards&&window.ccsExtraCards[A]||[]).filter'],
  ['D(`I couldn’t quite place that—try the directory below or mention what kind of business you need.`)',
   'D(window.ccsVoice.say(`I couldn’t quite place that. Try the directory, or tell me what kind of business you need.`))'],

  // A way back out to the entrance page (the arrival site with the three businesses).
  ['(0,i.jsx)(`button`,{onClick:()=>t(`elevator`),children:`Elevator`})',
   '(0,i.jsx)(`button`,{onClick:()=>t(`elevator`),children:`Elevator`}),(0,i.jsx)(`a`,{className:`entrance-link`,href:`../`,children:`Entrance`})'],

  // Madam Allure's lounge, The Powder Room (owner's lounge plan): a reception
  // button, and its card buttons lead to the product catalog.
  ['n===`217`&&(0,i.jsxs)(`button`,{onClick:()=>k(`services`),children:[`Browse products & pricing `,(0,i.jsx)(`span`,{children:`→`})]})',
   'n===`217`&&(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)(`button`,{onClick:()=>k(`services`),children:[`Browse products & pricing `,(0,i.jsx)(`span`,{children:`→`})]}),(0,i.jsxs)(`button`,{onClick:()=>U(`powder`),children:[`Step into The Powder Room `,(0,i.jsx)(`span`,{children:`→`})]})]})'],
  ['J=()=>{A===`maker`?(j(null),k(`project`)):(j(null),k(`ai`))}',
   'J=()=>{let t=window.ccsLoungeGo||(A===`maker`?`services`:A===`powder`?`services`:`ai`);window.ccsLoungeGo=null,j(null),k(t)}'],

  // Lounges: a spoken welcome as the visitor walks into the room.
  ['U=e=>{j(e),', 'U=e=>{window.ccsVoice.lounge(e),j(e),'],

  // Madam Allure's accent matches the rose gold in the boutique photo (not pink).
  ['accent:`#d891a0`', 'accent:`#cb9671`'],

  // Suite sign: each business's portal title image (Madam Allure: rose gold
  // signature) and tagline sit on a solid part of the reception desk; the
  // "Floor · Suite" label moves to its own plaque low on the screen.
  ['(0,i.jsxs)(`div`,{className:`suite-sign`,children:[(0,i.jsxs)(`small`,{children:[`FLOOR `,R.floor,` · SUITE `,n]}),(0,i.jsx)(`h1`,{children:R.name}),(0,i.jsx)(`p`,{children:R.tagline})]}),',
   '(0,i.jsxs)(`div`,{className:`suite-sign`,children:[(0,i.jsx)(`h1`,{children:(0,i.jsx)(`img`,{className:`suite-logo`,src:{217:`../img/madam-allure-signature.png`,305:`../img/allure-fusions-title.png`,412:`../img/ai-authoritech-title.png`}[n],alt:R.name})}),(0,i.jsx)(`p`,{children:R.tagline})]}),(0,i.jsxs)(`div`,{className:`suite-plaque`,children:[`FLOOR `,R.floor,` · SUITE `,n]}),'],

  // Memorial gifts: drop the "Gallery Image Coming Soon" placeholder boxes.
  ['(0,i.jsx)(`span`,{children:`Gallery Image Coming Soon`}),', ''],

  // Madam Allure product questions go to the Madam Allure inbox.
  ['mailto:hello@aiauthoritytech.com?subject=${encodeURIComponent(`Madam Allure',
   'mailto:madamallure@gmail.com?subject=${encodeURIComponent(`Madam Allure'],

  // Forms: route to the right business inbox, with a copy-to-clipboard fallback.
  ['window.location.href=`mailto:hello@aiauthoritytech.com?subject=${encodeURIComponent(e)}&body=${encodeURIComponent(r)}`',
   'window.ccsSendRequest(e,r)'],
  ['children:`Prepare email request`', 'children:`Send my project request`'],
  ['children:`Prepare consultation email`', 'children:`Send my consultation request`'],

  // Upload: say plainly how to send files instead of mentioning unfinished storage.
  ['`Secure upload — JPG, PNG, PDF, SVG, DXF, STL, or 3MF`', '`Artwork and model files`'],
  ['`Secure private upload is awaiting Supabase Storage configuration. Do not send confidential files here yet.`',
   '`Online upload is not available yet. After you send this request, reply to our email with your JPG, PNG, PDF, SVG, DXF, STL, or 3MF files attached.`'],
  // Owner's taglines (desk signs and suite pages).
  ['tagline:`Beauty, fragrance, self-care, and personalized design.`', 'tagline:`Beauty Crafted to Captivate.`'],
  ['tagline:`Where Beauty Takes Shape Through Dimensional Art`', 'tagline:`Where Bold Design and Beauty Fuse.`'],
  ['welcome:`Welcome to Madam Allure—an elevated experience in beauty, fragrance, and self-care.`', 'welcome:`Welcome to Madam Allure—where beauty is crafted to captivate.`'],
  ['welcome:`Welcome to Allure Fusions—where beauty takes shape through dimensional art.`', 'welcome:`Welcome to Allure Fusions—where bold design and beauty fuse.`'],
  ['is the perfect destination. It is where beauty takes shape through dimensional art.', 'is the perfect destination. It is where bold design and beauty fuse.'],
];

for (const [from, to] of patches) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`Expected exactly one match, found ${n}: ${from.slice(0, 60)}`);
  src = src.replace(from, () => to);
}

// Lobby: the welcome and the directory become one digital board (on the
// board in the photo) instead of a wide strip along the bottom.
{
  const titleStart = src.indexOf('(0,i.jsxs)(`div`,{className:`lobby-title`');
  const titleEnd = src.indexOf(',(0,i.jsxs)(`aside`,{className:`concierge-card`');
  const dirStart = src.indexOf(',(0,i.jsxs)(`section`,{className:`digital-directory`');
  const dirEndMarker = '},e))]})';
  const dirEnd = src.indexOf(dirEndMarker, dirStart) + dirEndMarker.length;
  if ([titleStart, titleEnd, dirStart].some((i) => i < 0) || dirEnd < dirStart || !(titleStart < titleEnd && titleEnd < dirStart)) {
    throw new Error('Lobby layout not found');
  }
  const title = src.slice(titleStart, titleEnd);
  const directory = src.slice(dirStart + 1, dirEnd);
  src = src.slice(0, titleStart)
    + '(0,i.jsxs)(`div`,{className:`lobby-board`,children:[' + title + ',' + directory + ']})'
    + src.slice(titleEnd, dirStart) + src.slice(dirEnd);
}

// AI AuthoriTech gets its own consulting terms; product floors keep theirs.
const hStart = src.indexOf('function h({physical:e=!1}){');
const hEnd = src.indexOf('export{p as default};');
if (hStart < 0 || hEnd < 0) throw new Error('Terms component not found');
const terms = `function h({physical:e=!1}){return e?(0,i.jsxs)(\`aside\`,{className:\`policy-notice\`,children:[(0,i.jsx)(\`strong\`,{children:\`Made to order\`}),(0,i.jsx)(\`p\`,{children:\`Made to order. Production begins after your request is reviewed and the required payment or deposit is received.\`}),(0,i.jsx)(\`p\`,{children:\`Orders of $35 or less require payment in full. Orders over $35 require a 60% production deposit. Remaining balances and shipping must be paid before shipment or final digital delivery.\`}),(0,i.jsx)(\`p\`,{children:\`The first 30-minute discovery consultation is complimentary. Additional consultation is $125 per hour, scheduled and paid in advance. The fee is credited only to an ongoing or recurring engagement. Shipping is added to the final invoice; local pickup is not offered.\`})]}):(0,i.jsxs)(\`aside\`,{className:\`policy-notice\`,children:[(0,i.jsx)(\`strong\`,{children:\`Consulting terms\`}),(0,i.jsx)(\`p\`,{children:\`Your first 30-minute discovery consultation is complimentary. Additional consultation is $125 per hour, scheduled and paid in advance, and is credited toward an ongoing or recurring engagement.\`}),(0,i.jsx)(\`p\`,{children:\`Each project is confirmed in a written proposal covering scope, deliverables, timeline, and price. Work begins once the proposal is accepted and the deposit it specifies is received; the remaining balance is due before final handoff.\`}),(0,i.jsx)(\`p\`,{children:\`Services are delivered virtually. Strategy documents, configured tools, agents, and training materials are shared digitally, so no shipping applies.\`})]})}`;
src = src.slice(0, hStart) + terms + src.slice(hEnd);

// Imports point at local shims instead of ChatGPT's hosted chunks.
src = src
  .replace('from"./rolldown-runtime-C60lm6uB.js"', 'from"./shim-runtime.js"')
  .replace('from"./framework-D_rUT4EX.js"', 'from"./shim-framework.js"');

writeFileSync(new URL('./app.patched.js', import.meta.url), src);
console.log('patched ok');
