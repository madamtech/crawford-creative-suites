// Keeps the lobby's welcome sign on the marble pillar at every window size.
// The sign's design is unchanged: it is laid out exactly as approved at a
// 1536-pixel-wide window, then scaled up or down with the lobby photo.
const PHOTO = { w: 1672, h: 941 };
// Fits inside the dark marble pillar (photo x 830-1110); Nov 23: was 326 photo px wide and overhung the wall.
const REF = { scale: 1.0075, left: 840, top: 83, width: 270 }; // layout px; left/top in photo pixels

function place() {
  const board = document.querySelector('.lobby-board');
  const img = document.querySelector('.lobby-scene > img');
  if (!board || !img) return;
  if (window.innerWidth <= 850) {            // phones: sign sits at the bottom instead
    board.classList.remove('scaled');
    ['left', 'top', 'width', 'transform'].forEach((p) => board.style.removeProperty(p));
    return;
  }
  const scene = img.parentElement.getBoundingClientRect();
  const r = img.getBoundingClientRect();
  const k = Math.max(r.width / PHOTO.w, r.height / PHOTO.h);   // object-fit: cover
  const ox = r.left - scene.left + (r.width - PHOTO.w * k) / 2;
  const oy = r.top - scene.top + (r.height - PHOTO.h * k) / 2;
  board.style.left = `${ox + REF.left * k}px`;
  board.style.top = `${oy + REF.top * k}px`;
  board.style.width = `${REF.width}px`;
  board.style.transform = `scale(${k / REF.scale})`;
  board.classList.add('scaled');
}

// Elevator: the floor buttons sit on the car's own brass keypad in the photo
// (which only shows 1-3), covering it with a 4-button plate, instead of a
// separate floating panel.
const KEYPAD = { left: 1276, top: 276, width: 70, height: 224 }; // photo pixels
function placeKeypad() {
  const panel = document.querySelector('.elevator-panel');
  const img = document.querySelector('.elevator-scene > img');
  if (!panel || !img) return;
  if (window.innerWidth <= 850) {
    panel.classList.remove('on-wall');
    ['left', 'top', 'width', 'height', 'font-size'].forEach((p) => panel.style.removeProperty(p));
    return;
  }
  const scene = img.parentElement.getBoundingClientRect();
  const r = img.getBoundingClientRect();
  const k = Math.max(r.width / PHOTO.w, r.height / PHOTO.h);
  const ox = r.left - scene.left + (r.width - PHOTO.w * k) / 2;
  const oy = r.top - scene.top + (r.height - PHOTO.h * k) / 2;
  panel.style.left = `${ox + KEYPAD.left * k}px`;
  panel.style.top = `${oy + KEYPAD.top * k}px`;
  panel.style.width = `${KEYPAD.width * k}px`;
  panel.style.height = `${KEYPAD.height * k}px`;
  panel.style.fontSize = `${17 * k}px`;
  panel.classList.add('on-wall');
}

// Reception desks: each business name is pinned to the front of its desk in the
// photo, so it stays on the desk at every window size (it used to drift because
// the photo is cropped to fill the window). Photo pixels: center x/y and width.
const DESK = {
  217: { x: 836, y: 527, w: 560 },
  305: { x: 953, y: 423, w: 284 },
  412: { x: 702, y: 480, w: 401 },
};
let watchedImg = null;
const photoSize = new ResizeObserver(() => schedule());
function placeDeskSign() {
  const scene = document.querySelector('.reception-scene');
  const sign = scene && scene.querySelector('.suite-sign');
  const img = scene && scene.querySelector(':scope > img');
  const d = scene && DESK[scene.dataset.suite];
  if (!sign || !img || !d) return;
  // Re-pin whenever the photo changes size (for example while a lounge closes
  // and the photo shrinks back), not only when the page structure changes.
  if (watchedImg !== img) {
    watchedImg = img;
    photoSize.disconnect();
    photoSize.observe(img);
  }
  if (window.innerWidth <= 560) {
    ['left', 'top', 'width'].forEach((p) => sign.style.removeProperty(p));
    sign.classList.add('pinned');
    return;
  }
  const s = scene.getBoundingClientRect();
  const r = img.getBoundingClientRect();
  const k = Math.max(r.width / PHOTO.w, r.height / PHOTO.h);
  const ox = r.left - s.left + (r.width - PHOTO.w * k) / 2;
  const oy = r.top - s.top + (r.height - PHOTO.h * k) / 2;
  sign.style.setProperty('left', `${ox + d.x * k}px`, 'important');
  sign.style.setProperty('top', `${oy + d.y * k}px`, 'important');
  sign.style.setProperty('width', `${d.w * k}px`, 'important');
  sign.classList.add('pinned');      // shown only once it sits on the desk
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; place(); placeKeypad(); placeDeskSign(); });
  // Layout can still be settling for a moment after a scene change; check again.
  clearTimeout(settle);
  settle = setTimeout(() => { place(); placeKeypad(); placeDeskSign(); }, 450);
}
let settle = null;
window.addEventListener('resize', schedule);
// Panels fade in and out (lounges, check-in); re-pin once they settle.
document.addEventListener('transitionend', schedule, true);
document.addEventListener('animationend', schedule, true);
window.addEventListener('load', schedule);
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
