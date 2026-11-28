/* Reports for each business: revenue, expenses, profit and loss, sales, customers, shipping, tax prep,
   plus business-specific reports. Reports build themselves from the portal's live data every time you open
   them; pick a period and export as a branded Excel workbook, PDF or Word document.
   Finance transactions save in this browser (keys "<code>_fin_"). Use Backup to keep a copy. */
window.Reports = function (cfg) {
  var E = PK.esc, N = PK.num, S = PK.db(cfg.code + '_fin_');
  var el = { rep: document.getElementById(cfg.repEl), led: document.getElementById(cfg.ledEl) };
  if (!el.rep) return;
  var ledger = S.get('ledger', []), st = S.get('state', { report: 'summary', period: 'month', from: '', to: '', hide: true });
  function save() { S.set('ledger', ledger); S.set('state', st); }
  function ls(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  function fmt(n, d) { return (+n || 0).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return (n < 0 ? '-$' : '$') + fmt(Math.abs(n), 2); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nice(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
  function monthKey(s) { return (s || '').slice(0, 7); }
  function monthName(k) { return k ? new Date(k + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'No date'; }
  function initials(name) { return String(name || '').split(/\s+/).filter(Boolean).map(function (w, i) { return i === 0 ? w : w[0] + '.'; }).join(' '); }
  function who(name) { return st.hide ? (String(name || '').trim() ? String(name).trim()[0].toUpperCase() + '.' : '') : (name || ''); }
  function sum(a, f) { return a.reduce(function (t, x) { return t + (f ? f(x) : x); }, 0); }
  function group(a, keyf, valf) { var m = {}; a.forEach(function (x) { var k = keyf(x) || 'Other'; m[k] = (m[k] || 0) + (valf ? valf(x) : 1); }); return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (x, y) { return y[1] - x[1]; }); }

  /* ---------- Categories ---------- */
  var OUT = ['Ingredients & materials', 'Packaging & labels', 'Filament & print supplies', 'Equipment & tools', 'Software & subscriptions', 'Marketing & ads', 'Shipping & postage', 'Platform & payment fees', 'Pop-up & vendor fees', 'Education & training', 'Office & supplies', 'Travel & mileage', 'Contract help', 'Other expense'];
  var IN = ['Product sales', 'Custom orders', 'Services', 'Pop-up sales', 'Wholesale', 'Other income'];
  var TAX = { 'Ingredients & materials': 'Supplies / cost of goods', 'Packaging & labels': 'Supplies / cost of goods', 'Filament & print supplies': 'Supplies / cost of goods', 'Equipment & tools': 'Equipment (depreciation or Section 179)', 'Software & subscriptions': 'Other expenses: software', 'Marketing & ads': 'Advertising', 'Shipping & postage': 'Other expenses: postage', 'Platform & payment fees': 'Commissions and fees', 'Pop-up & vendor fees': 'Rent or lease (booth fees)', 'Education & training': 'Other expenses: education', 'Office & supplies': 'Office expense', 'Travel & mileage': 'Car, truck and travel', 'Contract help': 'Contract labor', 'Other expense': 'Other expenses' };
  function guessOut(t) { t = (t || '').toLowerCase();
    if (/filament|pla\b|petg|nozzle|resin/.test(t)) return 'Filament & print supplies';
    if (/shea|butter|oil|wax|lye|fragrance|salt|sugar|clay|herb|mica|vitamin|optiphen|ingredient|wholesale supplies|bramble|nature.?s garden|majestic|bulk apothecary/.test(t)) return 'Ingredients & materials';
    if (/jar|bottle|label|box|bag|tin|container|sticker|tissue|ribbon/.test(t)) return 'Packaging & labels';
    if (/usps|ups|fedex|pirate ?ship|postage|stamps|shipping/.test(t)) return 'Shipping & postage';
    if (/etsy fee|stripe|square|paypal fee|shopify|transaction fee|processing/.test(t)) return 'Platform & payment fees';
    if (/canva|adobe|google|microsoft|ghl|gohighlevel|highlevel|skool|zoom|chatgpt|openai|claude|notion|subscription|ueni|domain/.test(t)) return 'Software & subscriptions';
    if (/facebook ads|meta ads|instagram|tiktok ads|ad spend|boost|marketing|flyer|business card/.test(t)) return 'Marketing & ads';
    if (/printer|laser|press|cricut|silhouette|dryer|xtool|bambu|flashforge|epson|canon|tool|equipment/.test(t)) return 'Equipment & tools';
    if (/booth|vendor|pop.?up|market fee|event fee/.test(t)) return 'Pop-up & vendor fees';
    if (/course|class|training|certification|workshop|book/.test(t)) return 'Education & training';
    if (/gas|mileage|uber|lyft|hotel|flight|parking/.test(t)) return 'Travel & mileage';
    return 'Other expense'; }

  /* ---------- Live data from the portal ---------- */
  var D = window.PORTAL_DATA || {};
  function orders() { return (D.orders || []).concat(ls(cfg.code === 'ma' ? 'ma_added' : cfg.code + '_added', []) || []).filter(function (o) { return o && o.id; }); }
  function paidOf(o) { var s = o.stage || '', t = N(o.total), d = N(o.deposit);
    if (/ship|deliver|review|complete|done/i.test(s)) return t;
    if (/inquiry|quote|lead/i.test(s)) return 0;
    return t <= 35 ? t : (d || 0); }
  var ships = function () { return ls(cfg.code + '_ox_ships', []); }, custs = function () { return ls(cfg.code + '_ox_custs', []); };

  /* ---------- Period ---------- */
  function range() {
    var t = new Date(); t.setHours(0, 0, 0, 0); var y = t.getFullYear(), m = t.getMonth(), f, to = iso(t);
    if (st.period === 'month') f = iso(new Date(y, m, 1));
    else if (st.period === 'lastmonth') { f = iso(new Date(y, m - 1, 1)); to = iso(new Date(y, m, 0)); }
    else if (st.period === 'quarter') f = iso(new Date(y, Math.floor(m / 3) * 3, 1));
    else if (st.period === 'year') f = iso(new Date(y, 0, 1));
    else if (st.period === '12m') f = iso(new Date(y, m - 11, 1));
    else if (st.period === 'custom') { f = st.from || '2000-01-01'; to = st.to || to; }
    else f = '2000-01-01';
    return { from: f, to: to, label: st.period === 'all' ? 'All time' : nice(f) + ' to ' + nice(to) };
  }
  function inRange(d, r) { return d && d >= r.from && d <= r.to; }

  /* ---------- Reports ---------- */
  function L(r) { return ledger.filter(function (x) { return inRange(x.date, r); }); }
  function moneyIn(r) { return L(r).filter(function (x) { return x.type === 'in'; }); }
  function moneyOut(r) { return L(r).filter(function (x) { return x.type === 'out'; }); }
  function byMonth(rows) { var m = {}; rows.forEach(function (x) { var k = monthKey(x.date); m[k] = m[k] || { in: 0, out: 0 }; m[k][x.type] += N(x.amount); }); return Object.keys(m).sort().map(function (k) { return [monthName(k), m[k].in, m[k].out, m[k].in - m[k].out]; }); }
  var REPORTS = {
    summary: { name: 'Executive summary', build: function (r) {
      var i = moneyIn(r), o = moneyOut(r), ti = sum(i, function (x) { return N(x.amount); }), to = sum(o, function (x) { return N(x.amount); });
      var os = orders(), open = os.filter(function (x) { return !/ship|deliver|review|complete/i.test(x.stage || ''); });
      var due = sum(os, function (x) { return /ship|deliver|review|complete|inquiry|quote/i.test(x.stage || '') ? 0 : Math.max(0, N(x.total) - paidOf(x)); });
      var k = [['Revenue', money(ti)], ['Expenses', money(to)], ['Net profit', money(ti - to)], ['Profit margin', ti ? fmt((ti - to) / ti * 100, 1) + '%' : 'n/a'], ['Open orders', String(open.length)], ['Accounts receivable', money(due)]];
      if (cfg.code === 'at') { var cl = D.clients || []; k[4] = ['Active clients', String(cl.filter(function (c) { return !/delivered|follow/i.test(c.stage || ''); }).length)]; k[5] = ['Pipeline value', money(sum(cl, function (c) { return /lead|discovery|proposal/i.test(c.stage || '') ? N(c.value) : 0; }))]; }
      var hi = [];
      var topIn = group(i, function (x) { return x.category; }, function (x) { return N(x.amount); })[0]; if (topIn) hi.push('Most money came from ' + topIn[0].toLowerCase() + ' (' + money(topIn[1]) + ').');
      var topOut = group(o, function (x) { return x.category; }, function (x) { return N(x.amount); })[0]; if (topOut) hi.push('Biggest expense: ' + topOut[0].toLowerCase() + ' (' + money(topOut[1]) + ').');
      if (!ledger.length) hi.push('No revenue or expense entries yet. Add them on the Finances page, or import from Wave or your bank, and this summary fills in.');
      cfg.extraHighlights && cfg.extraHighlights(r).forEach(function (h) { hi.push(h); });
      return { kpis: k, notes: hi, tables: [
        { title: 'Month by month', cols: ['Month', 'Revenue', 'Expenses', 'Net income'], money: [1, 2, 3], rows: byMonth(L(r)) },
        { title: 'Revenue by category', cols: ['Category', 'Amount'], money: [1], rows: group(i, function (x) { return x.category; }, function (x) { return N(x.amount); }) },
        { title: 'Expenses by category', cols: ['Category', 'Amount'], money: [1], rows: group(o, function (x) { return x.category; }, function (x) { return N(x.amount); }) }] };
    } },
    income: { name: 'Revenue', build: function (r) {
      var i = moneyIn(r).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), t = sum(i, function (x) { return N(x.amount); });
      return { kpis: [['Total revenue', money(t)], ['Transactions', String(i.length)], ['Average transaction', money(i.length ? t / i.length : 0)]], tables: [
        { title: 'By category', cols: ['Category', 'Amount'], money: [1], rows: group(i, function (x) { return x.category; }, function (x) { return N(x.amount); }) },
        { title: 'By payment channel', cols: ['Channel', 'Amount'], money: [1], rows: group(i, function (x) { return x.method || 'Not set'; }, function (x) { return N(x.amount); }) },
        { title: 'Revenue detail', cols: ['Date', 'Customer or source', 'Description', 'Category', 'Amount'], money: [4], rows: i.map(function (x) { return [nice(x.date), who(x.party), x.desc || '', x.category, N(x.amount)]; }) }] };
    } },
    expenses: { name: 'Expenses', build: function (r) {
      var o = moneyOut(r).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), t = sum(o, function (x) { return N(x.amount); });
      return { kpis: [['Total expenses', money(t)], ['Transactions', String(o.length)], ['Biggest category', (group(o, function (x) { return x.category; }, function (x) { return N(x.amount); })[0] || ['None'])[0]]], tables: [
        { title: 'By category', cols: ['Category', 'Amount', 'Share'], money: [1], rows: group(o, function (x) { return x.category; }, function (x) { return N(x.amount); }).map(function (g) { return [g[0], g[1], t ? fmt(g[1] / t * 100, 1) + '%' : '']; }) },
        { title: 'By vendor', cols: ['Vendor', 'Amount'], money: [1], rows: group(o, function (x) { return x.party; }, function (x) { return N(x.amount); }).slice(0, 15) },
        { title: 'Expense detail', cols: ['Date', 'Vendor', 'Description', 'Category', 'Amount'], money: [4], rows: o.map(function (x) { return [nice(x.date), x.party || '', x.desc || '', x.category, N(x.amount)]; }) }] };
    } },
    pl: { name: 'Profit and loss', build: function (r) {
      var i = moneyIn(r), o = moneyOut(r), ti = sum(i, function (x) { return N(x.amount); }), to = sum(o, function (x) { return N(x.amount); });
      var cogs = sum(o.filter(function (x) { return /Ingredients|Packaging|Filament/.test(x.category); }), function (x) { return N(x.amount); });
      return { kpis: [['Revenue', money(ti)], ['Cost of goods sold', money(cogs)], ['Gross profit', money(ti - cogs)], ['Operating expenses', money(to - cogs)], ['Net profit', money(ti - to)], ['Net margin', ti ? fmt((ti - to) / ti * 100, 1) + '%' : 'n/a']], tables: [
        { title: 'Profit and loss statement', cols: ['Line', 'Amount'], money: [1], rows: [['Revenue']].concat(group(i, function (x) { return x.category; }, function (x) { return N(x.amount); }).map(function (g) { return ['   ' + g[0], g[1]]; })).concat([['Total revenue', ti], ['Expenses']]).concat(group(o, function (x) { return x.category; }, function (x) { return N(x.amount); }).map(function (g) { return ['   ' + g[0], g[1]]; })).concat([['Total expenses', to], ['Net profit', ti - to]]).map(function (x) { return x.length === 1 ? [x[0], ''] : x; }) },
        { title: 'Month by month', cols: ['Month', 'Revenue', 'Expenses', 'Net income'], money: [1, 2, 3], rows: byMonth(L(r)) }] };
    } },
    sales: { name: cfg.code === 'at' ? 'Clients and projects' : 'Sales and orders', build: function (r) {
      if (cfg.code === 'at') { var cl = D.clients || [];
        return { kpis: [['Clients on record', String(cl.length)], ['Signed or in progress', String(cl.filter(function (c) { return /agreement|progress/i.test(c.stage || ''); }).length)], ['Delivered', String(cl.filter(function (c) { return /delivered|follow/i.test(c.stage || ''); }).length)], ['Open pipeline value', money(sum(cl, function (c) { return /lead|discovery|proposal/i.test(c.stage || '') ? N(c.value) : 0; }))]], tables: [
          { title: 'Pipeline by stage', cols: ['Stage', 'Clients', 'Value'], money: [2], rows: group(cl, function (c) { return c.stage; }).map(function (g) { return [g[0], g[1], sum(cl.filter(function (c) { return c.stage === g[0]; }), function (c) { return N(c.value); })]; }) },
          { title: 'By service', cols: ['Service', 'Value'], money: [1], rows: group(cl, function (c) { return c.service; }, function (c) { return N(c.value); }) },
          { title: 'Every client', cols: ['Client', 'Organization', 'Service', 'Stage', 'Next step', 'Value'], money: [5], rows: cl.map(function (c) { return [who(c.who), c.org || '', c.service || '', c.stage || '', c.nextStep || '', N(c.value)]; }) }] }; }
      var os = orders(), sold = os.filter(function (o) { return !/inquiry|quote/i.test(o.stage || ''); }), tot = sum(sold, function (o) { return N(o.total); });
      return { kpis: [['Orders on the board', String(os.length)], ['Confirmed orders', String(sold.length)], ['Gross sales', money(tot)], ['Average order value', money(sold.length ? tot / sold.length : 0)], ['Payments collected', money(sum(os, paidOf))], ['Accounts receivable', money(sum(sold, function (o) { return /ship|deliver|review|complete/i.test(o.stage || '') ? 0 : Math.max(0, N(o.total) - paidOf(o)); }))]], tables: [
        { title: 'Orders by stage', cols: ['Stage', 'Orders', 'Value'], money: [2], rows: group(os, function (o) { return o.stage; }).map(function (g) { return [g[0], g[1], sum(os.filter(function (o) { return o.stage === g[0]; }), function (o) { return N(o.total); })]; }) },
        { title: 'Where orders came from', cols: ['Channel', 'Orders', 'Value'], money: [2], rows: group(os, function (o) { return o.channel || 'Not set'; }).map(function (g) { return [g[0], g[1], sum(os.filter(function (o) { return (o.channel || 'Not set') === g[0]; }), function (o) { return N(o.total); })]; }) },
        { title: 'Order detail', cols: ['Order', 'Customer', 'Items', 'Stage', 'Due', 'Total', 'Collected'], money: [5, 6], rows: os.map(function (o) { return [o.id, who(o.who), o.items || '', o.stage || '', o.due ? nice(o.due) : '', N(o.total), paidOf(o)]; }) }],
        notes: os.some(function (o) { return o.src !== 'real'; }) && (D.sections || {}).orders !== 'real' ? ['Orders on the board are still example data until GoHighLevel or your order export is connected.'] : [] };
    } },
    customers: { name: 'Customers', build: function (r) {
      var c = custs(), rep = c.filter(function (x) { return N(x.orders) > 1 || (x.sources || []).length > 1; }), nw = c.filter(function (x) { return inRange((x.since || '').slice(0, 10), r); });
      return { kpis: [['Customers', String(c.length)], ['Repeat customers', String(rep.length)], ['Repeat rate', c.length ? fmt(rep.length / c.length * 100, 1) + '%' : 'n/a'], ['New this period', String(nw.length)], ['Lifetime sales on record', money(sum(c, function (x) { return N(x.spent); }))]], tables: [
        { title: 'Where customers came from', cols: ['Source', 'Customers'], rows: group([].concat.apply([], c.map(function (x) { return x.sources || ['Not set']; })), function (s) { return s; }) },
        { title: 'Top customers by spend', cols: ['Customer', 'Orders', 'Spent'], money: [2], rows: c.slice().sort(function (a, b) { return N(b.spent) - N(a.spent); }).slice(0, 15).map(function (x) { return [who((x.first || '') + ' ' + (x.last || '')), N(x.orders), N(x.spent)]; }) }],
        notes: c.length ? [] : ['No customers yet. Import your Wave, Clover or GoHighLevel customer exports on the Customers page.'] };
    } },
    shipping: { name: 'Shipping', build: function (r) {
      var s = ships().filter(function (x) { return inRange(x.date, r); }), cost = sum(s, function (x) { return N(x.cost); }), ch = sum(s, function (x) { return N(x.charged); });
      return { kpis: [['Shipments', String(s.length)], ['Label cost', money(cost)], ['Shipping charged', money(ch)], ['Difference', money(ch - cost)], ['Delivered', String(s.filter(function (x) { return x.delivered; }).length)]], tables: [
        { title: 'By carrier', cols: ['Carrier', 'Shipments', 'Label cost'], money: [2], rows: group(s, function (x) { return x.carrier; }).map(function (g) { return [g[0], g[1], sum(s.filter(function (x) { return x.carrier === g[0]; }), function (x) { return N(x.cost); })]; }) },
        { title: 'Every shipment', cols: ['Date', 'Order', 'Carrier', 'Tracking', 'Label cost', 'Charged'], money: [4, 5], rows: s.map(function (x) { return [nice(x.date), x.order, x.carrier + (x.svc ? ' ' + x.svc : ''), x.track || '', N(x.cost), N(x.charged)]; }) }] };
    } },
    tax: { name: 'Tax preparation summary', build: function (r) {
      var i = moneyIn(r), o = moneyOut(r), m = {};
      o.forEach(function (x) { var k = TAX[x.category] || 'Other expenses'; m[k] = (m[k] || 0) + N(x.amount); });
      var mil = o.filter(function (x) { return x.category === 'Travel & mileage'; });
      return { kpis: [['Gross receipts', money(sum(i, function (x) { return N(x.amount); }))], ['Total expenses', money(sum(o, function (x) { return N(x.amount); }))], ['Net', money(sum(i, function (x) { return N(x.amount); }) - sum(o, function (x) { return N(x.amount); }))]], tables: [
        { title: 'Expenses grouped the way a tax preparer expects (Schedule C lines)', cols: ['Tax line', 'Amount'], money: [1], rows: Object.keys(m).sort().map(function (k) { return [k, m[k]]; }) },
        { title: 'Your categories', cols: ['Category', 'Amount'], money: [1], rows: group(o, function (x) { return x.category; }, function (x) { return N(x.amount); }) }],
        notes: ['For your tax preparer. This is a summary of what you logged, not tax advice. Keep receipts for every expense.'].concat(mil.length ? ['Travel and mileage entries: ' + mil.length + '. Keep a mileage log with dates, miles and purpose.'] : []) };
    } }
  };
  /* Every report belongs to a business area; the report list is grouped by area. */
  var AREA = { summary: 'Overview', income: 'Finance', expenses: 'Finance', pl: 'Finance', tax: 'Finance', sales: 'Sales', customers: 'Customers', shipping: 'Operations' };
  Object.keys(AREA).forEach(function (k) { REPORTS[k].area = AREA[k]; });
  if (cfg.code === 'at') REPORTS.sales.area = 'Sales';
  (cfg.extraReports || []).forEach(function (x) { REPORTS[x.key] = x; });
  var AREAS = ['Overview', 'Finance', 'Sales', 'Customers', 'Operations', 'Inventory and production', 'Service delivery', 'Community', 'Marketing'];
  var skip = cfg.skipReports || (cfg.code === 'at' ? ['customers', 'shipping'] : []);
  var ORDER = [];
  AREAS.forEach(function (a) { Object.keys(REPORTS).forEach(function (k) { if ((REPORTS[k].area || 'Overview') === a && skip.indexOf(k) < 0 && ORDER.indexOf(k) < 0) ORDER.push(k); }); });
  /* Shared data every report can use */
  function CTX() { return { ledger: ledger, orders: orders(), ships: ships(), custs: custs(), D: D, paidOf: paidOf, who: who, sum: sum, group: group, money: money, nice: nice, monthName: monthName, monthKey: monthKey, inRange: inRange, state: st, budgets: S.get('budgets', {}), costs: S.get('costs', []), target: N(S.get('target', 40)) || 40 }; }

  /* ---------- Generated reports and the report log ----------
     Generate saves a report for the chosen period. The log remembers when each was made and from what data.
     If the data changes, the period moves on, or the portal data file is old, the report is marked Out of date
     and Rebuild makes it again. Exports always use the generated copy, so what you share matches what you saw. */
  var log = S.get('log', []);
  function fingerprint() {
    var s = JSON.stringify([ledger, orders(), ships(), custs(), D.clients || [], D.asOf || D.generated || '', cfg.extraData ? cfg.extraData() : null, S.get('budgets', {}), S.get('costs', []), S.get('target', 40)]), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  }
  function dataAge() { var a = D.asOf || D.generated; if (!a) return null; return (Date.now() - new Date(a).getTime()) / 36e5; }
  function snapKey(k) { return k + '|' + st.period + (st.period === 'custom' ? '|' + st.from + '|' + st.to : ''); }
  function findSnap(k) { return log.filter(function (x) { return x.key === snapKey(k); })[0]; }
  function whyStale(x) {
    var r = range(), why = [];
    if (x.fp !== fingerprint()) why.push('your data changed since it was made');
    if (x.from !== r.from || x.to !== r.to) why.push('the period has moved on (now ' + r.label + ')');
    if (x.hide !== st.hide) why.push('the customer-names setting changed');
    var age = dataAge(); if (age !== null && age > 26) why.push('the portal data file is ' + Math.round(age) + ' hours old; the 6:30 AM refresh may have missed');
    return why;
  }
  function generate(k) {
    var r = range();
    var snap = { id: PK.uid('g'), key: snapKey(k), report: k, name: REPORTS[k].name, period: st.period, from: r.from, to: r.to, label: r.label, at: new Date().toISOString(), fp: fingerprint(), hide: st.hide, dataAsOf: D.asOf || D.generated || '', result: REPORTS[k].build(r, CTX()) };
    log = log.filter(function (x) { return x.key !== snap.key; }); log.unshift(snap); log = log.slice(0, 40);
    try { S.set('log', log); } catch (e) {}
    return snap;
  }
  function when(isoStr) { return isoStr ? new Date(isoStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; }

  /* ---------- Report page ---------- */
  var PERIODS = [['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'This quarter'], ['year', 'This year'], ['12m', 'Last 12 months'], ['all', 'All time'], ['custom', 'Custom dates']];
  function renderRep() {
    if (ORDER.indexOf(st.report) < 0) st.report = 'summary';
    var snap = findSnap(st.report), why = snap ? whyStale(snap) : [], rep = snap ? snap.result : null;
    var status = !snap ? '<span class="st-pill st-draft">Not generated yet</span>' : why.length ? '<span class="st-pill st-test">Out of date</span>' : '<span class="st-pill st-vetted">Up to date</span>';
    el.rep.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Reports · ' + E(REPORTS[st.report].area || 'Overview') + '</span><h2>' + E(REPORTS[st.report].name) + '</h2></div><span class="source ' + (ledger.length ? 'real' : 'example') + '">' + (ledger.length ? 'Real data · from your portal' : 'Fills in as you record revenue and expenses') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="toolbar">' +
        '<select id="rp-rep">' + AREAS.map(function (a) { var ks = ORDER.filter(function (k) { return (REPORTS[k].area || 'Overview') === a; }); return ks.length ? '<optgroup label="' + a + '">' + ks.map(function (k) { return '<option value="' + k + '"' + (k === st.report ? ' selected' : '') + '>' + E(REPORTS[k].name) + '</option>'; }).join('') + '</optgroup>' : ''; }).join('') + '</select>' +
        '<select id="rp-per">' + PERIODS.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === st.period ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>' +
        (st.period === 'custom' ? '<input class="k-in" type="date" id="rp-from" value="' + E(st.from) + '" style="width:150px"><input class="k-in" type="date" id="rp-to" value="' + E(st.to) + '" style="width:150px">' : '') +
        '<label class="k-check"><input type="checkbox" id="rp-hide"' + (st.hide ? ' checked' : '') + '> Customer initials only</label></div>' +
        '<div class="toolbar" style="margin-top:10px">' + status + '<span class="k-hint">' + (snap ? 'Generated ' + E(when(snap.at)) + ' · ' + E(snap.label) + (snap.dataAsOf ? ' · portal data as of ' + E(when(snap.dataAsOf)) : '') : 'Choose a report and a period, then press Generate.') + '</span><span style="flex:1"></span>' +
        (snap ? '<button class="btn small-btn' + (why.length ? ' primary' : '') + '" id="rp-rebuild">Rebuild</button>' : '<button class="btn primary small-btn" id="rp-gen">Generate</button>') +
        '<span class="k-hint">Export</span><button class="btn small-btn" id="rp-xlsx"' + (snap ? '' : ' disabled') + '>Excel</button><button class="btn small-btn" id="rp-pdf"' + (snap ? '' : ' disabled') + '>PDF</button><button class="btn small-btn" id="rp-docx"' + (snap ? '' : ' disabled') + '>Word</button></div>' +
        (why.length ? '<div class="note-box warn" style="margin-top:8px"><b>Out of date:</b> ' + E(why.join('; ')) + '. Press Rebuild before you export.</div>' : '') +
      '</div></div>' +
      (rep ? '<div class="even one"><div class="card"><div class="k-kpis">' + rep.kpis.map(function (k) { return '<div class="k-kpi"><b class="k-price">' + E(k[1]) + '</b><span>' + E(k[0]) + '</span></div>'; }).join('') + '</div>' +
        (rep.notes && rep.notes.length ? '<div class="note-box" style="margin-top:12px">' + rep.notes.map(E).join('<br>') + '</div>' : '') + '</div></div>' + pairTables(rep.tables) : '') +
      renderLog();
    bindRep(snap);
  }
  function renderLog() {
    return '<div class="even one h-sm"><div class="card"><div class="toolbar"><h3 style="margin:0">Report log</h3><span style="flex:1"></span><button class="btn small-btn" id="rp-genall">Generate all reports</button><button class="btn small-btn" id="rp-rebuildstale"' + (log.some(function (x) { return whyStale(x).length; }) ? '' : ' disabled') + '>Rebuild everything out of date</button><button class="btn primary small-btn" id="rp-all">Export all to one Excel workbook</button></div><div class="fill"><table class="k-tbl"><thead><tr><th>Report</th><th>Period</th><th>Generated</th><th>Status</th><th></th></tr></thead><tbody>' +
      (log.map(function (x) { var w = whyStale(x); return '<tr><td><b style="font-weight:600">' + E(x.name) + '</b></td><td>' + E(x.label) + '</td><td>' + E(when(x.at)) + '</td><td>' + (w.length ? '<span class="st-pill st-test" title="' + E(w.join('; ')) + '">Out of date</span>' : '<span class="st-pill st-vetted">Up to date</span>') + '</td><td class="num"><button class="btn small-btn" data-open="' + E(x.key) + '">Open</button></td></tr>'; }).join('') || '<tr><td colspan="5" class="k-hint">Reports you generate are listed here with the date and whether their data is still current.</td></tr>') +
      '</tbody></table></div></div></div>';
  }
  function tableHtml(t) {
    return '<div class="card"><h3>' + E(t.title) + '</h3><div class="fill"><table class="k-tbl"><thead><tr>' + t.cols.map(function (c, i) { return '<th' + ((t.money || []).indexOf(i) >= 0 || typeof (t.rows[0] || [])[i] === 'number' ? ' class="num"' : '') + '>' + E(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (t.rows.map(function (row) { return '<tr>' + row.map(function (v, i) { var m = (t.money || []).indexOf(i) >= 0; return '<td' + (m || typeof v === 'number' ? ' class="num' + (m ? ' k-price' : '') + '"' : '') + '>' + (m && v !== '' ? money(+v) : E(v)) + '</td>'; }).join('') + '</tr>'; }).join('') || '<tr><td colspan="' + t.cols.length + '" class="k-hint">Nothing in this period yet.</td></tr>') + '</tbody></table></div></div>';
  }
  /* Small tables sit side by side in even rows; long lists get their own full-width row */
  function pairTables(ts) {
    var out = '', small = ts.filter(function (t) { return t.cols.length <= 3; }), big = ts.filter(function (t) { return t.cols.length > 3; });
    for (var i = 0; i < small.length; i += 2) out += '<div class="even h-sm">' + tableHtml(small[i]) + (small[i + 1] ? tableHtml(small[i + 1]) : '') + '</div>';
    big.forEach(function (t) { out += '<div class="even one h-md">' + tableHtml(t) + '</div>'; });
    return out;
  }
  function bindRep(snap) {
    var $ = function (id) { return document.getElementById(id); };
    function staleOk() { var w = whyStale(snap); return !w.length || confirm('This report is out of date (' + w.join('; ') + '). Export it anyway? Press Cancel, then Rebuild, to update it first.'); }
    $('rp-rep').onchange = function () { st.report = this.value; save(); renderRep(); };
    $('rp-per').onchange = function () { st.period = this.value; save(); renderRep(); };
    if ($('rp-from')) { $('rp-from').onchange = function () { st.from = this.value; save(); renderRep(); }; $('rp-to').onchange = function () { st.to = this.value; save(); renderRep(); }; }
    $('rp-hide').onchange = function () { st.hide = this.checked; save(); renderRep(); };
    if ($('rp-gen')) $('rp-gen').onclick = function () { generate(st.report); renderRep(); PK.say('Report generated'); };
    if ($('rp-rebuild')) $('rp-rebuild').onclick = function () { generate(st.report); renderRep(); PK.say('Report rebuilt with the latest data'); };
    $('rp-xlsx').onclick = function () { if (snap && staleOk()) exportXlsx([snap]); };
    $('rp-pdf').onclick = function () { if (snap && staleOk()) exportPdf(snap); };
    $('rp-docx').onclick = function () { if (snap && staleOk()) exportDocx(snap); };
    $('rp-genall').onclick = function () { var keep = st.report; ORDER.forEach(function (k) { generate(k); }); st.report = keep; renderRep(); PK.say(ORDER.length + ' reports generated'); };
    $('rp-rebuildstale').onclick = function () { var n = 0; log.slice().forEach(function (x) { if (!whyStale(x).length) return; var keep = [st.period, st.from, st.to]; st.period = x.period; if (x.period === 'custom') { st.from = x.from; st.to = x.to; } generate(x.report); st.period = keep[0]; st.from = keep[1]; st.to = keep[2]; n++; }); renderRep(); PK.say(n + ' report' + (n === 1 ? '' : 's') + ' rebuilt'); };
    $('rp-all').onclick = function () { var snaps = ORDER.map(function (k) { var x = findSnap(k); return x && !whyStale(x).length ? x : generate(k); }); renderRep(); exportXlsx(snaps); };
    el.rep.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { var x = log.filter(function (y) { return y.key === b.dataset.open; })[0]; if (!x) return; st.report = x.report; st.period = x.period; if (x.period === 'custom') { st.from = x.from; st.to = x.to; } save(); renderRep(); window.scrollTo({ top: 0 }); }; });
  }

  /* ---------- Exports ---------- */
  var LIBS = { xlsx: ['https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'], pdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'], docx: ['https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js'] };
  function need(kind) { return LIBS[kind].reduce(function (p, u) { return p.then(function () { if (document.querySelector('script[src="' + u + '"]')) return; return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = u; s.onload = ok; s.onerror = function () { bad(new Error('offline')); }; document.head.appendChild(s); }); }); }, Promise.resolve()); }
  function fail(e) { alert('The export tool could not load. Check your internet connection and try again.'); }
  function fileBase(snaps) { var x = snaps[0]; return cfg.slug + '-' + (snaps.length > 1 ? 'reports' : x.report) + '-' + (x.period === 'all' ? 'all-time' : x.from + '-to-' + x.to); }
  function hex(c) { return c.replace('#', ''); }
  function b64(dataUrl) { return dataUrl.split(',')[1]; }
  function bytes(dataUrl) { var s = atob(b64(dataUrl)), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function saveBlob(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  var IMG = (window.BRAND_IMG || {})[cfg.code] || null, DARK = '16171A';
  function stamp() { return 'Prepared ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' for Tanika Crawford, Founder'; }

  function exportXlsx(snaps) {
    need('xlsx').then(function () {
      var wb = new ExcelJS.Workbook(); wb.creator = cfg.brand; wb.created = new Date();
      var logoId = IMG ? wb.addImage({ base64: b64(IMG.logo), extension: 'png' }) : null, titleId = IMG ? wb.addImage({ base64: b64(IMG.title), extension: 'png' }) : null;
      snaps.forEach(function (sn) {
        var rep = sn.result, r = { label: sn.label + ' · generated ' + when(sn.at) }, ws = wb.addWorksheet(sn.name.replace(/[\\\/?*\[\]:]/g, '').slice(0, 31), { views: [{ showGridLines: false }] });
        ws.columns = [{ width: 34 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 18 }, { width: 18 }];
        for (var i = 1; i <= 4; i++) { ws.getRow(i).height = i === 1 ? 30 : 18; for (var c = 1; c <= 7; c++) ws.getCell(i, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK } }; }
        if (logoId !== null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.2 }, ext: { width: 60, height: 60 * IMG.logoH / IMG.logoW } });
        if (titleId !== null) ws.addImage(titleId, { tl: { col: 0.9, row: 0.25 }, ext: { width: Math.min(260, 40 * IMG.titleW / IMG.titleH), height: Math.min(260, 40 * IMG.titleW / IMG.titleH) * IMG.titleH / IMG.titleW } });
        var t1 = ws.getCell('D2'); t1.value = sn.name; t1.font = { name: 'Georgia', size: 16, italic: true, color: { argb: 'FF' + hex(cfg.light) } };
        var t2 = ws.getCell('D3'); t2.value = r.label; t2.font = { name: 'Calibri', size: 10, color: { argb: 'FFE8E2DC' } };
        var t3 = ws.getCell('D4'); t3.value = stamp(); t3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFB2A89E' } };
        var row = 6;
        rep.kpis.forEach(function (kp, i) { var col = (i % 3) * 2 + 1; if (i && i % 3 === 0) row += 2;
          var a = ws.getCell(row, col); a.value = kp[0]; a.font = { size: 9, color: { argb: 'FF6B6157' } };
          var b = ws.getCell(row + 1, col); b.value = kp[1]; b.font = { name: 'Georgia', size: 14, bold: true, color: { argb: 'FF' + hex(cfg.color) } }; });
        row += 3;
        (rep.notes || []).forEach(function (n) { var c = ws.getCell(row++, 1); c.value = n; c.font = { italic: true, size: 10, color: { argb: 'FF4A4440' } }; });
        rep.tables.forEach(function (t) {
          row++; var h = ws.getCell(row++, 1); h.value = t.title; h.font = { name: 'Georgia', size: 12, bold: true, color: { argb: 'FF' + hex(cfg.color) } };
          t.cols.forEach(function (c, i) { var x = ws.getCell(row, i + 1); x.value = c; x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex(cfg.color) } }; x.alignment = { vertical: 'middle' }; });
          row++;
          t.rows.forEach(function (rw, ri) { rw.forEach(function (v, i) { var x = ws.getCell(row, i + 1); var m = (t.money || []).indexOf(i) >= 0 && v !== '';
            x.value = m ? +v : v; if (m) x.numFmt = '$#,##0.00;[Red]-$#,##0.00';
            if (ri % 2) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex(cfg.tint) } };
            x.border = { bottom: { style: 'hair', color: { argb: 'FFDDD3CA' } } }; if (/^(Total|Net profit)/.test(rw[0]) ) x.font = { bold: true }; }); row++; });
          if (!t.rows.length) { ws.getCell(row++, 1).value = 'Nothing in this period yet.'; }
        });
        ws.getCell(row + 1, 1).value = cfg.brand + ' · Crawford Creative Suites'; ws.getCell(row + 1, 1).font = { size: 8, italic: true, color: { argb: 'FF9A8F86' } };
        ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
      });
      return wb.xlsx.writeBuffer().then(function (buf) { saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileBase(snaps) + '.xlsx'); PK.say('Excel report saved to Downloads'); });
    }).catch(fail);
  }
  function rgb(h) { h = hex(h); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function exportPdf(sn) {
    need('pdf').then(function () {
      var rep = sn.result, r = { label: sn.label + ' · generated ' + when(sn.at) }, doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' }), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
      function band() { doc.setFillColor(22, 23, 26); doc.rect(0, 0, W, 78, 'F');
        if (IMG) { var lh = 54, lw = lh * IMG.logoW / IMG.logoH; doc.addImage(IMG.logo, 'PNG', 28, 12, lw, lh); var th = 34, tw = Math.min(250, th * IMG.titleW / IMG.titleH); doc.addImage(IMG.title, 'PNG', 36 + lw, 22, tw, tw * IMG.titleH / IMG.titleW); }
        doc.setDrawColor.apply(doc, rgb(cfg.color)); doc.setLineWidth(2); doc.line(0, 78, W, 78); }
      band();
      doc.setFont('times', 'italic'); doc.setFontSize(22); doc.setTextColor.apply(doc, rgb(cfg.color)); doc.text(sn.name, 36, 112);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 84, 78); doc.text(r.label + '   ·   ' + stamp(), 36, 128);
      var y = 146, bw = (W - 72 - 20) / 3;
      rep.kpis.forEach(function (kp, i) { var x = 36 + (i % 3) * (bw + 10); if (i && i % 3 === 0) y += 56;
        doc.setFillColor.apply(doc, rgb(cfg.tint)); doc.roundedRect(x, y, bw, 48, 6, 6, 'F');
        doc.setFontSize(8.5); doc.setTextColor(107, 97, 87); doc.text(kp[0], x + 10, y + 16);
        doc.setFont('times', 'bold'); doc.setFontSize(16); doc.setTextColor.apply(doc, rgb(cfg.color)); doc.text(String(kp[1]), x + 10, y + 38); doc.setFont('helvetica', 'normal'); });
      y += 66;
      if (rep.notes && rep.notes.length) { doc.setFontSize(9.5); doc.setTextColor(60, 56, 52); rep.notes.forEach(function (n) { var lines = doc.splitTextToSize('• ' + n, W - 72); doc.text(lines, 36, y); y += lines.length * 12 + 2; }); y += 6; }
      rep.tables.forEach(function (t) {
        if (y > H - 120) { doc.addPage(); band(); y = 100; }
        doc.setFont('times', 'bold'); doc.setFontSize(12.5); doc.setTextColor.apply(doc, rgb(cfg.color)); doc.text(t.title, 36, y); doc.setFont('helvetica', 'normal');
        doc.autoTable({ startY: y + 6, head: [t.cols], body: (t.rows.length ? t.rows : [['Nothing in this period yet.']]).map(function (rw) { return rw.map(function (v, i) { return (t.money || []).indexOf(i) >= 0 && v !== '' ? money(+v) : String(v); }); }),
          margin: { left: 36, right: 36, top: 96 }, styles: { fontSize: 9, cellPadding: 5, textColor: [30, 30, 34] }, headStyles: { fillColor: rgb(cfg.color), textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: rgb(cfg.tint) }, columnStyles: (t.money || []).reduce(function (o, i) { o[i] = { halign: 'right' }; return o; }, {}),
          didDrawPage: function (d) { if (d.pageNumber > 1 && d.cursor && d.settings.startY !== d.cursor.y) {} } });
        y = doc.lastAutoTable.finalY + 26;
      });
      var pages = doc.internal.getNumberOfPages();
      for (var p = 1; p <= pages; p++) { doc.setPage(p); if (p > 1) band(); doc.setFontSize(8); doc.setTextColor(150, 143, 134); doc.text(cfg.brand + ' · Crawford Creative Suites', 36, H - 20); doc.text('Page ' + p + ' of ' + pages, W - 36, H - 20, { align: 'right' }); }
      doc.save(fileBase([sn]) + '.pdf'); PK.say('PDF report saved to Downloads');
    }).catch(fail);
  }
  function exportDocx(sn) {
    need('docx').then(function () {
      var d = window.docx, rep = sn.result, r = { label: sn.label + ' · generated ' + when(sn.at) }, kids = [];
      if (IMG) kids.push(new d.Paragraph({ shading: { type: d.ShadingType.CLEAR, fill: DARK, color: 'auto' }, children: [new d.ImageRun({ data: bytes(IMG.logo), transformation: { width: 56, height: Math.round(56 * IMG.logoH / IMG.logoW) } }), new d.TextRun('   '), new d.ImageRun({ data: bytes(IMG.title), transformation: { width: Math.min(260, Math.round(36 * IMG.titleW / IMG.titleH)), height: Math.round(Math.min(260, 36 * IMG.titleW / IMG.titleH) * IMG.titleH / IMG.titleW) } })] }));
      kids.push(new d.Paragraph({ spacing: { before: 240, after: 60 }, children: [new d.TextRun({ text: sn.name, font: 'Georgia', size: 44, italics: true, color: hex(cfg.color) })] }));
      kids.push(new d.Paragraph({ spacing: { after: 240 }, children: [new d.TextRun({ text: r.label + '  ·  ' + stamp(), size: 18, color: '6B6157' })] }));
      var cells = rep.kpis.map(function (kp) { return new d.TableCell({ shading: { type: d.ShadingType.CLEAR, fill: hex(cfg.tint), color: 'auto' }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new d.Paragraph({ children: [new d.TextRun({ text: kp[0], size: 16, color: '6B6157' })] }), new d.Paragraph({ children: [new d.TextRun({ text: String(kp[1]), font: 'Georgia', bold: true, size: 30, color: hex(cfg.color) })] })] }); });
      var krows = []; for (var i = 0; i < cells.length; i += 3) { var rowCells = cells.slice(i, i + 3); while (rowCells.length < 3) rowCells.push(new d.TableCell({ children: [new d.Paragraph('')] })); krows.push(new d.TableRow({ children: rowCells })); }
      kids.push(new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: krows }));
      if (rep.notes && rep.notes.length) { kids.push(new d.Paragraph({ spacing: { before: 280, after: 80 }, children: [new d.TextRun({ text: 'Highlights', font: 'Georgia', bold: true, size: 26, color: hex(cfg.color) })] })); rep.notes.forEach(function (n) { kids.push(new d.Paragraph({ bullet: { level: 0 }, children: [new d.TextRun({ text: n, size: 21 })] })); }); }
      rep.tables.forEach(function (t) {
        kids.push(new d.Paragraph({ spacing: { before: 320, after: 100 }, children: [new d.TextRun({ text: t.title, font: 'Georgia', bold: true, size: 26, color: hex(cfg.color) })] }));
        var head = new d.TableRow({ tableHeader: true, children: t.cols.map(function (c) { return new d.TableCell({ shading: { type: d.ShadingType.CLEAR, fill: hex(cfg.color), color: 'auto' }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new d.Paragraph({ children: [new d.TextRun({ text: c, bold: true, color: 'FFFFFF', size: 18 })] })] }); }) });
        var body = (t.rows.length ? t.rows : [['Nothing in this period yet.'].concat(t.cols.slice(1).map(function () { return ''; }))]).map(function (rw, ri) { return new d.TableRow({ children: rw.map(function (v, i) { var m = (t.money || []).indexOf(i) >= 0 && v !== ''; return new d.TableCell({ shading: ri % 2 ? { type: d.ShadingType.CLEAR, fill: hex(cfg.tint), color: 'auto' } : undefined, margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new d.Paragraph({ alignment: m ? d.AlignmentType.RIGHT : d.AlignmentType.LEFT, children: [new d.TextRun({ text: m ? money(+v) : String(v), size: 18 })] })] }); }) }); });
        kids.push(new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, rows: [head].concat(body) }));
      });
      var docu = new d.Document({ creator: 'Crawford Creative Suites', title: cfg.brand + ' ' + sn.name, styles: { default: { document: { run: { font: 'Calibri' } } } },
        sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, footers: { default: new d.Footer({ children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: cfg.brand + ' · Crawford Creative Suites', size: 16, color: '9A8F86' })] })] }) }, children: kids }] });
      return d.Packer.toBlob(docu).then(function (blob) { saveBlob(blob, fileBase([sn]) + '.docx'); PK.say('Word report saved to Downloads'); });
    }).catch(fail);
  }

  /* ---------- Finances (the transaction register) ---------- */
  var editL = null, lq = '';
  function renderLed() {
    var r = range(), i = sum(moneyIn(r), function (x) { return N(x.amount); }), o = sum(moneyOut(r), function (x) { return N(x.amount); });
    var rows = ledger.filter(function (x) { return !lq || (x.party + ' ' + x.desc + ' ' + x.category).toLowerCase().indexOf(lq.toLowerCase()) >= 0; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    el.led.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Reports</span><h2>Finances</h2></div><span class="source ' + (ledger.length ? 'real' : 'example') + '">' + (ledger.length ? 'Real data · your records' : 'Add or import your first entries') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis"><div class="k-kpi"><b class="k-price">' + money(i) + '</b><span>revenue · ' + E(PERIODS.filter(function (p) { return p[0] === st.period; })[0][1].toLowerCase()) + '</span></div><div class="k-kpi"><b class="k-price">' + money(o) + '</b><span>expenses</span></div><div class="k-kpi"><b class="k-price">' + money(i - o) + '</b><span>net income</span></div><div class="k-kpi"><b>' + ledger.length + '</b><span>transactions recorded</span></div></div></div></div>' +
      '<div class="even h-md"><div class="card"><h3>' + (editL ? 'Edit transaction' : 'Record a transaction') + '</h3><form class="k-form fill" id="lg-form" autocomplete="off">' +
          '<label>Type<select id="lg-type"><option value="out">Expense</option><option value="in">Revenue</option></select></label><label>Date<input id="lg-date" type="date" value="' + PK.today() + '" required></label>' +
          '<label>Amount ($)<input id="lg-amt" type="number" step="0.01" min="0" required></label><label>Category<select id="lg-cat"></select></label>' +
          '<label class="wide"><span id="lg-plabel">Vendor</span><input id="lg-party" placeholder="Amazon, Bramble Berry, customer first name…"></label>' +
          '<label class="wide">Description<input id="lg-desc" placeholder="Shea butter 10 lb, filament restock, order MA-1023…"></label>' +
          '<label>Payment method<input id="lg-method" placeholder="Card, Cash App, Square, Wave invoice…"></label><label>Reference (order, invoice or receipt #)<input id="lg-ref"></label>' +
          '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editL ? 'Save' : 'Record transaction') + '</button>' + (editL ? '<button class="btn" type="button" id="lg-cancel">Cancel</button><button class="btn" type="button" id="lg-del">Delete</button>' : '') + '</div></form></div>' +
        '<div class="card"><h3>Import and reconcile</h3><div class="fill">' +
          '<div class="btnrow"><button class="btn small-btn" id="lg-imp">Import CSV (Wave, bank, Amazon)</button>' + (cfg.code !== 'at' ? '<button class="btn small-btn" id="lg-sync">Record collected order payments as revenue</button>' : '<button class="btn small-btn" id="lg-sync">Record delivered client work as revenue</button>') + '</div>' +
          '<div class="btnrow" style="margin-top:8px"><button class="btn small-btn" id="lg-exp">Export CSV</button><button class="btn small-btn" id="lg-bak">Backup</button><button class="btn small-btn" id="lg-res">Restore</button></div>' +
          '<div class="note-box" style="margin-top:12px"><b>Wave:</b> Accounting › Transactions › Export (CSV). Revenue and expenses both come across; categories are guessed from the description, and you can change any of them.<br><b>Bank or card:</b> download the statement as CSV. Expenses show as negative amounts or a Debit column.<br><b>Amazon:</b> your order history report imports as expenses.<br>Transactions already imported are skipped, so you can import the same file twice safely.</div>' +
        '</div></div></div>' +
      '<div class="even one h-md"><div class="card"><div class="toolbar"><h3 style="margin:0">Transaction register</h3><span style="flex:1"></span><input id="lg-q" placeholder="Search" value="' + E(lq) + '"></div><div class="fill"><table class="k-tbl"><thead><tr><th>Date</th><th>Type</th><th>Vendor or customer</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead><tbody class="cust-names">' +
        (rows.map(function (x) { return '<tr><td>' + nice(x.date) + '</td><td>' + (x.type === 'in' ? '<span class="st-pill st-vetted">Revenue</span>' : '<span class="st-pill st-test">Expense</span>') + '</td><td>' + E(x.party || '') + '</td><td>' + E(x.desc || '') + '</td><td>' + E(x.category) + '</td><td class="num k-price">' + money(N(x.amount)) + '</td><td class="num"><button class="btn small-btn" data-el="' + x.id + '">Edit</button></td></tr>'; }).join('') || '<tr><td colspan="7" class="k-hint">No transactions yet.</td></tr>') +
      '</tbody></table></div></div></div>';
    bindLed();
  }
  function bindLed() {
    var $ = function (id) { return document.getElementById(id); };
    function cats() { var t = $('lg-type').value, keep = $('lg-cat').value; $('lg-cat').innerHTML = (t === 'in' ? IN : OUT).map(function (c) { return '<option>' + c + '</option>'; }).join(''); if (keep) $('lg-cat').value = keep; $('lg-plabel').textContent = t === 'in' ? 'Customer or source' : 'Vendor'; }
    $('lg-type').onchange = cats; cats();
    $('lg-desc').onblur = function () { if ($('lg-type').value === 'out' && !editL) $('lg-cat').value = guessOut(this.value + ' ' + $('lg-party').value); };
    $('lg-q').oninput = function () { lq = this.value; var p = this.selectionStart; renderLed(); var q = $('lg-q'); q.focus(); q.setSelectionRange(p, p); };
    el.led.querySelectorAll('[data-el]').forEach(function (b) { b.onclick = function () { editL = b.dataset.el; renderLed(); var x = ledger.filter(function (y) { return y.id === editL; })[0];
      $('lg-type').value = x.type; cats(); $('lg-date').value = x.date; $('lg-amt').value = x.amount; $('lg-cat').value = x.category; $('lg-party').value = x.party || ''; $('lg-desc').value = x.desc || ''; $('lg-method').value = x.method || ''; $('lg-ref').value = x.ref || ''; $('lg-form').scrollIntoView({ block: 'center' }); }; });
    if ($('lg-cancel')) $('lg-cancel').onclick = function () { editL = null; renderLed(); };
    if ($('lg-del')) $('lg-del').onclick = function () { if (confirm('Delete this transaction?')) { ledger = ledger.filter(function (y) { return y.id !== editL; }); editL = null; save(); renderAll(); } };
    $('lg-form').onsubmit = function (e) { e.preventDefault();
      var x = { type: $('lg-type').value, date: $('lg-date').value, amount: Math.abs(N($('lg-amt').value)), category: $('lg-cat').value, party: $('lg-party').value.trim(), desc: $('lg-desc').value.trim(), method: $('lg-method').value.trim(), ref: $('lg-ref').value.trim() };
      if (editL) Object.assign(ledger.filter(function (y) { return y.id === editL; })[0], x); else { x.id = PK.uid('l'); ledger.push(x); } editL = null; save(); renderAll(); PK.say('Saved'); };
    $('lg-exp').onclick = function () { PK.download(cfg.slug + '-finances-' + PK.today() + '.csv', PK.toCSV(ledger, ['date', 'type', 'amount', 'category', 'party', 'desc', 'method', 'ref']), 'text/csv'); };
    $('lg-bak').onclick = function () { PK.backup(cfg.code + '_fin_', cfg.slug + '-finances'); };
    $('lg-res').onclick = function () { PK.restore(cfg.code + '_fin_', function () { ledger = S.get('ledger', []); renderAll(); }); };
    $('lg-imp').onclick = function () { PK.pickFile('.csv', function (t) { var res = importCsv(PK.parseCSV(t)); save(); renderAll(); PK.say(res.added + ' added, ' + res.skipped + ' already there'); }); };
    $('lg-sync').onclick = function () { var n = syncOrders(); save(); renderAll(); PK.say(n ? n + ' revenue transaction' + (n === 1 ? '' : 's') + ' recorded from ' + (cfg.code === 'at' ? 'clients' : 'orders') : 'Nothing new to add'); };
  }
  function col(r, names) { var ks = Object.keys(r); for (var i = 0; i < names.length; i++) { var k = ks.filter(function (x) { return x.toLowerCase().replace(/[^a-z]/g, '') === names[i]; })[0]; if (k !== undefined && r[k] !== '') return r[k]; } return ''; }
  function toIso(s) { s = String(s || '').trim(); if (!s) return ''; if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); var d = new Date(s); return isNaN(d) ? '' : iso(d); }
  function importCsv(rows) {
    var added = 0, skipped = 0, have = {}; ledger.forEach(function (x) { have[x.date + '|' + x.amount + '|' + (x.desc || '').slice(0, 40)] = 1; });
    rows.forEach(function (r) {
      var date = toIso(col(r, ['transactiondate', 'date', 'orderdate', 'posteddate', 'postingdate'])), desc = col(r, ['description', 'transactiondescription', 'productname', 'title', 'memo', 'payee', 'name']);
      var amt = N(col(r, ['amount', 'amountusd', 'totalowed', 'total', 'itemtotal'])), debit = N(col(r, ['debit', 'withdrawal', 'withdrawals', 'moneyout'])), credit = N(col(r, ['credit', 'deposit', 'deposits', 'moneyin']));
      var type, val;
      if (debit || credit) { type = debit ? 'out' : 'in'; val = debit || credit; }
      else if ('Product Name' in r || 'Total Owed' in r) { type = 'out'; val = Math.abs(amt); }
      else { type = amt < 0 ? 'out' : 'in'; val = Math.abs(amt); }
      var acct = col(r, ['account', 'accountname', 'category']);
      if (/transfer|owner.?s? (draw|investment|equity)/i.test(acct + ' ' + desc)) return;
      if (!date || !val) return;
      var key = date + '|' + val + '|' + desc.slice(0, 40); if (have[key]) { skipped++; return; } have[key] = 1;
      ledger.push({ id: PK.uid('l'), type: type, date: date, amount: val, category: type === 'out' ? (OUT.indexOf(acct) >= 0 ? acct : guessOut(desc + ' ' + acct)) : (/service|consult/i.test(desc + acct) ? 'Services' : 'Product sales'), party: col(r, ['vendor', 'customer', 'payee', 'merchant', 'seller']) || (r['Product Name'] ? 'Amazon' : ''), desc: desc.slice(0, 120), method: col(r, ['paymentmethod', 'paymentinstrumenttype', 'account']), ref: col(r, ['orderid', 'reference', 'invoicenumber', 'checknumber']) });
      added++;
    });
    return { added: added, skipped: skipped };
  }
  function syncOrders() {
    var n = 0;
    if (cfg.code === 'at') {
      (D.clients || []).forEach(function (c) { if (!/delivered|follow/i.test(c.stage || '') || !N(c.value)) return; if (ledger.some(function (x) { return x.ref === c.id; })) return;
        ledger.push({ id: PK.uid('l'), type: 'in', date: PK.today(), amount: N(c.value), category: 'Services', party: c.who || '', desc: (c.service || 'Client project') + (c.org ? ' · ' + c.org : ''), method: 'Check the invoice was paid', ref: c.id }); n++; });
      return n;
    }
    orders().forEach(function (o) { var paid = paidOf(o); if (!paid) return; var ex = ledger.filter(function (x) { return x.ref === o.id && x.type === 'in'; }), have = sum(ex, function (x) { return N(x.amount); });
      if (paid - have < 0.01) return;
      ledger.push({ id: PK.uid('l'), type: 'in', date: PK.today(), amount: Math.round((paid - have) * 100) / 100, category: /custom|memorial|personal/i.test(o.items || '') ? 'Custom orders' : 'Product sales', party: o.who || '', desc: o.items || '', method: o.channel || '', ref: o.id }); n++; });
    return n;
  }

  function renderAll() { renderRep(); renderLed(); }
  renderAll();
  return { store: S, rerender: renderAll, OUT: OUT };
};
