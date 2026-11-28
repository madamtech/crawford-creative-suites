/* Full business reporting: finance, sales, customers, operations, inventory and production, service delivery,
   marketing and community. Each build(r, c) gets the period r and the portal's data c. */
(function () {
  function ls(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  function N(v) { var x = parseFloat(String(v == null ? '' : v).replace(/[$,]/g, '')); return isFinite(x) ? x : 0; }
  function fmt(n, d) { return (+n || 0).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return (n < 0 ? '-$' : '$') + fmt(Math.abs(n), 2); }
  function pct(a, b) { return b ? fmt(a / b * 100, 1) + '%' : 'n/a'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function days(a, b) { return Math.round((new Date((b || today()) + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
  function monthsIn(r) { var a = new Date(r.from + 'T00:00:00'), b = new Date(r.to + 'T00:00:00'); if (r.from < '2001') { return null; } return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1; }
  function isDone(o) { return /ship|deliver|review|complete|done/i.test(o.stage || ''); }
  function isQuote(o) { return /inquiry|quote|lead/i.test(o.stage || ''); }
  function amt(x) { return N(x.amount); }

  /* ---------- Product catalogs (used to read order items and find slow movers) ---------- */
  var CATALOG = {
    ma: [['Women fragrance oil', 'Enticed', /women.*fragrance|fragrance.*women/i], ['Men fragrance oil', 'Enticed', /men'?s? .*fragrance|fragrance.*\bmen/i], ['Unisex fragrance oil', 'Enticed', /unisex.*fragrance/i], ['Rollerball', 'Enticed', /roller/i],
      ['Dry body oil', 'Enticed', /body oil/i], ['Shampoo bar', "Naturally Indulg'n", /shampoo/i], ['African black soap', "M'Bellish", /black soap/i], ['Handmade soap', "M'Bellish", /\bsoap\b/i], ['Bath truffles', "M'Bellish", /truffle/i], ['Bath tea', "M'Bellish", /bath tea/i], ['Bath salt', "M'Bellish", /bath salt/i],
      ['Body scrub', "M'Bellish", /scrub/i], ['Foaming bath butter', "M'Bellish", /foaming/i], ['Facial serum', "M'Bellish", /serum/i], ['Beard balm', "M'Bellish", /beard balm/i], ['Beard oil', "M'Bellish", /beard oil/i],
      ['Whipped shea butter', "Naturally Indulg'n", /shea/i], ['Hair growth oil', "Naturally Indulg'n", /hair growth/i],
      ['Aroma beads', 'ScentSationate', /aroma bead/i], ['Room and linen spray', 'ScentSationate', /spray/i],
      ['Bridal Celebration Set', 'Gift sets', /bridal/i], ['Corporate Wellness Box', 'Gift sets', /corporate/i], ["Gentleman's Set", 'Gift sets', /gentleman/i], ['Welcome Home Set', 'Gift sets', /welcome home/i], ['Blinged wine glass', 'Gift sets', /wine glass|blinged/i],
      ['Memorial gifts', 'Memorial gifts', /memorial/i]],
    af: [['Bookmarks', '3D printed', /bookmark/i], ['Keychains and name tags', '3D printed', /keychain|name tag/i], ['Wedding heart favors', '3D printed', /favor/i], ['Christmas ornaments', '3D printed', /ornament(?!.*(wood|engrav))/i],
      ['Napkin rings', '3D printed', /napkin/i], ['Spiral vases', '3D printed', /vase/i], ['Lithophane lamps', '3D printed', /lithophane/i], ['Puzzle boxes', '3D printed', /puzzle/i],
      ['Engraved slate coasters', 'Laser engraved', /coaster/i], ['Custom dog tags', 'Laser engraved', /dog tag/i], ['Engraved wood ornaments', 'Laser engraved', /wood.*ornament|engraved.*ornament/i], ['Engraved signs and gift tags', 'Laser engraved', /sign|gift tag/i],
      ['Cake toppers', 'Custom projects', /cake topper/i], ['Custom projects', 'Custom projects', /custom/i]]
  };
  function lines(code, os) {
    var cat = CATALOG[code] || [], out = [];
    os.forEach(function (o) { String(o.items || '').split(/[,;+]|\band\b/).forEach(function (part) {
      part = part.trim(); if (!part) return;
      var q = +((part.match(/[x×]\s?(\d+)/i) || part.match(/^(\d+)\s?[x×]?\s/) || [])[1] || 1);
      var hit = cat.filter(function (c) { return c[2].test(part); })[0];
      out.push({ order: o, product: hit ? hit[0] : part.replace(/\s*[x×]\s?\d+\s*$/i, '').slice(0, 40), line: hit ? hit[1] : 'Other', qty: q, value: N(o.total) / Math.max(1, String(o.items || '').split(/[,;+]|\band\b/).filter(function (x) { return x.trim(); }).length) });
    }); });
    return out;
  }

  /* ---------- Finance reports (all businesses) ---------- */
  var FIN = [
    { key: 'cashflow', area: 'Finance', name: 'Cash flow by month', build: function (r, c) {
      var m = {}; c.ledger.forEach(function (x) { if (!c.inRange(x.date, r) && r.from > '2001') return; var k = c.monthKey(x.date); m[k] = m[k] || [0, 0]; m[k][x.type === 'in' ? 0 : 1] += amt(x); });
      var run = 0, rows = Object.keys(m).sort().map(function (k) { var net = m[k][0] - m[k][1]; run += net; return [c.monthName(k), m[k][0], m[k][1], net, run]; });
      var neg = rows.filter(function (x) { return x[3] < 0; }).length;
      return { kpis: [['Cash in', money(rows.reduce(function (t, x) { return t + x[1]; }, 0))], ['Cash out', money(rows.reduce(function (t, x) { return t + x[2]; }, 0))], ['Net cash flow', money(run)], ['Months with negative cash flow', String(neg)]],
        tables: [{ title: 'Monthly cash flow', cols: ['Month', 'Cash in', 'Cash out', 'Net cash flow', 'Running total'], money: [1, 2, 3, 4], rows: rows }],
        notes: neg ? ['Cash flow was negative in ' + neg + ' month' + (neg === 1 ? '' : 's') + '. Check large one-time purchases, such as equipment, in Expenses.'] : [] };
    } },
    { key: 'budget', area: 'Finance', name: 'Budget vs. actual', build: function (r, c) {
      var b = c.budgets || {}, months = monthsIn(r) || 12, out = c.ledger.filter(function (x) { return x.type === 'out' && c.inRange(x.date, r); });
      var cats = Object.keys(b).filter(function (k) { return N(b[k]) > 0; }), actual = {}; out.forEach(function (x) { actual[x.category] = (actual[x.category] || 0) + amt(x); });
      Object.keys(actual).forEach(function (k) { if (cats.indexOf(k) < 0) cats.push(k); });
      var rows = cats.map(function (k) { var bud = N(b[k]) * months, act = actual[k] || 0; return [k, bud, act, bud - act, bud ? fmt(act / bud * 100, 0) + '%' : 'No budget']; }).sort(function (x, y) { return y[2] - x[2]; });
      var tb = rows.reduce(function (t, x) { return t + x[1]; }, 0), ta = rows.reduce(function (t, x) { return t + x[2]; }, 0), over = rows.filter(function (x) { return x[1] && x[2] > x[1]; });
      return { kpis: [['Budget for the period', money(tb)], ['Actual expenses', money(ta)], ['Remaining', money(tb - ta)], ['Categories over budget', String(over.length)]],
        tables: [{ title: 'By category (' + months + ' month' + (months === 1 ? '' : 's') + ' of budget)', cols: ['Category', 'Budget', 'Actual', 'Remaining', 'Used'], money: [1, 2, 3], rows: rows }],
        notes: Object.keys(b).length ? over.map(function (x) { return x[0] + ' is over budget by ' + money(x[2] - x[1]) + '.'; }) : ['Set a monthly budget for each expense category under Reports › Budgets & costs.'] };
    } },
    { key: 'aging', area: 'Finance', name: 'Accounts receivable aging', build: function (r, c) {
      var rows = [];
      if (c.D.clients && !c.orders.length) {
        c.D.clients.filter(function (x) { return /delivered|follow/i.test(x.stage || '') && N(x.value); }).forEach(function (x) { var paid = c.ledger.filter(function (l) { return l.type === 'in' && l.ref === x.id; }).reduce(function (t, l) { return t + amt(l); }, 0); if (N(x.value) - paid > 0.5) rows.push([x.id, c.who(x.who), x.service || '', x.follow || '', N(x.value) - paid]); });
      } else {
        c.orders.filter(function (o) { return !isQuote(o) && !isDone(o); }).forEach(function (o) { var bal = N(o.total) - c.paidOf(o); if (bal > 0.5) rows.push([o.id, c.who(o.who), o.items || '', o.due || '', bal]); });
      }
      var b = { 'Not yet due': 0, '1 to 30 days past due': 0, '31 to 60 days past due': 0, 'Over 60 days past due': 0 };
      rows.forEach(function (x) { var d = x[3] ? days(x[3]) : -1; var k = d <= 0 ? 'Not yet due' : d <= 30 ? '1 to 30 days past due' : d <= 60 ? '31 to 60 days past due' : 'Over 60 days past due'; b[k] += x[4]; x.splice(4, 0, d > 0 ? d + ' days' : 'Not yet due'); });
      var tot = rows.reduce(function (t, x) { return t + x[5]; }, 0);
      return { kpis: [['Total receivable', money(tot)], ['Accounts', String(rows.length)], ['Past due', money(tot - b['Not yet due'])]],
        tables: [{ title: 'Aging buckets', cols: ['Bucket', 'Amount'], money: [1], rows: Object.keys(b).map(function (k) { return [k, b[k]]; }) },
          { title: 'Open balances', cols: [c.D.clients && !c.orders.length ? 'Client' : 'Order', 'Customer', 'For', 'Due', 'Days past due', 'Balance'], money: [5], rows: rows }],
        notes: ['Your rule: balances and shipping are paid before anything ships, so past-due balances usually mean an order is waiting on payment.'] };
    } }
  ];

  /* ---------- Product shops: Madam Allure and Allure Fusions ---------- */
  function shopReports(code) {
    var R = [
      { key: 'products', area: 'Sales', name: 'Best sellers and slow movers', build: function (r, c) {
        var os = c.orders.filter(function (o) { return !isQuote(o) && (!o.due || c.inRange(o.due, r) || r.from < '2001'); }), L = lines(code, os);
        var by = c.group(L, function (x) { return x.product; }, function (x) { return x.qty; }), val = {}; L.forEach(function (x) { val[x.product] = (val[x.product] || 0) + x.value; });
        var sold = {}; by.forEach(function (g) { sold[g[0]] = g[1]; });
        var slow = (CATALOG[code] || []).filter(function (p) { return !sold[p[0]]; }).map(function (p) { return [p[0], p[1]]; });
        return { kpis: [['Products sold', String(by.length)], ['Units sold', String(L.reduce(function (t, x) { return t + x.qty; }, 0))], ['Top seller', (by[0] || ['None'])[0]], ['Catalog items with no sales', String(slow.length)]],
          tables: [{ title: 'Sales by product line', cols: ['Product line', 'Units'], rows: c.group(L, function (x) { return x.line; }, function (x) { return x.qty; }) },
            { title: 'Slow movers (no sales this period)', cols: ['Product', 'Line'], rows: slow },
            { title: 'Best sellers', cols: ['Product', 'Line', 'Units', 'Estimated sales'], money: [3], rows: by.map(function (g) { var l = L.filter(function (x) { return x.product === g[0]; })[0]; return [g[0], l.line, g[1], val[g[0]]]; }) }],
          notes: ['Products are read from each order’s item list. Sales per item are estimated by splitting the order total across its items.'] };
      } },
      { key: 'channels', area: 'Sales', name: 'Sales by channel and season', build: function (r, c) {
        var os = c.orders.filter(function (o) { return !isQuote(o); }), m = {};
        os.forEach(function (o) { var k = c.monthKey(o.due || ''); m[k] = m[k] || [0, 0]; m[k][0]++; m[k][1] += N(o.total); });
        var tot = c.sum(os, function (o) { return N(o.total); });
        return { kpis: [['Orders', String(os.length)], ['Gross sales', money(tot)], ['Average order value', money(os.length ? tot / os.length : 0)], ['Top channel', (c.group(os, function (o) { return o.channel || 'Not set'; }, function (o) { return N(o.total); })[0] || ['None'])[0]]],
          tables: [{ title: 'By channel', cols: ['Channel', 'Sales'], money: [1], rows: c.group(os, function (o) { return o.channel || 'Not set'; }, function (o) { return N(o.total); }) },
            { title: 'By month (seasonal trend)', cols: ['Month', 'Orders', 'Sales', 'Average order'], money: [2, 3], rows: Object.keys(m).sort().map(function (k) { return [c.monthName(k), m[k][0], m[k][1], m[k][1] / m[k][0]]; }) }] };
      } },
      { key: 'margins', area: 'Sales', name: 'Product profitability', build: function (r, c) {
        var rows = (c.costs || []).filter(function (x) { return x.product; }).map(function (x) { var cost = N(x.materials) + N(x.packaging) + N(x.minutes) / 60 * N(x.rate || 0) + N(x.fees || 0), price = N(x.price), m = price ? (price - cost) / price * 100 : 0; return [x.product, price, cost, price - cost, price ? fmt(m, 1) + '%' : 'n/a', m < (c.target || 40) ? 'Price may be too low' : 'Healthy']; });
        var low = rows.filter(function (x) { return x[5] !== 'Healthy'; });
        return { kpis: [['Products costed', String(rows.length)], ['Average margin', rows.length ? fmt(rows.reduce(function (t, x) { return t + (x[1] ? (x[1] - x[2]) / x[1] * 100 : 0); }, 0) / rows.length, 1) + '%' : 'n/a'], ['Below ' + (c.target || 40) + '% margin', String(low.length)]],
          tables: [{ title: 'Cost, price and margin per unit', cols: ['Product', 'Price', 'Unit cost', 'Profit per unit', 'Margin', 'Flag'], money: [1, 2, 3], rows: rows }],
          notes: rows.length ? low.map(function (x) { return x[0] + ': ' + x[4] + ' margin. Consider raising the price or lowering the cost.'; }) : ['Enter each product’s materials, packaging and labor time under Reports › Budgets & costs to see margins.'] };
      } },
      { key: 'custgrowth', area: 'Customers', name: 'Customer growth and loyalty', build: function (r, c) {
        var cs = c.custs, m = {}; cs.forEach(function (x) { var k = c.monthKey((x.since || '').slice(0, 10)); if (k) m[k] = (m[k] || 0) + 1; });
        var ltv = cs.length ? c.sum(cs, function (x) { return N(x.spent); }) / cs.length : 0;
        var lapsed = cs.filter(function (x) { var last = (x.last || x.since || '').slice(0, 10); return last && days(last) > 90; });
        var up = []; cs.forEach(function (x) { [['birthday', 'Birthday'], ['memorial', 'Memorial date']].forEach(function (f) { if (!x[f[0]]) return; var d = new Date(x[f[0]] + 'T00:00:00'), t = new Date(today() + 'T00:00:00'); d.setFullYear(t.getFullYear()); if (d < t) d.setFullYear(t.getFullYear() + 1); var n = Math.round((d - t) / 864e5); if (n <= 60) up.push([c.who((x.first || '') + ' ' + (x.last || '')), f[1], n === 0 ? 'Today' : 'In ' + n + ' days']); }); });
        return { kpis: [['Customers', String(cs.length)], ['Average lifetime value', money(ltv)], ['Repeat customers', String(cs.filter(function (x) { return N(x.orders) > 1; }).length)], ['No order in 90+ days', String(lapsed.length)]],
          tables: [{ title: 'New customers by month', cols: ['Month', 'New customers'], rows: Object.keys(m).sort().map(function (k) { return [c.monthName(k), m[k]]; }) },
            { title: 'Birthdays and memorial dates (next 60 days)', cols: ['Customer', 'Date', 'When'], rows: up },
            { title: 'Win-back list (no order in 90+ days)', cols: ['Customer', 'Orders', 'Spent', 'Customer since'], money: [2], rows: lapsed.map(function (x) { return [c.who((x.first || '') + ' ' + (x.last || '')), N(x.orders), N(x.spent), (x.since || '').slice(0, 10)]; }) }],
          notes: cs.length ? [] : ['Import customers from Wave, Clover or GoHighLevel on the Customers page.'] };
      } },
      { key: 'fulfillment', area: 'Operations', name: 'Fulfillment and on-time delivery', build: function (r, c) {
        var byId = {}; c.orders.forEach(function (o) { byId[o.id] = o; });
        var sh = c.ships.filter(function (s) { return c.inRange(s.date, r) || r.from < '2001'; });
        var ontime = sh.filter(function (s) { var o = byId[s.order]; return o && o.due && s.date <= o.due; }), known = sh.filter(function (s) { var o = byId[s.order]; return o && o.due; });
        var late = c.orders.filter(function (o) { return !isDone(o) && !isQuote(o) && o.due && o.due < today(); });
        var dep = c.orders.filter(function (o) { return !isQuote(o); });
        return { kpis: [['Orders shipped', String(sh.length)], ['On-time rate', pct(ontime.length, known.length)], ['Late open orders', String(late.length)], ['Deposits and payments collected', money(c.sum(dep, c.paidOf))], ['Balances still due', money(c.sum(dep, function (o) { return isDone(o) ? 0 : Math.max(0, N(o.total) - c.paidOf(o)); }))]],
          tables: [{ title: 'Open orders by stage', cols: ['Stage', 'Orders'], rows: c.group(c.orders.filter(function (o) { return !isDone(o); }), function (o) { return o.stage; }) },
            { title: 'Shipping cost vs. charged', cols: ['Measure', 'Amount'], money: [1], rows: [['Label costs', c.sum(sh, function (s) { return N(s.cost); })], ['Shipping charged', c.sum(sh, function (s) { return N(s.charged); })], ['Difference', c.sum(sh, function (s) { return N(s.charged) - N(s.cost); })]] },
            { title: 'Late orders', cols: ['Order', 'Customer', 'Items', 'Stage', 'Due', 'Days late'], rows: late.map(function (o) { return [o.id, c.who(o.who), o.items || '', o.stage || '', o.due, days(o.due)]; }) }] };
      } },
      { key: 'marketing', area: 'Marketing', name: 'Marketing and social', build: function (r, c) {
        var posts = (c.D.social || []).filter(function (p) { return !p.date || c.inRange(p.date, r) || r.from < '2001'; });
        var os = c.orders.filter(function (o) { return !isQuote(o); });
        return { kpis: [['Posts planned', String(posts.length)], ['Posted', String(posts.filter(function (p) { return p.status === 'Posted'; }).length)], ['Scheduled', String(posts.filter(function (p) { return p.status === 'Scheduled'; }).length)], ['Orders from social DMs', String(os.filter(function (o) { return /instagram|facebook|tiktok|dm/i.test(o.channel || ''); }).length)]],
          tables: [{ title: 'Posts by account', cols: ['Account', 'Posts'], rows: c.group(posts, function (p) { return (p.network || '') + ' ' + (p.account || ''); }) },
            { title: 'Posts by status', cols: ['Status', 'Posts'], rows: c.group(posts, function (p) { return p.status; }) },
            { title: 'Orders and sales by channel', cols: ['Channel', 'Sales'], money: [1], rows: c.group(os, function (o) { return o.channel || 'Not set'; }, function (o) { return N(o.total); }) }],
          notes: (c.D.sections || {}).social === 'real' ? [] : ['Social posts are example data until Dazz’l’s GoHighLevel Social Planner file arrives through the Portal Sync folder.'] };
      } }
    ];
    R.push({ key: 'feedback', area: 'Customers', name: 'Client survey: feedback and wish list', build: function (r, c) {
      var resp = ls(code + '_sv_resp', []).filter(function (x) { return c.inRange(x.date, r) || r.from < '2001'; }), sent = ls(code + '_sv_sent', {});
      var AR = [['quality', 'Product quality'], ['packaging', 'Packaging'], ['shipping', 'Shipping and delivery'], ['service', 'Customer service']];
      function sc(x) { var v = AR.map(function (a) { return N(x[a[0]]); }).filter(Boolean); return v.length ? v.reduce(function (t, y) { return t + y; }, 0) / v.length : N(x.rating); }
      var rated = resp.filter(sc), np = resp.filter(function (x) { return x.nps !== '' && x.nps != null; });
      var nps = np.length ? Math.round((np.filter(function (x) { return N(x.nps) >= 9; }).length - np.filter(function (x) { return N(x.nps) <= 6; }).length) / np.length * 100) : null;
      var sentN = Object.keys(sent).filter(function (k) { return c.inRange(sent[k], r) || r.from < '2001'; }).length;
      return { kpis: [['Surveys sent', String(sentN)], ['Responses', String(resp.length)], ['Response rate', pct(resp.length, sentN)], ['Average rating', rated.length ? fmt(rated.reduce(function (t, x) { return t + sc(x); }, 0) / rated.length, 1) + ' of 5' : 'n/a'], ['Net Promoter Score', nps === null ? 'n/a' : String(nps)], ['Referrals received', String(resp.filter(function (x) { return x.referral; }).length)]],
        tables: [{ title: 'Ratings by area (1 to 5)', cols: ['Area', 'Average', 'Responses'], rows: AR.map(function (a) { var v = resp.map(function (x) { return N(x[a[0]]); }).filter(Boolean); return [a[1], v.length ? +(v.reduce(function (t, y) { return t + y; }, 0) / v.length).toFixed(1) : 'n/a', v.length]; }) },
          { title: 'Recommendation (Net Promoter Score)', cols: ['Group', 'Clients'], rows: [['Promoters (9 to 10)', np.filter(function (x) { return N(x.nps) >= 9; }).length], ['Passives (7 to 8)', np.filter(function (x) { return N(x.nps) >= 7 && N(x.nps) <= 8; }).length], ['Detractors (0 to 6)', np.filter(function (x) { return N(x.nps) <= 6; }).length]] },
          { title: 'Client feedback', cols: ['Date', 'Client', 'What they loved and what would make it better', 'May share as review'], rows: resp.filter(function (x) { return x.comments; }).map(function (x) { return [x.date, c.who(x.who), x.comments, x.share || '']; }) },
          { title: 'Wish list (what clients want you to make next)', cols: ['Idea', 'From'], rows: resp.filter(function (x) { return x.wish; }).map(function (x) { return [x.wish, c.who(x.who)]; }) },
          { title: 'Needs you don’t offer yet (referral or new product ideas)', cols: ['Need', 'From'], rows: resp.filter(function (x) { return x.offer; }).map(function (x) { return [x.offer, c.who(x.who)]; }) }] };
    } });    if (code === 'ma') R.push(
      { key: 'freshness', area: 'Inventory and production', name: 'Ingredient freshness and usage', build: function (r, c) {
        var inv = ls('ma_lab_inv', []), rec = ls('ma_lab_recipes', []), used = {};
        rec.forEach(function (x) { (x.lines || []).forEach(function (l) { if (l.id) used[l.id] = 1; }); });
        var past = inv.filter(function (i) { return i.bestBy && i.bestBy < today(); }), soon = inv.filter(function (i) { return i.bestBy && i.bestBy >= today() && days(today(), i.bestBy) <= 60; });
        var unused = inv.filter(function (i) { return !used[i.id] && i.cat !== 'K'; });
        var st = c.group(rec, function (x) { return x.status; });
        return { kpis: [['Past best-by', String(past.length)], ['Expiring in 60 days', String(soon.length)], ['Not in any recipe', String(unused.length)], ['Vetted recipes', String(rec.filter(function (x) { return x.status === 'Vetted'; }).length)], ['Recipes in testing', String(rec.filter(function (x) { return x.status !== 'Vetted'; }).length)]],
          tables: [{ title: 'Recipes by status', cols: ['Status', 'Recipes'], rows: st },
            { title: 'Past or near best-by', cols: ['Ingredient', 'Best by'], rows: past.concat(soon).map(function (i) { return [i.name, i.bestBy]; }) },
            { title: 'Ingredients not used in any recipe', cols: ['Ingredient', 'On hand', 'Value'], money: [2], rows: unused.map(function (i) { return [i.name, fmt(N(i.qty), 2) + ' ' + i.unit, N(i.qty) * N(i.cost)]; }) }] };
      } });
    if (code === 'af') R.push(
      { key: 'machines', area: 'Inventory and production', name: 'Machines, failures and care', build: function (r, c) {
        var j = ls('af_fil_jobs', []).filter(function (x) { return c.inRange(x.date, r) || r.from < '2001'; }), eq = ls('af_eq_eq', []);
        var byP = {}; j.forEach(function (x) { var k = x.printer || 'Not set'; byP[k] = byP[k] || [0, 0, 0]; byP[k][0]++; if (x.failed) byP[k][1]++; byP[k][2] += (x.parts || []).reduce(function (t, p) { return t + N(p.min) * N(p.qty || 1); }, 0); });
        var spools = ls('af_fil_spools', []), lastUse = {}; ls('af_fil_jobs', []).forEach(function (x) { (x.parts || []).forEach(function (p) { if (!lastUse[p.spool] || x.date > lastUse[p.spool]) lastUse[p.spool] = x.date; }); });
        var idle = spools.filter(function (s) { return !lastUse[s.id] || days(lastUse[s.id]) > 90; });
        var due = eq.filter(function (m) { return !m.last || days(m.last) > 30; });
        return { kpis: [['Prints', String(j.length)], ['Failed-print rate', pct(j.filter(function (x) { return x.failed; }).length, j.length)], ['Machine hours', fmt(Object.keys(byP).reduce(function (t, k) { return t + byP[k][2]; }, 0) / 60, 1)], ['Equipment care due', String(due.length)], ['Spools idle 90+ days', String(idle.length)]],
          tables: [{ title: 'By printer', cols: ['Printer', 'Prints', 'Failed', 'Failure rate', 'Machine hours'], rows: Object.keys(byP).map(function (k) { return [k, byP[k][0], byP[k][1], pct(byP[k][1], byP[k][0]), +(byP[k][2] / 60).toFixed(1)]; }) },
            { title: 'Equipment care due (none logged in 30 days)', cols: ['Machine', 'Last care'], rows: due.map(function (m) { return [m.name, m.last || 'Not logged']; }) },
            { title: 'Filament not used in 90 days', cols: ['Spool', 'Color and material', 'Grams left'], rows: idle.map(function (s) { return [s.id, s.color + ' ' + s.material, Math.round(N(s.left))]; }) }] };
      } });
    return R;
  }

  /* ---------- Agency: AI AuthoriTech ---------- */
  var STAGES = ['Lead', 'Discovery Call', 'Proposal Sent', 'Agreement Signed', 'In Progress', 'Delivered', 'Follow-up'];
  var PROB = { 'Lead': 0.1, 'Discovery Call': 0.2, 'Proposal Sent': 0.5, 'Agreement Signed': 0.9, 'In Progress': 1, 'Delivered': 1, 'Follow-up': 1 };
  var AT = [
    { key: 'pipeline', area: 'Sales', name: 'Sales pipeline and forecast', build: function (r, c) {
      var cl = c.D.clients || [], idx = function (x) { return Math.max(0, STAGES.indexOf(x.stage)); };
      var reached = STAGES.map(function (s, i) { return cl.filter(function (x) { return idx(x) >= i; }).length; });
      var signed = cl.filter(function (x) { return idx(x) >= 3; }), forecast = c.sum(cl, function (x) { return N(x.value) * (PROB[x.stage] || 0); });
      return { kpis: [['Clients and leads', String(cl.length)], ['Win rate', pct(signed.length, cl.length)], ['Average deal size', money(signed.length ? c.sum(signed, function (x) { return N(x.value); }) / signed.length : 0)], ['Weighted forecast', money(forecast)]],
        tables: [{ title: 'Conversion by stage', cols: ['Stage', 'Reached', 'Conversion from previous'], rows: STAGES.map(function (s, i) { return [s, reached[i], i ? pct(reached[i], reached[i - 1]) : '']; }) },
          { title: 'Leads by source', cols: ['Source', 'Leads'], rows: c.group(cl, function (x) { return x.source || x.channel || 'Not recorded'; }) },
          { title: 'Forecast by deal', cols: ['Client', 'Service', 'Stage', 'Value', 'Probability', 'Weighted'], money: [3, 5], rows: cl.map(function (x) { return [c.who(x.who), x.service || '', x.stage || '', N(x.value), fmt((PROB[x.stage] || 0) * 100, 0) + '%', N(x.value) * (PROB[x.stage] || 0)]; }) }],
        notes: ['Forecast weights each deal by stage: Lead 10%, Discovery 20%, Proposal 50%, Signed 90%, In progress and later 100%.'] };
    } },
    { key: 'clientvalue', area: 'Customers', name: 'Clients and retention', build: function (r, c) {
      var cl = c.D.clients || [], rev = {}; c.ledger.filter(function (x) { return x.type === 'in'; }).forEach(function (x) { var k = x.party || x.ref || 'Not set'; rev[k] = (rev[k] || 0) + amt(x); });
      var active = cl.filter(function (x) { return /agreement|progress/i.test(x.stage || ''); }), past = cl.filter(function (x) { return /delivered|follow/i.test(x.stage || ''); });
      var repeat = Object.keys(c.group(cl, function (x) { return (x.org || x.who || '').toLowerCase(); }).reduce(function (o, g) { if (g[1] > 1) o[g[0]] = 1; return o; }, {})).length;
      return { kpis: [['Active clients', String(active.length)], ['Past clients', String(past.length)], ['Returning clients', String(repeat)], ['Testimonials collected', String(cl.filter(function (x) { return x.testimonial; }).length)]],
        tables: [{ title: 'Revenue by client', cols: ['Client', 'Revenue'], money: [1], rows: Object.keys(rev).map(function (k) { return [c.who(k), rev[k]]; }).sort(function (a, b) { return b[1] - a[1]; }) },
          { title: 'Every client', cols: ['Client', 'Organization', 'Service', 'Stage', 'Next step'], rows: cl.map(function (x) { return [c.who(x.who), x.org || '', x.service || '', x.stage || '', x.nextStep || '']; }) }],
        notes: ['Testimonials count when a client record has a testimonial noted. Ask every delivered client; it feeds your Skool proof and website.'] };
    } },
    { key: 'utilization', area: 'Service delivery', name: 'Utilization and effective rate', build: function (r, c) {
      var svc = ls('at_svc_svc', []), set = ls('at_svc_set', { rate: 125, week: 15 }), book = ls('at_svc_book', []).filter(function (b) { return c.inRange(b.date, r); });
      var byId = {}; svc.forEach(function (s) { byId[s.id] = s; });
      var hrs = book.reduce(function (t, b) { var s = byId[b.svc]; return t + (s ? (N(s.live) + N(s.prep) + N(s.follow) + N(s.travel)) / 60 : 0); }, 0);
      var weeks = Math.max(1, Math.round((new Date(r.to) - new Date(r.from < '2001' ? today() : r.from)) / 6048e5) || 1), avail = weeks * N(set.week || 15);
      var revenue = c.sum(c.ledger.filter(function (x) { return x.type === 'in' && x.category === 'Services' && c.inRange(x.date, r); }), amt);
      var eff = hrs ? revenue / hrs : 0;
      return { kpis: [['Hours booked', fmt(hrs, 1)], ['Hours available', fmt(avail, 0)], ['Utilization', pct(hrs, avail)], ['Service revenue', money(revenue)], ['Effective hourly rate', hrs ? money(eff) : 'n/a'], ['Target rate', money(N(set.rate))]],
        tables: [{ title: 'Hours by service', cols: ['Service', 'Sessions'], rows: c.group(book, function (b) { return (byId[b.svc] || {}).name || 'Removed service'; }) }],
        notes: hrs && eff < N(set.rate) ? ['Your effective rate is below $' + N(set.rate) + ' per hour. Prep and follow-up time may be under-priced.'] : [] };
    } },
    { key: 'atmarketing', area: 'Marketing', name: 'Marketing and inquiries', build: function (r, c) {
      var ct = (c.D.content || []).filter(function (p) { return !p.date || c.inRange(p.date, r) || r.from < '2001'; }), so = (c.D.social || []), inbox = c.D.inbox || [];
      return { kpis: [['Content planned', String(ct.length + so.length)], ['Published', String(ct.concat(so).filter(function (p) { return /posted|published/i.test(p.status || ''); }).length)], ['Inquiries waiting', String(inbox.length)]],
        tables: [{ title: 'Content by channel', cols: ['Channel', 'Pieces'], rows: c.group(ct.concat(so), function (p) { return p.channel || p.network; }) },
          { title: 'Inquiries by channel', cols: ['Channel', 'Inquiries'], rows: c.group(inbox, function (m) { return m.channel; }) }] };
    } }
  ];

  /* ---------- Skool community ---------- */
  var SK = [
    { key: 'members', area: 'Community', name: 'Member growth', build: function (r, c) {
      var m = ls('sk_members', []), by = {}; m.forEach(function (x) { var k = c.monthKey(x.joined || ''); if (k) by[k] = (by[k] || 0) + 1; });
      var left = m.filter(function (x) { return /cancel|left|removed/i.test(x.status || x.tier || ''); });
      return { kpis: [['Members', String(m.length - left.length)], ['Joined this period', String(m.filter(function (x) { return c.inRange(x.joined, r); }).length)], ['Paid members', String(m.filter(function (x) { return /paid|premium|vip/i.test(x.tier || ''); }).length)], ['Cancellations', String(left.length)], ['Churn rate', pct(left.length, m.length)]],
        tables: [{ title: 'New members by month', cols: ['Month', 'Joined'], rows: Object.keys(by).sort().map(function (k) { return [c.monthName(k), by[k]]; }) },
          { title: 'By plan', cols: ['Plan', 'Members'], rows: c.group(m, function (x) { return x.tier || 'Free'; }) }] };
    } },
    { key: 'engagement', area: 'Community', name: 'Sessions, courses and engagement', build: function (r, c) {
      var s = ls('sk_sessions', []).filter(function (x) { return c.inRange(x.date, r) || r.from < '2001'; }), done = s.filter(function (x) { return x.status === 'Done'; }), co = ls('sk_courses', []), posts = ls('sk_posts', []), mem = ls('sk_members', []).length;
      var att = done.reduce(function (t, x) { return t + N(x.att); }, 0);
      return { kpis: [['Sessions held', String(done.length)], ['Average attendance', done.length ? fmt(att / done.length, 1) : 'n/a'], ['Attendance rate', mem && done.length ? pct(att / done.length, mem) : 'n/a'], ['Courses published', String(co.filter(function (x) { return x.status === 'Published'; }).length) + ' of ' + co.length], ['Community posts', String(posts.length)]],
        tables: [{ title: 'Sessions', cols: ['Date', 'Session', 'Type', 'Attended', 'Recording'], rows: s.map(function (x) { return [x.date, x.title, x.type, N(x.att), x.rec ? 'Posted' : 'Not yet']; }) },
          { title: 'Courses', cols: ['Course', 'Access', 'Status'], rows: co.map(function (x) { return [x.name, x.access, x.status]; }) }] };
    } }
  ];

  window.REPORT_CATALOG = CATALOG;
  function add(code, list) { var s = window.REPORT_SETUP && window.REPORT_SETUP[code]; if (!s) return; s.extraReports = (s.extraReports || []).concat(list); }
  add('ma', FIN.concat(shopReports('ma')));
  add('af', FIN.concat(shopReports('af')));
  add('at', FIN.concat(AT));
  window.REPORT_SETUP = window.REPORT_SETUP || {};
  window.REPORT_SETUP.sk = { code: 'sk', brand: 'Skool community', slug: 'skool-community', color: '#1F4FB8', light: '#7FEDE3', tint: '#E1E9FA', repEl: 'sk-rep', ledEl: 'sk-led', skipReports: ['summary', 'sales', 'customers', 'shipping', 'aging'],
    extraData: function () { return [ls('sk_members', []), ls('sk_sessions', []), ls('sk_courses', [])]; }, extraReports: FIN.filter(function (x) { return x.key !== 'aging'; }).concat(SK) };
})();
