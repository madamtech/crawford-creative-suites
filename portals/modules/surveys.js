/* Client surveys: sent 10 to 14 days after delivery (never right away), to hear how the order is going,
   collect a wish list of things you don't make yet, ideas for services to refer out, and referrals.
   Saved in this browser under "<code>_sv_". Nothing is sent from here: you send it, or GoHighLevel does once
   you turn that workflow on. */
window.Surveys = function (cfg) {
  var E = PK.esc, N = PK.num, S = PK.db(cfg.code + '_sv_'), el = document.getElementById(cfg.el); if (!el) return;
  function ls(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  var set = S.get('set', { wait: 12, link: '', remind: 5 }), sent = S.get('sent', {}), resp = S.get('resp', []);
  /* Six questions, each built to collect more than one piece of data:
     1 gives four ratings (quality, packaging, shipping, service); 2 gives your Net Promoter Score;
     3 gives feedback, an improvement idea and review permission; 4 the wish list; 5 unmet needs; 6 referrals. */
  var Q6 = [
    'Rate your experience from 1 to 5: product quality · packaging · shipping and delivery · customer service. (Grid question: one row each)',
    'How likely are you to recommend ' + cfg.brand + ' to a friend, from 0 to 10?',
    'What did you love most, and what would make it even better? Let us know if we may share your words as a review.',
    'Wish list: what would you love ' + cfg.brand + ' to make next? (A scent, size, product or gift idea)',
    'Is there anything you need that we don’t offer yet? We’re happy to point you to someone we trust.',
    'Know someone who would love ' + cfg.brand + '? Share their name and best way to reach them (only with their OK).'
  ];
  var Q = S.get('questions', null); if (!Q || Q.length > 6) Q = Q6.slice();
  function save() { S.set('set', set); S.set('sent', sent); S.set('resp', resp); S.set('questions', Q); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function days(a) { return Math.round((new Date(today() + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
  function nice(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; }
  function orderBy(id) { return ((window.PORTAL_DATA || {}).orders || []).filter(function (o) { return o.id === id; })[0] || {}; }
  function queue() {
    return ls(cfg.code + '_ox_ships', []).filter(function (s) { return s.delivered; }).map(function (s) {
      var o = orderBy(s.order), on = s.deliveredOn || s.date, d = on ? days(on) : 0;
      return { order: s.order, who: o.who || '', items: o.items || 'order', on: on, age: d, dueIn: N(set.wait) - d, done: sent[s.order] };
    }).sort(function (a, b) { return a.dueIn - b.dueIn; });
  }
  function message(q) {
    var first = String(q.who || '').split(/\s+/)[0] || 'there';
    return { subj: 'How are you enjoying your ' + q.items + '?', body: 'Hi ' + first + ',\n\nI hope you’re loving your ' + q.items + '! It means so much that you chose ' + cfg.brand + '.\n\nWould you take two minutes to tell me how it’s going, and what you’d love to see me make next? Your wish list helps shape what I create.\n\n' + (set.link || '[survey link]') + '\n\nThank you so much for being part of the ' + cfg.brand + ' family.' + (window.EMAILKIT ? '\n\n' + EMAILKIT.sigText(cfg.brand) : '\n\nTanika Crawford\nFounder, ' + cfg.brand) };
  }
  function render() {
    var q = queue(), due = q.filter(function (x) { return !x.done && x.dueIn <= 0; }), soon = q.filter(function (x) { return !x.done && x.dueIn > 0; }), done = q.filter(function (x) { return x.done; });
    var wishes = resp.filter(function (r) { return r.wish; }), offers = resp.filter(function (r) { return r.offer; }), refs = resp.filter(function (r) { return r.referral; });
    function score(r) { var v = ['quality', 'packaging', 'shipping', 'service'].map(function (k) { return N(r[k]); }).filter(Boolean); return v.length ? v.reduce(function (t, x) { return t + x; }, 0) / v.length : N(r.rating); }
    var avg = resp.filter(score), avgN = avg.length ? avg.reduce(function (t, r) { return t + score(r); }, 0) / avg.length : 0;
    var np = resp.filter(function (r) { return r.nps !== '' && r.nps != null; }), nps = np.length ? Math.round((np.filter(function (r) { return N(r.nps) >= 9; }).length - np.filter(function (r) { return N(r.nps) <= 6; }).length) / np.length * 100) : null;
    el.innerHTML =
      '<div class="view-head"><div><span class="eyebrow">Customers</span><h2>Surveys &amp; wish list</h2></div><span class="source ' + (resp.length || done.length ? 'real' : 'example') + '">' + (resp.length || done.length ? 'Real data · your surveys' : 'Sends ' + set.wait + ' days after delivery') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis"><div class="k-kpi"><b>' + due.length + '</b><span>surveys ready to send</span></div><div class="k-kpi"><b>' + soon.length + '</b><span>waiting for the ' + set.wait + '-day mark</span></div><div class="k-kpi"><b>' + done.length + '</b><span>sent</span></div><div class="k-kpi"><b>' + resp.length + '</b><span>responses</span></div><div class="k-kpi"><b>' + (avgN ? avgN.toFixed(1) + ' ★' : 'n/a') + '</b><span>average rating</span></div><div class="k-kpi"><b>' + (nps === null ? 'n/a' : nps) + '</b><span>Net Promoter Score</span></div><div class="k-kpi"><b>' + wishes.length + '</b><span>wish-list ideas</span></div></div></div></div>' +
      '<div class="even h-md"><div class="card"><h3>Ready to send</h3><div class="fill">' +
        (due.map(function (x) { return '<div class="soc"><span class="mono small">Delivered ' + nice(x.on) + '</span><span class="cust-names"><b style="font-weight:600">' + E(x.who || x.order) + '</b><br><span class="small">' + E(x.order) + ' · ' + E(x.items) + '</span></span><span class="btnrow"><button class="btn small-btn" data-copy="' + E(x.order) + '">Copy email</button><button class="btn small-btn" data-mail="' + E(x.order) + '">Open in email</button><button class="btn small-btn primary" data-sent="' + E(x.order) + '">Mark sent</button></span></div>'; }).join('') || '<p class="k-hint">Nothing is ready yet. When you mark a shipment Delivered on the Shipping page, its survey becomes ready ' + set.wait + ' days later.</p>') +
        (soon.length ? '<h3 style="margin-top:14px">Coming up</h3>' + soon.map(function (x) { return '<div class="soc"><span class="mono small">In ' + x.dueIn + ' day' + (x.dueIn === 1 ? '' : 's') + '</span><span class="cust-names"><b style="font-weight:600">' + E(x.who || x.order) + '</b><br><span class="small">' + E(x.items) + '</span></span><span></span></div>'; }).join('') : '') +
      '</div></div>' +
      '<div class="card"><h3>Survey settings</h3><div class="fill"><form class="k-form" id="sv-set">' +
        '<label>Send this many days after delivery<input id="sv-wait" type="number" min="7" max="21" value="' + E(set.wait) + '"></label><label>Reminder if no answer after (days)<input id="sv-rem" type="number" min="0" max="14" value="' + E(set.remind) + '"></label>' +
        '<label class="wide">Survey link (Google Form or GoHighLevel survey)<input id="sv-link" value="' + E(set.link) + '" placeholder="https://"></label></form>' +
        '<h3 style="margin-top:12px">Questions</h3><ol class="steps" id="sv-qs">' + Q.map(function (t, i) { return '<li><span contenteditable="true" data-q="' + i + '">' + E(t) + '</span></li>'; }).join('') + '</ol><p class="k-hint">Six questions, each collecting several answers. Click one to edit it. Copy them into a Google Form or GoHighLevel survey; make question 1 a grid with four rows rated 1 to 5.</p>' +
        '<div class="btnrow"><button class="btn small-btn" id="sv-copyq">Copy questions</button></div>' +
        '<div class="note-box" style="margin-top:12px"><b>To send it automatically:</b> in GoHighLevel, create a workflow. Trigger: opportunity moved to Delivered (or the tag “delivered” added). Wait ' + set.wait + ' days. Send the survey email. If no response in ' + set.remind + ' days, send one gentle reminder. It stays off until you turn it on.</div>' +
      '</div></div></div>' +
      '<div class="even h-md"><div class="card"><div class="toolbar"><h3 style="margin:0">Client wish list</h3><span style="flex:1"></span><button class="btn small-btn" id="sv-add">Add a response</button><button class="btn small-btn" id="sv-imp">Import responses (CSV)</button></div><div class="fill">' +
        (wishes.length ? '<ul class="checks">' + wishes.map(function (r) { return '<li><span>' + E(r.wish) + ' <span class="k-hint cust-names">· ' + E(r.who || '') + '</span></span></li>'; }).join('') + '</ul>' : '<p class="k-hint">Wish-list answers show here: new scents, sizes, products and gift ideas your clients ask for.</p>') +
      '</div></div>' +
      '<div class="card"><h3>Referral opportunities</h3><div class="fill">' +
        (offers.length ? '<b style="font-size:13px">Things clients need that you don’t offer</b><ul class="checks">' + offers.map(function (r) { return '<li class="warn"><span>' + E(r.offer) + ' <span class="k-hint cust-names">· ' + E(r.who || '') + '</span></span></li>'; }).join('') + '</ul>' : '') +
        (refs.length ? '<b style="font-size:13px">People clients referred to you</b><ul class="checks">' + refs.map(function (r) { return '<li><span class="cust-names">' + E(r.referral) + ' · from ' + E(r.who || '') + '</span></li>'; }).join('') + '</ul>' : '') +
        (!offers.length && !refs.length ? '<p class="k-hint">When clients name something you don’t offer, it shows here so you can refer them to a partner, or consider adding it. Referrals they give you show here too.</p>' : '') +
      '</div></div></div>';
    bind(due);
  }
  function bind(due) {
    var $ = function (id) { return document.getElementById(id); };
    function find(id) { return due.filter(function (x) { return x.order === id; })[0]; }
    el.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { var m = message(find(b.dataset.copy)); navigator.clipboard.writeText('Subject: ' + m.subj + '\n\n' + m.body).then(function () { PK.say('Survey email copied'); }); }; });
    el.querySelectorAll('[data-mail]').forEach(function (b) { b.onclick = function () { var m = message(find(b.dataset.mail)); location.href = 'mailto:?subject=' + encodeURIComponent(m.subj) + '&body=' + encodeURIComponent(m.body); }; });
    el.querySelectorAll('[data-sent]').forEach(function (b) { b.onclick = function () { sent[b.dataset.sent] = today(); save(); render(); PK.say('Marked sent'); }; });
    $('sv-wait').onchange = function () { set.wait = Math.max(7, N(this.value) || 12); save(); render(); };
    $('sv-rem').onchange = function () { set.remind = N(this.value); save(); render(); };
    $('sv-link').onchange = function () { set.link = this.value.trim(); save(); };
    el.querySelectorAll('[data-q]').forEach(function (s) { s.onblur = function () { Q[+s.dataset.q] = s.textContent.trim(); save(); }; });
    $('sv-copyq').onclick = function () { navigator.clipboard.writeText(Q.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n')).then(function () { PK.say('Questions copied'); }); };
    $('sv-add').onclick = function () { var who = prompt('Client first name'); if (who === null) return; var g = (prompt('Question 1 ratings, 1 to 5, in order: quality, packaging, shipping, service (for example 5,4,5,5)') || '').split(/[ ,]+/); resp.push({ date: today(), who: who, quality: g[0] || '', packaging: g[1] || '', shipping: g[2] || '', service: g[3] || '', nps: prompt('Question 2: likely to recommend, 0 to 10') || '', comments: prompt('Question 3: what they loved and what would make it better') || '', share: confirm('May you share their words as a review?') ? 'Yes' : 'No', wish: prompt('Question 4: wish list') || '', offer: prompt('Question 5: something they need that you don’t offer') || '', referral: prompt('Question 6: anyone they referred') || '' }); save(); render(); };
    $('sv-imp').onclick = function () { PK.pickFile('.csv', function (t) { var n = 0; PK.parseCSV(t).forEach(function (r) {
      function col(re) { var k = Object.keys(r).filter(function (x) { return re.test(x); })[0]; return k ? r[k] : ''; }
      resp.push({ date: (col(/timestamp|date/i) || today()).slice(0, 10), who: col(/name/i), quality: col(/quality/i), packaging: col(/packag/i), shipping: col(/shipping|deliver/i), service: col(/service/i), nps: col(/recommend/i), comments: col(/love most|even better|comment/i), share: col(/share your words|review/i), wish: col(/wish|make next/i), offer: col(/don.?t offer|need/i), referral: col(/who do you know|refer/i) }); n++; });
      save(); render(); PK.say(n + ' responses imported'); }); };
  }
  render();
};
