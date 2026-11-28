// PortalLux Lounge plan views for the Skool community portal (owner, Nov 28, 2026).
// Reads the same plan files the curriculum pages use, so the portal always matches the plan:
//   class-data.js (window.CURRICULUM), events-data.js (window.EVENTS), engagement-data.js (window.ENGAGE)
// Source: AI AuthoriTech > Skool Community > Content > Curriculum.
(function () {
  var C = window.CURRICULUM, V = window.EVENTS, G = window.ENGAGE;
  var nav = document.querySelector('[data-v="launch"]');
  if (!C || !nav) return;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var head = function (eb, h, note) { return '<div class="view-head"><div><span class="eyebrow">' + eb + '</span><h2>' + h + '</h2></div><span class="source real">' + (note || 'From your plan') + '</span></div>'; };
  var tierName = { lobby: 'Lobby', suite: 'Suite', penthouse: 'Penthouse' };

  // Tiers, from the Skool setup map (Nov 27): each tier includes everything below it.
  var TIERS = [
    { id: 'lobby', name: 'Lobby', price: 'Free', count: '6 classes', what: 'Preparation only. Members finish with a complete Portal Plan; all building happens in the Suite. Monthly Open Lounge Q&A, quarterly PortalLux Week challenge, weekly Build Season sneak peeks, Wins Friday.' },
    { id: 'suite', name: 'Suite (Builder)', price: 'Founding $27/mo, then $47', count: '19 classes (Lobby 6 + Build Season 13)', what: 'Pre-recorded Build-Along video every week, weekly Lounge Live drop-in help, template and prompt vault, Show Your Build feedback. Graduation week and Showcase.' },
    { id: 'penthouse', name: 'Penthouse (Premium)', price: 'Founding $77/mo, then $127 · capped at 25', count: '25 classes (Suite 19 + The Front Door 6)', what: 'Monthly Hot Seat review, one recorded review of your system a month, early access to new templates, same-day answers. Natural place to offer Build With Me (1:1, from the $125/hour service menu).' },
  ];

  // Add the menu items and views after "Launch plan".
  var add = [['plan-classes', 'Tiers & classes'], ['plan-events', 'Events plan'], ['plan-posts', 'Engagement posts']];
  var after = nav;
  add.forEach(function (a) {
    var b = document.createElement('button');
    b.className = 'tab'; b.setAttribute('role', 'tab'); b.dataset.v = a[0]; b.setAttribute('aria-selected', 'false'); b.textContent = a[1];
    after.after(b); after = b;
    var sec = document.createElement('section');
    sec.className = 'view'; sec.dataset.view = a[0]; sec.hidden = true; sec.innerHTML = '<div id="sk-' + a[0] + '"></div>';
    document.querySelector('[data-view="launch"]').after(sec);
  });
  // Same tab behavior as the rest of the portal.
  var tabs = document.querySelectorAll('.tab[data-v]'), views = document.querySelectorAll('.view[data-view]');
  add.forEach(function (a) {
    document.querySelector('.tab[data-v="' + a[0] + '"]').onclick = function () {
      tabs = document.querySelectorAll('.tab[data-v]'); views = document.querySelectorAll('.view[data-view]');
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.dataset.v === a[0]); });
      views.forEach(function (s) { s.hidden = s.dataset.view !== a[0]; });
      window.scrollTo({ top: 0 });
    };
  });
  // Clicking any original tab hides these views again.
  document.querySelectorAll('.tab[data-v]').forEach(function (t) {
    if (add.some(function (a) { return a[0] === t.dataset.v; })) return;
    t.addEventListener('click', function () {
      add.forEach(function (a) { document.querySelector('.tab[data-v="' + a[0] + '"]').setAttribute('aria-selected', 'false'); document.querySelector('[data-view="' + a[0] + '"]').hidden = true; });
    });
  });

  // ---------- Tiers & classes ----------
  var byTier = function (t) { return C.classes.filter(function (c) { return c.tier === t; }); };
  // One Markdown file of the whole plan (for NotebookLM or other tools); built by
  // Skool Community/Plans/make-plan-export.mjs. The published copy sets window.SKOOL_PLAN_EXPORT.
  var exportUrl = window.SKOOL_PLAN_EXPORT || '../../AI AuthoriTech/Skool Community/Plans/PortalLux Lounge Plan - for NotebookLM.md';
  var exportBar = '<div class="even one"><div class="card"><div class="toolbar"><a class="btn" href="' + E(exportUrl) + '" download="PortalLux Lounge Plan.md">Download the full plan (for NotebookLM)</a><span class="k-hint">One Markdown file with the setup map, tiers, all classes and lessons, events and engagement posts. Upload it to NotebookLM as a source to make diagrams.</span></div></div></div>';
  var classesHtml = head('PortalLux Lounge', 'Tiers & classes', C.classes.length + ' classes · ' + Object.keys(C.tiers).length + ' tiers') + exportBar +
    '<div class="even"><div class="card"><table class="k-tbl"><thead><tr><th>Tier</th><th>Price</th><th>Classes</th><th>What it includes</th></tr></thead><tbody>' +
    TIERS.map(function (t) { return '<tr><td><b style="font-weight:600">' + E(t.name) + '</b></td><td>' + E(t.price) + '</td><td>' + E(t.count) + '</td><td class="k-hint">' + E(t.what) + '</td></tr>'; }).join('') +
    '</tbody></table><p class="k-hint" style="margin-top:8px">Each tier includes everything below it. Classes open one at a time, in order.' + (C.upgradeHook ? ' ' + E(C.upgradeHook) : '') + '</p></div></div>' +
    ['lobby', 'suite', 'penthouse'].map(function (t) {
      var list = byTier(t);
      return '<div class="even one"><div class="card"><h3 style="margin:0 0 8px">' + E(C.tiers[t] || tierName[t]) + ' · ' + list.length + ' classes</h3><table class="k-tbl"><thead><tr><th>#</th><th>Class</th><th>What members walk away with</th><th>Lessons</th></tr></thead><tbody>' +
        list.map(function (c) {
          var mins = (c.lessons || []).reduce(function (a, l) { return a + (l[1] || 0); }, 0);
          return '<tr><td class="mono">' + E(c.n) + '</td><td><b style="font-weight:600">' + E(c.title) + '</b></td><td class="k-hint">' + E(c.outcome) + '</td><td class="num">' + (c.lessons || []).length + ' · ' + mins + ' min</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');

  // ---------- Events plan ----------
  var rows = [];
  if (V) {
    V.community.forEach(function (e) { rows.push({ group: 'Community', cls: '', title: e.title, fmt: e.format, mins: e.mins, tier: e.tier, how: e.how, note: e.note }); });
    C.classes.forEach(function (c) {
      V.standard.forEach(function (e) { rows.push({ group: 'Class', cls: c.n + ' · ' + c.title, title: e.title.replace('{title}', c.title), fmt: e.format, mins: e.mins, tier: c.tier, how: e.when, note: '' }); });
      (V.classEvents[c.id] || []).forEach(function (e) { rows.push({ group: 'Class', cls: c.n + ' · ' + c.title, title: e.title, fmt: e.format, mins: e.mins, tier: c.tier, how: 'During this class week', note: e.note }); });
    });
  }
  var fmt = function (f) { return V && V.formats[f] ? V.formats[f].short : f; };
  var cnt = function (f) { return rows.filter(function (r) { return r.fmt === f; }).length; };
  var eventsHtml = head('PortalLux Lounge', 'Events plan', 'No dates yet · one live a week at most') +
    '<div class="even one"><div class="card"><div class="k-kpis">' +
    ['camera', 'voice', 'recorded', 'async'].map(function (f) { return '<div class="k-kpi"><b>' + cnt(f) + '</b><span>' + E(fmt(f)) + '</span></div>'; }).join('') +
    '</div><p class="k-hint" style="margin-top:8px">The teaching is pre-recorded. Your weekly Lounge Live is 30 minutes, camera optional. On-camera events are rare and each one replaces that week\'s live. When you pick dates, add them under Classes &amp; sessions and on the Skool calendar.</p></div></div>' +
    '<div class="even one"><div class="card"><h3 style="margin:0 0 8px">Community events</h3><table class="k-tbl"><thead><tr><th>Event</th><th>How you appear</th><th>Length</th><th>Tier</th><th>When</th><th>Plan</th></tr></thead><tbody>' +
    rows.filter(function (r) { return r.group === 'Community'; }).map(function (r) { return '<tr><td><b style="font-weight:600">' + E(r.title) + '</b></td><td>' + E(fmt(r.fmt)) + '</td><td class="num">' + r.mins + ' min</td><td>' + tierName[r.tier] + '</td><td class="k-hint">' + E(r.how) + '</td><td class="k-hint">' + E(r.note) + '</td></tr>'; }).join('') +
    '</tbody></table></div></div>' +
    '<div class="even one"><div class="card"><h3 style="margin:0 0 8px">Class events</h3><p class="k-hint">Every class gets a Kickoff Live and a Show Your Build Review; Suite and Penthouse classes also get a Build-Along. Pop-up lives are listed per class.</p><table class="k-tbl"><thead><tr><th>Class</th><th>Event</th><th>How you appear</th><th>Length</th><th>Tier</th><th>When</th></tr></thead><tbody>' +
    rows.filter(function (r) { return r.group === 'Class'; }).map(function (r) { return '<tr><td class="k-hint">' + E(r.cls) + '</td><td><b style="font-weight:600">' + E(r.title) + '</b></td><td>' + E(fmt(r.fmt)) + '</td><td class="num">' + r.mins + ' min</td><td>' + tierName[r.tier] + '</td><td class="k-hint">' + E(r.how) + '</td></tr>'; }).join('') +
    '</tbody></table></div></div>';

  // ---------- Engagement posts ----------
  var postsHtml = head('PortalLux Lounge', 'Engagement posts', 'Weekly rhythm and a prompt for every class') +
    (G ? '<div class="even one"><div class="card"><h3 style="margin:0 0 8px">Weekly rhythm</h3><table class="k-tbl"><thead><tr><th>Day</th><th>Post</th><th>Category</th></tr></thead><tbody>' +
      (G.days || []).map(function (d) { return '<tr><td>' + E(d[0]) + '</td><td><b style="font-weight:600">' + E(d[1]) + '</b>' + (d[3] ? '<br><span class="k-hint">' + E(d[3]) + '</span>' : '') + '</td><td>' + E(d[2]) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="even one"><div class="card"><h3 style="margin:0 0 8px">Discussion prompt for each class</h3><table class="k-tbl"><thead><tr><th>Class</th><th>Question</th><th>Poll options</th></tr></thead><tbody>' +
      (G.order || []).map(function (id) {
        var c = C.classes.filter(function (x) { return x.id === id; })[0], t = (G.talk || {})[id];
        if (!c || !t) return '';
        return '<tr><td class="k-hint">' + E(c.n + ' · ' + c.title) + '</td><td>' + E(t.q) + '</td><td class="k-hint">' + E((t.poll || []).join(' · ')) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' : '<p class="k-hint">Engagement plan file not found.</p>');

  document.getElementById('sk-plan-classes').innerHTML = classesHtml;
  document.getElementById('sk-plan-events').innerHTML = eventsHtml;
  document.getElementById('sk-plan-posts').innerHTML = postsHtml;
})();
