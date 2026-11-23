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
