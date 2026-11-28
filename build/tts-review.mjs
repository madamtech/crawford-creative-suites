// Record receptionist lines straight from ElevenLabs into a review folder (not the live site).
//
//   1. In ElevenLabs: Profile > API Keys > Create key (text-to-speech + voices read).
//   2. In your own PowerShell window (the key stays on your computer):
//        $env:ELEVENLABS_API_KEY = "paste-your-key-here"
//        node build/tts-review.mjs --suite 412 --voice "Tanika_Real"
//        node build/tts-review.mjs --suite 305 --voice "Bhee"
//   3. Listen to the files in audio-review/<suite>/. Tell Claude which are approved;
//      only approved files are copied into audio/ and published.
//
// Each voice keeps its own default settings (no pitch, speed or style changes).
// Options: --only key1,key2  record just those lines;  --force  re-record files already in review.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const suite = opt('suite');
const voiceName = opt('voice');
const only = opt('only') ? opt('only').split(',').map((s) => s.trim()) : null;
const force = args.includes('--force');
const key = process.env.ELEVENLABS_API_KEY;

if (!key) { console.error('Set ELEVENLABS_API_KEY in this window first (see the top of this file).'); process.exit(1); }
if (!['217', '305', '412'].includes(suite) || !voiceName) { console.error('Usage: node build/tts-review.mjs --suite 305|412|217 --voice "Voice name"'); process.exit(1); }

const here = (p) => new URL(p, import.meta.url);
const groups = JSON.parse(readFileSync(here('../audio/voice-lines.json'), 'utf8'));
const group = groups.find((g) => g.who.includes(`Suite ${suite}`));
let lines = group.lines;
if (only) lines = lines.filter((l) => only.includes(l.key));

const api = async (path, init = {}) => {
  const r = await fetch('https://api.elevenlabs.io' + path, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r;
};

const voices = (await (await api('/v1/voices')).json()).voices;
const voice = voices.find((v) => v.name.toLowerCase() === voiceName.toLowerCase())
  || voices.find((v) => v.name.toLowerCase().startsWith(voiceName.toLowerCase()));
if (!voice) { console.error(`No voice named "${voiceName}" in My Voices. Found: ${voices.map((v) => v.name).join(', ')}`); process.exit(1); }

// Same model the site's receptionists use in the ElevenLabs app (Eleven v4), else Multilingual v2.
const models = await (await api('/v1/models')).json();
const model = models.find((m) => /v4/i.test(m.name) && m.can_do_text_to_speech) || models.find((m) => m.model_id === 'eleven_multilingual_v2');
console.log(`Voice: ${voice.name}  |  Model: ${model.name}  |  ${lines.length} lines`);

const outDir = join(fileURLToPath(here('../audio-review/')), suite);
mkdirSync(outDir, { recursive: true });
let n = 0;
for (const l of lines) {
  const file = join(outDir, l.key + '.mp3');
  if (existsSync(file) && !force) { console.log('skip (already in review)', l.key); continue; }
  const r = await api(`/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: l.say, model_id: model.model_id }), // no voice_settings: the voice's own defaults
  });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  n++;
  console.log(`saved ${l.key}.mp3  |  ${l.say}`);
}
console.log(`Done: ${n} new clips in ${outDir}. Listen, then tell Claude which are approved.`);
