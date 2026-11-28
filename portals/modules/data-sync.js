/* OneDrive data saving for the portals.
   Everything you type into the tools (inventory, filament, recipes, finances, customers, surveys, settings) is saved
   in the browser AND in a file in your OneDrive portals folder: portal-data/portal-data.json. Open the portals on any
   laptop, connect the same folder once, and your data is there. A dated backup is kept for each day (last 30 days).
   Works in Chrome and Edge. Nothing leaves your computer except through your own OneDrive. */
(function () {
  if (window.__dataSync) return; window.__dataSync = true;
  var LS = window.localStorage, AT = '__ds_local_at', SYNCED = '__ds_synced_at', FILE = 'portal-data.json', DIR = 'portal-data';
  var supported = 'showDirectoryPicker' in window && 'indexedDB' in window;

  /* 1. Mark every change so we know the browser has something newer to save */
  var origSet = Storage.prototype.setItem, origRemove = Storage.prototype.removeItem, timer = null, applying = false;
  function touched(key) { if (applying || String(key).indexOf('__ds_') === 0) return; origSet.call(LS, AT, new Date().toISOString()); schedule(); }
  /* Only real changes count: pages re-save settings with the same value every time they open. */
  Storage.prototype.setItem = function (k, v) { var old = this === LS ? this.getItem(k) : null; origSet.call(this, k, v); if (this === LS && old !== String(v)) touched(k); };
  Storage.prototype.removeItem = function (k) { var had = this === LS && this.getItem(k) !== null; origRemove.call(this, k); if (had) touched(k); };

  /* 2. Remember the chosen folder (IndexedDB keeps the folder permission between visits) */
  function idb(fn) { return new Promise(function (ok, bad) { var r = indexedDB.open('ccs-data-sync', 1); r.onupgradeneeded = function () { r.result.createObjectStore('h'); }; r.onsuccess = function () { var tx = r.result.transaction('h', 'readwrite'); var q = fn(tx.objectStore('h')); tx.oncomplete = function () { ok(q && q.result); }; tx.onerror = function () { bad(tx.error); }; }; r.onerror = function () { bad(r.error); }; }); }
  function getHandle() { return idb(function (s) { return s.get('dir'); }); }
  function setHandle(h) { return idb(function (s) { return s.put(h, 'dir'); }); }

  function snapshot() { var keys = {}; for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (k.indexOf('__ds_') !== 0) keys[k] = LS.getItem(k); } return keys; }
  function localAt() { return LS.getItem(AT) || ''; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function when(s) { return s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; }

  async function dataDir(root) { return root.getDirectoryHandle(DIR, { create: true }); }
  async function readFile(root) {
    try { var d = await dataDir(root), fh = await d.getFileHandle(FILE), f = await fh.getFile(); return JSON.parse(await f.text()); } catch (e) { return null; }
  }
  async function writeJson(dir, name, obj) { var fh = await dir.getFileHandle(name, { create: true }), w = await fh.createWritable(); await w.write(JSON.stringify(obj)); await w.close(); }

  var root = null, state = 'off';
  async function push() {
    if (!root) return;
    try {
      chip('saving');
      var d = await dataDir(root), at = localAt() || new Date().toISOString();
      var data = { app: 'Crawford Creative Suites portals', savedAt: at, savedFrom: location.pathname.split('/').pop() || 'portal', keys: snapshot() };
      await writeJson(d, FILE, data);
      var b = await d.getDirectoryHandle('backups', { create: true });
      await writeJson(b, 'portal-data-' + today() + '.json', data);
      var names = []; for await (var e of b.keys()) if (/^portal-data-\d{4}-\d{2}-\d{2}\.json$/.test(e)) names.push(e);
      names.sort(); while (names.length > 30) await b.removeEntry(names.shift());
      origSet.call(LS, SYNCED, at); chip('saved');
    } catch (e) { chip('error', e); }
  }
  function schedule() { if (!root) return; clearTimeout(timer); timer = setTimeout(push, 1500); }

  function apply(file) {
    applying = true;
    try {
      var keep = file.keys || {}, have = snapshot();
      Object.keys(have).forEach(function (k) { if (!(k in keep)) origRemove.call(LS, k); });
      Object.keys(keep).forEach(function (k) { origSet.call(LS, k, keep[k]); });
      origSet.call(LS, AT, file.savedAt); origSet.call(LS, SYNCED, file.savedAt);
    } finally { applying = false; }
  }
  async function pull(firstConnect) {
    var file = await readFile(root), lAt = localAt(), sAt = LS.getItem(SYNCED) || '';
    if (!file) { await push(); return; }
    if (file.savedAt === lAt) { origSet.call(LS, SYNCED, lAt); chip('saved'); return; }
    var fileNewer = file.savedAt > lAt, localChanged = lAt && lAt > sAt, fileChanged = file.savedAt > sAt;
    if (fileNewer && !(localChanged && sAt)) {
      if (firstConnect && Object.keys(snapshot()).length > 3 && !confirm('Your OneDrive folder has portal data saved ' + when(file.savedAt) + '. Load it into this browser? (Press Cancel to keep this browser’s data and save it to OneDrive instead.)')) { await push(); return; }
      apply(file);
      if (sessionStorage.getItem('__ds_reloaded') !== file.savedAt) { sessionStorage.setItem('__ds_reloaded', file.savedAt); location.reload(); return; }
      chip('saved'); return;
    }
    if (fileChanged && localChanged && fileNewer) {
      var useFile = confirm('Your portal data changed in two places: OneDrive (saved ' + when(file.savedAt) + ') and this browser (changed ' + when(lAt) + ').\n\nPress OK to load the OneDrive version, or Cancel to keep this browser’s version and save it to OneDrive. A backup of both stays in portal-data › backups.');
      if (useFile) { var d = await dataDir(root), b = await d.getDirectoryHandle('backups', { create: true }); await writeJson(b, 'browser-before-load-' + Date.now() + '.json', { savedAt: lAt, keys: snapshot() }); apply(file); location.reload(); return; }
    }
    await push();
  }

  async function connect() {
    try {
      var h = await window.showDirectoryPicker({ id: 'ccs-portals', mode: 'readwrite' });
      var looksRight = false; for await (var n of h.keys()) if (n === 'morning-dashboard.html') { looksRight = true; break; }
      if (!looksRight && !confirm('This folder doesn’t look like your portals folder (it has no morning-dashboard.html). Pick “Owner Portals and Morning Dashboard” in OneDrive. Use this folder anyway?')) return;
      await setHandle(h); root = h; await pull(true);
    } catch (e) { if (e && e.name !== 'AbortError') chip('error', e); }
  }
  async function reconnect() {
    try { var h = await getHandle(); if (!h) return connect(); if ((await h.requestPermission({ mode: 'readwrite' })) === 'granted') { root = h; await pull(false); } } catch (e) { chip('error', e); }
  }

  /* 3. The status chip next to Presentation mode / Light mode */
  var el = null;
  function chip(s, err) {
    state = s; if (!el) return;
    var t = { off: 'Save data to OneDrive', reconnect: 'Reconnect OneDrive', saving: 'Saving to OneDrive…', saved: 'Saved to OneDrive ' + when(LS.getItem(SYNCED)), error: 'OneDrive save failed: click to retry', unsupported: 'Saved in this browser only' }[s];
    el.textContent = t; el.setAttribute('aria-pressed', s === 'saved' ? 'true' : 'false');
    el.title = s === 'unsupported' ? 'Open the portals in Chrome or Edge to save your data to OneDrive.' : s === 'saved' ? 'Your data is saved in OneDrive › Owner Portals and Morning Dashboard › portal-data. Daily backups are kept in portal-data › backups.' : s === 'error' ? String(err && err.message || err) : 'Click to choose your Owner Portals and Morning Dashboard folder in OneDrive.';
  }
  function mount() {
    var tools = document.querySelector('.bar-tools') || document.querySelector('header .wrap') || document.body;
    el = document.createElement('button'); el.type = 'button'; el.className = 'chip'; el.id = 't-onedrive';
    el.onclick = function () { if (!supported) { alert('Saving to OneDrive needs Chrome or Microsoft Edge. Your data is still saved in this browser.'); return; } if (state === 'saved' || state === 'saving') { push(); return; } if (state === 'reconnect' || state === 'error') reconnect(); else connect(); };
    tools.insertBefore(el, tools.firstChild && tools.firstChild.nextSibling ? tools.firstChild.nextSibling : null);
    chip(supported ? 'off' : 'unsupported');
  }
  async function start() {
    mount(); if (!supported) return;
    try {
      var h = await getHandle(); if (!h) return chip('off');
      if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') { root = h; await pull(false); }
      else chip('reconnect');
    } catch (e) { chip('off'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.PortalSync = { push: push, connect: connect, status: function () { return state; } };
})();
