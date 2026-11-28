/* Allure Fusions: your equipment, what each machine makes, and a simple maintenance log. */
(function () {
  var E = PK.esc, S = PK.db('af_eq_'), el = document.getElementById('af-equip'); if (!el) return;
  var SEED = [
    ['p1s', '3D printer', 'Bambu Lab P1S Combo (with AMS)', '256 × 256 × 256 mm', 'Multicolor prints up to 4 colors: keychains, notebook covers, ornaments, signs', 'Clean the build plate with dish soap weekly · Lubricate rods every 3 months · Check the AMS feeders and PTFE tubes monthly'],
    ['ad5m', '3D printer', 'Flashforge Adventurer 5M', '220 × 220 × 220 mm', 'Single-color jobs and long prints while the P1S runs multicolor', 'Clean the nozzle and plate weekly · Lubricate the lead screw every 3 months'],
    ['dryer', 'Filament dryer', 'Creality filament dryer (4 spools)', '4 spools', 'Dries filament before printing; can feed while drying', 'Swap or dry the desiccant when it changes color'],
    ['s1', 'Laser engraver', 'xTool S1 40W', '498 × 319 mm work area', 'Engraving and cutting wood, slate, leather, acrylic, coated metal', 'Clean the lens and check the air assist weekly · Empty the honeycomb tray · Never run unattended'],
    ['screen', 'Screen printer', 'xTool screen printer', '', 'Screen-printed shirts, totes and merch', 'Wash screens right after use'],
    ['hp1', 'Heat press', 'Heat Press Nation 15 × 15', '15 × 15 in', 'Shirts, totes, larger sublimation blanks', 'Wipe the platen and check the Teflon sheet before each session'],
    ['hp2', 'Heat press', 'Heat Press Nation 9 × 13', '9 × 13 in', 'Smaller blanks: coasters, mouse pads, notebook covers', 'Wipe the platen and check the Teflon sheet before each session'],
    ['sub', 'Sublimation printer', 'Epson WF-7210 (converted for sublimation)', 'Up to 13 × 19 in', 'Sublimation transfers', 'Print a nozzle check at least weekly so the ink does not clog'],
    ['ink', 'Inkjet printer', 'Epson WF-7310', 'Up to 13 × 19 in', 'Stickers, labels, inserts, printable vinyl', 'Run a nozzle check weekly'],
    ['photo', 'Photo printer', 'Canon PIXMA', 'Photo sizes', 'Photo prints for memorial and keepsake pieces', 'Run a nozzle check before photo jobs'],
    ['cricut', 'Cutter', 'Cricut Maker', '12 × 24 in mat', 'Vinyl, HTV, cardstock, fabric; print-then-cut stickers', 'Replace the blade when cuts drag · Clean or replace sticky mats'],
    ['cameo', 'Cutter', 'Silhouette Cameo 4', '12 in wide, matless rolls', 'Long vinyl runs, stickers, print-and-cut labels', 'Replace the blade when cuts drag']
  ];
  var eq = S.get('eq', null);
  if (!eq) eq = SEED.map(function (r) { return { id: r[0], type: r[1], name: r[2], size: r[3], makes: r[4], care: r[5], last: '', status: 'Working', notes: '' }; });
  function save() { S.set('eq', eq); }
  function age(d) { if (!d) return null; return Math.round((new Date() - new Date(d + 'T00:00:00')) / 864e5); }
  function render() {
    var due = eq.filter(function (m) { var a = age(m.last); return a == null || a > 30; });
    el.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Production</span><h2>Equipment</h2></div><span class="source real">Real data · your machines, Nov 23, 2026</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis"><div class="k-kpi"><b>' + eq.length + '</b><span>machines</span></div><div class="k-kpi"><b>' + eq.filter(function (m) { return m.status !== 'Working'; }).length + '</b><span>need repair or parts</span></div><div class="k-kpi"><b>' + due.length + '</b><span>no care logged in 30 days</span></div></div></div></div>' +
      '<div class="even one h-lg"><div class="card"><div class="fill"><table class="k-tbl"><thead><tr><th>Machine</th><th>Size</th><th>Best for</th><th>Care</th><th>Status</th><th>Last care</th><th></th></tr></thead><tbody>' +
        eq.map(function (m, i) { var a = age(m.last); return '<tr class="' + (m.status !== 'Working' ? 'low' : '') + '"><td><b style="font-weight:600">' + E(m.name) + '</b><br><span class="k-hint">' + E(m.type) + '</span></td><td>' + E(m.size) + '</td><td>' + E(m.makes) + '</td><td class="k-hint">' + E(m.care) + '</td>' +
          '<td><select class="k-in" data-st="' + i + '">' + ['Working', 'Needs parts', 'In repair', 'Retired'].map(function (s) { return '<option' + (m.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
          '<td>' + (m.last ? E(m.last) + '<br><span class="k-hint">' + a + ' days ago</span>' : '<span class="k-hint">not logged</span>') + '</td><td class="num"><button class="btn small-btn" data-care="' + i + '">Log care today</button></td></tr>'; }).join('') +
      '</tbody></table></div><p class="k-hint">Machine names fill the Print &amp; laser queue and the Print jobs printer list. Tell me if a model is wrong and I will correct it.</p></div></div>';
    el.querySelectorAll('[data-st]').forEach(function (s) { s.onchange = function () { eq[+s.dataset.st].status = s.value; save(); render(); }; });
    el.querySelectorAll('[data-care]').forEach(function (b) { b.onclick = function () { eq[+b.dataset.care].last = PK.today(); save(); render(); PK.say('Care logged'); }; });
  }
  render();
})();
