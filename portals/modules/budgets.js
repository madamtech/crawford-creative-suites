/* Budgets & costs: monthly budget per expense category (for Budget vs. actual) and, for the product shops,
   the cost of each product (for Product profitability). Saved with the portal's finance data. */
window.Budgets = function (rp, code, elId) {
  var el = document.getElementById(elId); if (!el || !rp) return;
  var E = PK.esc, N = PK.num, S = rp.store, shop = code === 'ma' || code === 'af';
  function render() {
    var b = S.get('budgets', {}), costs = S.get('costs', []), target = N(S.get('target', 40)) || 40;
    if (shop && !costs.length) costs = ((window.REPORT_CATALOG || {})[code] || []).map(function (p) { return { product: p[0], price: '', materials: '', packaging: '', minutes: '', rate: code === 'af' ? 25 : 20, fees: '' }; });
    var totalB = Object.keys(b).reduce(function (t, k) { return t + N(b[k]); }, 0);
    el.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Reports</span><h2>Budgets &amp; costs</h2></div><span class="source ' + (totalB || costs.some(function (x) { return N(x.price); }) ? 'real' : 'example') + '">Feeds Budget vs. actual' + (shop ? ' and Product profitability' : '') + '</span></div>' +
      '<div class="even one h-md"><div class="card"><h3>Monthly budget by category</h3><div class="fill"><table class="k-tbl"><thead><tr><th>Expense category</th><th class="num">Monthly budget</th></tr></thead><tbody>' +
        rp.OUT.map(function (c) { return '<tr><td>' + E(c) + '</td><td class="num"><input class="k-in num" type="number" min="0" step="5" data-b="' + E(c) + '" value="' + E(b[c] || '') + '" style="width:120px"></td></tr>'; }).join('') +
        '<tr><td><b>Total per month</b></td><td class="num"><b>$' + totalB.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</b></td></tr></tbody></table></div><p class="k-hint">Leave a category blank if you don’t budget for it. Changes save as you type.</p></div></div>' +
      (shop ? '<div class="even one h-lg"><div class="card"><div class="toolbar"><h3 style="margin:0">Product costs</h3><span style="flex:1"></span><span class="k-hint">Target margin</span><input class="k-in" type="number" id="bc-target" min="0" max="95" value="' + target + '" style="width:70px"><span class="k-hint">%</span><button class="btn small-btn" id="bc-add">+ Product</button></div><div class="fill"><table class="k-tbl"><thead><tr><th>Product</th><th class="num">Price</th><th class="num">Materials</th><th class="num">Packaging</th><th class="num">Labor (min)</th><th class="num">$/hour</th><th class="num">Fees</th><th class="num">Margin</th></tr></thead><tbody>' +
        costs.map(function (x, i) { var cost = N(x.materials) + N(x.packaging) + N(x.minutes) / 60 * N(x.rate) + N(x.fees), m = N(x.price) ? (N(x.price) - cost) / N(x.price) * 100 : null;
          return '<tr><td><input class="k-in" data-c="' + i + '" data-f="product" value="' + E(x.product) + '"></td>' + ['price', 'materials', 'packaging', 'minutes', 'rate', 'fees'].map(function (f) { return '<td class="num"><input class="k-in num" type="number" min="0" step="any" data-c="' + i + '" data-f="' + f + '" value="' + E(x[f]) + '" style="width:78px"></td>'; }).join('') +
            '<td class="num">' + (m == null ? '' : '<span style="color:' + (m < target ? '#F0229F' : 'var(--teal)') + '">' + m.toFixed(1) + '%</span>') + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="k-hint">Unit cost = materials + packaging + labor minutes × hourly rate + fees (Etsy, card processing). ' + (code === 'ma' ? 'For materials, use the ingredient cost of a recipe batch (Recipes & batches) divided by the units it fills.' : 'Material cost = grams of filament × cost per gram from your spools.') + '</p></div></div>' : '');
    el.querySelectorAll('[data-b]').forEach(function (i) { i.onchange = function () { var x = S.get('budgets', {}); if (N(i.value)) x[i.dataset.b] = N(i.value); else delete x[i.dataset.b]; S.set('budgets', x); render(); rp.rerender(); }; });
    el.querySelectorAll('[data-c]').forEach(function (i) { i.onchange = function () { var cs = costs.slice(); cs[+i.dataset.c][i.dataset.f] = i.value; S.set('costs', cs); render(); rp.rerender(); }; });
    if (document.getElementById('bc-add')) document.getElementById('bc-add').onclick = function () { var cs = costs.slice(); cs.push({ product: '', rate: costs[0] ? costs[0].rate : 20 }); S.set('costs', cs); render(); };
    if (document.getElementById('bc-target')) document.getElementById('bc-target').onchange = function () { S.set('target', N(this.value) || 40); render(); rp.rerender(); };
  }
  render();
};
