// Keeps the lobby's welcome sign on the marble pillar at every window size.
// The sign's design is unchanged: it is laid out exactly as approved at a
// 1536-pixel-wide window, then scaled up or down with the lobby photo.
const PHOTO = { w: 1672, h: 941 };
const REF = { scale: 0.9187, left: 845.5, top: 83, width: 300 }; // approved layout, in photo pixels

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

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; place(); });
}
window.addEventListener('resize', schedule);
window.addEventListener('load', schedule);
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
