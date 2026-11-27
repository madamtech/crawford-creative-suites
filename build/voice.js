// Spoken concierge, receptionists, elevator, and lobby music.
//
// The voices are recorded audio files (your ElevenLabs voice or your own
// recordings) in the site's audio/ folder. See audio/README.md for the exact
// lines and file names. A line with no file yet stays silent: the device's
// robotic voice is not used (set USE_DEVICE_VOICE to true to allow it).
//
// Sound is on unless the visitor mutes it (the Sound button in the header); the
// choice is remembered on their device. The concierge greets visitors as they
// arrive in the lobby. If the browser blocks sound until the visitor interacts,
// she greets them on their first tap or key press instead.

// In the local preview (127.0.0.1 / localhost) every unrecorded line is read by the
// device voice, so the owner can hear the whole flow before recording (Nov 27).
const USE_DEVICE_VOICE = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
// Nov 27 (owner): on the live site, unrecorded lines stay silent; the device voice
// sounded wrong for the receptionists. (Nov 25 it read the elevator and receptionist
// welcomes.) The local preview above still reads every line so she can hear the flow.
const DEVICE_VOICE_FOR = /(?!)/;
// Pause between the elevator's floor announcement and the receptionist's welcome (owner, Nov 27: it was too quick).
const ARRIVAL_PAUSE = 1300;
// Visitors who arrive straight into Log In, My Orders or the Admin Office (including
// a returning sign-in link) are not greeted again by the lobby concierge (owner, Nov 27).
const STARTED_IN_PANEL = /access_token|^#(login|projects|admin)/.test(location.hash);
const AUDIO = '../audio/';
const KEY = 'ccs-sound';
const MUSIC_VOLUME = 0.16;   // lobby music stays soft under the voices

const LINES = {
  greeting: 'Welcome to Crawford Creative Suites. How may I direct you today? Tell me what you are looking for, or choose a destination on the directory.',
  'reply-unknown': 'I couldn’t quite place that. Try the directory, or tell me what kind of business you need.',
  // Elevator voice, after the ding as the doors open (Nov 25: owner's wording).
  // No elevator welcome for the lobby: the concierge greets visitors there (owner, Nov 25).
  // Nov 27 (owner): the elevator voice (Blake Harlow, male) announces only the floor and
  // the business, short enough to finish as the doors open; the receptionist welcomes them.
  'floor-2': 'Floor two. Madam Allure.',
  'floor-3': 'Floor three. Allure Fusions.',
  'floor-4': 'Floor four. AI AuthoriTech.',
  // Owner, Nov 25: the elevator says "Welcome to <business>." and the receptionist
  // only adds "How may I help you today?" (skipped when the concierge already
  // sent the visitor up with a question; it shows on the check-in screen).
  'welcome-217': 'How may I help you today?',
  'welcome-305': 'How may I help you today?',
  'welcome-412': 'How may I help you today?',
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
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
let on = stored();
let greeted = false;

// ---------- recorded clips ----------
let current = null;
const queue = [];
let blocked = false;   // the browser refused sound until the visitor interacts
// Which clips exist (audio/clips.json, written by the build), so missing
// lines are skipped without asking the server for them.
let clips = null;
fetch(AUDIO + 'clips.json').then((r) => r.ok ? r.json() : null).then((list) => { if (list) clips = new Set(list); }).catch(() => {});
const has = (key) => !clips || clips.has(key);

function playNext() {
  if (current || !queue.length) return;
  const { key, text } = queue.shift();
  if (!has(key)) { deviceSpeak(text, key); playNext(); return; }
  const a = new Audio(AUDIO + key + '.mp3');
  current = a;
  const done = () => { if (current === a) { current = null; playNext(); } };
  a.onended = done;
  a.onerror = () => { current = null; deviceSpeak(text, key); playNext(); };   // no file yet
  a.play().catch((err) => {
    if (err && err.name === 'NotAllowedError') {
      // The browser wants a tap first: keep this line for the first tap.
      current = null;
      queue.unshift({ key, text });
      blocked = true;
      return;
    }
    done();
  });
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
function deviceSpeak(text, key = '') {
  if (!(USE_DEVICE_VOICE || DEVICE_VOICE_FOR.test(key)) || !on || !text || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  u.voice = PREFERRED.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean) || voices[0] || null;
  u.rate = 0.97;
  if (key.startsWith('floor-')) { u.rate = 0.92; u.pitch = 0.9; }   // the elevator sounds a little different from the receptionist
  speechSynthesis.speak(u);
}

// ---------- lobby music ----------
const music = new Audio();
fetch(AUDIO + 'clips.json').then((r) => r.ok ? r.json() : null).then((list) => { if (!list || list.includes('lobby-music')) music.src = AUDIO + 'lobby-music.mp3'; else musicOk = false; }).catch(() => { music.src = AUDIO + 'lobby-music.mp3'; });
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
  // FAQ answers: play audio/<key>.mp3 if it has been recorded.
  // With { queue: true } it waits for the line already playing (a receptionist's welcome).
  sayKey(key, text, { queue = false } = {}) {
    play(key, text, { interrupt: !queue });
    return text;
  },
  // Run `fn` once the current spoken line (and anything queued) has finished,
  // plus a short pause. With sound off or nothing playing, just wait `pause` ms.
  afterSpeech(fn, pause = 700, settle = 500) {
    const busy = () => on && (current || queue.length || (window.speechSynthesis && speechSynthesis.speaking));
    if (!busy()) { setTimeout(fn, pause); return; }
    const started = Date.now();
    const tick = setInterval(() => {
      if (!busy() || Date.now() - started > 30000) {
        clearInterval(tick);
        setTimeout(fn, settle);
      }
    }, 150);
  },
  // Elevator: the car is moving. Quiet until it arrives.
  // Owner, Nov 25: the elevator says "Welcome to <business>." while the car is
  // still moving, before the doors open (no on-screen sign).
  approach(floor) {
    greeted = true;
    const line = LINES['floor-' + floor];
    if (line) setTimeout(() => play('floor-' + floor, line, { interrupt: true }), 250);
  },
  // Arrival: after the ding, as the doors open, the receptionist asks how she
  // can help (unless the concierge already sent the visitor up).
  arrive(floor) {
    const suite = FLOOR_SUITE[floor];
    // Sent up by the concierge (a question or a "take me to" from the lobby)?
    const routed = suite && window.ccsRouted === suite;
    window.ccsRouted = null;
    // Let the elevator finish "Welcome to ..." and leave a breath before the receptionist speaks.
    window.ccsVoice.afterSpeech(() => {
      // The receptionist speaks first; a lobby question's answer (queued on arrival) follows.
      const answer = [];
      for (let k = queue.length - 1; k >= 0; k--) if (/^(faq-|r\d{3}-)/.test(queue[k].key)) answer.unshift(...queue.splice(k, 1));
      if (suite && !routed) play('welcome-' + suite, LINES['welcome-' + suite]);
      answer.forEach((q) => play(q.key, q.text));
    }, ARRIVAL_PAUSE, ARRIVAL_PAUSE);
  },
  // Elevator arrival chime: audio/elevator-chime.mp3 (swap the file to change the
  // sound; Nov 27 options are in OneDrive Work Notes > Elevator chime options).
  chime() {
    if (!on) return;
    const a = new Audio(AUDIO + 'elevator-chime.mp3');
    a.volume = 0.55;
    a.play().catch(() => {});
  },
  // Walking into a lounge.
  lounge(id) {
    play('lounge-' + id, LINES['lounge-' + id], { interrupt: true });
  },
};

// The concierge greets visitors as soon as they arrive in the lobby.
function greetOnArrival() {
  if (STARTED_IN_PANEL || document.body.hasAttribute('data-portal-open')) { greeted = true; return; }
  if (on && !greeted && document.querySelector('.lobby-scene')) window.ccsVoice.greet();
}
// If the browser blocked sound, the first tap or key press plays what was waiting.
function firstTap() {
  window.removeEventListener('pointerdown', firstTap, true);
  window.removeEventListener('keydown', firstTap, true);
  setTimeout(() => {
    syncMusic();
    if (blocked) { blocked = false; playNext(); }
    else greetOnArrival();
  }, 150);
}
window.addEventListener('pointerdown', firstTap, true);
window.addEventListener('keydown', firstTap, true);
setTimeout(() => { greetOnArrival(); syncMusic(); }, 900);

// Music follows the visitor: plays in the lobby, fades out elsewhere.
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; syncMusic(); });
}).observe(document.documentElement, { childList: true, subtree: true });
