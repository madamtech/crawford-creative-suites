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
// Nov 25: the business name and the check-in screen are now part of each
// reception photo (img/*-desk.jpg), so they can never drift. Only the invisible
// tap area over the screen (and the check-in panel above it) is placed here.
// Photo pixels: bottom-center of the screen in the photo, and its width/height.
// Phones: the photo is framed on the business name (photo x of its center) so the whole name shows.
const NAME_CENTER = { 217: 836, 305: 953, 412: 702 };
const TABLET = {
  217: { x: 1131, y: 414, w: 93, h: 70 },
  305: { x: 540, y: 367, w: 93, h: 70 },
  412: { x: 1164, y: 409, w: 93, h: 70 },
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
  const t = TABLET[scene.dataset.suite];
  {
    const s = scene.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    const k = Math.max(r.width / PHOTO.w, r.height / PHOTO.h);
    const ox = r.left - s.left + (r.width - PHOTO.w * k) / 2;
    const oy = r.top - s.top + (r.height - PHOTO.h * k) / 2;
    scene.style.setProperty('--kiosk-x', `${ox + t.x * k}px`);
    scene.style.setProperty('--kiosk-y', `${oy + t.y * k}px`);
    scene.style.setProperty('--kiosk-w', `${t.w * k}px`);
    scene.style.setProperty('--kiosk-h', `${t.h * k}px`);
    // The check-in panel opens above the screen; if there is no room up there
    // (the screen sits high in the photo at some window sizes), it opens below.
    const desk = scene.querySelector('.reception-desk');
    const room = oy + (t.y - t.h) * k - 10;
    scene.toggleAttribute('data-kiosk-below', !!desk && desk.offsetHeight > room);
    // Keep the panel inside the window (it is centered on the screen when it fits).
    const half = desk ? desk.offsetWidth / 2 + 12 : 0;
    scene.style.setProperty('--panel-x', `${Math.min(Math.max(ox + t.x * k, half), s.width - half)}px`);
    // When the whole screen is in view, it is the tap area; otherwise (narrow
    // phones, where the photo is cropped) a separate Check in button is shown.
    const left = ox + (t.x - t.w / 2) * k, right = ox + (t.x + t.w / 2) * k;
    const inView = left >= 4 && right <= s.width - 4 && oy + (t.y - t.h) * k >= 4 && oy + t.y * k <= s.height - 4;
    scene.toggleAttribute('data-kiosk-inview', inView);
  }
  if (window.innerWidth <= 560) {
    const k = img.clientHeight / PHOTO.h;
    img.style.objectPosition = `${img.clientWidth / 2 - NAME_CENTER[scene.dataset.suite] * k}px 50%`;
  } else {
    img.style.removeProperty('object-position');
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
