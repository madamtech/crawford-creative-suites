/* AI AuthoriTech: service menu with time per service, pricing calculator and weekly time planner.
   Saved in this browser under keys starting with "at_svc_". Prices hide in Presentation mode. */
(function () {
  var E = PK.esc, N = PK.num, S = PK.db('at_svc_');
  var el = { log: document.getElementById('at-svclog'), calc: document.getElementById('at-pricecalc') };
  if (!el.log) return;
  var TYPES = ['Consult call', 'Strategy session', 'Audit or assessment', 'Workshop or training', 'Webinar', 'Live demo', 'Build or automation', 'Marketing materials', 'Speaking', 'Retainer (monthly)'];
  var STATUS = ['Available', 'By request', 'Paused'];
  var CX = { 'Standard': 1, 'Custom': 1.25, 'Rush (under 1 week)': 1.5 };
  var SEED = [
    ['Discovery consult', 'Consult call', 30, 0, 0, '0', 'First 30 minutes free, then $125 per hour.'],
    ['Strategy call (1 hour)', 'Strategy session', 60, 15, 15, '', ''],
    ['AI readiness audit', 'Audit or assessment', 90, 60, 480, '', 'Interviews, review, written report and walkthrough.'],
    ['Team AI training workshop', 'Workshop or training', 120, 360, 60, '', 'Prep covers slides, exercises and handouts.'],
    ['Webinar', 'Webinar', 60, 240, 60, '', 'Prep covers slides, promo and rehearsal.'],
    ['Live demo', 'Live demo', 45, 120, 30, '', ''],
    ['Marketing materials design', 'Marketing materials', 30, 0, 240, '', 'Flyers, social graphics, one-pagers.'],
    ['Automation build', 'Build or automation', 60, 60, 840, '', 'Setup, testing and handover.']
  ];
  var svc = S.get('svc', null), set = S.get('set', { rate: 125, week: 15 }), book = S.get('book', []);
  var seeded = !svc; if (!svc) svc = SEED.map(function (r, i) { return { id: 's' + i, name: r[0], type: r[1], live: r[2], prep: r[3], follow: r[4], travel: 0, price: r[5], status: 'Available', notes: r[6] }; });
  function save() { S.set('svc', svc); S.set('set', set); S.set('book', book); seeded = false; }
  function fmt(n, d) { return (+n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return '$' + fmt(n, 0); }
  function hours(s) { return (N(s.live) + N(s.prep) + N(s.follow) + N(s.travel)) / 60; }
  function suggest(s, cx, extra) { return Math.ceil((hours(s) * N(set.rate) * (cx || 1) + N(extra || 0)) / 25) * 25; }
  function byId(id) { return svc.filter(function (s) { return s.id === id; })[0]; }

  var editing = null;
  function renderLog() {
    var mon = monday(), wk = book.filter(function (b) { return b.date >= mon && b.date < addDays(mon, 7); });
    var used = wk.reduce(function (t, b) { var s = byId(b.svc); return t + (s ? hours(s) : 0); }, 0), cap = N(set.week) || 1;
    el.log.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Services</span><h2>Service menu and time</h2></div><span class="source ' + (seeded ? 'example' : 'real') + '">' + (seeded ? 'Example data · edit to make it yours' : 'Real data · your service menu') + '</span></div>' +
      '<div class="even one h-md"><div class="card"><div class="toolbar"><h3 style="margin:0">What you offer</h3><span style="flex:1"></span><span class="k-hint">Rate $<input class="k-in" id="as-rate" type="number" min="0" step="5" value="' + set.rate + '" style="width:80px"> per hour</span><button class="btn small-btn" id="as-exp">Export CSV</button><button class="btn small-btn" id="as-bak">Backup</button><button class="btn small-btn" id="as-res">Restore</button></div>' +
        '<div class="fill"><table class="k-tbl"><thead><tr><th>Service</th><th>Status</th><th class="num">Live</th><th class="num">Prep</th><th class="num">Follow-up</th><th class="num">Total time</th><th class="num">Set price</th><th class="num">At your rate</th><th class="num">You earn per hour</th><th></th></tr></thead><tbody>' +
        svc.map(function (s) { var h = hours(s), sug = suggest(s), eff = s.price !== '' && h ? N(s.price) / h : null;
          return '<tr><td><b style="font-weight:600">' + E(s.name) + '</b><br><span class="k-hint">' + E(s.type) + (s.notes ? ' · ' + E(s.notes) : '') + '</span></td><td>' + E(s.status) + '</td><td class="num">' + N(s.live) + ' min</td><td class="num">' + N(s.prep) + ' min</td><td class="num">' + N(s.follow) + ' min</td><td class="num">' + fmt(h, 1) + ' h</td>' +
            '<td class="num k-price">' + (s.price === '' ? '<span class="k-hint">not set</span>' : money(N(s.price))) + '</td><td class="num k-price">' + money(sug) + '</td><td class="num k-price">' + (eff == null ? '' : (eff < N(set.rate) && N(s.price) > 0 ? '<span style="color:#F0229F">' + money(eff) + '</span>' : money(eff))) + '</td>' +
            '<td class="num"><button class="btn small-btn" data-edit="' + s.id + '">Edit</button></td></tr>'; }).join('') +
        '</tbody></table></div><p class="k-hint">“At your rate” counts every minute: live time, prep, follow-up and travel. A pink “per hour” number means the set price pays less than your rate.</p></div></div>' +
      '<div class="even h-md"><div class="card"><h3>' + (editing ? 'Edit service' : 'Add a service') + '</h3><form class="k-form fill" id="as-form" autocomplete="off">' +
          '<label class="wide">Service name<input id="as-name" required></label>' +
          '<label>Type<select id="as-type">' + TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label><label>Status<select id="as-status">' + STATUS.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
          '<label>Live time (min)<input id="as-live" type="number" min="0" step="5"></label><label>Prep (min)<input id="as-prep" type="number" min="0" step="5"></label>' +
          '<label>Follow-up (min)<input id="as-follow" type="number" min="0" step="5"></label><label>Travel (min)<input id="as-travel" type="number" min="0" step="5"></label>' +
          '<label class="wide">Set price ($, leave blank if quoted)<input id="as-price" type="number" min="0" step="5"></label>' +
          '<label class="wide">Notes<input id="as-notes"></label>' +
          '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editing ? 'Save changes' : 'Add service') + '</button>' + (editing ? '<button class="btn" type="button" id="as-cancel">Cancel</button><button class="btn" type="button" id="as-del">Delete</button>' : '') + '</div></form></div>' +
        '<div class="card"><h3>This week’s time</h3><div class="fill">' +
          '<div class="k-kpis">' + '<div class="k-kpi"><b>' + fmt(used, 1) + ' h</b><span>booked, with prep and follow-up</span></div><div class="k-kpi"><b>' + fmt(Math.max(0, cap - used), 1) + ' h</b><span>open of ' + fmt(cap) + ' h</span></div></div>' +
          '<div class="meter' + (used > cap ? ' low' : '') + '" style="margin:10px 0"><i style="width:' + Math.min(100, used / cap * 100) + '%"></i></div>' +
          '<form class="k-form" id="as-book"><label>Date<input id="ab-date" type="date" value="' + PK.today() + '" required></label><label>Service<select id="ab-svc">' + svc.map(function (s) { return '<option value="' + s.id + '">' + E(s.name) + '</option>'; }).join('') + '</select></label><label class="wide">For<input id="ab-who" placeholder="Client first name or event"></label><div class="btnrow wide"><button class="btn small-btn primary" type="submit">Add to this week</button></div></form>' +
          '<ul class="checks" style="margin-top:10px">' + (wk.sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (b) { var s = byId(b.svc); return '<li><span>' + E(b.date) + ' · <b style="font-weight:600">' + E(s ? s.name : 'Removed service') + '</b>' + (b.who ? ' · ' + E(b.who) : '') + ' · ' + fmt(s ? hours(s) : 0, 1) + ' h <button class="btn small-btn" data-unbook="' + book.indexOf(b) + '">✕</button></span></li>'; }).join('') || '<li class="warn"><span>Nothing booked this week yet.</span></li>') + '</ul>' +
          '<label class="k-hint" style="display:block;margin-top:10px">Hours you can give AI AuthoriTech each week <input class="k-in" id="as-week" type="number" min="1" value="' + set.week + '" style="width:70px"></label>' +
        '</div></div></div>';
    bindLog();
  }
  function monday() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function bindLog() {
    var $ = function (id) { return document.getElementById(id); };
    $('as-rate').onchange = function () { set.rate = N(this.value) || 125; save(); renderAll(); };
    $('as-week').onchange = function () { set.week = N(this.value) || 15; save(); renderLog(); };
    $('as-exp').onclick = function () { PK.download('ai-authoritech-services-' + PK.today() + '.csv', PK.toCSV(svc.map(function (s) { return Object.assign({ totalHours: hours(s).toFixed(2), atYourRate: suggest(s) }, s); }), ['name', 'type', 'status', 'live', 'prep', 'follow', 'travel', 'totalHours', 'price', 'atYourRate', 'notes']), 'text/csv'); };
    $('as-bak').onclick = function () { PK.backup('at_svc_', 'ai-authoritech-services'); };
    $('as-res').onclick = function () { PK.restore('at_svc_', function () { svc = S.get('svc', svc); set = S.get('set', set); book = S.get('book', []); renderAll(); }); };
    el.log.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editing = b.dataset.edit; renderLog(); var s = byId(editing);
      $('as-name').value = s.name; $('as-type').value = s.type; $('as-status').value = s.status; $('as-live').value = s.live; $('as-prep').value = s.prep; $('as-follow').value = s.follow; $('as-travel').value = s.travel || 0; $('as-price').value = s.price; $('as-notes').value = s.notes || ''; $('as-form').scrollIntoView({ block: 'center' }); }; });
    if ($('as-cancel')) $('as-cancel').onclick = function () { editing = null; renderLog(); };
    if ($('as-del')) $('as-del').onclick = function () { if (confirm('Delete this service?')) { svc = svc.filter(function (s) { return s.id !== editing; }); editing = null; save(); renderAll(); } };
    $('as-form').onsubmit = function (e) { e.preventDefault();
      var s = { name: $('as-name').value.trim(), type: $('as-type').value, status: $('as-status').value, live: N($('as-live').value), prep: N($('as-prep').value), follow: N($('as-follow').value), travel: N($('as-travel').value), price: $('as-price').value, notes: $('as-notes').value.trim() };
      if (editing) Object.assign(byId(editing), s); else { s.id = PK.uid('s'); svc.push(s); } editing = null; save(); renderAll(); PK.say('Service saved'); };
    $('as-book').onsubmit = function (e) { e.preventDefault(); book.push({ date: $('ab-date').value, svc: $('ab-svc').value, who: $('ab-who').value.trim() }); save(); renderLog(); };
    el.log.querySelectorAll('[data-unbook]').forEach(function (b) { b.onclick = function () { book.splice(+b.dataset.unbook, 1); save(); renderLog(); }; });
  }

  /* ---------- Pricing calculator ---------- */
  var c = S.get('calc', { name: '', live: 60, prep: 120, follow: 30, travel: 0, cx: 'Standard', people: 0, perPerson: 0, tools: 0 });
  function renderCalc() {
    var h = hours(c), base = h * N(set.rate), cx = CX[c.cx] || 1, extra = N(c.people) * N(c.perPerson) + N(c.tools), total = Math.ceil((base * cx + extra) / 25) * 25;
    el.calc.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Services</span><h2>Price a new service</h2></div><span class="source real">Uses your $' + set.rate + '/hour rate</span></div>' +
      '<div class="even h-md"><div class="card"><h3>Time and extras</h3><form class="k-form fill" id="ac-form" autocomplete="off">' +
          '<label class="wide">What is it?<input id="ac-name" value="' + E(c.name) + '" placeholder="Live demo for a chamber of commerce"></label>' +
          '<label>Live time (min)<input id="ac-live" type="number" min="0" step="5" value="' + E(c.live) + '"></label><label>Prep (min)<input id="ac-prep" type="number" min="0" step="5" value="' + E(c.prep) + '"></label>' +
          '<label>Follow-up (min)<input id="ac-follow" type="number" min="0" step="5" value="' + E(c.follow) + '"></label><label>Travel (min)<input id="ac-travel" type="number" min="0" step="5" value="' + E(c.travel) + '"></label>' +
          '<label class="wide">Complexity<select id="ac-cx">' + Object.keys(CX).map(function (k) { return '<option' + (c.cx === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label>' +
          '<label>Attendees<input id="ac-people" type="number" min="0" value="' + E(c.people) + '"></label><label>Per attendee ($, handouts or seats)<input id="ac-pp" type="number" min="0" step="1" value="' + E(c.perPerson) + '"></label>' +
          '<label class="wide">Tools, software or materials ($)<input id="ac-tools" type="number" min="0" step="1" value="' + E(c.tools) + '"></label>' +
        '</form></div>' +
        '<div class="card"><h3>Suggested price</h3><div class="fill">' +
          '<div class="k-kpis"><div class="k-kpi"><b>' + fmt(h, 1) + ' h</b><span>your total time</span></div><div class="k-kpi"><b class="k-price">' + money(total) + '</b><span>suggested price</span></div></div>' +
          '<table class="k-tbl" style="margin-top:12px"><tbody>' +
            '<tr><td>Time at $' + set.rate + '/hour</td><td class="num k-price">' + money(base) + '</td></tr>' +
            (cx !== 1 ? '<tr><td>' + E(c.cx) + ' (×' + cx + ')</td><td class="num k-price">+' + money(base * (cx - 1)) + '</td></tr>' : '') +
            (extra ? '<tr><td>Attendees and tools</td><td class="num k-price">+' + money(extra) + '</td></tr>' : '') +
            '<tr><td><b>Rounded up to the nearest $25</b></td><td class="num k-price"><b>' + money(total) + '</b></td></tr></tbody></table>' +
          '<div class="note-box" style="margin-top:12px">Prep and follow-up are real work. A 1-hour webinar with 4 hours of prep is a 6-hour job. Your first 30-minute consult stays free; time after that is $125 per hour, paid in advance.</div>' +
          '<div class="btnrow" style="margin-top:12px"><button class="btn primary" id="ac-add">Add to service menu</button></div>' +
        '</div></div></div>';
    var $ = function (id) { return document.getElementById(id); };
    ['name', 'live', 'prep', 'follow', 'travel', 'cx', 'people', 'pp', 'tools'].forEach(function (k) { $('ac-' + k).onchange = function () { c.name = $('ac-name').value; c.live = $('ac-live').value; c.prep = $('ac-prep').value; c.follow = $('ac-follow').value; c.travel = $('ac-travel').value; c.cx = $('ac-cx').value; c.people = $('ac-people').value; c.perPerson = $('ac-pp').value; c.tools = $('ac-tools').value; S.set('calc', c); renderCalc(); }; });
    $('ac-add').onclick = function () { var nm = c.name || prompt('Name this service'); if (!nm) return; svc.push({ id: PK.uid('s'), name: nm, type: 'Live demo', status: 'By request', live: N(c.live), prep: N(c.prep), follow: N(c.follow), travel: N(c.travel), price: String(total), notes: c.cx !== 'Standard' ? c.cx : '' }); save(); renderAll(); PK.say('Added to your service menu'); };
  }
  function renderAll() { renderLog(); renderCalc(); }
  renderAll();
})();
