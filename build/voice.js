// Spoken concierge, receptionists, elevator, and lobby music.
//
// The voices are recorded audio files (your ElevenLabs voice or your own
// recordings) in the site's audio/ folder. See audio/README.md for the exact
// lines and file names. A line with no file yet stays silent: the device's
// robotic voice is not used (set USE_DEVICE_VOICE to true to allow it).
//
// Sound is off until the visitor turns it on (browsers block sound until the
// visitor taps something). The choice is remembered on their device.

const USE_DEVICE_VOICE = false;
const AUDIO = '../audio/';
const KEY = 'ccs-sound';
const MUSIC_VOLUME = 0.16;   // lobby music stays soft under the voices

const LINES = {
  greeting: 'Welcome to Crawford Creative Suites. How may I direct you today? Tell me what you are looking for, or choose a destination on the directory.',
  'reply-unknown': 'I couldn’t quite place that. Try the directory, or tell me what kind of business you need.',
  'floor-1': 'Floor 1. Main lobby.',
  'floor-2': 'Floor 2. Suite 217. Madam Allure.',
  'floor-3': 'Floor 3. Suite 305. Allure Fusions.',
  'floor-4': 'Floor 4. Suite 412. AI AuthoriTech.',
  'welcome-217': 'Welcome to Madam Allure, an elevated experience in beauty, fragrance, and self-care. How may we help you today?',
  'welcome-305': 'Welcome to Allure Fusions, where beauty takes shape through dimensional art. How may we help you today?',
  'welcome-412': 'Welcome to AI AuthoriTech, where clarity meets capability. How may we help you today?',
  'lounge-powder': 'Welcome to the Powder Room, a quiet place to explore beauty rituals, fragrance, and self-care.',
  'lounge-maker': "Welcome to the Maker's Lounge, where ideas, materials, and technology come together.",
  'lounge-clarity': 'Welcome to the AI Clarity Lounge, a practical space for separating AI facts from hype.',
};
// Concierge answers (text shown on screen) -> their recording.
const REPLY_KEYS = [
  ['Madam Allure is the perfect destination', 'reply-217'],
  ['Allure Fusions is the perfect destination', 'reply-305'],
  ['AI AuthoriTech is the right destination', 'reply-412'],
  ['I couldn’t quite place that', 'reply-unknown'],
];
const FLOOR_SUITE = { 2: '217', 3: '305', 4: '412' };

function stored() {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
}
let on = stored();
let greeted = false;

// ---------- recorded clips ----------
let current = null;
const queue = [];
function playNext() {
  if (current || !queue.length) return;
  const { key, text } = queue.shift();
  const a = new Audio(AUDIO + key + '.mp3');
  current = a;
  const done = () => { if (current === a) { current = null; playNext(); } };
  a.onended = done;
  a.onerror = () => { current = null; deviceSpeak(text); playNext(); };   // no file yet
  a.play().catch(done);
}
function play(key, text, { interrupt = false } = {}) {
  if (!on) return;
  if (interrupt) {
    queue.length = 0;
    if (current) { current.pause(); current = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  queue.push({ key, text });
  playNext();
}

// ---------- device voice (off by default) ----------
const PREFERRED = ['Aria', 'Jenny', 'Natural', 'Samantha', 'Google US English', 'Zira'];
function deviceSpeak(text) {
  if (!USE_DEVICE_VOICE || !on || !text || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  u.voice = PREFERRED.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean) || voices[0] || null;
  u.rate = 0.97;
  speechSynthesis.speak(u);
}

// ---------- lobby music ----------
const music = new Audio(AUDIO + 'lobby-music.mp3');
music.loop = true;
music.volume = 0;
let musicOk = true;
music.onerror = () => { musicOk = false; };
let fade = null;
function fadeTo(target, ms = 1200) {
  clearInterval(fade);
  const step = (target - music.volume) / (ms / 50);
  fade = setInterval(() => {
    const v = music.volume + step;
    if ((step >= 0 && v >= target) || (step < 0 && v <= target)) {
      music.volume = Math.max(0, Math.min(1, target));
      clearInterval(fade);
      if (target === 0) music.pause();
    } else music.volume = Math.max(0, Math.min(1, v));
  }, 50);
}
function syncMusic() {
  const inLobby = !!document.querySelector('.lobby-scene');
  if (on && inLobby && musicOk) {
    if (music.paused) music.play().then(() => fadeTo(MUSIC_VOLUME)).catch(() => {});
    else fadeTo(MUSIC_VOLUME);
  } else if (!music.paused) fadeTo(0, 800);
}

window.ccsVoice = {
  isOn: () => on,
  setOn(value) {
    on = !!value;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode: not remembered */ }
    if (!on) {
      queue.length = 0;
      if (current) { current.pause(); current = null; }
      if (window.speechSynthesis) speechSynthesis.cancel();
    }
    setTimeout(syncMusic, 0);
    return on;
  },
  greet() {
    greeted = true;
    play('greeting', LINES.greeting, { interrupt: true });
  },
  // Concierge replies: play the matching recording and hand the text back for display.
  say(text) {
    const key = (REPLY_KEYS.find(([start]) => text.startsWith(start)) || [])[1];
    if (key) play(key, text, { interrupt: true });
    return text;
  },
  // Elevator: announce the floor as the car arrives, before the doors open.
  approach(floor) {
    greeted = true;
    play('floor-' + floor, LINES['floor-' + floor], { interrupt: true });
  },
  // Doors open: the receptionist greets the visitor.
  arrive(floor) {
    const suite = FLOOR_SUITE[floor];
    if (suite) play('welcome-' + suite, LINES['welcome-' + suite]);
  },
  // Walking into a lounge.
  lounge(id) {
    play('lounge-' + id, LINES['lounge-' + id], { interrupt: true });
  },
};

// Returning visitors who turned sound on hear the concierge on their first tap.
function firstTap() {
  window.removeEventListener('pointerdown', firstTap, true);
  window.removeEventListener('keydown', firstTap, true);
  setTimeout(() => {
    syncMusic();
    if (on && !greeted && document.querySelector('.lobby-scene')) window.ccsVoice.greet();
  }, 150);
}
window.addEventListener('pointerdown', firstTap, true);
window.addEventListener('keydown', firstTap, true);

// Music follows the visitor: plays in the lobby, fades out elsewhere.
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; syncMusic(); });
}).observe(document.documentElement, { childList: true, subtree: true });
