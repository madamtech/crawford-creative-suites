/* Allure Fusions: filament library, QR spool stickers, and print jobs that deduct filament.
   Saved in this browser under keys starting with "af_fil_". Use Backup to keep a copy in OneDrive. */
(function () {
  var E = PK.esc, N = PK.num, S = PK.db('af_fil_');
  var el = { fil: document.getElementById('af-fil'), qr: document.getElementById('af-qr'), jobs: document.getElementById('af-jobs') };
  if (!el.fil) return;
  var MATERIALS = ['PLA', 'PLA+', 'Matte PLA', 'Silk PLA', 'PLA-CF', 'Wood PLA', 'Glow PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'PVA (support)', 'Other'];
  var PRINTERS = ['Bambu Lab P1S (AMS)', 'Flashforge Adventurer 5M'];
  var LOCS = ['Shelf', 'Creality dryer bay 1', 'Creality dryer bay 2', 'Creality dryer bay 3', 'Creality dryer bay 4', 'AMS slot 1', 'AMS slot 2', 'AMS slot 3', 'AMS slot 4', 'Adventurer 5M', 'Sealed bag'];
  var DRY = { 'PLA': '50°C, 4 to 6 h', 'PLA+': '50°C, 4 to 6 h', 'Matte PLA': '50°C, 4 to 6 h', 'Silk PLA': '50°C, 4 to 6 h', 'PLA-CF': '55°C, 6 h', 'Wood PLA': '50°C, 6 h', 'Glow PLA': '50°C, 4 to 6 h', 'PETG': '65°C, 6 h', 'TPU': '55°C, 8 h', 'ABS': '70°C, 6 h', 'ASA': '70°C, 6 h', 'PVA (support)': '55°C, 8 h; store sealed' };
  var spools = S.get('spools', []), jobs = S.get('jobs', []), tpls = S.get('tpls', []), set = S.get('set', { rate: 0.5, reorder: 200 });
  function save() { S.set('spools', spools); S.set('jobs', jobs); S.set('tpls', tpls); S.set('set', set); }
  function byId(id) { return spools.filter(function (s) { return s.id === id; })[0]; }
  function low(s) { return N(s.left) <= N(s.reorder || set.reorder); }
  function pct(s) { return Math.max(0, Math.min(100, N(s.left) / (N(s.net) || 1000) * 100)); }
  function label(s) { return s ? (s.color + ' ' + s.material + (s.brand ? ' · ' + s.brand : '')) : '(removed spool)'; }
  function nextId() { var n = spools.reduce(function (m, s) { var x = parseInt(String(s.id).replace(/\D/g, ''), 10) || 0; return Math.max(m, x); }, 0) + 1; return 'AF-F' + String(n).padStart(3, '0'); }
  function fmt(n, d) { return (+n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return '$' + fmt(n, 2); }
  function perGram(s) { return s && N(s.cost) > 0 ? N(s.cost) / (N(s.net) || 1000) : 0; }
  function sw(s) { return '<span class="swatch" style="background:' + E(s.hex || '#999') + '"></span>'; }
  function spoolOpts(sel) { return '<option value="">Choose a spool</option>' + spools.filter(function (s) { return N(s.left) > 0 || s.id === sel; }).map(function (s) { return '<option value="' + s.id + '"' + (s.id === sel ? ' selected' : '') + '>' + E(s.id + ' · ' + label(s) + ' · ' + fmt(N(s.left)) + ' g') + '</option>'; }).join(''); }
  function kpi(n, l) { return '<div class="k-kpi"><b>' + n + '</b><span>' + l + '</span></div>'; }

  /* ---------- Filament library ---------- */
  var editing = null, q = '';
  function renderFil() {
    var lows = spools.filter(low), rows = spools.filter(function (s) { return !q || (s.id + ' ' + label(s) + ' ' + (s.loc || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    var total = spools.reduce(function (t, s) { return t + N(s.left); }, 0);
    el.fil.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Inventory</span><h2>Filament library</h2></div><span class="source ' + (spools.length ? 'real' : 'example') + '">' + (spools.length ? 'Real data · your spools' : 'Add your first spool below') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis">' + kpi(spools.length, 'spools logged') + kpi(fmt(total / 1000, 1) + ' kg', 'filament on hand') + kpi(lows.length, 'spools at or below reorder') + kpi(jobs.length, 'print jobs logged') + kpi(new Set(spools.map(function (s) { return s.color + s.material; })).size, 'colors and materials') + '</div></div></div>' +
      (spools.length === 0 && window.AF_FIL_START ? '<div class="even one"><div class="card"><div class="toolbar"><span><b style="font-weight:600">' + window.AF_FIL_START.length + ' spools found in your Amazon and Best Buy order emails</b> (May to Nov 2026). Add them, then weigh each spool and mark any that are used up.</span><span style="flex:1"></span><button class="btn primary small-btn" id="ff-start">Add these spools</button></div></div></div>' : '') +
      '<div class="even one h-md"><div class="card"><div class="toolbar"><input id="ff-q" placeholder="Search or scan a spool sticker" value="' + E(q) + '"><button class="btn small-btn" id="ff-cam" hidden>Scan with camera</button><span style="flex:1"></span>' +
        '<button class="btn small-btn" id="ff-imp">Import CSV</button><button class="btn small-btn" id="ff-exp">Export CSV</button><button class="btn small-btn" id="ff-bak">Backup</button><button class="btn small-btn" id="ff-res">Restore</button></div>' +
        '<div class="fill"><table class="k-tbl"><thead><tr><th>Spool</th><th>Color and material</th><th>Where</th><th>Left</th><th class="num">Grams</th><th>Last dried</th><th></th></tr></thead><tbody>' +
        (rows.map(function (s) { return '<tr class="' + (low(s) ? 'low' : '') + '"><td class="mono">' + E(s.id) + '</td><td>' + sw(s) + '<b style="font-weight:600">' + E(s.color) + '</b> ' + E(s.material) + '<br><span class="k-hint">' + E(s.brand || '') + (s.notes ? ' · ' + E(s.notes) : '') + '</span></td><td>' + E(s.loc || '') + '</td>' +
          '<td><div class="meter' + (low(s) ? ' low' : '') + '"><i style="width:' + pct(s) + '%"></i></div></td><td class="num">' + fmt(N(s.left)) + ' / ' + fmt(N(s.net) || 1000) + '</td><td>' + E(s.dried || '') + '</td>' +
          '<td class="num"><button class="btn small-btn" data-qr="' + s.id + '">QR</button> <button class="btn small-btn" data-weigh="' + s.id + '">Weigh</button> <button class="btn small-btn" data-edit="' + s.id + '">Edit</button></td></tr>'; }).join('') ||
          '<tr><td colspan="7" class="k-hint">No spools yet. Add one below; each gets an ID like AF-F001 for its QR sticker.</td></tr>') +
        '</tbody></table></div></div></div>' +
      '<div class="even h-md"><div class="card"><h3>' + (editing ? 'Edit spool ' + E(editing) : 'Add a spool') + '</h3><form class="k-form fill" id="ff-form" autocomplete="off">' +
          '<label>Color name<input id="ff-color" required placeholder="Rose gold silk"></label><label>Swatch<input id="ff-hex" type="color" value="#B76E79"></label>' +
          '<label>Material<select id="ff-mat">' + MATERIALS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></label><label>Brand<input id="ff-brand" placeholder="Bambu, Sunlu, Elegoo…"></label>' +
          '<label>Spool size (g)<input id="ff-net" type="number" min="0" value="1000"></label><label>Grams left<input id="ff-left" type="number" min="0" value="1000"></label>' +
          '<label>Empty spool weight (g)<input id="ff-empty" type="number" min="0" placeholder="For weigh-ins, e.g. 250"></label><label>Cost per spool ($)<input id="ff-cost" type="number" step="any" min="0"></label>' +
          '<label>Reorder at (g)<input id="ff-re" type="number" min="0" placeholder="' + set.reorder + '"></label><label>Where it is<select id="ff-loc">' + LOCS.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select></label>' +
          '<label>Last dried<input id="ff-dried" type="date"></label><label>Purchased<input id="ff-bought" type="date"></label>' +
          '<label class="wide">Notes<input id="ff-notes" placeholder="Nozzle temp that works, supplier link, lot…"></label>' +
          '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editing ? 'Save changes' : 'Add spool') + '</button>' + (editing ? '<button class="btn" type="button" id="ff-cancel">Cancel</button><button class="btn" type="button" id="ff-del">Delete</button>' : '') + '</div></form></div>' +
        '<div class="card"><h3>Reorder and care</h3><div class="fill">' +
          (lows.length ? '<ul class="checks">' + lows.map(function (s) { return '<li class="warn"><span>' + sw(s) + '<b style="font-weight:600">' + E(s.color + ' ' + s.material) + '</b> (' + E(s.id) + '): ' + fmt(N(s.left)) + ' g left' + (s.brand ? ' · ' + E(s.brand) : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="k-hint">Nothing is low. Spools show here when they reach their reorder amount (default ' + set.reorder + ' g).</p>') +
          '<div class="note-box" style="margin-top:12px"><b>Drying guide for your Creality 4-bay dryer</b><br>' + Object.keys(DRY).filter(function (m) { return spools.some(function (s) { return s.material === m; }) || ['PLA', 'PETG', 'TPU'].indexOf(m) >= 0; }).map(function (m) { return E(m) + ': ' + E(DRY[m]); }).join('<br>') + '</div>' +
          '<label class="k-hint" style="display:block;margin-top:12px">Default reorder level (g) <input class="k-in" id="ff-defre" type="number" min="0" value="' + set.reorder + '" style="width:90px"></label>' +
        '</div></div></div>';
    bindFil();
  }
  function bindFil() {
    var $ = function (id) { return document.getElementById(id); };
    $('ff-q').oninput = function () { q = this.value; var p = this.selectionStart; renderFil(); var i = $('ff-q'); i.focus(); i.setSelectionRange(p, p); };
    $('ff-q').onkeydown = function (e) { if (e.key === 'Enter') { var id = (this.value.match(/AF-F\d+/i) || [])[0]; if (id && byId(id.toUpperCase())) { q = id.toUpperCase(); renderFil(); PK.say('Found ' + q); } } };
    if ('BarcodeDetector' in window) { $('ff-cam').hidden = false; $('ff-cam').onclick = camScan; }
    if ($('ff-start')) $('ff-start').onclick = function () { window.AF_FIL_START.forEach(function (r) { spools.push({ id: nextId(), color: r[0], hex: r[1], material: r[2], brand: r[3], net: r[4], left: r[4], cost: String(r[5]), loc: 'Shelf', bought: r[6], notes: r[7] + ' Weigh to confirm grams left.' }); }); save(); renderAll(); PK.say(window.AF_FIL_START.length + ' spools added. Weigh each one to set what is left.'); };
    $('ff-defre').onchange = function () { set.reorder = N(this.value) || 200; save(); renderAll(); };
    $('ff-exp').onclick = function () { PK.download('allure-fusions-filament-' + PK.today() + '.csv', PK.toCSV(spools, ['id', 'color', 'hex', 'material', 'brand', 'net', 'left', 'empty', 'cost', 'reorder', 'loc', 'dried', 'bought', 'notes']), 'text/csv'); };
    $('ff-imp').onclick = function () { PK.pickFile('.csv', function (t) { var a = 0, rows = PK.parseCSV(t);
      if (rows.length && ('Product Name' in rows[0] || 'Title' in rows[0] || 'Item Description' in rows[0])) { a = fromStore(rows); save(); renderAll(); PK.say(a ? a + ' spools added from your order history. Weigh each one to confirm what is left.' : 'No filament found in that file.'); return; }
      rows.forEach(function (r) { if (!r.color) return; var ex = r.id && byId(r.id); if (ex) Object.assign(ex, r); else { r.id = r.id || nextId(); r.net = r.net || 1000; r.left = r.left || r.net; spools.push(r); a++; } }); save(); renderAll(); PK.say(a + ' spools added'); }); };
    $('ff-bak').onclick = function () { PK.backup('af_fil_', 'allure-fusions-filament'); };
    $('ff-res').onclick = function () { PK.restore('af_fil_', function () { spools = S.get('spools', []); jobs = S.get('jobs', []); tpls = S.get('tpls', []); set = S.get('set', set); renderAll(); }); };
    el.fil.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editing = b.dataset.edit; renderFil(); var s = byId(editing);
      $('ff-color').value = s.color; $('ff-hex').value = s.hex || '#999999'; $('ff-mat').value = s.material; $('ff-brand').value = s.brand || ''; $('ff-net').value = s.net; $('ff-left').value = s.left; $('ff-empty').value = s.empty || ''; $('ff-cost').value = s.cost || ''; $('ff-re').value = s.reorder || ''; $('ff-loc').value = s.loc || 'Shelf'; $('ff-dried').value = s.dried || ''; $('ff-bought').value = s.bought || ''; $('ff-notes').value = s.notes || ''; $('ff-form').scrollIntoView({ block: 'center' }); }; });
    el.fil.querySelectorAll('[data-qr]').forEach(function (b) { b.onclick = function () { showQR(byId(b.dataset.qr)); }; });    el.fil.querySelectorAll('[data-weigh]').forEach(function (b) { b.onclick = function () { var s = byId(b.dataset.weigh);
      var w = prompt('Put ' + s.id + ' (' + label(s) + ') on the scale. Total weight in grams, spool included:'); if (!w) return;
      var empty = N(s.empty) || N(prompt('Empty spool weight in grams (saved for next time):', '250')); if (!empty) return; s.empty = empty;
      s.left = Math.max(0, Math.round(N(w) - empty)); save(); renderAll(); PK.say(s.id + ': ' + s.left + ' g left'); }; });
    if ($('ff-cancel')) $('ff-cancel').onclick = function () { editing = null; renderFil(); };
    if ($('ff-del')) $('ff-del').onclick = function () { if (confirm('Delete spool ' + editing + '?')) { spools = spools.filter(function (s) { return s.id !== editing; }); editing = null; save(); renderAll(); } };
    $('ff-form').onsubmit = function (e) { e.preventDefault();
      var s = { color: $('ff-color').value.trim(), hex: $('ff-hex').value, material: $('ff-mat').value, brand: $('ff-brand').value.trim(), net: N($('ff-net').value) || 1000, left: N($('ff-left').value), empty: $('ff-empty').value, cost: $('ff-cost').value, reorder: $('ff-re').value, loc: $('ff-loc').value, dried: $('ff-dried').value, bought: $('ff-bought').value, notes: $('ff-notes').value.trim() };
      if (editing) { Object.assign(byId(editing), s); PK.say('Saved'); editing = null; } else { s.id = nextId(); spools.push(s); PK.say(s.id + ' added. Print its sticker on the QR stickers page.'); }
      save(); renderAll(); };
  }
  function camScan() {
    var v = document.createElement('video'), box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);display:grid;place-items:center;z-index:99'; box.innerHTML = '<div style="display:grid;gap:10px;justify-items:center"><p style="color:#fff">Point the camera at a spool sticker</p></div>';
    box.firstChild.appendChild(v); var cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = 'Cancel'; box.firstChild.appendChild(cancel); document.body.appendChild(box);
    v.style.cssText = 'max-width:90vw;max-height:60vh;border-radius:12px'; v.setAttribute('playsinline', '');
    var det = new BarcodeDetector({ formats: ['qr_code'] }), stream, stop = false;
    function end() { stop = true; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); box.remove(); }
    cancel.onclick = end;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (st) { stream = st; v.srcObject = st; v.play();
      (function loop() { if (stop) return; det.detect(v).then(function (c) { var hit = c.map(function (x) { return (x.rawValue.match(/AF-F\d+/) || [])[0]; }).filter(Boolean)[0]; if (hit) { end(); q = hit; renderFil(); PK.say('Found ' + hit); } else setTimeout(loop, 250); }).catch(function () { setTimeout(loop, 400); }); })();
    }).catch(function () { end(); alert('Camera not available. Type the spool ID or use a USB scanner in the search box.'); });
  }

  /* One spool's QR code: view it, or download it as PNG or SVG for your own sticker designs (Canva, Cricut or Silhouette print-then-cut) */
  function showQR(s) {
    if (!window.qrcode) { alert('The QR maker loads when you are online. Try again in a moment.'); return; }
    var text = 'AFSPOOL ' + s.id, svg = qrSvg(text);
    var box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:grid;place-items:center;z-index:99';
    box.innerHTML = '<div class="card" style="width:min(360px,92vw);display:grid;gap:12px;justify-items:center;text-align:center">' +
      '<h3 style="margin:0">' + E(s.id) + '</h3><p class="k-hint" style="margin:0">' + sw(s) + E(label(s)) + '</p>' +
      '<div style="background:#fff;padding:12px;border-radius:10px;width:200px;height:200px">' + svg.replace('<svg', '<svg width="176" height="176"') + '</div>' +
      '<p class="k-hint" style="margin:0">Scanning this code finds ' + E(s.id) + ' in your filament library.</p>' +
      '<div class="btnrow"><button class="btn primary" id="qd-png">Download PNG</button><button class="btn" id="qd-svg">Download SVG</button><button class="btn" id="qd-close">Close</button></div></div>';
    document.body.appendChild(box);
    box.onclick = function (e) { if (e.target === box) box.remove(); };
    box.querySelector('#qd-close').onclick = function () { box.remove(); };
    box.querySelector('#qd-svg').onclick = function () { PK.download(s.id + '-qr.svg', svg, 'image/svg+xml'); };
    box.querySelector('#qd-png').onclick = function () {
      var img = new Image(), c = document.createElement('canvas'); c.width = c.height = 600;
      img.onload = function () { var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 600); x.drawImage(img, 30, 30, 540, 540);
        c.toBlob(function (bl) { var a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = s.id + '-qr.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.indexOf('xmlns') < 0 ? svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"') : svg);
    };
  }

  /* Amazon "Your Orders" export or Best Buy purchase history CSV: find filament lines and add one spool per unit bought */
  var COLORS = ['rose gold', 'light blue', 'sky blue', 'dark blue', 'navy', 'royal blue', 'blue', 'black', 'white', 'grey', 'gray', 'silver', 'gold', 'copper', 'bronze', 'red', 'pink', 'magenta', 'purple', 'violet', 'orange', 'yellow', 'green', 'teal', 'turquoise', 'cyan', 'brown', 'beige', 'ivory', 'clear', 'transparent', 'rainbow', 'glow', 'marble', 'wood'];
  var HEX = { black: '#111111', white: '#F4F4F4', grey: '#8A8A8A', gray: '#8A8A8A', silver: '#C0C0C0', gold: '#D4AF37', 'rose gold': '#B76E79', copper: '#B87333', bronze: '#9C6B30', red: '#C62828', pink: '#F48FB1', magenta: '#D81B60', purple: '#7B1FA2', violet: '#8E24AA', orange: '#EF6C00', yellow: '#FDD835', green: '#2E7D32', teal: '#2FC4BA', turquoise: '#30D5C8', cyan: '#00BCD4', blue: '#1E63D6', 'light blue': '#81D4FA', 'sky blue': '#81D4FA', 'dark blue': '#1A237E', navy: '#1A237E', 'royal blue': '#2848C8', brown: '#6D4C41', beige: '#D7C4A3', ivory: '#F3EBD3', clear: '#E8F4F8', transparent: '#E8F4F8' };
  function fromStore(rows) {
    var n = 0;
    rows.forEach(function (r) {
      var name = r['Product Name'] || r['Title'] || r['Item Description'] || '';
      if (!/filament|\bPLA\b|PETG|\bTPU\b|\bABS\b|\bASA\b/i.test(name) || /nozzle|dryer|hotend|extruder|3d printer(?!.*filament)/i.test(name)) return;
      var mat = /silk/i.test(name) ? 'Silk PLA' : /matte/i.test(name) ? 'Matte PLA' : /PLA\+|PLA plus|PLA pro/i.test(name) ? 'PLA+' : /PETG/i.test(name) ? 'PETG' : /TPU/i.test(name) ? 'TPU' : /\bASA\b/i.test(name) ? 'ASA' : /\bABS\b/i.test(name) ? 'ABS' : /wood/i.test(name) ? 'Wood PLA' : /glow/i.test(name) ? 'Glow PLA' : 'PLA';
      var low = name.toLowerCase(), found = [];
      COLORS.forEach(function (c) { if (low.indexOf(c) >= 0 && !found.some(function (f) { return f.indexOf(c) >= 0; })) found.push(c); });
      var color = found.slice(0, 2).join(' and ') || 'Color to confirm';
      var kg = (name.match(/(\d+(?:\.\d+)?)\s*kg/i) || [])[1], net = kg ? Math.round(N(kg) * 1000) : 1000;
      var pack = N((name.match(/(\d+)\s*(?:pack|pcs|rolls|spools)/i) || [])[1]) || 1;
      var qty = Math.max(1, N(r['Quantity'] || r['Qty'] || 1)) * pack;
      var per = kg && pack > 1 ? Math.round(net / pack) : net;
      var date = (r['Order Date'] || r['Purchase Date'] || r['Date'] || '').slice(0, 10), price = N(r['Unit Price'] || r['Item Price'] || r['Price'] || r['Total Owed']);
      var brand = name.split(/\s+/)[0].replace(/[^A-Za-z0-9+]/g, '');
      for (var i = 0; i < Math.min(qty, 12); i++) {
        spools.push({ id: nextId(), color: color.replace(/^./, function (c) { return c.toUpperCase(); }), hex: HEX[found[0]] || '#999999', material: mat, brand: brand, net: per, left: per, cost: price ? (price / pack).toFixed(2) : '', loc: 'Shelf', bought: date, notes: 'From order history: confirm color and weigh. ' + name.slice(0, 80) });
        n++;
      }
    });
    return n;
  }

  /* ---------- QR stickers ---------- */
  var picked = S.get('qrPick', {});
  function qrSvg(text) {
    if (!window.qrcode) return '<div style="width:84px;height:84px;display:grid;place-items:center;border:1px solid #999;font-size:10px;text-align:center">QR loads when online</div>';
    var qr = window.qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize: 3, margin: 1, scalable: true });
  }
  function renderQR() {
    var chosen = spools.filter(function (s) { return picked[s.id]; });
    el.qr.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Inventory</span><h2>QR spool stickers</h2></div><span class="source real">Real data · from your filament library</span></div>' +
      '<div class="even one"><div class="card"><div class="toolbar"><span><b style="font-weight:600">' + chosen.length + ' of ' + spools.length + ' spools selected</b> <span class="k-hint">· each sticker holds the spool ID, color, material and brand</span></span><span style="flex:1"></span>' +
        '<button class="btn small-btn" id="fq-all">Select all</button><button class="btn small-btn" id="fq-none">Clear</button><button class="btn primary small-btn" id="fq-print"' + (chosen.length ? '' : ' disabled') + '>Print ' + chosen.length + ' sticker' + (chosen.length === 1 ? '' : 's') + '</button></div></div></div>' +
      '<div class="even h-md"><div class="card"><h3>Choose spools</h3><div class="fill"><div class="qr-pick">' +
        (spools.length ? spools.map(function (s) { return '<label class="k-check qr-row"><input type="checkbox" data-pick="' + s.id + '"' + (picked[s.id] ? ' checked' : '') + '>' + sw(s) + '<span class="qr-id mono">' + E(s.id) + '</span><span class="qr-name">' + E(label(s)) + '</span></label>'; }).join('') : '<p class="k-hint">Add spools in the Filament library first.</p>') +
        '</div></div></div>' +
        '<div class="card"><h3>Sticker preview</h3><div class="fill"><div id="qr-sheet" class="qr-sheet">' +
        (chosen.map(function (s) { return '<div class="qr-label">' + qrSvg('AFSPOOL ' + s.id) + '<div><b>' + E(s.id) + '</b><small><span class="swatch" style="background:' + E(s.hex || '#999') + ';width:10px;height:10px"></span>' + E(s.color) + '</small><small>' + E(s.material) + (s.brand ? ' · ' + E(s.brand) : '') + '</small><small>' + fmt(N(s.net) || 1000) + ' g spool</small><small>Allure Fusions</small></div></div>'; }).join('') || '<p class="k-hint">Tick spools on the left to preview their stickers here.</p>') +
        '</div></div></div></div>' +
      '<div class="even one"><div class="card"><h3>How the stickers work</h3><div class="qr-how">' +
        '<div class="note-box"><b>1. Print</b><br>Tick spools, then Print. Use 2-inch square labels or plain paper and tape.</div>' +
        '<div class="note-box"><b>2. Stick</b><br>One on the side of the spool. Add one on its dryer bay or AMS slot if you like.</div>' +
        '<div class="note-box"><b>3. Scan</b><br>Phone or tablet: “Scan with camera” on the Filament page. PC: click the search box and scan with a USB or Bluetooth scanner, or type the ID.</div>' +
        '<div class="note-box"><b>4. Log</b><br>When you log a print job, pick the spool by its ID so the grams come off the right color.</div>' +
      '</div></div></div>';
    el.qr.querySelectorAll('[data-pick]').forEach(function (c) { c.onchange = function () { if (c.checked) picked[c.dataset.pick] = 1; else delete picked[c.dataset.pick]; S.set('qrPick', picked); renderQR(); }; });
    document.getElementById('fq-all').onclick = function () { spools.forEach(function (s) { picked[s.id] = 1; }); S.set('qrPick', picked); renderQR(); };
    document.getElementById('fq-none').onclick = function () { picked = {}; S.set('qrPick', picked); renderQR(); };
    document.getElementById('fq-print').onclick = function () { document.body.classList.add('printing-qr'); window.print(); setTimeout(function () { document.body.classList.remove('printing-qr'); }, 500); };
  }
  if (!window.qrcode) { var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; sc.onload = function () { renderQR(); }; document.head.appendChild(sc); }

  /* ---------- Print jobs ---------- */
  var draft = S.get('draft', { order: '', product: '', printer: PRINTERS[0], parts: [{ part: '', spool: '', g: '', min: '', qty: 1 }], failed: false });
  function jobCost(parts) { var fil = 0, min = 0; parts.forEach(function (p) { fil += N(p.g) * N(p.qty || 1) * perGram(byId(p.spool)); min += N(p.min) * N(p.qty || 1); }); return { fil: fil, mach: min / 60 * N(set.rate), min: min }; }
  function renderJobs() {
    var orders = ((window.PORTAL_DATA || {}).orders || []);
    var c = jobCost(draft.parts), grams = draft.parts.reduce(function (t, p) { return t + N(p.g) * N(p.qty || 1); }, 0);
    el.jobs.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Production</span><h2>Print jobs and filament use</h2></div><span class="source ' + (jobs.length ? 'real' : 'example') + '">' + (jobs.length ? 'Real data · your print log' : 'Log your first print') + '</span></div>' +
      '<div class="even one"><div class="card"><h3>Log a print</h3><form id="fj-form" style="display:grid;gap:10px;align-content:start" autocomplete="off">' +
        '<div class="k-form"><label>Order<input id="fj-order" list="fj-orders" value="' + E(draft.order) + '" placeholder="Order ID or “stock”"></label><datalist id="fj-orders">' + orders.map(function (o) { return '<option value="' + E(o.id) + '">' + E(o.items || '') + '</option>'; }).join('') + '</datalist>' +
        '<label>Product<input id="fj-product" list="fj-tpls" value="' + E(draft.product) + '" placeholder="Keychain, notebook cover…"></label><datalist id="fj-tpls">' + tpls.map(function (t) { return '<option value="' + E(t.name) + '">'; }).join('') + '</datalist>' +
        '<label class="wide">Printer<select id="fj-printer">' + PRINTERS.map(function (p) { return '<option' + (draft.printer === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label></div>' +
        '<table class="k-tbl"><thead><tr><th>Part</th><th>Spool (color)</th><th class="num">Grams each</th><th class="num">Minutes</th><th class="num">Qty</th><th></th></tr></thead><tbody>' +
        draft.parts.map(function (p, i) { return '<tr><td><input class="k-in" data-p="part" data-i="' + i + '" value="' + E(p.part) + '" placeholder="Front"></td><td><select class="k-in" data-p="spool" data-i="' + i + '">' + spoolOpts(p.spool) + '</select></td><td><input class="k-in num" type="number" step="any" min="0" data-p="g" data-i="' + i + '" value="' + E(p.g) + '" style="width:80px"></td><td><input class="k-in num" type="number" step="any" min="0" data-p="min" data-i="' + i + '" value="' + E(p.min) + '" style="width:80px"></td><td><input class="k-in num" type="number" min="1" data-p="qty" data-i="' + i + '" value="' + E(p.qty) + '" style="width:60px"></td><td>' + (draft.parts.length > 1 ? '<button type="button" class="btn small-btn" data-rm="' + i + '">✕</button>' : '') + '</td></tr>'; }).join('') +
        '</tbody></table>' +
        '<div class="btnrow"><button type="button" class="btn small-btn" id="fj-add">+ Add part or color</button><button type="button" class="btn small-btn" id="fj-tpl">Save as product template</button></div>' +
        '<p class="k-hint">Copy grams and print time from the slicer (Bambu Studio or Orca: “Filament” and “Total time”; FlashPrint: “Material” and “Time”). For multicolor AMS prints, add one row per color with that color’s grams.</p>' +
        '<label class="k-check"><input type="checkbox" id="fj-failed"' + (draft.failed ? ' checked' : '') + '> This print failed (filament still comes off; it is logged as waste)</label>' +
        '<div class="note-box">This job: <b>' + fmt(grams, 1) + ' g</b> of filament · ' + fmt(c.min / 60, 1) + ' h machine time · filament ' + money(c.fil) + ' + machine ' + money(c.mach) + ' = <b>' + money(c.fil + c.mach) + '</b> cost</div>' +
        '<div class="btnrow"><button class="btn primary" type="submit">Log print and deduct filament</button></div></form></div></div>' +
      '<div class="even h-sm"><div class="card"><h3>Product templates</h3><div class="fill">' +
        (tpls.length ? '<table class="k-tbl"><thead><tr><th>Product</th><th>Parts</th><th class="num">Grams</th><th></th></tr></thead><tbody>' + tpls.map(function (t, i) { return '<tr><td><b style="font-weight:600">' + E(t.name) + '</b></td><td>' + E(t.parts.map(function (p) { return p.part || 'Part'; }).join(', ')) + '</td><td class="num">' + fmt(t.parts.reduce(function (s, p) { return s + N(p.g) * N(p.qty || 1); }, 0), 1) + '</td><td class="num"><button class="btn small-btn" data-use="' + i + '">Use</button> <button class="btn small-btn" data-tdel="' + i + '">✕</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="k-hint">Save a job as a template (for example “Notebook cover” with Front and Back parts). Next time pick it, choose colors, and the grams fill in.</p>') +
        '</div></div><div class="card"><h3>Filament forecast</h3><div class="fill"><div class="note-box">' + lowForecast() + '</div>' +
        '<label class="k-hint" style="display:block;margin-top:12px">Machine cost per hour (power and wear) $<input class="k-in" id="fj-rate" type="number" step="0.05" min="0" value="' + set.rate + '" style="width:80px"></label>' +
      '</div></div></div>' +
      '<div class="even one h-sm"><div class="card"><div class="toolbar"><h3 style="margin:0">Print log</h3><span style="flex:1"></span><button class="btn small-btn" id="fj-exp">Export CSV</button></div><div class="fill"><table class="k-tbl"><thead><tr><th>Date</th><th>Order</th><th>Product</th><th>Printer</th><th>Colors used</th><th class="num">Grams</th><th class="num">Cost</th><th></th></tr></thead><tbody>' +
        (jobs.map(function (j, i) { return '<tr><td>' + E(j.date) + '</td><td>' + E(j.order || '') + '</td><td>' + E(j.product || '') + (j.failed ? ' <span class="st-pill st-test">Failed</span>' : '') + '</td><td>' + E(j.printer) + '</td><td>' + j.parts.map(function (p) { var s = byId(p.spool); return (s ? sw(s) : '') + E(p.spool); }).join(' ') + '</td><td class="num">' + fmt(j.grams, 1) + '</td><td class="num">' + money(j.cost) + '</td><td class="num"><button class="btn small-btn" data-undo="' + i + '" title="Remove and put the filament back">Undo</button></td></tr>'; }).join('') || '<tr><td colspan="8" class="k-hint">Logged prints show here.</td></tr>') +
      '</tbody></table></div></div></div>';
    bindJobs();
  }
  function lowForecast() {
    var out = spools.map(function (s) { var used = jobs.filter(function (j) { return !j.failed; }).reduce(function (t, j) { return t + j.parts.filter(function (p) { return p.spool === s.id; }).reduce(function (a, p) { return a + N(p.g) * N(p.qty || 1); }, 0); }, 0); var n = jobs.filter(function (j) { return j.parts.some(function (p) { return p.spool === s.id; }); }).length; return { s: s, avg: n ? used / n : 0 }; })
      .filter(function (x) { return x.avg > 0; }).map(function (x) { return { s: x.s, left: Math.floor(N(x.s.left) / x.avg) }; }).sort(function (a, b) { return a.left - b.left; }).slice(0, 5);
    return out.length ? out.map(function (x) { return sw(x.s) + E(x.s.id + ' ' + x.s.color) + ': about ' + x.left + ' more job' + (x.left === 1 ? '' : 's') + ' at your usual size'; }).join('<br>') : 'Once you log a few prints, this shows how many more jobs each spool can cover.';
  }
  function bindJobs() {
    var $ = function (id) { return document.getElementById(id); };
    function keep() { draft.order = $('fj-order').value; draft.product = $('fj-product').value; draft.printer = $('fj-printer').value; draft.failed = $('fj-failed').checked; S.set('draft', draft); }
    el.jobs.querySelectorAll('[data-p]').forEach(function (inp) { inp.onchange = function () { keep(); draft.parts[+inp.dataset.i][inp.dataset.p] = inp.value; S.set('draft', draft); renderJobs(); }; });
    el.jobs.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { keep(); draft.parts.splice(+b.dataset.rm, 1); renderJobs(); }; });
    $('fj-add').onclick = function () { keep(); draft.parts.push({ part: '', spool: '', g: '', min: '', qty: 1 }); renderJobs(); };
    $('fj-product').onchange = function () { keep(); var t = tpls.filter(function (x) { return x.name === draft.product; })[0]; if (t) { draft.parts = t.parts.map(function (p) { return { part: p.part, spool: '', g: p.g, min: p.min, qty: p.qty || 1 }; }); PK.say('Template loaded. Choose the colors.'); } renderJobs(); };
    $('fj-tpl').onclick = function () { keep(); var nm = draft.product || prompt('Product name for this template'); if (!nm) return; tpls = tpls.filter(function (t) { return t.name !== nm; }); tpls.push({ name: nm, parts: draft.parts.map(function (p) { return { part: p.part, g: p.g, min: p.min, qty: p.qty }; }) }); draft.product = nm; save(); renderJobs(); PK.say('Template saved'); };
    $('fj-rate').onchange = function () { set.rate = N(this.value); save(); renderJobs(); };
    el.jobs.querySelectorAll('[data-use]').forEach(function (b) { b.onclick = function () { var t = tpls[+b.dataset.use]; draft.product = t.name; draft.parts = t.parts.map(function (p) { return { part: p.part, spool: '', g: p.g, min: p.min, qty: p.qty || 1 }; }); S.set('draft', draft); renderJobs(); }; });
    el.jobs.querySelectorAll('[data-tdel]').forEach(function (b) { b.onclick = function () { if (confirm('Delete this template?')) { tpls.splice(+b.dataset.tdel, 1); save(); renderJobs(); } }; });
    el.jobs.querySelectorAll('[data-undo]').forEach(function (b) { b.onclick = function () { var j = jobs[+b.dataset.undo]; if (!confirm('Remove this print and put ' + fmt(j.grams, 1) + ' g back on the spools?')) return; j.parts.forEach(function (p) { var s = byId(p.spool); if (s) s.left = N(s.left) + N(p.g) * N(p.qty || 1); }); jobs.splice(+b.dataset.undo, 1); save(); renderAll(); }; });
    $('fj-exp').onclick = function () { PK.download('allure-fusions-print-log-' + PK.today() + '.csv', PK.toCSV(jobs.map(function (j) { return { date: j.date, order: j.order, product: j.product, printer: j.printer, failed: j.failed ? 'yes' : '', spools: j.parts.map(function (p) { return p.spool + ':' + N(p.g) * N(p.qty || 1) + 'g'; }).join(' '), grams: j.grams, cost: j.cost.toFixed(2) }; }), ['date', 'order', 'product', 'printer', 'failed', 'spools', 'grams', 'cost']), 'text/csv'); };
    $('fj-form').onsubmit = function (e) { e.preventDefault(); keep();
      var parts = draft.parts.filter(function (p) { return p.spool && N(p.g) > 0; });
      if (!parts.length) { alert('Choose a spool and enter the grams from the slicer for at least one part.'); return; }
      var short = parts.filter(function (p) { var s = byId(p.spool); return s && N(s.left) < N(p.g) * N(p.qty || 1); });
      if (short.length && !confirm(short.map(function (p) { return p.spool; }).join(', ') + ' may not have enough filament left. Log anyway?')) return;
      parts.forEach(function (p) { var s = byId(p.spool); if (s) s.left = Math.max(0, Math.round((N(s.left) - N(p.g) * N(p.qty || 1)) * 10) / 10); });
      var c = jobCost(parts);
      jobs.unshift({ date: PK.today(), order: draft.order, product: draft.product, printer: draft.printer, failed: draft.failed, parts: parts, grams: parts.reduce(function (t, p) { return t + N(p.g) * N(p.qty || 1); }, 0), cost: c.fil + c.mach });
      var lowNow = parts.map(function (p) { return byId(p.spool); }).filter(function (s) { return s && low(s); });
      draft = { order: '', product: '', printer: draft.printer, parts: [{ part: '', spool: '', g: '', min: '', qty: 1 }], failed: false };
      save(); S.set('draft', draft); renderAll();
      PK.say(lowNow.length ? 'Logged. Reorder soon: ' + lowNow.map(function (s) { return s.color + ' ' + s.material; }).join(', ') : 'Logged and filament deducted');
    };
  }

  function renderAll() { renderFil(); renderQR(); renderJobs();
    var mb = document.querySelector('.tab[data-v="fil"]'), n = spools.filter(low).length;
    if (mb) mb.textContent = 'Inventory' + (n ? ' (' + n + ' low)' : ''); }
  renderAll();
})();
