// Record voice lines straight from ElevenLabs into a review folder (not the live site).
// This is how all voice lines are recorded (owner, Nov 28): one command instead of clicking in the browser.
//
//   1. In ElevenLabs: Profile > API Keys > Create key (text-to-speech + voices read + models read).
//   2. In your own PowerShell window (the key stays on your computer):
//        $env:ELEVENLABS_API_KEY = "paste-your-key-here"
//        node build/tts-review.mjs --area lobby --only greeting
//        node build/tts-review.mjs --area 305
//   3. Files land in audio-review/<area>/. Claude checks them and publishes a whole area at once.
//
// Areas and the voice each one uses (owner's picks; settings are the voice's own, nothing changed
// except the lobby speed she chose):
//   lobby    Veda Sky       Multilingual v2, speed 1.08, stability 50, similarity 75, style 0
//   elevator Blake Harlow   Multilingual v2
//   217      Kai            Eleven v4
//   305      Bhee           Eleven v4
//   412      Tanika_Real    Eleven v4
// Options: --only key1,key2   record just those lines
//          --voice "Name"     use another voice      --model v2|v4   use another model
//          --force            re-record files already in review
//          (--suite works the same as --area)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AREAS = {
  // Lobby settings match the recorded replies (audio/README.md): speed 1.08, stability 50, similarity 75, style 0.
  lobby: { group: 'Lobby concierge', voice: 'Veda Sky', model: 'v2', settings: { speed: 1.08, stability: 0.5, similarity_boost: 0.75, style: 0 } },
  elevator: { group: 'Elevator', voice: 'Blake Harlow', model: 'v2' },
  217: { group: 'Suite 217', voice: 'Kai', model: 'v4' },
  305: { group: 'Suite 305', voice: 'Bhee', model: 'v4' },
  412: { group: 'Suite 412', voice: 'Tanika_Real', model: 'v4' },
};

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const area = opt('area') || opt('suite');
const preset = AREAS[area];
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Set ELEVENLABS_API_KEY in this window first (see the top of this file).'); process.exit(1); }
if (!preset) { console.error('Usage: node build/tts-review.mjs --area lobby|elevator|217|305|412 [--only key1,key2]'); process.exit(1); }
const voiceName = opt('voice') || preset.voice;
const modelWant = opt('model') || preset.model;
const only = opt('only') ? opt('only').split(',').map((s) => s.trim()) : null;
const force = args.includes('--force');

const here = (p) => new URL(p, import.meta.url);
const groups = JSON.parse(readFileSync(here('../audio/voice-lines.json'), 'utf8'));
const group = groups.find((g) => g.who.includes(preset.group));
let lines = group.lines;
if (only) {
  const missing = only.filter((k) => !lines.some((l) => l.key === k));
  if (missing.length) { console.error(`Not in the ${area} script: ${missing.join(', ')}`); process.exit(1); }
  lines = lines.filter((l) => only.includes(l.key));
}

const api = async (path, init = {}) => {
  const r = await fetch('https://api.elevenlabs.io' + path, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r;
};

const voices = (await (await api('/v1/voices')).json()).voices;
const low = voiceName.toLowerCase();
const voice = voices.find((v) => v.name.toLowerCase() === low) || voices.find((v) => v.name.toLowerCase().startsWith(low));
if (!voice) { console.error(`No voice named "${voiceName}" in My Voices. Found: ${voices.map((v) => v.name).join(', ')}`); process.exit(1); }

const models = await (await api('/v1/models')).json();
const model = modelWant === 'v4'
  ? models.find((m) => /v4/i.test(m.name) && m.can_do_text_to_speech)
  : models.find((m) => m.model_id === 'eleven_multilingual_v2');
if (!model) { console.error(`Model ${modelWant} not available. Found: ${models.map((m) => m.name).join(', ')}`); process.exit(1); }

// The voice's own saved settings; only the speed is changed, and only where the owner chose one.
let voiceSettings;
if (preset.settings && !opt('voice')) {
  voiceSettings = { ...(await (await api(`/v1/voices/${voice.voice_id}/settings`)).json()), ...preset.settings };
}
console.log(`Area: ${area}  |  Voice: ${voice.name}  |  Model: ${model.name}${voiceSettings ? `  |  Speed: ${voiceSettings.speed}` : ''}  |  ${lines.length} lines`);

const outDir = join(fileURLToPath(here('../audio-review/')), String(area));
mkdirSync(outDir, { recursive: true });
let n = 0;
for (const l of lines) {
  const file = join(outDir, l.key + '.mp3');
  if (existsSync(file) && !force) { console.log('skip (already in review)', l.key); continue; }
  const body = { text: l.say, model_id: model.model_id };
  if (voiceSettings) body.voice_settings = voiceSettings;
  const r = await api(`/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  n++;
  console.log(`saved ${l.key}.mp3  |  ${l.say}`);
}
console.log(`Done: ${n} new clips in ${outDir}. Tell Claude it's done.`);
