// Writes the ElevenLabs recording script from the live answer lists, so the script
// and the site never drift apart:  node build/voice-script.mjs [outHtmlPath]
//   audio/VOICE-SCRIPT.md     every line, grouped by voice, with its file name
//   <outHtmlPath> (optional)  the same as a page with Copy buttons, for recording
// Also writes audio/voice-lines.json (used for the Notion knowledge base page).
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const here = (p) => new URL(p, import.meta.url);

// faq.js and voice.js are browser files; load them with tiny stand-ins.
globalThis.window = { ccsVoice: { sayKey() {} } };
globalThis.document = { documentElement: {}, querySelector: () => null };
globalThis.location = { hostname: 'script' };
globalThis.MutationObserver = class { observe() {} };
globalThis.requestAnimationFrame = () => {};
const tmp = mkdtempSync(join(tmpdir(), 'ccs-'));
writeFileSync(join(tmp, 'faq.mjs'), readFileSync(here('./faq.js'), 'utf8'));
await import(pathToFileURL(join(tmp, 'faq.mjs')).href);
const { list: FAQ, suites: SUITES, deskLines, sendTail } = window.ccsFaq;
const voiceSrc = readFileSync(here('./voice.js'), 'utf8');
const LINES = Function(`return ${voiceSrc.slice(voiceSrc.indexOf('const LINES = {') + 'const LINES = '.length, voiceSrc.indexOf('};', voiceSrc.indexOf('const LINES = {')) + 1)}`)();
const recorded = new Set(JSON.parse(readFileSync(here('../audio/clips.json'), 'utf8')));

// What to type into ElevenLabs so numbers and names are read naturally.
const spoken = (t) => String(t)
  .replace(/\bSuite 217\b/g, 'Suite two-seventeen').replace(/\bSuite 305\b/g, 'Suite three-oh-five').replace(/\bSuite 412\b/g, 'Suite four-twelve')
  .replace(/\b3D\b/g, '3-D').replace(/\bLMS\b/g, 'L-M-S').replace(/\bNFC\b/g, 'N-F-C').replace(/\bPLA\b/g, 'P-L-A').replace(/\bPETG\b/g, 'P-E-T-G')
  .replace(/\bJPG\b/g, 'J-peg').replace(/\bPNG\b/g, 'P-N-G').replace(/\bPDF\b/g, 'P-D-F').replace(/\bSVG\b/g, 'S-V-G').replace(/\bDXF\b/g, 'D-X-F')
  .replace(/\bSTL\b/g, 'S-T-L').replace(/\b3MF\b/g, '3-M-F').replace(/\bMB\b/g, 'megabytes').replace(/madamallure@gmail\.com/g, 'madam allure at gmail dot com')
  .replace(/allurefusionsfirm@gmail\.com/g, 'allure fusions firm at gmail dot com').replace(/ai\.authoritech@gmail\.com/g, 'A-I dot uh-thor-a-tek at gmail dot com')
  // Owner pronunciation (corrected Nov 27, late): "AuthoriTech" is said uh-thor-a-tek, typed "A-I uh-thor-a-tek".
  .replace(/\bAI AuthoriTech\b/g, 'A-I uh-thor-a-tek').replace(/\bAuthoriTech\b/g, 'uh-thor-a-tek');

const lobbyGeneral = FAQ.filter((f) => !f.suite && !f.deskOnly && !f.desk);
const DIRECT = 'Each business handles that with you directly, so their receptionist can help. Madam Allure on Floor 2 offers beauty, fragrance, and gifts; Allure Fusions on Floor 3 offers 3D printing and laser work; and AI AuthoriTech on Floor 4 offers AI strategy and automation. Choose a suite on the board, and I will send you up.';
const sendText = (s) => `${SUITES[s].name} in Suite ${s} on Floor ${SUITES[s].floor} offers ${SUITES[s].offers}. Tap below, and their receptionist will answer your question when you arrive.`;

const groups = [
  { who: 'Lobby concierge (Floor 1)', voice: 'Veda Sky (chosen). Speed 1.08, stability 50, similarity 75, style 0.', lines: [
    ...['greeting', 'reply-217', 'reply-305', 'reply-412', 'reply-unknown'].map((k) => ({ key: k, text: LINES[k] || readmeText(k) })),
    ...lobbyGeneral.map((f) => ({ key: 'faq-' + f.id, text: f.text })),
    { key: 'faq-direct', text: DIRECT },
    { key: 'lobby-send-tail', text: sendTail },
  ] },
  { who: 'Elevator', voice: 'Blake Harlow (chosen Nov 27). Floor announcements only.', lines: ['floor-1', 'floor-2', 'floor-3', 'floor-4'].map((k) => ({ key: k, text: LINES[k] })) },
  // Receptionist voices chosen by Tanika, Nov 27, 2026 (saved under My Voices in ElevenLabs).
  ...[['217', 'powder', 'Kai - Real AI Receptionist (chosen Nov 27)'], ['305', 'maker', 'Maya - Receptionist & Customer Service (chosen Nov 27)'], ['412', 'clarity', 'Tiffany - Warm, Conversational Narrator (chosen Nov 27)']].map(([s, lounge, voice]) => ({
    who: `${SUITES[s].name} receptionist (Floor ${SUITES[s].floor}, Suite ${s})`, voice,
    lines: [{ key: 'welcome-' + s, text: LINES['welcome-' + s] }, { key: 'sent-' + s, text: LINES['sent-' + s] }, { key: 'lounge-' + lounge, text: LINES['lounge-' + lounge] }, ...deskLines(s).map((l) => ({ key: l.key, text: l.text }))],
  })),
];

function readmeText(key) {
  const m = readFileSync(here('../audio/README.md'), 'utf8').match(new RegExp('\\| `' + key + '\\.mp3` \\| ([^|]+) \\|'));
  return m ? m[1].trim() : '';
}

const total = groups.reduce((n, g) => n + g.lines.length, 0);
let md = `# Voice recording script (ElevenLabs)\n\nGenerated ${new Date().toISOString().slice(0, 10)} by \`node build/voice-script.mjs\` from the site's answer lists. Do not edit by hand; change \`build/faq.js\` or \`build/voice.js\` and run it again.\n\n`;
md += `**${total} lines.** Save each as an MP3 with the exact file name into \`audio/\`. A line works on the site as soon as its file is there. "Type this" spells out numbers and short forms so the voice reads them naturally; the site shows the "On screen" text.\n\n`;
md += `Elevator chime: \`audio/elevator-chime.mp3\` (Nov 27 modern bell; options in OneDrive Work Notes > Elevator chime options). To use an ElevenLabs sound effect instead, prompt: "soft modern luxury elevator arrival chime, two gentle glassy bell tones rising, clean, warm, 2 seconds, no voice".\n\n`;
for (const g of groups) {
  md += `## ${g.who}\n\nVoice: ${g.voice}\n\n| File | On screen | Type this | Recorded |\n| --- | --- | --- | --- |\n`;
  for (const l of g.lines) md += `| \`${l.key}.mp3\` | ${l.text.replace(/\|/g, '/')} | ${spoken(l.text).replace(/\|/g, '/')} | ${recorded.has(l.key) ? 'yes' : ''} |\n`;
  md += '\n';
}
writeFileSync(here('../audio/VOICE-SCRIPT.md'), md);
writeFileSync(here('../audio/voice-lines.json'), JSON.stringify(groups.map((g) => ({ ...g, lines: g.lines.map((l) => ({ ...l, say: spoken(l.text), recorded: recorded.has(l.key) })) })), null, 1));

const out = process.argv[2];
if (out) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ElevenLabs voice script</title>
<style>body{margin:0;background:#100e0d;color:#f4ece6;font:15px/1.5 Lora,Georgia,serif}main{max-width:1000px;margin:auto;padding:28px 18px}h1,h2{font:400 2rem "Instrument Serif",Georgia,serif;margin:.6em 0 .2em}h2{font-size:1.5rem;color:#eccbb0;border-top:1px solid #3a302b;padding-top:1em}
.v{color:#b9aca3}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #2b2522;padding:8px 6px;vertical-align:top}td:first-child{white-space:nowrap;font:600 .8rem Arial,sans-serif;color:#9fe3dc}
button{cursor:pointer;border:1px solid #cb9671;background:transparent;color:#fff;padding:5px 10px;font-size:.75rem}button.done{background:#21b8b0;color:#000;border-color:#21b8b0}.rec{color:#21b8b0;font-size:.75rem}</style></head><body><main>
<h1>ElevenLabs voice script</h1><p class="v">${total} lines. For each line: tap <b>Copy</b>, paste into ElevenLabs, generate, and download it with the file name shown into the website's <code>audio</code> folder. Generated ${new Date().toISOString().slice(0, 10)} from the site's answer lists.</p>`;
  for (const g of groups) {
    html += `<h2>${esc(g.who)}</h2><p class="v">Voice: ${esc(g.voice)}</p><table>`;
    for (const l of g.lines) html += `<tr><td>${esc(l.key)}.mp3${recorded.has(l.key) ? '<br><span class="rec">recorded</span>' : ''}</td><td>${esc(spoken(l.text))}</td><td><button data-t="${esc(spoken(l.text))}">Copy</button></td></tr>`;
    html += '</table>';
  }
  html += `</main><script>document.querySelectorAll('button[data-t]').forEach(b=>b.onclick=()=>{navigator.clipboard.writeText(b.dataset.t);b.textContent='Copied';b.classList.add('done')})</script></body></html>`;
  writeFileSync(out, html);
}
console.log(`voice script: ${total} lines in ${groups.length} voices`);
