/* Shared by the Madam Allure and Allure Fusions portals: Shipping log and Customer list.
   Customer details stay in this browser only. They are never copied into published pages. */
window.OrdersExtras = function (cfg) {
  var E = PK.esc, N = PK.num, S = PK.db(cfg.prefix);
  var el = { ship: document.getElementById(cfg.shipEl), cust: document.getElementById(cfg.custEl) };
  var ships = S.get('ships', []), custs = S.get('custs', []);
  function save() { S.set('ships', ships); S.set('custs', custs); }
  function fmt(n, d) { return (+n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return '$' + fmt(n, 2); }
  var CARRIERS = ['USPS', 'UPS', 'FedEx', 'Pirate Ship (USPS)', 'Other'];
  function trackUrl(c, t) { t = encodeURIComponent(String(t || '').replace(/\s/g, '')); if (!t) return '';
    if (/UPS/.test(c)) return 'https://www.ups.com/track?tracknum=' + t; if (/FedEx/.test(c)) return 'https://www.fedex.com/fedextrack/?trknbr=' + t;
    return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + t; }
  function orders() { return ((window.PORTAL_DATA || {}).orders || []).concat(cfg.extraOrders ? cfg.extraOrders() : []); }

  /* ---------- Shipping ---------- */
  function renderShip() {
    var ready = orders().filter(function (o) { return /ready|pack|ship/i.test(o.stage || '') && !/shipped|delivered/i.test(o.stage || '') && !ships.some(function (s) { return s.order === o.id; }); });
    var open = ships.filter(function (s) { return !s.delivered; });
    var charged = ships.reduce(function (t, s) { return t + N(s.charged); }, 0), cost = ships.reduce(function (t, s) { return t + N(s.cost); }, 0);
    el.ship.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Orders</span><h2>Shipping</h2></div><span class="source ' + (ships.length ? 'real' : 'example') + '">' + (ships.length ? 'Real data · your shipping log' : 'Log your first shipment') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis"><div class="k-kpi"><b>' + ready.length + '</b><span>ready to ship, no label yet</span></div><div class="k-kpi"><b>' + open.length + '</b><span>in transit</span></div><div class="k-kpi"><b>' + ships.length + '</b><span>shipments logged</span></div><div class="k-kpi"><b class="k-price">' + money(charged - cost) + '</b><span>shipping charged minus label cost</span></div></div></div></div>' +
      '<div class="even h-md"><div class="card"><h3>Log a shipment</h3><form class="k-form fill" id="sh-form" autocomplete="off">' +
          '<label>Order<input id="sh-order" list="sh-orders" required placeholder="Order ID"></label><datalist id="sh-orders">' + orders().map(function (o) { return '<option value="' + E(o.id) + '">' + E(o.items || '') + '</option>'; }).join('') + '</datalist>' +
          '<label>Ship date<input id="sh-date" type="date" value="' + PK.today() + '"></label>' +
          '<label>Carrier<select id="sh-car">' + CARRIERS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></label><label>Service<input id="sh-svc" placeholder="Ground Advantage, Priority…"></label>' +
          '<label class="wide">Tracking number<input id="sh-track"></label>' +
          '<label>Label cost ($)<input id="sh-cost" type="number" step="0.01" min="0"></label><label>Shipping charged ($)<input id="sh-charged" type="number" step="0.01" min="0"></label>' +
          '<label>Package (weight, box)<input id="sh-pkg" placeholder="1 lb 4 oz, 8×6×4"></label><label>Insurance<select id="sh-ins"><option>None</option><option>Included</option><option>Added</option></select></label>' +
          '<div class="btnrow wide"><button class="btn primary" type="submit">Save shipment</button></div>' +
          '<p class="k-hint wide">Your rule: balance and shipping are paid before shipment. No local pickup. After saving, send the “Ready to ship” or tracking message from Messages.</p></form></div>' +
        '<div class="card"><h3>Ready to ship</h3><div class="fill">' +
          (ready.length ? '<ul class="checks">' + ready.map(function (o) { return '<li class="warn"><span><b style="font-weight:600">' + E(o.id) + '</b> · ' + E(o.items || '') + (o.due ? ' · due ' + E(o.due) : '') + ' <button class="btn small-btn" data-pick="' + E(o.id) + '">Ship this</button></span></li>'; }).join('') + '</ul>' : '<p class="k-hint">No orders are waiting for a label. Orders show here when they reach a “Ready to ship” or “Packed” stage.</p>') +
          '<div class="note-box" style="margin-top:12px"><b>Packing checklist</b><br>Balance and shipping paid · Care card and thank-you note · Batch code on labels · Fragile items wrapped · Photo of the packed box for your records</div>' +
        '</div></div></div>' +
      '<div class="even one h-sm"><div class="card"><div class="toolbar"><h3 style="margin:0">Shipping log</h3><span style="flex:1"></span><button class="btn small-btn" id="sh-exp">Export CSV</button></div><div class="fill"><table class="k-tbl"><thead><tr><th>Order</th><th>Shipped</th><th>Carrier</th><th>Tracking</th><th class="num">Label</th><th class="num">Charged</th><th>Delivered</th><th></th></tr></thead><tbody>' +
        (ships.map(function (s, i) { var u = trackUrl(s.carrier, s.track); return '<tr><td class="mono">' + E(s.order) + '</td><td>' + E(s.date) + '</td><td>' + E(s.carrier) + (s.svc ? '<br><span class="k-hint">' + E(s.svc) + '</span>' : '') + '</td><td>' + (u ? '<a href="' + u + '" target="_blank" rel="noopener">' + E(s.track) + '</a>' : '') + '</td><td class="num k-price">' + (s.cost ? money(N(s.cost)) : '') + '</td><td class="num k-price">' + (s.charged ? money(N(s.charged)) : '') + '</td><td><label class="k-check"><input type="checkbox" data-del="' + i + '"' + (s.delivered ? ' checked' : '') + '> ' + (s.delivered ? 'Yes' : 'Not yet') + '</label></td><td class="num"><button class="btn small-btn" data-rm="' + i + '">✕</button></td></tr>'; }).join('') || '<tr><td colspan="8" class="k-hint">Shipments you log show here with live tracking links.</td></tr>') +
      '</tbody></table></div></div></div>';
    var $ = function (id) { return document.getElementById(id); };
    el.ship.querySelectorAll('[data-pick]').forEach(function (b) { b.onclick = function () { $('sh-order').value = b.dataset.pick; $('sh-track').focus(); }; });
    el.ship.querySelectorAll('[data-del]').forEach(function (c) { c.onchange = function () { ships[+c.dataset.del].delivered = c.checked; ships[+c.dataset.del].deliveredOn = c.checked ? PK.today() : ''; save(); renderShip(); }; });
    el.ship.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { if (confirm('Remove this shipment from the log?')) { ships.splice(+b.dataset.rm, 1); save(); renderShip(); } }; });
    $('sh-exp').onclick = function () { PK.download(cfg.slug + '-shipping-' + PK.today() + '.csv', PK.toCSV(ships, ['order', 'date', 'carrier', 'svc', 'track', 'cost', 'charged', 'pkg', 'ins', 'delivered']), 'text/csv'); };
    $('sh-form').onsubmit = function (e) { e.preventDefault(); ships.unshift({ order: $('sh-order').value.trim(), date: $('sh-date').value, carrier: $('sh-car').value, svc: $('sh-svc').value.trim(), track: $('sh-track').value.trim(), cost: $('sh-cost').value, charged: $('sh-charged').value, pkg: $('sh-pkg').value.trim(), ins: $('sh-ins').value, delivered: false }); save(); renderShip(); PK.say('Shipment saved'); };
  }

  /* ---------- Customers ---------- */
  var SOURCES = ['GoHighLevel', 'Wave (invoices)', 'Clover (pop-up shops)', 'Etsy', 'Website', 'Other'];
  var q = '', editing = null;
  function key(c) { return (c.email || '').toLowerCase() || String(c.phone || '').replace(/\D/g, '').slice(-10) || (c.first + ' ' + c.last).toLowerCase().trim(); }
  function isRepeat(c) { return N(c.orders) > 1 || (c.sources || []).length > 1; }
  function upcoming(c) { var out = [], now = new Date(); now.setHours(0, 0, 0, 0);
    [['birthday', 'Birthday'], ['memorial', 'Memorial date']].forEach(function (f) { if (!c[f[0]]) return; var d = new Date(c[f[0]] + 'T00:00:00'); d.setFullYear(now.getFullYear()); if (d < now) d.setFullYear(now.getFullYear() + 1); var n = Math.round((d - now) / 864e5); if (n <= 30) out.push({ c: c, what: f[1], days: n }); });
    return out; }
  function pickCol(row, names) { var ks = Object.keys(row); for (var i = 0; i < names.length; i++) { var k = ks.filter(function (x) { return x.toLowerCase().replace(/[^a-z]/g, '') === names[i]; })[0]; if (k && row[k]) return row[k]; } return ''; }
  function importRows(rows, source) {
    var added = 0, merged = 0;
    rows.forEach(function (r) {
      var first = pickCol(r, ['firstname', 'contactfirstname', 'givenname']), last = pickCol(r, ['lastname', 'contactlastname', 'surname', 'familyname']);
      var full = pickCol(r, ['customername', 'customer', 'name', 'fullname', 'contactname', 'contact']);
      if (!first && full) { var p = full.trim().split(/\s+/); first = p.shift(); last = last || p.join(' '); }
      var c = { first: first, last: last, email: pickCol(r, ['email', 'emailaddress', 'contactemail', 'customeremail']), phone: pickCol(r, ['phone', 'phonenumber', 'mobile', 'mobilephone', 'contactphone']),
        since: pickCol(r, ['customersince', 'created', 'datecreated', 'dateadded', 'createdat', 'firstvisit']), spent: N(pickCol(r, ['totalspent', 'lifetimevalue', 'totalsales', 'total', 'amountpaid', 'paid'])), orders: N(pickCol(r, ['orders', 'visits', 'totalorders', 'numberofinvoices', 'invoices'])), city: pickCol(r, ['city', 'billingcity']) };
      if (!c.first && !c.email && !c.phone) return;
      var k = key(c), ex = custs.filter(function (x) { return key(x) === k; })[0];
      if (ex) { ['first', 'last', 'email', 'phone', 'since', 'city'].forEach(function (f) { if (!ex[f] && c[f]) ex[f] = c[f]; }); ex.spent = N(ex.spent) + c.spent; ex.orders = N(ex.orders) + c.orders; if (ex.sources.indexOf(source) < 0) ex.sources.push(source); merged++; }
      else { c.id = PK.uid('c'); c.sources = [source]; custs.push(c); added++; }
    });
    save(); renderCust(); PK.say(added + ' new customers, ' + merged + ' matched existing');
  }
  function renderCust() {
    var rows = custs.filter(function (c) { return !q || (c.first + ' ' + c.last + ' ' + c.email + ' ' + c.phone + ' ' + (c.tags || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0; }).sort(function (a, b) { return N(b.spent) - N(a.spent); });
    var ups = [].concat.apply([], custs.map(upcoming)).sort(function (a, b) { return a.days - b.days; });
    el.cust.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Orders</span><h2>Customers</h2></div><span class="source ' + (custs.length ? 'real' : 'example') + '">' + (custs.length ? 'Real data · stays on this device only' : 'Import from Wave, Clover or GoHighLevel') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis"><div class="k-kpi"><b>' + custs.length + '</b><span>customers</span></div><div class="k-kpi"><b>' + custs.filter(isRepeat).length + '</b><span>repeat customers</span></div><div class="k-kpi"><b>' + ups.length + '</b><span>birthdays or dates in 30 days</span></div><div class="k-kpi"><b class="k-price">' + money(custs.reduce(function (t, c) { return t + N(c.spent); }, 0)) + '</b><span>lifetime sales on record</span></div></div></div></div>' +
      '<div class="even one h-md"><div class="card"><div class="toolbar"><input id="cu-q" placeholder="Search customers" value="' + E(q) + '"><span style="flex:1"></span><select id="cu-src">' + SOURCES.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select><button class="btn small-btn" id="cu-imp">Import CSV</button><button class="btn small-btn" id="cu-exp">Export CSV</button><button class="btn small-btn" id="cu-bak">Backup</button></div>' +
        '<div class="fill"><table class="k-tbl"><thead><tr><th>Customer</th><th>Contact</th><th>From</th><th class="num">Orders</th><th class="num">Spent</th><th>Dates</th><th></th></tr></thead><tbody class="cust-names">' +
        (rows.map(function (c) { return '<tr><td><b style="font-weight:600">' + E((c.first || '') + ' ' + (c.last || '')) + '</b>' + (isRepeat(c) ? ' <span class="st-pill st-vetted">Repeat</span>' : '') + (c.tags ? '<br><span class="k-hint">' + E(c.tags) + '</span>' : '') + '</td><td>' + E(c.email || '') + (c.phone ? '<br>' + E(c.phone) : '') + '</td><td>' + E((c.sources || []).join(', ')) + '</td><td class="num">' + (N(c.orders) || '') + '</td><td class="num k-price">' + (N(c.spent) ? money(N(c.spent)) : '') + '</td><td>' + (c.birthday ? 'Birthday ' + E(c.birthday.slice(5)) : '') + (c.memorial ? '<br>Memorial ' + E(c.memorial.slice(5)) : '') + '</td><td class="num"><button class="btn small-btn" data-edit="' + c.id + '">Edit</button></td></tr>'; }).join('') || '<tr><td colspan="7" class="k-hint">No customers yet. Export your customer list from Wave, Clover or GoHighLevel and import it here.</td></tr>') +
        '</tbody></table></div></div></div>' +
      '<div class="even h-md"><div class="card"><h3>' + (editing ? 'Edit customer' : 'Add a customer') + '</h3><form class="k-form fill" id="cu-form" autocomplete="off">' +
          '<label>First name<input id="cu-first" required></label><label>Last name<input id="cu-last"></label><label>Email<input id="cu-email" type="email"></label><label>Phone<input id="cu-phone"></label>' +
          '<label>Orders<input id="cu-orders" type="number" min="0"></label><label>Total spent ($)<input id="cu-spent" type="number" step="0.01" min="0"></label>' +
          '<label>Birthday<input id="cu-bday" type="date"></label><label>' + E(cfg.dateLabel || 'Memorial or special date') + '<input id="cu-mem" type="date"></label>' +
          '<label class="wide">Favorites and notes<input id="cu-tags" placeholder="Favorite scents, sizes, allergies, gift ideas"></label>' +
          '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editing ? 'Save' : 'Add customer') + '</button>' + (editing ? '<button class="btn" type="button" id="cu-cancel">Cancel</button><button class="btn" type="button" id="cu-del">Delete</button>' : '') + '</div></form></div>' +
        '<div class="card"><h3>Coming up and how to import</h3><div class="fill">' +
          (ups.length ? '<ul class="checks">' + ups.map(function (u) { return '<li class="warn"><span class="cust-names"><b style="font-weight:600">' + E(u.c.first) + '</b>: ' + E(u.what) + (u.days === 0 ? ' today' : ' in ' + u.days + ' day' + (u.days === 1 ? '' : 's')) + '</span></li>'; }).join('') + '</ul>' : '<p class="k-hint">Birthdays and ' + E((cfg.dateLabel || 'special dates').toLowerCase()) + ' in the next 30 days show here, so you can send a note or offer.</p>') +
          '<div class="note-box" style="margin-top:12px"><b>Wave:</b> Sales &amp; Payments → Customers → Export (CSV).<br><b>Clover:</b> Customers app on the web dashboard → Export (CSV).<br><b>GoHighLevel:</b> Contacts → select all → Export.<br>Choose where the file came from, then Import CSV. Matching email or phone numbers merge into one customer, so someone who bought at a pop-up and later by invoice shows as a repeat customer.</div>' +
          '<p class="k-hint" style="margin-top:8px">Customer details stay in this browser only and are never added to anything published. Presentation mode blurs them.</p>' +
        '</div></div></div>';
    var $ = function (id) { return document.getElementById(id); };
    $('cu-q').oninput = function () { q = this.value; var p = this.selectionStart; renderCust(); var i = $('cu-q'); i.focus(); i.setSelectionRange(p, p); };
    $('cu-imp').onclick = function () { var src = $('cu-src').value; PK.pickFile('.csv', function (t) { importRows(PK.parseCSV(t), src); }); };
    $('cu-exp').onclick = function () { PK.download(cfg.slug + '-customers-' + PK.today() + '.csv', PK.toCSV(custs.map(function (c) { return Object.assign({}, c, { sources: (c.sources || []).join('; ') }); }), ['first', 'last', 'email', 'phone', 'sources', 'orders', 'spent', 'since', 'birthday', 'memorial', 'tags']), 'text/csv'); };
    $('cu-bak').onclick = function () { PK.backup(cfg.prefix, cfg.slug + '-orders-extras'); };
    el.cust.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editing = b.dataset.edit; renderCust(); var c = custs.filter(function (x) { return x.id === editing; })[0];
      $('cu-first').value = c.first || ''; $('cu-last').value = c.last || ''; $('cu-email').value = c.email || ''; $('cu-phone').value = c.phone || ''; $('cu-orders').value = c.orders || ''; $('cu-spent').value = c.spent || ''; $('cu-bday').value = c.birthday || ''; $('cu-mem').value = c.memorial || ''; $('cu-tags').value = c.tags || ''; $('cu-form').scrollIntoView({ block: 'center' }); }; });
    if ($('cu-cancel')) $('cu-cancel').onclick = function () { editing = null; renderCust(); };
    if ($('cu-del')) $('cu-del').onclick = function () { if (confirm('Delete this customer?')) { custs = custs.filter(function (x) { return x.id !== editing; }); editing = null; save(); renderCust(); } };
    $('cu-form').onsubmit = function (e) { e.preventDefault();
      var c = { first: $('cu-first').value.trim(), last: $('cu-last').value.trim(), email: $('cu-email').value.trim(), phone: $('cu-phone').value.trim(), orders: $('cu-orders').value, spent: $('cu-spent').value, birthday: $('cu-bday').value, memorial: $('cu-mem').value, tags: $('cu-tags').value.trim() };
      if (editing) Object.assign(custs.filter(function (x) { return x.id === editing; })[0], c); else { c.id = PK.uid('c'); c.sources = ['Other']; custs.push(c); }
      editing = null; save(); renderCust(); PK.say('Customer saved'); };
  }
  if (el.ship) renderShip();
  if (el.cust) renderCust();
};
