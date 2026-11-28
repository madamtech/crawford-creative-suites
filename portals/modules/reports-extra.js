/* Business-specific reports and brand settings for the Reports page in each portal. */
(function () {
  function ls(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  function N(v) { var x = parseFloat(String(v == null ? '' : v).replace(/[$,]/g, '')); return isFinite(x) ? x : 0; }
  function fmt(n, d) { return (+n || 0).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return '$' + fmt(n, 2); }
  function inR(d, r) { return d && d >= r.from && d <= r.to; }
  function group(a, kf, vf) { var m = {}; a.forEach(function (x) { var k = kf(x) || 'Other'; m[k] = (m[k] || 0) + (vf ? vf(x) : 1); }); return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
  var G = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ml: 0.92, 'fl oz': 27.2 };
  var CAT = { C: 'Carrier oils', B: 'Butters', W: 'Waxes', H: 'Herbs', P: 'Clays and powders', S: 'Salts and sugars', E: 'Essential oils', F: 'Fragrance oils', A: 'Antioxidants', R: 'Preservatives', X: 'Additives', K: 'Packaging' };

  window.REPORT_SETUP = {
    ma: { code: 'ma', brand: 'Madam Allure', slug: 'madam-allure', color: '#B76E79', light: '#E8C2B0', tint: '#F6E5DE', repEl: 'ma-rep', ledEl: 'ma-led',
      extraData: function () { return [ls('ma_lab_inv', []), ls('ma_lab_batches', [])]; },
      extraHighlights: function (r) { var low = ls('ma_lab_inv', []).filter(function (i) { return i.reorder !== '' && i.reorder != null && N(i.qty) <= N(i.reorder); }); return low.length ? [low.length + ' ingredient' + (low.length === 1 ? ' is' : 's are') + ' at or below the reorder level.'] : []; },
      extraReports: [
        { key: 'inventory', area: 'Inventory and production', name: 'Ingredients and packaging', build: function (r) {
          var inv = ls('ma_lab_inv', []), val = function (i) { return N(i.qty) * N(i.cost); }, low = inv.filter(function (i) { return i.reorder !== '' && i.reorder != null && N(i.qty) <= N(i.reorder); });
          return { kpis: [['Items logged', String(inv.length)], ['Value on hand', money(inv.reduce(function (t, i) { return t + val(i); }, 0))], ['At or below reorder', String(low.length)], ['Past best-by', String(inv.filter(function (i) { return i.bestBy && i.bestBy < new Date().toISOString().slice(0, 10); }).length)]], tables: [
            { title: 'Value by category', cols: ['Category', 'Value'], money: [1], rows: group(inv, function (i) { return CAT[i.cat] || 'Other'; }, val) },
            { title: 'Reorder list', cols: ['Item', 'On hand', 'Reorder at'], rows: low.map(function (i) { return [i.name, fmt(N(i.qty), 2) + ' ' + i.unit, fmt(N(i.reorder), 2) + ' ' + i.unit]; }) },
            { title: 'Everything on hand', cols: ['Item', 'Category', 'On hand', 'Cost per unit', 'Supplier', 'Value'], money: [3, 5], rows: inv.map(function (i) { return [i.name, CAT[i.cat] || '', fmt(N(i.qty), 2) + ' ' + i.unit, N(i.cost), i.supplier || '', val(i)]; }) }],
            notes: inv.length ? [] : ['Record your ingredients and packaging under Production › Ingredients & packaging.'] };
        } },
        { key: 'production', area: 'Inventory and production', name: 'Batches made', build: function (r) {
          var b = ls('ma_lab_batches', []).filter(function (x) { return inR(x.date, r); });
          return { kpis: [['Batches', String(b.length)], ['Total made', fmt(b.reduce(function (t, x) { return t + N(x.grams); }, 0) / 28.3495, 1) + ' oz'], ['Units filled', String(b.reduce(function (t, x) { return t + N(x.units); }, 0))]], tables: [
            { title: 'By recipe', cols: ['Recipe', 'Batches'], rows: group(b, function (x) { return x.recipe; }) },
            { title: 'Every batch', cols: ['Batch code', 'Recipe', 'Made', 'Size (oz)', 'Units', 'Use by'], rows: b.map(function (x) { return [x.code, x.recipe, x.date, fmt(N(x.grams) / 28.3495, 1), N(x.units), x.useBy || '']; }) }] };
        } }] },
    af: { code: 'af', brand: 'Allure Fusions', slug: 'allure-fusions', color: '#1F4FB8', light: '#A9C4FF', tint: '#E1E9FA', repEl: 'af-rep', ledEl: 'af-led',
      extraData: function () { return [ls('af_fil_spools', []), ls('af_fil_jobs', [])]; },
      extraHighlights: function (r) { var s = ls('af_fil_spools', []), set = ls('af_fil_set', { reorder: 200 }), low = s.filter(function (x) { return N(x.left) <= N(x.reorder || set.reorder); }); return low.length ? [low.length + ' filament spool' + (low.length === 1 ? ' is' : 's are') + ' low.'] : []; },
      extraReports: [
        { key: 'filament', area: 'Inventory and production', name: 'Filament on hand', build: function (r) {
          var s = ls('af_fil_spools', []), set = ls('af_fil_set', { reorder: 200 }), low = s.filter(function (x) { return N(x.left) <= N(x.reorder || set.reorder); });
          var val = function (x) { return N(x.cost) / (N(x.net) || 1000) * N(x.left); };
          return { kpis: [['Spools', String(s.length)], ['Filament on hand', fmt(s.reduce(function (t, x) { return t + N(x.left); }, 0) / 1000, 2) + ' kg'], ['Value on hand', money(s.reduce(function (t, x) { return t + val(x); }, 0))], ['Low spools', String(low.length)]], tables: [
            { title: 'By material', cols: ['Material', 'Grams left'], rows: group(s, function (x) { return x.material; }, function (x) { return N(x.left); }).map(function (g) { return [g[0], Math.round(g[1])]; }) },
            { title: 'Reorder list', cols: ['Spool', 'Color and material', 'Grams left'], rows: low.map(function (x) { return [x.id, x.color + ' ' + x.material, Math.round(N(x.left))]; }) },
            { title: 'Every spool', cols: ['Spool', 'Color', 'Material', 'Brand', 'Grams left', 'Value'], money: [5], rows: s.map(function (x) { return [x.id, x.color, x.material, x.brand || '', Math.round(N(x.left)), val(x)]; }) }] };
        } },
        { key: 'printjobs', area: 'Inventory and production', name: 'Print jobs and filament use', build: function (r) {
          var j = ls('af_fil_jobs', []).filter(function (x) { return inR(x.date, r); }), failed = j.filter(function (x) { return x.failed; });
          var grams = j.reduce(function (t, x) { return t + N(x.grams); }, 0), cost = j.reduce(function (t, x) { return t + N(x.cost); }, 0);
          return { kpis: [['Prints', String(j.length)], ['Filament used', fmt(grams / 1000, 2) + ' kg'], ['Print cost', money(cost)], ['Failed prints', String(failed.length)], ['Waste from failures', fmt(failed.reduce(function (t, x) { return t + N(x.grams); }, 0), 0) + ' g']], tables: [
            { title: 'By printer', cols: ['Printer', 'Prints'], rows: group(j, function (x) { return x.printer; }) },
            { title: 'By product', cols: ['Product', 'Grams'], rows: group(j, function (x) { return x.product || 'Not named'; }, function (x) { return N(x.grams); }).map(function (g) { return [g[0], Math.round(g[1])]; }) },
            { title: 'Every print', cols: ['Date', 'Order', 'Product', 'Printer', 'Grams', 'Cost'], money: [5], rows: j.map(function (x) { return [x.date, x.order || '', (x.product || '') + (x.failed ? ' (failed)' : ''), x.printer, Math.round(N(x.grams)), N(x.cost)]; }) }] };
        } }] },
    at: { code: 'at', brand: 'AI AuthoriTech', slug: 'ai-authoritech', color: '#0D857D', light: '#7FEDE3', tint: '#DCF0EE', repEl: 'at-rep', ledEl: 'at-led',
      extraData: function () { return [ls('at_svc_svc', []), ls('at_svc_book', [])]; },
      extraReports: [
        { key: 'time', area: 'Service delivery', name: 'Hours by service', build: function (r) {
          var svc = ls('at_svc_svc', []), set = ls('at_svc_set', { rate: 125 }), book = ls('at_svc_book', []).filter(function (b) { return inR(b.date, r); });
          var byId = {}; svc.forEach(function (s) { byId[s.id] = s; });
          var hrs = function (s) { return s ? (N(s.live) + N(s.prep) + N(s.follow) + N(s.travel)) / 60 : 0; };
          var total = book.reduce(function (t, b) { return t + hrs(byId[b.svc]); }, 0);
          return { kpis: [['Sessions booked', String(book.length)], ['Hours of work', fmt(total, 1)], ['Value at $' + N(set.rate) + '/hour', money(total * N(set.rate))]], tables: [
            { title: 'Hours by service', cols: ['Service', 'Hours'], rows: group(book, function (b) { return (byId[b.svc] || {}).name || 'Removed service'; }, function (b) { return hrs(byId[b.svc]); }).map(function (g) { return [g[0], +g[1].toFixed(1)]; }) },
            { title: 'Service menu', cols: ['Service', 'Total time (h)', 'Set price', 'Earns per hour'], money: [2, 3], rows: svc.map(function (s) { var h = hrs(s); return [s.name, +h.toFixed(1), s.price === '' ? '' : N(s.price), s.price === '' || !h ? '' : N(s.price) / h]; }) }] };
        } }] }
  };
})();
