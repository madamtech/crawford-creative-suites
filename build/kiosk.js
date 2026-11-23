// Check-in tablet on each reception desk. The office stays clear until the
// visitor taps the tablet; then the reception options open ("How may we help
// you today?"). Opening a showroom, changing floors, Escape or × closes it.

const OPEN = 'kioskOpen';

function setOpen(open) {
  if (open) document.body.dataset[OPEN] = '1';
  else delete document.body.dataset[OPEN];
  const tablet = document.querySelector('.checkin-tablet');
  if (tablet) tablet.setAttribute('aria-expanded', String(open));
  if (open) {
    const first = document.querySelector('.reception-desk .reception-options button');
    if (first) first.focus({ preventScroll: true });
  }
}

function ensure() {
  const scene = document.querySelector('.reception-scene');
  if (!scene) { setOpen(false); return; }

  if (scene.dataset.kioskFor !== scene.dataset.suite) {
    scene.dataset.kioskFor = scene.dataset.suite;   // new floor: start closed
    setOpen(false);
  }

  if (!scene.querySelector('.checkin-tablet')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'checkin-tablet';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Check in at reception');
    b.innerHTML = '<span class="checkin-screen"><span class="checkin-dot"></span><span class="checkin-text">Check in</span><span class="checkin-sub">Tap here</span></span>';
    b.addEventListener('click', () => setOpen(!document.body.dataset[OPEN]));
    scene.appendChild(b);
  }

  const desk = scene.querySelector('.reception-desk');
  if (desk && !desk.querySelector('.kiosk-close')) {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'kiosk-close';
    c.setAttribute('aria-label', 'Close check-in');
    c.textContent = '×';
    c.addEventListener('click', () => {
      setOpen(false);
      scene.querySelector('.checkin-tablet')?.focus({ preventScroll: true });
    });
    desk.prepend(c);
  }

  // A showroom, form or lounge took over: the check-in panel steps aside.
  if (scene.querySelector('.business-showroom') && document.body.dataset[OPEN]) setOpen(false);
}

let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; ensure(); });
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-suite'] });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.dataset[OPEN]) setOpen(false);
});
