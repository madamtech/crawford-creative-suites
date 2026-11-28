// Applies the publishing fixes to the original ChatGPT-built building code.
// src/ccs-app.js stays untouched; the patched copy goes to build/app.patched.js.
import { readFileSync, writeFileSync } from 'node:fs';

let src = readFileSync(new URL('../src/ccs-app.js', import.meta.url), 'utf8');

const CONTACT_FIELDS = '(0,i.jsxs)(`div`,{className:`field-pair`,children:[(0,i.jsxs)(`label`,{children:[`Name`,(0,i.jsx)(`input`,{name:`Name`,type:`text`,autoComplete:`name`,required:!0})]}),(0,i.jsxs)(`label`,{children:[`Email`,(0,i.jsx)(`input`,{name:`Email`,type:`email`,autoComplete:`email`,required:!0})]})]}),(0,i.jsxs)(`label`,{children:[`Phone (optional)`,(0,i.jsx)(`input`,{name:`Phone`,type:`tel`,autoComplete:`tel`})]}),(0,i.jsx)(`input`,{name:`_hp`,className:`ccs-hp`,tabIndex:-1,autoComplete:`off`,"aria-hidden":`true`}),';

const patches = [
  // Scene images now live in /img and are referenced relative to /suites/.
  ['src:`/main-lobby.png`', 'src:`../img/main-lobby.jpg`'],
  ['src:`/elevator.png`', 'src:`../img/elevator.jpg`'],
  ['image:`/madam-allure-rose-gold.png`', 'image:`../img/madam-allure-desk.jpg`'],
  ['image:`/allure-fusions-gallery.png`', 'image:`../img/allure-fusions-desk.jpg`'],
  ['image:`/reception-303.jpg`', 'image:`../img/ai-authoritech-desk.jpg`'],

  // Sound (chime, concierge voice, floor announcements) is off until the visitor
  // turns it on; the choice is remembered on their device (build/voice.js).
  ['[b,x]=(0,r.useState)(!0)', '[b,x]=(0,r.useState)(()=>window.ccsVoice.isOn())'],
  ['onClick:()=>x(e=>!e)', 'onClick:()=>x(e=>window.ccsVoice.setOn(!e))'],

  // Elevator announces the floor as the car arrives (before the doors open),
  // then the receptionist greets the visitor once the doors have opened.
  ['t(`traveling`);', 't(`traveling`),window.ccsVoice.approach(e);'],
  ['z(),y(!1)', 'z(),window.ccsVoice.arrive(e),y(!1)'],
  // Owner, Nov 27: the doors open (chime) only after the floor announcement has finished,
  // so the ride lasts as long as "Floor two. Madam Allure." takes to say.
  ['window.setTimeout(()=>{if(e===1)C(`Floor 1. Main Lobby.`)', 'window.setTimeout(()=>window.ccsVoice.afterSpeech(()=>{if(e===1)C(`Floor 1. Main Lobby.`)'],
  ['window.ccsVoice.arrive(e),y(!1)},n?350:1500)', 'window.ccsVoice.arrive(e),y(!1)},0,300),n?350:1500)'],
  // Owner, Nov 27: the floor and suite show once, in the top bar, worded like the old
  // bottom plaque (which is now hidden in build/site.mjs).
  ['reception`?`Suite ${n} · Floor ${R.floor}`', 'reception`?`Floor ${R.floor} · Suite ${n}`'],
  // Owner, Nov 27: the Allure Fusions lounge is the Designer Lounge (not the Maker's Lounge).
  ['maker:{title:`The Maker’s Lounge`', 'maker:{title:`The Designer Lounge`'],
  ['children:[`Visit The Maker’s Lounge `', 'children:[`Visit The Designer Lounge `'],
  // Owner, Nov 27: Allure Fusions calls them lithophane lamps, never photo lamps.
  ['description:`Original-design photo lamps priced by', 'description:`Original-design lithophane lamps priced by'],
  ['related:`Photo lamps, memorial lamps, artist-i', 'related:`Lithophane lamps, memorial lamps, artist-i'],
  // Owner, Nov 28: it is laser printing, never "laser work" (3D printing and laser printing).
  ['title:`Preparing Artwork for Laser Work`', 'title:`Preparing Artwork for Laser Printing`'],
  ['description:`Custom laser work for signage and gifting.`', 'description:`Custom laser printing for signage and gifting.`'],

  // Concierge speaks on her own when the visitor arrives (build/voice.js), and replies aloud.
  ['(0,i.jsx)(`p`,{children:`Tell me what you need or choose a destination below.`}),',
   '(0,i.jsx)(`p`,{children:`Tell me what you need, or choose a suite on the board.`}),'],
  ['D({217:`', 'D(window.ccsVoice.say({217:`'],
  // FAQ concierge (build/faq.js): answer common questions first, and offer a
  // button to the matching suite instead of whisking the visitor away.
  ['H=e=>{e.preventDefault();let t=w.trim(),', 'H=e=>{e.preventDefault();let t=w.trim();window.ccsFaqGo=null;{let f=window.ccsFaq&&window.ccsFaq.answer(t);if(f){window.ccsFaqGo=f.suite;D(f.text);return}}let '],
  ['E&&(0,i.jsx)(`p`,{className:`concierge-reply`,"aria-live":`polite`,children:E})', 'E&&(0,i.jsx)(`p`,{className:`concierge-reply`,"aria-live":`polite`,children:E}),E&&window.ccsFaqGo&&c[window.ccsFaqGo]&&(0,i.jsx)(`button`,{type:`button`,className:`concierge-go`,onClick:()=>{let s=window.ccsFaqGo;window.ccsFaqGo=null;window.ccsRouted=s;V(s)},children:`Take me to `+c[window.ccsFaqGo].name+` →`}),E&&window.ccsPortal&&window.ccsPortal.ready()&&(0,i.jsxs)(`p`,{className:`concierge-extra`,children:[(0,i.jsx)(`button`,{type:`button`,onClick:()=>window.ccsPortal.lead(``,`Lobby concierge`),children:`Leave my details`}),(0,i.jsx)(`button`,{type:`button`,onClick:()=>window.ccsPortal.open(`projects`),children:`Check my order`})]})'],
  // The concierge finishes her answer before the visitor is taken to the elevator.
  ['}[r]),window.setTimeout(()=>V(r),700)', '}[r])),(window.ccsRouted=r,window.ccsVoice.afterSpeech(()=>V(r),700))'],

  // Lounge cards: clearer button wording (build/lounge.js, ccsCta).
  ['children:[G.cta,` →`]', 'children:[window.ccsCta?window.ccsCta(G):G.cta,` →`]'],
  // Elevator chime (Nov 27, owner): a softer, modern bell from audio/elevator-chime.mp3
  // (build/voice.js) instead of two plain beeps.
  ['z=()=>{if(!b)return;let e=window.AudioContext||window.webkitAudioContext;if(!e)return;let t=new e,n=t.createGain();n.connect(t.destination),n.gain.setValueAtTime(1e-4,t.currentTime),n.gain.exponentialRampToValueAtTime(.12,t.currentTime+.03),n.gain.exponentialRampToValueAtTime(1e-4,t.currentTime+.75),[659.25,783.99].forEach((e,r)=>{let i=t.createOscillator();i.frequency.value=e,i.connect(n),i.start(t.currentTime+r*.18),i.stop(t.currentTime+.35+r*.18)}),window.setTimeout(()=>t.close(),900)}',
   'z=()=>{if(!b)return;window.ccsVoice.chime()}'],
  // Elevator: only the current floor's key lights up (all keys are switched off
  // while the car moves, and switched-off keys used to look lit).
  ['children:t},t))]}),e===`traveling`', '"data-current":t===g?``:void 0,"aria-current":t===g?`true`:void 0,children:t},t))]}),e===`traveling`'],

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

  // Header (owner, Nov 27): no Elevator button (each suite has "Take elevator to another floor").
  // In the main lobby: Entrance, back out to the arrival page. Everywhere else in the
  // building: Lobby, an elevator ride down to the main lobby (no second greeting).
  ['(0,i.jsx)(`button`,{onClick:()=>t(`elevator`),children:`Elevator`})',
   'e===`lobby`?(0,i.jsx)(`a`,{className:`entrance-link`,href:`../`,children:`Entrance`}):(0,i.jsx)(`button`,{type:`button`,className:`lobby-link`,disabled:e===`traveling`,onClick:()=>B(1),children:`Lobby`}),window.ccsPortal&&window.ccsPortal.ready()&&(0,i.jsx)(`button`,{type:`button`,className:`client-login`,"data-client-login":``,onClick:()=>window.ccsPortal.open(),children:`Log In`})'],
  // (Log In, Nov 27: build/portal.js; shown only once suites/backend-config.js has the Supabase URL.)

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

  // Custom and memorial gifts: a request form (build/portal.js), saved online or emailed.
  ['(0,i.jsx)(`p`,{children:s[e].subtitle})]}),e===`gifts`?',
   '(0,i.jsx)(`p`,{children:s[e].subtitle}),(e===`gifts`||e===`memorials`)&&(0,i.jsx)(`button`,{type:`button`,className:`ma-request-btn`,onClick:()=>window.ccsMaRequest(e===`memorials`?`memorial`:`custom`),children:e===`memorials`?`Request a memorial piece →`:`Request a custom gift →`})]}),e===`gifts`?'],

  // Memorial gifts: drop the "Gallery Image Coming Soon" placeholder boxes.
  ['(0,i.jsx)(`span`,{children:`Gallery Image Coming Soon`}),', ''],

  // Madam Allure: shop products open the Ueni store; items without a shop link
  // open a short request form (name, email, optional phone) before emailing.
  ['(0,i.jsx)(`a`,{href:`mailto:hello@aiauthoritytech.com?subject=${encodeURIComponent(`Madam Allure — ${e.name}`)}&body=${encodeURIComponent(`I am interested in ${e.name} (${e.price}). Please contact me about options.`)}`,children:`Ask about this item ↗`})',
   '(0,i.jsx)(e.url?`a`:`button`,{...(e.url?{className:`shop-link`,href:e.url,target:`_blank`,rel:`noopener`}:{type:`button`,onClick:()=>window.ccsAskAbout(e.name,e.price)}),children:e.url?`View & buy on our shop ↗`:`Ask about this item ↗`})'],

  // Name, Email, and optional Phone at the top of both request forms.
  [',onSubmit:e=>{e.preventDefault(),Y(`Allure Fusions — Build My Project`,e.currentTarget)},children:[',
   ',onSubmit:e=>{e.preventDefault(),Y(`Allure Fusions — Build My Project`,e.currentTarget)},children:[' + CONTACT_FIELDS],
  [',onSubmit:e=>{e.preventDefault(),Y(`AI AuthoriTech — Readiness Conversation`,e.currentTarget)},children:[(0,i.jsx)(`h3`,{children:`Request an AI readiness conversation`}),',
   ',onSubmit:e=>{e.preventDefault(),Y(`AI AuthoriTech — Readiness Conversation`,e.currentTarget)},children:[(0,i.jsx)(`h3`,{children:`Request an AI readiness conversation`}),' + CONTACT_FIELDS],

  // Forms: route to the right business inbox, with a copy-to-clipboard fallback.
  ['window.location.href=`mailto:hello@aiauthoritytech.com?subject=${encodeURIComponent(e)}&body=${encodeURIComponent(r)}`',
   'window.ccsSendRequest(e,r,t)'],
  ['children:`Prepare email request`', 'children:`Send my project request`'],
  ['children:`Prepare consultation email`', 'children:`Send my consultation request`'],

  // Upload: private Supabase Storage upload once the backend is set up (build/portal.js);
  // until then, say plainly how to send files instead of mentioning unfinished storage.
  ['(0,i.jsxs)(`label`,{className:`disabled-upload`,children:[`Secure upload — JPG, PNG, PDF, SVG, DXF, STL, or 3MF`,(0,i.jsx)(`input`,{type:`file`,accept:`.jpg,.jpeg,.png,.pdf,.svg,.dxf,.stl,.3mf`,disabled:!0}),(0,i.jsx)(`small`,{children:`Secure private upload is awaiting Supabase Storage configuration. Do not send confidential files here yet.`})]})',
   '(0,i.jsxs)(`label`,{className:window.ccsUploadsReady()?`file-upload`:`disabled-upload`,children:[`Artwork and model files`,(0,i.jsx)(`input`,{type:`file`,name:`_files`,multiple:!0,accept:`.jpg,.jpeg,.png,.pdf,.svg,.dxf,.stl,.3mf`,disabled:!window.ccsUploadsReady()}),(0,i.jsx)(`small`,{children:window.ccsUploadsReady()?`JPG, PNG, PDF, SVG, DXF, STL, or 3MF, up to 25 MB each. Files are stored privately; only you and Allure Fusions can open them.`:`Online upload is not available yet. After you send this request, reply to our email with your JPG, PNG, PDF, SVG, DXF, STL, or 3MF files attached.`})]})'],
  // AI Clarity Lounge: short button text.
  ['cta:`See Human-Centered AI Services`', 'cta:`See AI Services`'],
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
