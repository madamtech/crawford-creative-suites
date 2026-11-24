// Lounges are rooms of their own (owner's lounge plan): selecting a lounge walks
// past reception and into that room. Each room's photo lives at
//   img/lounge-powder.jpg   Madam Allure, The Powder Room
//   img/lounge-maker.jpg    Allure Fusions, The Maker's Lounge
//   img/lounge-clarity.jpg  AI AuthoriTech, The AI Clarity Lounge
// Drop a photo in with that name and the room appears; until then the walk-in
// zoom toward the back of the office is used.

const known = {};   // id -> true (photo exists) | false (missing)

function check(id) {
  if (id in known) return Promise.resolve(known[id]);
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { known[id] = true; resolve(true); };
    im.onerror = () => { known[id] = false; resolve(false); };
    im.src = `../img/lounge-${id}.jpg`;
  });
}

function sync() {
  const scene = document.querySelector('.reception-scene');
  if (!scene) return;
  const panel = scene.querySelector('.business-showroom.lounge');
  const id = panel && [...panel.classList].find((c) => c.startsWith('lounge-'))?.slice(7);
  let room = scene.querySelector('.lounge-room');
  if (!id) {
    if (room) room.classList.remove('ready');
    return;
  }
  check(id).then((has) => {
    if (!has) return;
    room = scene.querySelector('.lounge-room');
    if (!room) {
      room = document.createElement('div');
      room.className = 'lounge-room';
      room.setAttribute('aria-hidden', 'true');
      scene.appendChild(room);
    }
    room.style.backgroundImage = `url(../img/lounge-${id}.jpg)`;
    requestAnimationFrame(() => room.classList.add('ready'));
  });
}

let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; sync(); });
}).observe(document.documentElement, { childList: true, subtree: true });

// ---------- Card buttons open the card's own ritual or explainer ----------
// The button first shows the guide on the card (build/lounge-guides.js); the
// guide's own button then continues to the original destination.
import { GUIDES, EXTRA_CARDS } from './lounge-guides.js';
window.ccsExtraCards = EXTRA_CARDS;

let passThrough = false;
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function guideHtml(g) {
  const body = g.compare
    ? `<dl>${g.compare.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    : `<ol>${g.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
  return `<h3>${esc(g.title)}</h3>${body}${g.note ? `<p class="guide-note">${esc(g.note)}</p>` : ''}`
    + `<div class="guide-actions"><button type="button" data-guide-next>${esc(g.next)} →</button><button type="button" data-guide-close>Close</button></div>`;
}

window.addEventListener('click', (e) => {
  if (passThrough) return;
  const card = e.target.closest('.education-card');
  if (!card) return;
  const ctaBtn = card.querySelector(':scope > button');
  if (e.target.closest('[data-guide-close]')) {
    card.querySelector('.card-guide')?.remove();
    card.classList.remove('guided');
    ctaBtn?.focus();
    return;
  }
  if (e.target.closest('[data-guide-next]')) {
    const g = GUIDES[card.querySelector('h2')?.textContent.trim()];
    window.ccsLoungeGo = g && g.to || null;   // which page the button opens
    passThrough = true;
    try { ctaBtn?.click(); } finally { passThrough = false; }
    return;
  }
  if (!ctaBtn || !ctaBtn.contains(e.target)) return;
  const title = card.querySelector('h2')?.textContent.trim();
  const g = GUIDES[title];
  if (!g) return;                                   // no guide: keep the original route
  e.stopPropagation();
  e.preventDefault();
  let box = card.querySelector('.card-guide');
  if (!box) {
    box = document.createElement('div');
    box.className = 'card-guide';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', g.title);
    ctaBtn.after(box);
  }
  box.dataset.for = title;
  box.innerHTML = guideHtml(g);
  card.classList.add('guided');
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}, true);

// A different card (Next, Previous, Surprise Me, a category tab) clears the old guide.
new MutationObserver(() => {
  document.querySelectorAll('.card-guide').forEach((box) => {
    const card = box.closest('.education-card');
    if (card?.querySelector('h2')?.textContent.trim() !== box.dataset.for) { box.remove(); card?.classList.remove('guided'); }
  });
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
