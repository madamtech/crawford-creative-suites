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

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; place(); placeKeypad(); });
}
window.addEventListener('resize', schedule);
window.addEventListener('load', schedule);
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
