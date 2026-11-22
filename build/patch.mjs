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

  // Elevator chime is off until the visitor turns it on.
  ['[b,x]=(0,r.useState)(!0)', '[b,x]=(0,r.useState)(!1)'],

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
];

for (const [from, to] of patches) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`Expected exactly one match, found ${n}: ${from.slice(0, 60)}`);
  src = src.replace(from, () => to);
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
