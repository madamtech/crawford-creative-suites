// Spoken concierge, receptionists and elevator announcements.
// Uses the browser's built-in speech (free, nothing to install or pay for).
// Sound is off until the visitor turns it on; browsers only allow speech after
// the visitor clicks or taps something. The choice is remembered on their device.

const KEY = 'ccs-sound';
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

const SUITES = {
  2: { approach: 'Floor 2. Suite 217. Madam Allure.', welcome: 'Welcome to Madam Allure, an elevated experience in beauty, fragrance, and self-care. How may we help you today?' },
  3: { approach: 'Floor 3. Suite 305. Allure Fusions.', welcome: 'Welcome to Allure Fusions, where beauty takes shape through dimensional art. How may we help you today?' },
  4: { approach: 'Floor 4. Suite 412. AI AuthoriTech.', welcome: 'Welcome to AI AuthoriTech, where clarity meets capability. How may we help you today?' },
};
const GREETING = 'Welcome to Crawford Creative Suites. How may I direct you today? Tell me what you are looking for, or choose a destination on the directory.';

function stored() {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
}
let on = stored();
let greeted = false;

// Prefer natural-sounding English voices where the device has them.
const PREFERRED = ['Aria', 'Jenny', 'Natural', 'Samantha', 'Google US English', 'Zira', 'Female'];
function pickVoice() {
  const voices = synth ? synth.getVoices().filter((v) => /^en/i.test(v.lang)) : [];
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices[0] || null;
}

function speak(text, { rate = 0.97, pitch = 1, interrupt = false } = {}) {
  if (!on || !synth || !text) return;
  if (interrupt) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = rate;
  u.pitch = pitch;
  synth.speak(u);
}

window.ccsVoice = {
  isOn: () => on,
  setOn(value) {
    on = !!value;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode: not remembered */ }
    if (!on && synth) synth.cancel();
    return on;
  },
  greet() {
    greeted = true;
    speak(GREETING, { interrupt: true });
  },
  // Concierge replies: speak them and hand the text back for display.
  say(text) {
    speak(text, { interrupt: true });
    return text;
  },
  // Elevator: announce the floor as the car arrives, before the doors open.
  approach(floor) {
    greeted = true;
    const s = SUITES[floor];
    speak(s ? s.approach : 'Floor 1. Main lobby.', { interrupt: true, rate: 0.92, pitch: 0.95 });
  },
  // Walking into a lounge.
  lounge(id) {
    const line = {
      clarity: 'Welcome to the AI Clarity Lounge, a practical space for separating AI facts from hype.',
      maker: "Welcome to the Maker's Lounge, where ideas, materials, and technology come together.",
      powder: 'Welcome to the Powder Room, a quiet place to explore beauty rituals, fragrance, and self-care.',
    }[id];
    speak(line, { interrupt: true });
  },
  // Doors open: the receptionist greets the visitor.
  arrive(floor) {
    const s = SUITES[floor];
    if (s) speak(s.welcome);
  },
};

// Returning visitors who turned sound on hear the concierge on their first tap.
function firstTap() {
  window.removeEventListener('pointerdown', firstTap, true);
  window.removeEventListener('keydown', firstTap, true);
  setTimeout(() => {
    if (on && !greeted && document.querySelector('.lobby-scene')) window.ccsVoice.greet();
  }, 150);
}
window.addEventListener('pointerdown', firstTap, true);
window.addEventListener('keydown', firstTap, true);
if (synth) synth.onvoiceschanged = () => {};
