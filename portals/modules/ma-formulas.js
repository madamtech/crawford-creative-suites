/* Madam Allure: ingredient inventory, formula builder, recipes and batches.
   Saved in this browser under keys starting with "ma_lab_". Use Backup to keep a copy in OneDrive.
   Generated formulas are starting points: every new formula stays a Draft until a test batch passes. */
(function () {
  var E = PK.esc, N = PK.num, S = PK.db('ma_lab_');
  var root = { ing: document.getElementById('ma-ing'), form: document.getElementById('ma-form'), rec: document.getElementById('ma-rec') };
  if (!root.ing) return;

  /* ---------- Ingredient knowledge ----------
     [key, name, INCI, category, rancidity (H/M/L), goals, max % of formula (0 = none in leave-on), NaOH SAP, note] */
  var CAT = { C: 'Carrier oil', B: 'Butter', W: 'Wax', H: 'Herb & botanical', P: 'Clay & powder', S: 'Salt & sugar', E: 'Essential oil', F: 'Fragrance oil', A: 'Antioxidant', R: 'Preservative', X: 'Emulsifier & additive', K: 'Packaging' };
  var GOALS = { dry: 'Dry skin', dryfeel: 'Fast-absorbing, non-greasy', sensitive: 'Sensitive or soothing', glow: 'Glow and even tone', calm: 'Relaxing', hair: 'Hair and scalp', oily: 'Oily or breakout-prone', mature: 'Mature skin', lips: 'Lips' };
  var LIB_RAW = [
    ['sweetalmond', 'Sweet almond oil', 'Prunus Amygdalus Dulcis (Sweet Almond) Oil', 'C', 'M', 'dry sensitive', 100, .136, 'Tree nut: list it for allergy awareness.'],
    ['jojoba', 'Jojoba oil', 'Simmondsia Chinensis (Jojoba) Seed Oil', 'C', 'L', 'oily hair sensitive mature', 100, .069, ''],
    ['grapeseed', 'Grapeseed oil', 'Vitis Vinifera (Grape) Seed Oil', 'C', 'H', 'oily', 100, .126, 'Goes rancid fast; keep batches small.'],
    ['avocado', 'Avocado oil', 'Persea Gratissima (Avocado) Oil', 'C', 'M', 'dry mature', 100, .133, ''],
    ['olive', 'Olive oil', 'Olea Europaea (Olive) Fruit Oil', 'C', 'L', 'dry', 100, .135, ''],
    ['fraccoconut', 'Fractionated coconut oil', 'Caprylic/Capric Triglyceride', 'C', 'L', 'dryfeel oily sensitive', 100, 0, 'Light, non-greasy, very stable.'],
    ['coconut', 'Coconut oil', 'Cocos Nucifera (Coconut) Oil', 'C', 'L', 'dry hair', 100, .183, 'In soap keep at 30% or less, it can dry skin.'],
    ['castor', 'Castor oil', 'Ricinus Communis (Castor) Seed Oil', 'C', 'L', 'hair lips', 30, .128, 'Thick and sticky; keep low in body products.'],
    ['argan', 'Argan oil', 'Argania Spinosa Kernel Oil', 'C', 'M', 'hair mature glow', 100, .136, ''],
    ['rosehip', 'Rosehip oil', 'Rosa Canina Fruit Oil', 'C', 'H', 'glow mature', 10, 0, 'Very fragile; always pair with an antioxidant.'],
    ['sunflower', 'Sunflower oil', 'Helianthus Annuus (Sunflower) Seed Oil', 'C', 'H', 'sensitive dry', 100, .134, 'High-oleic sunflower keeps longer.'],
    ['apricot', 'Apricot kernel oil', 'Prunus Armeniaca (Apricot) Kernel Oil', 'C', 'M', 'sensitive dry', 100, .135, ''],
    ['hemp', 'Hemp seed oil', 'Cannabis Sativa Seed Oil', 'C', 'H', 'oily sensitive calm', 30, .135, 'Fragile; store cool.'],
    ['ricebran', 'Rice bran oil', 'Oryza Sativa (Rice) Bran Oil', 'C', 'M', 'glow mature', 100, .128, ''],
    ['blackseed', 'Black seed oil', 'Nigella Sativa Seed Oil', 'C', 'M', 'hair sensitive', 10, 0, 'Strong scent; keep low.'],
    ['pumpkin', 'Pumpkin seed oil', 'Cucurbita Pepo (Pumpkin) Seed Oil', 'C', 'H', 'hair', 20, 0, ''],
    ['tamanu', 'Tamanu oil', 'Calophyllum Inophyllum Seed Oil', 'C', 'M', 'sensitive calm mature', 10, 0, 'Tree nut: list it for allergy awareness.'],
    ['seabuckthorn', 'Sea buckthorn oil', 'Hippophae Rhamnoides Fruit Oil', 'C', 'M', 'glow', 2, 0, 'Stains orange above 2%.'],
    ['ipm', 'Isopropyl myristate (IPM)', 'Isopropyl Myristate', 'C', 'L', 'dryfeel oily', 50, 0, 'Dry-feel ester: cuts the greasy film so oils sink in fast.'],
    ['c1215', 'C12-15 alkyl benzoate', 'C12-15 Alkyl Benzoate', 'C', 'L', 'dryfeel', 50, 0, 'Dry-feel ester with a silky, non-oily finish.'],
    ['cococaprylate', 'Coco-caprylate', 'Coco-Caprylate', 'C', 'L', 'dryfeel sensitive', 60, 0, 'Plant-based dry-feel ester; a light silicone alternative.'],
    ['squalane', 'Squalane (olive)', 'Squalane', 'C', 'L', 'dryfeel sensitive mature', 100, 0, 'Weightless and very stable.'],
    ['meadowfoam', 'Meadowfoam seed oil', 'Limnanthes Alba (Meadowfoam) Seed Oil', 'C', 'L', 'dry lips', 100, 0, 'Very stable; extends shelf life of blends.'],
    ['babassu', 'Babassu oil', 'Orbignya Oleifera Seed Oil', 'C', 'L', 'dry oily', 100, .175, ''],
    ['safflower', 'Safflower oil', 'Carthamus Tinctorius (Safflower) Seed Oil', 'C', 'H', 'oily', 100, .136, ''],
    ['shea', 'Shea butter', 'Butyrospermum Parkii (Shea) Butter', 'B', 'L', 'dry sensitive lips', 100, .128, 'Melt low and cool fast to avoid grainy texture.'],
    ['cocoa', 'Cocoa butter', 'Theobroma Cacao (Cocoa) Seed Butter', 'B', 'L', 'dry lips', 100, .137, 'Hard butter with a chocolate scent unless deodorized.'],
    ['mango', 'Mango butter', 'Mangifera Indica (Mango) Seed Butter', 'B', 'L', 'dry sensitive oily', 100, .137, 'Lighter, less greasy.'],
    ['kokum', 'Kokum butter', 'Garcinia Indica Seed Butter', 'B', 'L', 'dry lips', 100, .136, 'Very hard; great in balms.'],
    ['avocadobutter', 'Avocado butter', 'Persea Gratissima (Avocado) Butter', 'B', 'M', 'dry mature', 100, 0, ''],
    ['murumuru', 'Murumuru butter', 'Astrocaryum Murumuru Seed Butter', 'B', 'L', 'dry hair', 100, 0, ''],
    ['aloebutter', 'Aloe butter', 'Aloe Barbadensis Leaf Extract, Cocos Nucifera (Coconut) Oil', 'B', 'L', 'calm sensitive', 100, 0, ''],
    ['lard', 'Lard', 'Lard', 'B', 'L', '', 0, .138, 'Soap only.'],
    ['tallow', 'Tallow', 'Tallow', 'B', 'L', '', 0, .143, 'Soap only.'],
    ['beeswax', 'Beeswax', 'Cera Alba (Beeswax)', 'W', 'L', 'lips', 35, 0, ''],
    ['candelilla', 'Candelilla wax', 'Euphorbia Cerifera (Candelilla) Wax', 'W', 'L', 'lips', 20, 0, 'Vegan; use about half as much as beeswax.'],
    ['carnauba', 'Carnauba wax', 'Copernicia Cerifera (Carnauba) Wax', 'W', 'L', 'lips', 10, 0, 'Very hard; small amounts only.'],
    ['calendula', 'Calendula petals', 'Calendula Officinalis Flower', 'H', 'L', 'sensitive calm', 3, 0, 'Infuse into oil for oils and butters.'],
    ['chamomile', 'Chamomile flowers', 'Chamomilla Recutita (Matricaria) Flower', 'H', 'L', 'calm sensitive', 3, 0, 'Ragweed family: allergy note.'],
    ['lavenderbuds', 'Lavender buds', 'Lavandula Angustifolia (Lavender) Flower', 'H', 'L', 'calm', 3, 0, ''],
    ['rosepetals', 'Rose petals', 'Rosa Centifolia Flower', 'H', 'L', 'glow', 3, 0, 'Petals brown in bath salts over time.'],
    ['hibiscus', 'Hibiscus powder or petals', 'Hibiscus Sabdariffa Flower', 'H', 'L', 'hair glow', 3, 0, 'Can tint pink.'],
    ['rosemaryleaf', 'Rosemary leaf', 'Rosmarinus Officinalis (Rosemary) Leaf', 'H', 'L', 'hair', 3, 0, 'Infuse into oil.'],
    ['nettle', 'Nettle leaf', 'Urtica Dioica (Nettle) Leaf', 'H', 'L', 'hair', 3, 0, 'Infuse into oil.'],
    ['horsetail', 'Horsetail', 'Equisetum Arvense Extract', 'H', 'L', 'hair', 3, 0, 'Infuse into oil.'],
    ['fenugreek', 'Fenugreek seed', 'Trigonella Foenum-Graecum Seed', 'H', 'L', 'hair', 3, 0, 'Infuse into oil; strong scent.'],
    ['peppermintleaf', 'Peppermint leaf', 'Mentha Piperita (Peppermint) Leaf', 'H', 'L', 'hair', 3, 0, ''],
    ['oats', 'Colloidal oatmeal', 'Avena Sativa (Oat) Kernel Flour', 'P', 'L', 'sensitive dry calm', 5, 0, 'Gluten note for labels.'],
    ['kaolin', 'Kaolin clay', 'Kaolin', 'P', 'L', 'sensitive', 5, 0, ''],
    ['bentonite', 'Bentonite clay', 'Bentonite', 'P', 'L', 'oily', 5, 0, ''],
    ['frenchgreen', 'French green clay', 'Illite', 'P', 'L', 'oily', 5, 0, ''],
    ['rhassoul', 'Rhassoul clay', 'Moroccan Lava Clay', 'P', 'L', 'oily hair', 5, 0, ''],
    ['arrowroot', 'Arrowroot powder', 'Maranta Arundinacea Root Powder', 'P', 'L', '', 6, 0, 'Cuts greasiness in body butter.'],
    ['tapioca', 'Tapioca starch', 'Tapioca Starch', 'P', 'L', '', 6, 0, 'Cuts greasiness in body butter.'],
    ['cornstarch', 'Cornstarch', 'Zea Mays (Corn) Starch', 'P', 'L', '', 6, 0, ''],
    ['turmeric', 'Turmeric powder', 'Curcuma Longa (Turmeric) Root Powder', 'P', 'L', 'glow', 1, 0, 'Stains skin and towels above 1%.'],
    ['charcoal', 'Activated charcoal', 'Charcoal Powder', 'P', 'L', 'oily', 2, 0, ''],
    ['coffee', 'Ground coffee', 'Coffea Arabica (Coffee) Seed Powder', 'P', 'M', 'glow', 15, 0, 'Exfoliant; used grounds must be fully dry.'],
    ['cocoapowder', 'Cocoa powder', 'Theobroma Cacao (Cocoa) Seed Powder', 'P', 'L', '', 5, 0, ''],
    ['mica', 'Mica (color)', 'Mica (CI 77019)', 'P', 'L', '', 2, 0, 'Use cosmetic-grade, lip-safe if for lips.'],
    ['bakingsoda', 'Baking soda', 'Sodium Bicarbonate', 'P', 'L', 'calm', 40, 0, 'Bath products only.'],
    ['citricacid', 'Citric acid', 'Citric Acid', 'P', 'L', '', 25, 0, 'Bath products only.'],
    ['epsom', 'Epsom salt', 'Magnesium Sulfate', 'S', 'L', 'calm', 100, 0, ''],
    ['deadsea', 'Dead Sea salt', 'Maris Sal', 'S', 'L', 'calm dry', 100, 0, ''],
    ['himalayan', 'Pink Himalayan salt', 'Sodium Chloride', 'S', 'L', '', 100, 0, ''],
    ['seasalt', 'Sea salt', 'Sea Salt', 'S', 'L', '', 100, 0, ''],
    ['sugar', 'Granulated sugar', 'Sucrose', 'S', 'L', '', 100, 0, ''],
    ['brownsugar', 'Brown sugar', 'Sucrose', 'S', 'L', 'sensitive', 100, 0, 'Softer, gentler scrub.'],
    ['lavender', 'Lavender essential oil', 'Lavandula Angustifolia (Lavender) Oil', 'E', 'L', 'calm', 2, 0, ''],
    ['teatree', 'Tea tree essential oil', 'Melaleuca Alternifolia (Tea Tree) Leaf Oil', 'E', 'L', 'oily', 1, 0, 'Oxidizes with age; use fresh oil.'],
    ['rosemary', 'Rosemary essential oil', 'Rosmarinus Officinalis (Rosemary) Leaf Oil', 'E', 'L', 'hair', 1, 0, 'Not for pregnancy, epilepsy or young children.'],
    ['peppermint', 'Peppermint essential oil', 'Mentha Piperita (Peppermint) Oil', 'E', 'L', 'hair', 1, 0, 'Not for young children; keep away from eyes. Lips 0.5% max.'],
    ['eucalyptus', 'Eucalyptus essential oil', 'Eucalyptus Globulus Leaf Oil', 'E', 'L', '', 1, 0, 'Not for young children.'],
    ['frankincense', 'Frankincense essential oil', 'Boswellia Carterii Oil', 'E', 'L', 'mature calm', 2, 0, ''],
    ['lemon', 'Lemon essential oil (cold-pressed)', 'Citrus Limon (Lemon) Peel Oil', 'E', 'L', '', 2, 0, 'Sun sensitivity in leave-on products above 2%.'],
    ['sweetorange', 'Sweet orange essential oil', 'Citrus Aurantium Dulcis (Orange) Peel Oil', 'E', 'L', '', 2, 0, ''],
    ['bergamot', 'Bergamot essential oil', 'Citrus Aurantium Bergamia (Bergamot) Fruit Oil', 'E', 'L', '', 0.4, 0, 'Sun sensitivity: 0.4% max leave-on unless it is bergapten-free (FCF).'],
    ['ylangylang', 'Ylang ylang essential oil', 'Cananga Odorata Flower Oil', 'E', 'L', 'calm', 0.8, 0, 'Can irritate sensitive skin above 0.8%.'],
    ['cedarwood', 'Cedarwood essential oil', 'Juniperus Virginiana Oil', 'E', 'L', 'hair calm', 2, 0, ''],
    ['geranium', 'Geranium essential oil', 'Pelargonium Graveolens Oil', 'E', 'L', 'glow', 1, 0, ''],
    ['clarysage', 'Clary sage essential oil', 'Salvia Sclarea (Clary) Oil', 'E', 'L', 'calm hair', 1, 0, 'Avoid in pregnancy.'],
    ['clove', 'Clove essential oil', 'Eugenia Caryophyllus (Clove) Bud Oil', 'E', 'L', '', 0, 0, 'Skin irritant: not for leave-on products.'],
    ['cinnamon', 'Cinnamon bark essential oil', 'Cinnamomum Zeylanicum Bark Oil', 'E', 'L', '', 0, 0, 'Strong sensitizer: do not use on skin.'],
    ['vite', 'Vitamin E (tocopherol)', 'Tocopherol', 'A', 'L', '', 1, 0, 'Antioxidant: slows rancidity. 0.5 to 1%.'],
    ['roe', 'Rosemary oleoresin (ROE)', 'Rosmarinus Officinalis (Rosemary) Leaf Extract', 'A', 'L', '', 0.2, 0, 'Antioxidant: 0.1 to 0.2%.'],
    ['optiphen', 'Optiphen', 'Phenoxyethanol, Caprylyl Glycol', 'R', 'L', '', 1.5, 0, 'Broad-spectrum preservative; works in scrubs and lotions. 0.75 to 1.5%.'],
    ['optiphenplus', 'Optiphen Plus', 'Phenoxyethanol, Caprylyl Glycol, Sorbic Acid', 'R', 'L', '', 1.5, 0, 'Water-based products only, pH under 6. 0.75 to 1.5%.'],
    ['germall', 'Liquid Germall Plus', 'Propylene Glycol, Diazolidinyl Urea, Iodopropynyl Butylcarbamate', 'R', 'L', '', 0.5, 0, 'Water-based products. 0.1 to 0.5%.'],
    ['ewax', 'Emulsifying wax NF', 'Cetearyl Alcohol, Polysorbate 60', 'X', 'L', '', 6, 0, 'Lotions: about 25% of the oil phase.'],
    ['btms', 'BTMS-50', 'Behentrimonium Methosulfate, Cetyl Alcohol, Butylene Glycol', 'X', 'L', 'hair', 6, 0, 'Emulsifier with a silky, conditioning feel.'],
    ['polysorbate80', 'Polysorbate 80', 'Polysorbate 80', 'X', 'L', '', 4, 0, 'Lets oils and fragrance mix into bath water.'],
    ['cetyl', 'Cetyl alcohol', 'Cetyl Alcohol', 'X', 'L', '', 3, 0, 'Thickener for lotions.'],
    ['stearic', 'Stearic acid', 'Stearic Acid', 'X', 'L', '', 3, 0, 'Thickener for lotions.'],
    ['glycerin', 'Vegetable glycerin', 'Glycerin', 'X', 'L', 'dry', 5, 0, 'Humectant; water-based products.'],
    ['panthenol', 'Panthenol (vitamin B5)', 'Panthenol', 'X', 'L', 'hair', 2, 0, 'Water-based products.'],
    ['allantoin', 'Allantoin', 'Allantoin', 'X', 'L', 'sensitive', 0.5, 0, 'Water-based products.'],
    ['water', 'Distilled water', 'Aqua', 'X', 'L', '', 100, 0, 'Anything with water needs a broad-spectrum preservative.'],
    ['lye', 'Sodium hydroxide (lye)', 'Sodium Hydroxide', 'X', 'L', '', 0, 0, 'Soap only. Goggles and gloves; lye into water, never water into lye.']
  ];
  var LIB = {}, LIBN = [];
  LIB_RAW.forEach(function (r) { LIB[r[0]] = { key: r[0], name: r[1], inci: r[2], cat: r[3], r: r[4], goals: r[5] ? r[5].split(' ') : [], max: r[6], sap: r[7], note: r[8] }; LIBN.push(r[0]); });
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function libFor(item) {
    if (item.lib && LIB[item.lib]) return LIB[item.lib];
    var n = norm(item.name), exact = null, inside = null, around = null;
    if (!n) return null;
    LIBN.forEach(function (k) { var ln = norm(LIB[k].name);
      if (n === ln) exact = LIB[k];
      else if (n.indexOf(ln) >= 0) { if (!inside || ln.length > norm(inside.name).length) inside = LIB[k]; }
      else if (n.length > 4 && ln.indexOf(n) >= 0) { if (!around || ln.length < norm(around.name).length) around = LIB[k]; } });
    return exact || inside || around;
  }

  /* ---------- Inventory ---------- */
  var UNITS = ['oz', 'g', 'lb', 'kg', 'fl oz', 'ml', 'count'];
  var G_PER = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ml: 0.92, 'fl oz': 27.2 }; /* liquids: oil density about 0.92 */
  var inv = S.get('inv', []);
  var recipes = S.get('recipes', []);
  var batches = S.get('batches', []);
  function save() { S.set('inv', inv); S.set('recipes', recipes); S.set('batches', batches); }
  function catOf(it) { return it.cat || (libFor(it) || {}).cat || 'X'; }
  function isLow(it) { return it.reorder !== '' && it.reorder != null && N(it.qty) <= N(it.reorder); }
  function gramsOnHand(it) { return G_PER[it.unit] ? N(it.qty) * G_PER[it.unit] : null; }
  function costPerGram(it) { return (N(it.cost) > 0 && G_PER[it.unit]) ? N(it.cost) / G_PER[it.unit] : 0; }
  function fmt(n, d) { return (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { return '$' + fmt(n, 2); }

  var filt = { cat: '', q: '' }, editing = null;
  function renderIng() {
    var low = inv.filter(isLow);
    var rows = inv.filter(function (it) { return (!filt.cat || catOf(it) === filt.cat) && (!filt.q || norm(it.name).indexOf(norm(filt.q)) >= 0); })
      .sort(function (a, b) { return catOf(a).localeCompare(catOf(b)) || a.name.localeCompare(b.name); });
    var cats = Object.keys(CAT);
    root.ing.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Production</span><h2>Ingredients &amp; packaging</h2></div><span class="source ' + (inv.length ? 'real' : 'example') + '">' + (inv.length ? 'Real data · your inventory' : 'Start your inventory below') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis">' +
        kpi(inv.length, 'items logged') + kpi(inv.filter(function (i) { return 'CBW'.indexOf(catOf(i)) >= 0; }).length, 'oils, butters, waxes') + kpi(inv.filter(function (i) { return 'EF'.indexOf(catOf(i)) >= 0; }).length, 'fragrance and essential oils') + kpi(low.length, 'at or below reorder') + kpi(inv.filter(function (i) { return catOf(i) === 'K'; }).length, 'packaging items') +
      '</div></div></div>' +
      '<div class="even one h-md"><div class="card">' +
        '<div class="toolbar"><select id="mi-cat"><option value="">All categories</option>' + cats.map(function (c) { return '<option value="' + c + '"' + (filt.cat === c ? ' selected' : '') + '>' + CAT[c] + '</option>'; }).join('') + '</select>' +
        '<input id="mi-q" placeholder="Search" value="' + E(filt.q) + '"><span style="flex:1"></span>' +
        '<button class="btn small-btn" id="mi-imp">Import CSV</button><button class="btn small-btn" id="mi-exp">Export CSV</button><button class="btn small-btn" id="mi-bak">Backup</button><button class="btn small-btn" id="mi-res">Restore</button></div>' +
        '<div class="fill"><table class="k-tbl"><thead><tr><th>Ingredient</th><th>Category</th><th class="num">On hand</th><th class="num">Reorder at</th><th class="num">Cost</th><th>Best by</th><th></th></tr></thead><tbody>' +
        (rows.map(function (it) {
          var l = libFor(it);
          return '<tr class="' + (isLow(it) ? 'low' : '') + '"><td><b style="font-weight:600">' + E(it.name) + '</b>' + (l ? '' : ' <span class="k-hint">(not in the knowledge list)</span>') + (it.notes ? '<br><span class="k-hint">' + E(it.notes) + '</span>' : '') + '</td>' +
            '<td>' + E(CAT[catOf(it)] || '') + '</td><td class="num">' + fmt(N(it.qty), 2) + ' ' + E(it.unit) + '</td><td class="num">' + (it.reorder !== '' && it.reorder != null ? fmt(N(it.reorder), 2) + ' ' + E(it.unit) : '') + '</td>' +
            '<td class="num">' + (N(it.cost) ? money(N(it.cost)) + '/' + E(it.unit) : '') + '</td><td>' + E(it.bestBy || '') + '</td>' +
            '<td class="num"><button class="btn small-btn" data-edit="' + it.id + '">Edit</button></td></tr>';
        }).join('') || '<tr><td colspan="7" class="k-hint">Nothing here yet. Add your first ingredient below, or import a CSV.</td></tr>') +
        '</tbody></table></div></div></div>' +
      '<div class="even h-md">' +
        '<div class="card"><h3 id="mi-ftitle">' + (editing ? 'Edit ingredient' : 'Add an ingredient') + '</h3><form class="k-form fill" id="mi-form" autocomplete="off">' +
          '<label class="wide">Name<input id="mi-name" list="mi-known" required placeholder="Start typing: shea, jojoba, Optiphen…"></label><datalist id="mi-known">' + LIBN.map(function (k) { return '<option value="' + E(LIB[k].name) + '">'; }).join('') + '</datalist>' +
          '<label>Category<select id="mi-c">' + cats.map(function (c) { return '<option value="' + c + '">' + CAT[c] + '</option>'; }).join('') + '</select></label>' +
          '<label>Amount on hand<input id="mi-qty" type="number" step="any" min="0"></label>' +
          '<label>Unit<select id="mi-unit">' + UNITS.map(function (u) { return '<option>' + u + '</option>'; }).join('') + '</select></label>' +
          '<label>Reorder at<input id="mi-re" type="number" step="any" min="0"></label>' +
          '<label>Cost per unit ($)<input id="mi-cost" type="number" step="any" min="0"></label>' +
          '<label>Best by<input id="mi-bb" type="date"></label>' +
          '<label>Supplier<input id="mi-sup"></label>' +
          '<label id="mi-maxwrap">Skin-safe max % (from supplier)<input id="mi-max" type="number" step="any" min="0" placeholder="Fragrance oils: IFRA body max"></label>' +
          '<label id="mi-sizewrap">Container size (oz)<input id="mi-size" type="number" step="any" min="0" placeholder="Packaging: 4, 8, 16"></label>' +
          '<label class="wide">Notes<input id="mi-notes" placeholder="Lot number, scent notes, vanilla content (turns brown)…"></label>' +
          '<p class="k-hint wide" id="mi-libnote"></p>' +
          '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editing ? 'Save changes' : 'Add to inventory') + '</button>' + (editing ? '<button class="btn" type="button" id="mi-cancel">Cancel</button><button class="btn" type="button" id="mi-del">Delete</button>' : '') + '</div>' +
        '</form></div>' +
        '<div class="card"><h3>Reorder list</h3><div class="fill">' +
          (low.length ? '<ul class="checks">' + low.map(function (it) { return '<li class="warn"><span><b style="font-weight:600">' + E(it.name) + '</b>: ' + fmt(N(it.qty), 2) + ' ' + E(it.unit) + ' left (reorder at ' + fmt(N(it.reorder), 2) + ')' + (it.supplier ? ' · ' + E(it.supplier) : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="k-hint">Nothing is low. Set a "Reorder at" amount on each item and it shows here when you reach it.</p>') +
          '<div class="note-box" style="margin-top:12px"><b>Logging tips</b><br>Weigh in ounces or grams so batches can deduct automatically. Liquids in ml or fl oz are converted at oil density (about 0.92 g per ml). For fragrance oils, enter the supplier’s IFRA max for body products in “Skin-safe max %”. The formula builder never goes above it.</div>' +
        '</div></div>' +
      '</div>';
    bindIng();
  }
  function kpi(n, l) { return '<div class="k-kpi"><b>' + n + '</b><span>' + l + '</span></div>'; }
  function bindIng() {
    var $ = function (id) { return document.getElementById(id); };
    $('mi-cat').onchange = function () { filt.cat = this.value; renderIng(); };
    $('mi-q').oninput = function () { filt.q = this.value; var p = this.selectionStart; renderIng(); var q = $('mi-q'); q.focus(); q.setSelectionRange(p, p); };
    $('mi-exp').onclick = function () { PK.download('madam-allure-ingredients-' + PK.today() + '.csv', PK.toCSV(inv.map(function (i) { return { name: i.name, category: CAT[catOf(i)], amount: i.qty, unit: i.unit, reorderAt: i.reorder, costPerUnit: i.cost, supplier: i.supplier, bestBy: i.bestBy, maxPct: i.max, sizeOz: i.size, notes: i.notes }; }), ['name', 'category', 'amount', 'unit', 'reorderAt', 'costPerUnit', 'supplier', 'bestBy', 'maxPct', 'sizeOz', 'notes']), 'text/csv'); };
    $('mi-imp').onclick = function () {
      PK.pickFile('.csv', function (txt) {
        var rows = PK.parseCSV(txt), added = 0, updated = 0, rev = {}; Object.keys(CAT).forEach(function (k) { rev[norm(CAT[k])] = k; });
        rows.forEach(function (r) { if (!r.name) return;
          var it = { name: r.name, cat: rev[norm(r.category)] || (libFor({ name: r.name }) || {}).cat || 'X', qty: r.amount, unit: UNITS.indexOf(r.unit) >= 0 ? r.unit : 'oz', reorder: r.reorderAt, cost: r.costPerUnit, supplier: r.supplier, bestBy: r.bestBy, max: r.maxPct, size: r.sizeOz, notes: r.notes };
          var ex = inv.filter(function (i) { return norm(i.name) === norm(r.name); })[0];
          if (ex) { Object.assign(ex, it); updated++; } else { it.id = PK.uid('i'); inv.push(it); added++; } });
        save(); renderIng(); PK.say(added + ' added, ' + updated + ' updated');
      });
    };
    $('mi-bak').onclick = function () { PK.backup('ma_lab_', 'madam-allure-lab'); };
    $('mi-res').onclick = function () { PK.restore('ma_lab_', function () { inv = S.get('inv', []); recipes = S.get('recipes', []); batches = S.get('batches', []); renderAll(); }); };
    root.ing.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editing = b.dataset.edit; renderIng(); fillForm(); $('mi-form').scrollIntoView({ block: 'center' }); }; });
    function showFields() { var c = $('mi-c').value; $('mi-maxwrap').style.display = 'EF'.indexOf(c) >= 0 ? '' : 'none'; $('mi-sizewrap').style.display = c === 'K' ? '' : 'none'; }
    $('mi-c').onchange = showFields;
    $('mi-name').oninput = function () { var l = libFor({ name: this.value }); if (l && !editing) { $('mi-c').value = l.cat; showFields(); } $('mi-libnote').textContent = l ? (l.inci + (l.note ? ' · ' + l.note : '') + (l.r === 'H' ? ' · Goes rancid quickly.' : '')) : ''; };
    function fillForm() { var it = inv.filter(function (i) { return i.id === editing; })[0]; if (!it) return;
      $('mi-name').value = it.name; $('mi-c').value = catOf(it); $('mi-qty').value = it.qty; $('mi-unit').value = it.unit; $('mi-re').value = it.reorder || ''; $('mi-cost').value = it.cost || ''; $('mi-bb').value = it.bestBy || ''; $('mi-sup').value = it.supplier || ''; $('mi-max').value = it.max || ''; $('mi-size').value = it.size || ''; $('mi-notes').value = it.notes || ''; showFields(); $('mi-name').oninput(); }
    showFields();
    if ($('mi-cancel')) $('mi-cancel').onclick = function () { editing = null; renderIng(); };
    if ($('mi-del')) $('mi-del').onclick = function () { if (!confirm('Delete this ingredient from your inventory?')) return; inv = inv.filter(function (i) { return i.id !== editing; }); editing = null; save(); renderAll(); };
    $('mi-form').onsubmit = function (e) { e.preventDefault();
      var it = { name: $('mi-name').value.trim(), cat: $('mi-c').value, qty: $('mi-qty').value || '0', unit: $('mi-unit').value, reorder: $('mi-re').value, cost: $('mi-cost').value, bestBy: $('mi-bb').value, supplier: $('mi-sup').value.trim(), max: $('mi-max').value, size: $('mi-size').value, notes: $('mi-notes').value.trim() };
      if (!it.name) return; var l = libFor(it); if (l) it.lib = l.key;
      if (editing) { Object.assign(inv.filter(function (i) { return i.id === editing; })[0], it); editing = null; PK.say('Saved'); }
      else { it.id = PK.uid('i'); inv.push(it); PK.say(it.name + ' added'); }
      save(); renderAll();
    };
  }

  /* ---------- Formula builder ---------- */
  var TYPES = {
    butter: { label: 'Whipped body butter', use: 'leave', fo: 2, eo: 2, slots: [
      { role: 'Butters', cats: 'B', pct: 65, n: [1, 2], req: 1 }, { role: 'Liquid oils', cats: 'C', pct: 30, n: [1, 3], req: 1 }, { role: 'Silky finish', keys: ['arrowroot', 'tapioca', 'cornstarch'], pct: 3, n: [0, 1] }],
      steps: ['Melt butters gently (under 75°C / 167°F). Add liquid oils.', 'Chill until just set at the edges (about 30 to 45 minutes).', 'Whip 5 to 8 minutes. Add the powder, then vitamin E and scent, and whip again until fluffy.', 'Fill jars with a spatula; let rest 24 hours before lidding tightly.'] },
    oil: { label: 'Dry body oil (absorbs fast, no greasy film)', use: 'leave', fo: 1.5, eo: 2, slots: [
      { role: 'Dry-feel base (sinks in, no oily film)', keys: ['fraccoconut', 'ipm', 'c1215', 'cococaprylate', 'squalane'], pct: 45, n: [1, 2], req: 1 },
      { role: 'Nourishing oils', cats: 'C', pct: 55, n: [1, 3], req: 1 }], herbs: 1,
      steps: ['Weigh the dry-feel base and the nourishing oils into a clean, dry beaker.', 'Add vitamin E and scent; stir well.', 'Bottle in amber or opaque spray or dropper bottles; cap tightly.', 'Test on skin: it should feel dry to the touch within a minute or two. If it feels oily, raise the dry-feel base and lower the heavier oils.'] },
    hair: { label: 'Hair & scalp oil', use: 'leave', fo: 1, eo: 2, autoEO: ['rosemary', 'peppermint', 'cedarwood', 'clarysage', 'lavender'], prefer: 'hair', slots: [{ role: 'Carrier oils', cats: 'C', pct: 100, n: [2, 4], req: 1 }], herbs: 1,
      steps: ['If using herbs, infuse them in the carrier oil first (low heat 2 to 3 hours, or 4 weeks cold), then strain well.', 'Weigh oils; add vitamin E and essential oils; stir.', 'Bottle in dropper bottles. Patch test note on the label.'] },
    sugar: { label: 'Sugar scrub', use: 'rinse', fo: 2.5, eo: 2, pres: 'recommended', slots: [
      { role: 'Sugar', keys: ['sugar', 'brownsugar'], pct: 58, n: [1, 1], req: 1 }, { role: 'Oils', cats: 'C', pct: 28, n: [1, 2], req: 1 }, { role: 'Butter', cats: 'B', pct: 8, n: [0, 1] }, { role: 'Rinse-clean emulsifier', keys: ['ewax', 'btms', 'polysorbate80'], pct: 4, n: [0, 1] }],
      steps: ['Melt butter and emulsifier (if using) with the oils; cool until warm.', 'Stir in vitamin E, preservative and scent.', 'Fold in the sugar until it feels like wet sand. Jar it and add a scoop so no water gets in.'] },
    salt: { label: 'Salt scrub', use: 'rinse', fo: 2.5, eo: 2, pres: 'recommended', slots: [
      { role: 'Salt', keys: ['deadsea', 'epsom', 'himalayan', 'seasalt'], pct: 60, n: [1, 2], req: 1 }, { role: 'Oils', cats: 'C', pct: 30, n: [1, 2], req: 1 }, { role: 'Butter', cats: 'B', pct: 5, n: [0, 1] }, { role: 'Rinse-clean emulsifier', keys: ['ewax', 'btms', 'polysorbate80'], pct: 3, n: [0, 1] }],
      steps: ['Melt butter and emulsifier (if using) with the oils; cool until warm.', 'Stir in vitamin E, preservative and scent.', 'Fold in the salt. Label: do not use on freshly shaved or broken skin.'] },
    bath: { label: 'Bath salts', use: 'rinse', fo: 2.5, eo: 2, slots: [
      { role: 'Salts', keys: ['epsom', 'deadsea', 'himalayan', 'seasalt'], pct: 92, n: [1, 3], req: 1 }, { role: 'Botanicals', keys: ['lavenderbuds', 'rosepetals', 'calendula', 'chamomile', 'hibiscus'], pct: 3, n: [0, 1] }, { role: 'Skin-softening oil', cats: 'C', pct: 2, n: [0, 1] }, { role: 'Disperses oil in water', keys: ['polysorbate80'], pct: 2, n: [0, 1] }],
      steps: ['Mix the salts. Stir the oil, scent and polysorbate 80 together, then work them into the salts.', 'Spread to dry 1 to 2 hours, then fold in botanicals.', 'Store airtight. Label: botanicals can clog drains; use a mesh bag.'] },
    balm: { label: 'Lip balm', use: 'lip', fo: 0, eo: 0.5, eoOnly: ['peppermint', 'sweetorange', 'lavender'], prefer: 'lips', slots: [
      { role: 'Wax', cats: 'W', pct: 28, n: [1, 1], req: 1 }, { role: 'Butters', cats: 'B', pct: 30, n: [1, 2], req: 1 }, { role: 'Oils', cats: 'C', pct: 42, n: [1, 2], req: 1 }],
      steps: ['Melt wax first, then butters, then oils over low heat.', 'Off heat, stir in vitamin E and lip-safe flavor or essential oil.', 'Pour into tubes while hot; let set fully before capping.'] },
    lotion: { label: 'Lotion (water-based)', use: 'leave', fo: 1, eo: 1, water: 1, slots: [
      { role: 'Water', keys: ['water'], pct: 68, n: [1, 1], req: 1 }, { role: 'Humectant', keys: ['glycerin'], pct: 3, n: [0, 1] }, { role: 'Oils and butters', cats: 'CB', pct: 18, n: [1, 3], req: 1 }, { role: 'Emulsifier', keys: ['ewax', 'btms'], pct: 5, n: [1, 1], req: 1 }, { role: 'Thickener', keys: ['cetyl', 'stearic'], pct: 2, n: [0, 1] }, { role: 'Skin conditioner', keys: ['panthenol', 'allantoin'], pct: 0.5, n: [0, 1] }],
      steps: ['Sanitize everything. Heat water phase and oil phase separately to 70°C (158°F) and hold 20 minutes.', 'Pour oil phase into water phase; blend with a stick blender 1 to 2 minutes, then stir while cooling.', 'Below 40°C (104°F) add preservative, vitamin E and scent. Check pH (aim 5 to 6).', 'Bottle in pumps. Hold a test batch 4 weeks and watch for separation, mold or smell changes before selling.'] },
    soap: { label: 'Cold process soap', use: 'rinse', fo: 3, eo: 3, soap: 1 }
  };

  var lastF = null, seed = 0;
  function avail(it) { return N(it.qty) > 0; }
  function score(it, goal, prefer, salt) {
    var l = libFor(it) || { goals: [], r: 'M' }, s = 0;
    if (goal && l.goals.indexOf(goal) >= 0) s += 3; if (prefer && l.goals.indexOf(prefer) >= 0) s += 2;
    s += l.r === 'L' ? 1 : l.r === 'H' ? -1 : 0;
    if (seed) s += ((Math.sin((salt + seed) * 9301 + norm(it.name).length * 49297) + 1) / 2) * 3;
    return s;
  }
  function pick(slot, goal, prefer, used, typeKey) {
    var cands = inv.filter(function (it) {
      if (!avail(it) || used[it.id]) return false;
      var l = libFor(it), c = catOf(it);
      if (slot.keys) return l && slot.keys.indexOf(l.key) >= 0;
      if (slot.cats.indexOf(c) < 0) return false;
      if (l && ['ipm', 'c1215', 'cococaprylate'].indexOf(l.key) >= 0) return false; /* dry-feel esters only where a formula asks for them */
      if (l && l.max === 0 && (c === 'B' || c === 'C')) return false; /* soap-only fats */
      return true;
    });
    cands.sort(function (a, b) { return score(b, goal, prefer, 1) - score(a, goal, prefer, 1); });
    return cands.slice(0, slot.n[1]);
  }
  var SPLIT = { 1: [1], 2: [.6, .4], 3: [.5, .3, .2], 4: [.4, .3, .2, .1] };
  function build(o) {
    var T = TYPES[o.type], out = { type: o.type, label: T.label, lines: [], checks: [], stops: [], warns: [], notes: [], goal: o.goal };
    if (T.soap) return buildSoap(o, out);
    var used = {}, base = [];
    T.slots.forEach(function (sl, si) {
      var got = pick(sl, o.goal, T.prefer, used, o.type);
      if (got.length < (sl.req ? Math.max(1, sl.n[0]) : sl.n[0]) && sl.req) { out.stops.push('Needs ' + sl.role.toLowerCase() + ': add ' + (sl.keys ? sl.keys.map(function (k) { return LIB[k].name; }).join(' or ') : (sl.cats.split('').map(function (c) { return CAT[c].toLowerCase(); }).join(' or '))) + ' to your inventory (with an amount on hand).'); return; }
      var sp = SPLIT[got.length] || [];
      got.forEach(function (it, i) { used[it.id] = 1; base.push({ it: it, role: sl.role, pct: sl.pct * sp[i], slot: si }); });
    });
    /* Caps (e.g. rosehip 10%, castor 30%): move the excess to the slot's first uncapped ingredient */
    base.forEach(function (ln) { var l = libFor(ln.it); if (l && l.max && l.max < 100 && ln.pct > l.max) { var extra = ln.pct - l.max; ln.pct = l.max; var to = base.filter(function (b) { return b.slot === ln.slot && b !== ln; })[0]; if (to) to.pct += extra; } });
    /* Additives */
    var add = [], hasFat = base.some(function (b) { return 'CBW'.indexOf(catOf(b.it)) >= 0; });
    if (hasFat) {
      var ao = inv.filter(function (it) { var l = libFor(it); return avail(it) && l && (l.key === 'vite' || l.key === 'roe'); }).sort(function (a) { return libFor(a).key === 'vite' ? -1 : 1; })[0];
      if (ao) { add.push({ it: ao, role: 'Antioxidant', pct: libFor(ao).key === 'vite' ? 0.5 : 0.15 }); out.checks.push('Antioxidant added (' + ao.name + ') because oils and butters can go rancid.'); }
      else out.stops.push('Add vitamin E (or rosemary oleoresin) to your inventory. Anything with oils or butters needs an antioxidant so it does not go rancid.');
    }
    if (T.water || T.pres) {
      var presKeys = T.water ? ['optiphen', 'optiphenplus', 'germall'] : ['optiphen'];
      var pr = inv.filter(function (it) { var l = libFor(it); return avail(it) && l && presKeys.indexOf(l.key) >= 0; })[0];
      if (pr) { var pl = libFor(pr); add.push({ it: pr, role: 'Preservative', pct: pl.key === 'germall' ? 0.5 : 1 }); out.checks.push(pr.name + ' added as a broad-spectrum preservative' + (T.water ? ' (required: this product contains water).' : ' (water gets into scrub jars in the shower).')); }
      else if (T.water) out.stops.push('A water-based product must have a broad-spectrum preservative. Add Optiphen, Optiphen Plus or Liquid Germall Plus to your inventory.');
      else out.warns.push('Recommended: Optiphen at 1%, because shower water gets into scrub jars. Without it, sell with a scoop and a 3-month use-by.');
    }
    /* Scent */
    var sc = o.scent ? inv.filter(function (i) { return i.id === o.scent; })[0] : null;
    if (!sc && T.autoEO) { sc = inv.filter(function (it) { var l = libFor(it); return avail(it) && l && T.autoEO.indexOf(l.key) >= 0; })[0] || null; if (sc) out.checks.push(sc.name + ' chosen for the hair and scalp blend.'); }
    if (sc) {
      var c = catOf(sc), l = libFor(sc), pct;
      if (c === 'F') {
        if (!T.fo) { out.warns.push('Fragrance oils are left out of lip products unless the supplier marks them lip-safe (flavor oil).'); }
        else { pct = T.fo; if (N(sc.max) > 0) pct = Math.min(pct, N(sc.max)); else out.warns.push('Enter the supplier’s IFRA max for ' + sc.name + ' in your inventory. Using a cautious ' + pct + '% until then.'); add.push({ it: sc, role: 'Fragrance', pct: pct }); out.checks.push('Fragrance at ' + pct + '%' + (N(sc.max) ? ', within the supplier’s ' + N(sc.max) + '% limit.' : '.')); }
      } else if (c === 'E') {
        var lim = l ? l.max : 1;
        if (T.eoOnly && (!l || T.eoOnly.indexOf(l.key) < 0)) out.warns.push(sc.name + ' is not on the lip-safe list; left out.');
        else if (lim === 0 && T.use !== 'rinse') out.stops.push(sc.name + ': ' + (l.note || 'not for leave-on skin products.'));
        else { pct = Math.min(T.eo, lim || T.eo); if (l && l.key === 'peppermint' && T.use === 'lip') pct = Math.min(pct, 0.5); add.push({ it: sc, role: 'Essential oil', pct: pct }); out.checks.push(sc.name + ' at ' + pct + '%, within its safe limit.'); if (l && l.note) out.notes.push(sc.name + ': ' + l.note); }
      }
    }
    if (out.stops.length) return out;
    var addPct = add.reduce(function (s, a) { return s + a.pct; }, 0), basePct = base.reduce(function (s, b) { return s + b.pct; }, 0);
    base.forEach(function (b) { b.pct = b.pct * (100 - addPct) / basePct; });
    out.lines = base.concat(add).map(function (b) { var l = libFor(b.it); return { id: b.it.id, name: b.it.name, inci: catOf(b.it) === 'F' ? 'Fragrance (Parfum)' : (l ? l.inci : b.it.name), role: b.role, pct: b.pct }; });
    /* Herb infusion suggestion for oils */
    if (T.herbs) { var hb = inv.filter(function (it) { return avail(it) && catOf(it) === 'H'; }).sort(function (a, b) { return score(b, o.goal, T.prefer, 2) - score(a, o.goal, T.prefer, 2); })[0]; if (hb) out.notes.push('Optional: infuse ' + hb.name + ' into the carrier oil first for extra benefit (about 1 part dried herb to 10 parts oil, strained well).'); }
    base.forEach(function (b) { var l = libFor(b.it); if (l && l.note) out.notes.push(b.it.name + ': ' + l.note); if (b.it.bestBy && b.it.bestBy < PK.today()) out.warns.push(b.it.name + ' is past its best-by date (' + b.it.bestBy + ').'); });
    var worst = base.reduce(function (w, b) { var r = (libFor(b.it) || {}).r || 'M'; return r === 'H' ? 'H' : (r === 'M' && w !== 'H' ? 'M' : w); }, 'L');
    out.shelf = T.water ? '3 to 6 months, after a 4-week test batch' : worst === 'H' ? 'about 6 months' : worst === 'M' ? 'about 9 months' : 'about 12 months';
    out.steps = T.steps; out.checks.unshift('Uses only ingredients you have on hand.');
    if (T.use === 'leave') out.checks.push('Leave-on scent limits applied (fragrance ' + T.fo + '% max, essential oils ' + T.eo + '% max).');
    return out;
  }
  function buildSoap(o, out) {
    var soft = ['olive', 'ricebran', 'sweetalmond', 'avocado', 'sunflower', 'apricot', 'safflower', 'hemp', 'grapeseed'], hardC = ['coconut', 'babassu'], hardB = ['shea', 'cocoa', 'mango', 'kokum', 'lard', 'tallow'];
    function first(keys, n, goal) { return inv.filter(function (it) { var l = libFor(it); return avail(it) && l && keys.indexOf(l.key) >= 0 && l.sap > 0; }).sort(function (a, b) { return score(b, goal, '', 3) - score(a, goal, '', 3); }).slice(0, n || 1); }
    var c = first(hardC), b = first(hardB, 2, o.goal), s = first(soft, 2, o.goal), ca = first(['castor']);
    var lye = inv.filter(function (it) { var l = libFor(it); return l && l.key === 'lye'; })[0];
    if (!s.length) out.stops.push('Soap needs a soft oil such as olive, rice bran or sweet almond in your inventory.');
    if (!c.length && !b.length) out.stops.push('Soap needs a hard oil or butter (coconut, babassu, shea, cocoa, mango) for a firm bar.');
    if (!lye) out.stops.push('Add sodium hydroxide (lye) to your inventory.');
    if (out.stops.length) return out;
    var parts = [];
    if (c.length) parts.push({ it: c[0], role: 'Cleansing and lather', pct: 25 });
    var bp = c.length ? 30 : 45; b.forEach(function (it, i) { parts.push({ it: it, role: 'Hardness', pct: bp * (b.length === 2 ? [.6, .4][i] : 1) }); });
    var cp = ca.length ? 5 : 0; if (ca.length) parts.push({ it: ca[0], role: 'Creamy lather', pct: 5 });
    var sp = 100 - parts.reduce(function (t, p) { return t + p.pct; }, 0); s.forEach(function (it, i) { parts.push({ it: it, role: 'Conditioning', pct: sp * (s.length === 2 ? [.7, .3][i] : 1) }); });
    out.soap = { sf: 5, ratio: 2 }; out.lines = parts.map(function (p) { var l = libFor(p.it); return { id: p.it.id, name: p.it.name, inci: l.inci, role: p.role, pct: p.pct, sap: l.sap }; });
    out.lyeId = lye.id;
    var sc = o.scent ? inv.filter(function (i) { return i.id === o.scent; })[0] : null;
    if (sc) { var lim = catOf(sc) === 'F' ? (N(sc.max) || 3) : ((libFor(sc) || {}).max || 1); out.scent = { id: sc.id, name: sc.name, pct: Math.min(3, Math.max(lim, 1)) }; out.notes.push('Fragrance at ' + out.scent.pct + '% of oil weight. Check the supplier’s soap usage rate and whether it accelerates trace or discolors.'); }
    out.checks.push('5% superfat (extra oil left free for a gentler bar).', 'Water is 2 times the lye weight (33% lye solution).', 'Coconut kept at 25% so the bar is not drying.');
    out.warns.push('Check these lye and water amounts in a lye calculator (such as SoapCalc) before you make the batch. Never skip this step.');
    out.steps = ['Goggles, gloves and long sleeves on; ventilate. Keep pets and children away.', 'Add the lye to the water (never water to lye). Stir until clear; cool to about 38 to 43°C (100 to 110°F).', 'Melt hard oils and butters, add soft oils, and cool to the same temperature.', 'Pour lye solution into the oils; stick-blend to light trace. Add fragrance, then pour into the mold.', 'Unmold after 24 to 48 hours; cut and cure 4 to 6 weeks on a rack before selling.'];
    out.shelf = 'about 12 months after cure';
    return out;
  }
  function batchGrams(o, T) {
    if (T && T.soap) return N(o.size) * 28.3495;
    var pk = o.pack ? inv.filter(function (i) { return i.id === o.pack; })[0] : null;
    if (pk && N(pk.size) > 0 && N(o.count) > 0) return N(pk.size) * N(o.count) * 28.3495 * 1.05;
    return N(o.size) * 28.3495;
  }
  function amountTable(f, grams, o) {
    var invById = {}; inv.forEach(function (i) { invById[i.id] = i; });
    var rows = [], cost = 0;
    if (f.soap) {
      var lyeG = f.lines.reduce(function (t, l) { return t + grams * l.pct / 100 * l.sap; }, 0) * (1 - f.soap.sf / 100);
      var lines = f.lines.map(function (l) { return { id: l.id, name: l.name, role: l.role, pct: l.pct, g: grams * l.pct / 100 }; });
      lines.push({ id: f.lyeId, name: 'Sodium hydroxide (lye)', role: 'Saponifies the oils', pct: null, g: lyeG });
      lines.push({ id: null, name: 'Distilled water', role: 'Dissolves the lye', pct: null, g: lyeG * f.soap.ratio });
      if (f.scent) lines.push({ id: f.scent.id, name: f.scent.name, role: 'Fragrance (of oil weight)', pct: f.scent.pct, g: grams * f.scent.pct / 100 });
      rows = lines;
    } else rows = f.lines.map(function (l) { return { id: l.id, name: l.name, role: l.role, pct: l.pct, g: grams * l.pct / 100 }; });
    rows.forEach(function (r) { var it = invById[r.id]; r.short = false; if (it) { var have = gramsOnHand(it); if (have != null && have < r.g) r.short = true; cost += costPerGram(it) * r.g; } });
    return { rows: rows, cost: cost };
  }
  function opt(list, sel, empty) { return (empty ? '<option value="">' + empty + '</option>' : '') + list.map(function (i) { return '<option value="' + i.id + '"' + (sel === i.id ? ' selected' : '') + '>' + E(i.name) + '</option>'; }).join(''); }

  var fo = S.get('fo', { type: 'butter', goal: 'dry', scent: '', pack: '', count: 6, size: 16 });
  function renderForm() {
    var scents = inv.filter(function (i) { return 'EF'.indexOf(catOf(i)) >= 0 && avail(i); }), packs = inv.filter(function (i) { return catOf(i) === 'K' && N(i.size) > 0; });
    var T = TYPES[fo.type];
    var f = lastF && lastF.type === fo.type ? lastF : null;
    var g = batchGrams(fo, T), at = f && !f.stops.length ? amountTable(f, g, fo) : null;
    var units = T.soap ? 0 : (fo.pack && N(fo.count)) ? N(fo.count) : 0;
    root.form.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Production</span><h2>Formula builder</h2></div><span class="source example">Starting point · test before selling</span></div>' +
      '<div class="even h-md">' +
        '<div class="card"><h3>What are you making?</h3><form class="k-form fill" id="mf-form">' +
          '<label class="wide">Product<select id="mf-type">' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (fo.type === k ? ' selected' : '') + '>' + TYPES[k].label + '</option>'; }).join('') + '</select></label>' +
          (T.soap ? '' : '<label class="wide">Main benefit<select id="mf-goal">' + Object.keys(GOALS).map(function (k) { return '<option value="' + k + '"' + (fo.goal === k ? ' selected' : '') + '>' + GOALS[k] + '</option>'; }).join('') + '</select></label>') +
          '<label class="wide">Scent<select id="mf-scent">' + opt(scents, fo.scent, T.autoEO ? 'Choose for me from my essential oils' : 'Unscented') + '</select></label>' +
          (T.soap ? '<label class="wide">Total oil weight (oz)<input id="mf-size" type="number" min="1" step="any" value="' + E(fo.size) + '"></label>' :
            '<label>Container<select id="mf-pack">' + opt(packs, fo.pack, 'No container: use batch size') + '</select></label>' +
            (fo.pack ? '<label>How many<input id="mf-count" type="number" min="1" step="1" value="' + E(fo.count) + '"></label>' : '<label>Batch size (oz)<input id="mf-size" type="number" min="1" step="any" value="' + E(fo.size) + '"></label>')) +
          '<div class="btnrow wide"><button class="btn primary" type="submit">Build formula</button><button class="btn" type="button" id="mf-shuffle"' + (f ? '' : ' disabled') + '>Try another combination</button></div>' +
          '<p class="k-hint wide">Uses only what is in your inventory with an amount on hand. ' + (packs.length ? '' : 'Add jars and bottles under Packaging with a container size to fill by count.') + '</p>' +
        '</form></div>' +
        '<div class="card"><h3>Safety checks</h3><div class="fill">' +
          (f ? '<ul class="checks">' + f.stops.map(function (s) { return '<li class="stop">' + E(s) + '</li>'; }).join('') + f.warns.map(function (s) { return '<li class="warn">' + E(s) + '</li>'; }).join('') + f.checks.map(function (s) { return '<li>' + E(s) + '</li>'; }).join('') + '</ul>' +
            (f.stops.length ? '' : '<div class="note-box" style="margin-top:12px">Estimated shelf life: <b>' + E(f.shelf) + '</b>. This formula saves as a <b>Draft</b>. Make a small test batch, check texture, scent and stability for 2 to 4 weeks, then mark it Vetted.</div>')
            : '<p class="k-hint">Choose a product and press Build formula. Every formula gets an antioxidant when it has oils, a preservative when water is involved, and scent kept within safe limits.</p>' + (inv.length ? '' : '<div class="note-box warn" style="margin-top:12px">Your inventory is empty. Log a few oils, butters, vitamin E and a fragrance on the Ingredients page first.</div>')) +
        '</div></div>' +
      '</div>' +
      (at ? '<div class="even one h-sm"><div class="card"><div class="toolbar"><h3 style="margin:0">' + E(f.label) + (f.goal && !f.soap ? ' · ' + E(GOALS[f.goal]) : '') + '</h3><span style="flex:1"></span><span class="k-hint">' + fmt(g, 0) + ' g (' + fmt(g / 28.3495, 1) + ' oz)' + (units ? ' for ' + units + ' containers, plus 5% for loss' : '') + '</span>' +
          '<button class="btn small-btn primary" id="mf-save">Save as draft recipe</button></div>' +
          '<div class="fill"><table class="k-tbl"><thead><tr><th>Ingredient</th><th>Role</th><th class="num">%</th><th class="num">Grams</th><th class="num">Ounces</th><th>On hand</th></tr></thead><tbody>' +
          at.rows.map(function (r) { return '<tr class="' + (r.short ? 'low' : '') + '"><td><b style="font-weight:600">' + E(r.name) + '</b></td><td>' + E(r.role) + '</td><td class="num">' + (r.pct == null ? '' : fmt(r.pct, 2)) + '</td><td class="num">' + fmt(r.g, 1) + '</td><td class="num">' + fmt(r.g / 28.3495, 2) + '</td><td>' + (r.id ? (r.short ? 'Not enough' : 'Enough') : '') + '</td></tr>'; }).join('') +
          '</tbody></table></div>' +
          '<p class="k-hint">' + (at.cost ? 'Ingredient cost: ' + money(at.cost) + (units ? ' · ' + money(at.cost / units) + ' per container (before packaging)' : '') : 'Add cost per unit to your ingredients to see batch cost.') + '</p></div></div>' +
        '<div class="even h-sm"><div class="card"><h3>How to make it</h3><div class="fill"><ol class="steps">' + f.steps.map(function (s) { return '<li>' + E(s) + '</li>'; }).join('') + '</ol>' +
          (f.notes.length ? '<div class="note-box" style="margin-top:12px">' + f.notes.map(E).join('<br>') + '</div>' : '') + '</div></div>' +
        '<div class="card"><h3>Label ingredient list</h3><div class="fill"><p style="line-height:1.6">' + (f.soap ? E(f.lines.map(function (l) { return l.name; }).concat(['Sodium Hydroxide', 'Aqua']).concat(f.scent ? ['Fragrance (Parfum)'] : []).join(', ')) + '</p><p class="k-hint">Soap labels can list oils before saponification, or saponified names (for example, Sodium Olivate).</p>' :
          E(f.lines.slice().sort(function (a, b) { return b.pct - a.pct; }).map(function (l) { return l.inci; }).join(', ')) + '</p><p class="k-hint">Listed from most to least. Add allergens your fragrance supplier lists, and “Patch test before use.”</p>') + '</div></div></div>'
      : '');
    bindForm();
  }
  function bindForm() {
    var $ = function (id) { return document.getElementById(id); };
    function read() { fo.type = $('mf-type').value; if ($('mf-goal')) fo.goal = $('mf-goal').value; fo.scent = $('mf-scent').value; if ($('mf-pack')) fo.pack = $('mf-pack').value; if ($('mf-count')) fo.count = $('mf-count').value; if ($('mf-size')) fo.size = $('mf-size').value; S.set('fo', fo); }
    $('mf-type').onchange = function () { read(); fo.scent = ''; if (TYPES[fo.type].prefer) fo.goal = TYPES[fo.type].prefer; S.set('fo', fo); lastF = null; renderForm(); };
    if ($('mf-pack')) $('mf-pack').onchange = function () { read(); renderForm(); };
    $('mf-form').onsubmit = function (e) { e.preventDefault(); read(); seed = 0; lastF = build(fo); renderForm(); };
    $('mf-shuffle').onclick = function () { read(); seed = (seed || 0) + 1 + Math.floor(Math.random() * 7); lastF = build(fo); renderForm(); };
    if ($('mf-save')) $('mf-save').onclick = function () {
      var nm = prompt('Name this recipe', lastF.label + (lastF.goal && !lastF.soap ? ' · ' + GOALS[lastF.goal] : '')); if (!nm) return;
      recipes.unshift({ id: PK.uid('r'), name: nm, type: fo.type, status: 'Draft', lines: lastF.lines, soap: lastF.soap || null, lyeId: lastF.lyeId || null, scent: lastF.scent || null, steps: lastF.steps, shelf: lastF.shelf, created: PK.today(), notes: '' });
      save(); selRec = recipes[0].id; renderRec(); PK.say('Saved to Recipes as a draft');
    };
  }

  /* ---------- Recipes and batches ---------- */
  var selRec = null, recSize = S.get('recSize', { size: 16, pack: '', count: 6 });
  function renderRec() {
    var r = recipes.filter(function (x) { return x.id === selRec; })[0] || recipes[0]; if (r) selRec = r.id;
    var packs = inv.filter(function (i) { return catOf(i) === 'K' && N(i.size) > 0; });
    var T = r ? TYPES[r.type] || {} : {}, g = r ? batchGrams(recSize, T) : 0, at = r ? amountTable(r, g, recSize) : null;
    var stCls = { 'Draft': 'st-draft', 'Test batch': 'st-test', 'Vetted': 'st-vetted' };
    root.rec.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Production</span><h2>Recipes &amp; batches</h2></div><span class="source ' + (recipes.length ? 'real' : 'example') + '">' + (recipes.length ? 'Real data · your recipes' : 'No recipes yet') + '</span></div>' +
      '<div class="even h-lg">' +
        '<div class="card"><h3>Your recipes</h3><div class="fill">' +
          (recipes.length ? '<table class="k-tbl"><thead><tr><th>Recipe</th><th>Status</th></tr></thead><tbody>' + recipes.map(function (x) { return '<tr style="cursor:pointer' + (x.id === selRec ? ';background:var(--surface-2)' : '') + '" data-rec="' + x.id + '"><td><b style="font-weight:600">' + E(x.name) + '</b><br><span class="k-hint">' + E((TYPES[x.type] || {}).label || x.type) + ' · ' + E(x.created) + '</span></td><td><span class="st-pill ' + (stCls[x.status] || 'st-draft') + '">' + E(x.status) + '</span></td></tr>'; }).join('') + '</tbody></table>' : '<p class="k-hint">Save a formula from the Formula builder, or add one of your proven recipes below.</p>') +
          '<div class="btnrow" style="margin-top:12px"><button class="btn small-btn" id="mr-imp">Import recipes (CSV from Muse or a spreadsheet)</button><button class="btn small-btn" id="mr-tpl">Get the CSV template</button></div>' +
          '<details style="margin-top:10px"><summary class="btn small-btn" style="display:inline-block">+ Add a proven recipe</summary><form class="k-form" id="mr-add" style="margin-top:10px">' +
            '<label class="wide">Name<input id="mr-name" required></label><label class="wide">Product type<select id="mr-type">' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '">' + TYPES[k].label + '</option>'; }).join('') + '</select></label>' +
            '<label class="wide">Ingredients, one per line: name, percent<textarea id="mr-lines" placeholder="Shea butter, 60&#10;Sweet almond oil, 34&#10;Arrowroot powder, 3&#10;Vitamin E, 1&#10;Your fragrance, 2"></textarea></label>' +
            '<div class="btnrow wide"><button class="btn primary" type="submit">Save as Vetted</button></div></form></details>' +
        '</div></div>' +
        '<div class="card">' + (r ?
          '<div class="toolbar"><h3 style="margin:0">' + E(r.name) + '</h3><span style="flex:1"></span><select id="mr-status" style="min-width:120px">' + ['Draft', 'Test batch', 'Vetted'].map(function (s) { return '<option' + (r.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><button class="btn small-btn" id="mr-del">Delete</button></div>' +
          '<div class="toolbar">' + (T.soap ? '<label class="k-hint">Oil weight (oz) <input class="k-in" id="mr-size" type="number" min="1" step="any" value="' + E(recSize.size) + '" style="width:90px"></label>' :
            '<select id="mr-pack">' + opt(packs, recSize.pack, 'Batch size in oz') + '</select>' + (recSize.pack ? '<input class="k-in" id="mr-count" type="number" min="1" value="' + E(recSize.count) + '" style="width:80px"> <span class="k-hint">containers</span>' : '<input class="k-in" id="mr-size" type="number" min="1" step="any" value="' + E(recSize.size) + '" style="width:90px"> <span class="k-hint">oz</span>')) + '</div>' +
          '<div class="fill"><table class="k-tbl"><thead><tr><th>Ingredient</th><th class="num">%</th><th class="num">Grams</th><th class="num">Oz</th><th></th></tr></thead><tbody>' +
            at.rows.map(function (x) { return '<tr class="' + (x.short ? 'low' : '') + '"><td>' + E(x.name) + '</td><td class="num">' + (x.pct == null ? '' : fmt(x.pct, 2)) + '</td><td class="num">' + fmt(x.g, 1) + '</td><td class="num">' + fmt(x.g / 28.3495, 2) + '</td><td>' + (x.short ? 'Short' : (x.id ? '' : '<span class="k-hint">not tracked</span>')) + '</td></tr>'; }).join('') +
          '</tbody></table>' + (r.shelf ? '<p class="k-hint">Shelf life: ' + E(r.shelf) + '.' + (at.cost ? ' Ingredient cost ' + money(at.cost) + '.' : '') + '</p>' : '') + '</div>' +
          '<div class="btnrow"><button class="btn primary" id="mr-make"' + (at.rows.some(function (x) { return x.short; }) ? ' disabled title="Not enough of an ingredient"' : '') + '>Make this batch</button><span class="k-hint" style="align-self:center">Deducts ingredients' + (recSize.pack ? ' and containers' : '') + ' from inventory and logs a batch code.</span></div>'
          : '<p class="k-hint">Select a recipe to scale it and make a batch.</p>') + '</div>' +
      '</div>' +
      '<div class="even one h-sm"><div class="card"><h3>Batch log</h3><div class="fill"><table class="k-tbl"><thead><tr><th>Batch code</th><th>Recipe</th><th>Made</th><th class="num">Size</th><th>Use by</th></tr></thead><tbody>' +
        (batches.map(function (b) { return '<tr><td class="mono">' + E(b.code) + '</td><td>' + E(b.recipe) + '</td><td>' + E(b.date) + '</td><td class="num">' + fmt(b.grams / 28.3495, 1) + ' oz' + (b.units ? ' · ' + b.units + ' units' : '') + '</td><td>' + E(b.useBy || '') + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="k-hint">Batches you make show here with a code for your labels.</td></tr>') +
      '</tbody></table></div></div></div>';
    bindRec(r, at, g);
  }
  function addMonths(d, m) { var x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); }
  function bindRec(r, at, g) {
    var $ = function (id) { return document.getElementById(id); };
    root.rec.querySelectorAll('[data-rec]').forEach(function (tr) { tr.onclick = function () { selRec = tr.dataset.rec; renderRec(); }; });
    $('mr-add').onsubmit = function (e) { e.preventDefault();
      var lines = $('mr-lines').value.split(/\n/).map(function (s) { var m = s.match(/^(.*?)[,\t]\s*([\d.]+)\s*%?\s*$/); return m ? { name: m[1].trim(), pct: N(m[2]) } : null; }).filter(Boolean);
      if (!lines.length) { alert('Add at least one line like: Shea butter, 60'); return; }
      var tot = lines.reduce(function (t, l) { return t + l.pct; }, 0); if (Math.abs(tot - 100) > 0.5 && !confirm('These add up to ' + fmt(tot, 1) + '%, not 100%. Save anyway?')) return;
      lines.forEach(function (l) { var it = inv.filter(function (i) { return norm(i.name) === norm(l.name); })[0] || inv.filter(function (i) { var a = libFor(i), b = libFor({ name: l.name }); return a && b && a.key === b.key; })[0]; l.id = it ? it.id : null; l.role = ''; var lb = libFor({ name: l.name }); l.inci = lb ? lb.inci : l.name; });
      recipes.unshift({ id: PK.uid('r'), name: $('mr-name').value.trim(), type: $('mr-type').value, status: 'Vetted', lines: lines, created: PK.today(), steps: [], shelf: '' });
      selRec = recipes[0].id; save(); renderRec(); PK.say('Recipe saved');
    };
    $('mr-tpl').onclick = function () { PK.download('madam-allure-recipes-template.csv', 'recipe,type,status,ingredient,percent,notes\r\nWhipped Shea Butter (house),butter,Vetted,Shea butter,60,\r\nWhipped Shea Butter (house),butter,Vetted,Sweet almond oil,34,\r\nWhipped Shea Butter (house),butter,Vetted,Arrowroot powder,3,\r\nWhipped Shea Butter (house),butter,Vetted,Vitamin E,1,\r\nWhipped Shea Butter (house),butter,Vetted,Fragrance oil,2,Pink Sugar\r\n', 'text/csv'); };
    $('mr-imp').onclick = function () { PK.pickFile('.csv', function (t) {
      var rows = PK.parseCSV(t), groups = {}, order = [];
      function typeOf(x) { x = norm(x); var k = Object.keys(TYPES).filter(function (k) { return norm(k) === x || norm(TYPES[k].label).indexOf(x) >= 0; })[0];
        if (k) return k; if (/soap/.test(x)) return 'soap'; if (/scrub/.test(x)) return /salt/.test(x) ? 'salt' : 'sugar'; if (/butter/.test(x)) return 'butter'; if (/oil/.test(x)) return /hair|beard/.test(x) ? 'hair' : 'oil'; if (/balm|lip/.test(x)) return 'balm'; if (/salt|bath/.test(x)) return 'bath'; if (/lotion|cream/.test(x)) return 'lotion'; return x || 'other'; }
      rows.forEach(function (r) { var nm = (r.recipe || r.Recipe || r.name || '').trim(); var ing = (r.ingredient || r.Ingredient || '').trim(); if (!nm || !ing) return;
        if (!groups[nm]) { groups[nm] = { id: PK.uid('r'), name: nm, type: typeOf(r.type || r.Type || r.product || ''), status: /draft/i.test(r.status) ? 'Draft' : /test/i.test(r.status) ? 'Test batch' : 'Vetted', lines: [], created: PK.today(), steps: [], shelf: '', notes: '' }; order.push(nm); }
        var it = inv.filter(function (i) { return norm(i.name) === norm(ing); })[0] || inv.filter(function (i) { var a = libFor(i), b = libFor({ name: ing }); return a && b && a.key === b.key; })[0];
        var lb = libFor({ name: ing }); groups[nm].lines.push({ name: ing, pct: N(r.percent || r.Percent || r['%']), id: it ? it.id : null, role: r.notes || '', inci: lb ? lb.inci : ing }); });
      order.forEach(function (nm) { recipes = recipes.filter(function (x) { return x.name !== nm; }); recipes.unshift(groups[nm]); });
      save(); renderRec(); PK.say(order.length + ' recipe' + (order.length === 1 ? '' : 's') + ' imported');
    }); };    if (!r) return;
    $('mr-status').onchange = function () { r.status = this.value; save(); renderRec(); };
    $('mr-del').onclick = function () { if (confirm('Delete the recipe “' + r.name + '”?')) { recipes = recipes.filter(function (x) { return x !== r; }); selRec = null; save(); renderRec(); } };
    function rd() { if ($('mr-pack')) recSize.pack = $('mr-pack').value; if ($('mr-count')) recSize.count = $('mr-count').value; if ($('mr-size')) recSize.size = $('mr-size').value; S.set('recSize', recSize); renderRec(); }
    ['mr-pack', 'mr-count', 'mr-size'].forEach(function (id) { if ($(id)) $(id).onchange = rd; });
    $('mr-make').onclick = function () {
      if (r.status === 'Draft' && !confirm('This recipe is still a Draft. Make it as a test batch?')) return;
      var invById = {}; inv.forEach(function (i) { invById[i.id] = i; });
      at.rows.forEach(function (x) { var it = invById[x.id]; if (it && G_PER[it.unit]) it.qty = String(Math.max(0, N(it.qty) - x.g / G_PER[it.unit]).toFixed(3) * 1); });
      var units = 0; if (recSize.pack && invById[recSize.pack]) { var pk = invById[recSize.pack]; units = N(recSize.count); pk.qty = String(Math.max(0, N(pk.qty) - units)); }
      var d = PK.today(), n = batches.filter(function (b) { return b.date === d; }).length + 1;
      var shelfM = /6 months/.test(r.shelf || '') ? 6 : /9/.test(r.shelf || '') ? 9 : /3 to 6/.test(r.shelf || '') ? 3 : 12;
      batches.unshift({ code: 'MA-' + d.slice(2).replace(/-/g, '') + '-' + String(n).padStart(2, '0'), recipe: r.name, date: d, grams: g, units: units, useBy: addMonths(d, shelfM) });
      if (r.status === 'Draft') r.status = 'Test batch';
      save(); renderAll(); PK.say('Batch logged and inventory updated');
    };
  }

  function renderAll() { renderIng(); renderForm(); renderRec(); }
  renderAll();
})();
