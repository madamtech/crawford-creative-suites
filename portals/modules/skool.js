/* Skool community portal: launch plan, classes and sessions, classroom courses, members, community posts,
   automations and message templates. Your entries save in this browser (keys start with "sk_").
   The launch plan and posts come from data/ai-authoritech.data.js until the community has its own data. */
(function () {
  var E = PK.esc, N = PK.num, S = PK.db('sk_'), D = window.PORTAL_DATA || {};
  var root = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var LAUNCH = S.get('launchDate', '2027-01-01');
  var done = S.get('done', {}), sessions = S.get('sessions', []), courses = S.get('courses', []), members = S.get('members', []), posts = S.get('posts', []), autos = S.get('autos', null);
  function save() { S.set('done', done); S.set('sessions', sessions); S.set('courses', courses); S.set('members', members); S.set('posts', posts); S.set('autos', autos); S.set('launchDate', LAUNCH); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function days(s) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(s + 'T00:00:00') - t) / 864e5); }
  function nice(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''; }
  function kpi(n, l) { return '<div class="k-kpi"><b>' + n + '</b><span>' + l + '</span></div>'; }
  function head(eb, h, src, real) { return '<div class="view-head"><div><span class="eyebrow">' + eb + '</span><h2>' + h + '</h2></div><span class="source ' + (real ? 'real' : 'example') + '">' + src + '</span></div>'; }
  if (!autos) autos = [
    ['Welcome message when someone joins', 'Skool auto-DM', 'Greets new members by first name, points them to Start Here and the next live session.'],
    ['Session reminders (24 hours and 1 hour before)', 'Skool calendar', 'Skool emails members who RSVP. Add the Zoom or Meet link to each event.'],
    ['Weekly recap post', 'Scheduled post', 'Every Friday: wins of the week, next week’s sessions, one question to answer.'],
    ['Recording posted to the Classroom', 'Manual step, 10 minutes', 'After each live class, upload the recording to the matching course module.'],
    ['New paid member to GoHighLevel', 'Zapier or webhook to GHL', 'Tags the contact “Skool member” so they get the right emails and do not get sales emails.'],
    ['Quiet member check-in', 'GHL workflow', 'Members with no activity for 14 days get a friendly “here’s what you missed” note.']
  ].map(function (a, i) { return { id: 'a' + i, name: a[0], tool: a[1], what: a[2], status: 'Idea' }; });

  /* ---------- Theme, glow, presentation (same switches as the other portals) ---------- */
  var prefs = S.get('prefs', {});
  function applyPrefs() {
    if (prefs.theme) root.setAttribute('data-theme', prefs.theme);
    root.setAttribute('data-glow', prefs.glow === false ? 'off' : 'on');
    $('t-glow').setAttribute('aria-pressed', prefs.glow !== false);
    $('t-theme').setAttribute('aria-pressed', root.getAttribute('data-theme') === 'light');
    $('app').classList.toggle('blurred', !!prefs.present); $('t-present').setAttribute('aria-pressed', !!prefs.present);
  }
  $('t-glow').onclick = function () { prefs.glow = (prefs.glow === false); S.set('prefs', prefs); applyPrefs(); };
  $('t-theme').onclick = function () { prefs.theme = (root.getAttribute('data-theme') === 'light') ? 'dark' : 'light'; S.set('prefs', prefs); applyPrefs(); };
  $('t-present').onclick = function () { prefs.present = !prefs.present; S.set('prefs', prefs); applyPrefs(); PK.say(prefs.present ? 'Member names hidden' : 'Member names shown'); };
  applyPrefs();
  $('asof').textContent = 'Your entries save on this device';

  /* ---------- Tabs ---------- */
  var tabs = document.querySelectorAll('.tab'), views = document.querySelectorAll('.view');
  function show(v) { tabs.forEach(function (t) { t.setAttribute('aria-selected', t.dataset.v === v); }); views.forEach(function (s) { s.hidden = s.dataset.view !== v; }); window.scrollTo({ top: 0 }); }
  tabs.forEach(function (t) { t.onclick = function () { show(t.dataset.v); }; });

  /* ---------- Today ---------- */
  function upcoming() { return sessions.filter(function (s) { return days(s.date) >= 0 && s.status !== 'Done'; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }); }
  function launchTasks() { return (D.launch || []).map(function (t) { return Object.assign({ done: !!done[t.id] }, t); }); }
  function renderToday() {
    var h = new Date().getHours(), up = upcoming(), lt = launchTasks(), open = lt.filter(function (t) { return !t.done; });
    var soon = open.filter(function (t) { return t.due && days(t.due) <= 7; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var newM = members.filter(function (m) { return m.joined && days(m.joined) >= -30; }).length;
    $('sk-today').innerHTML =
      '<div class="view-head"><div><span class="eyebrow">' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '</span><h2><span class="script">' + (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + '</span>, here’s your community.</h2></div><span class="source ' + (sessions.length || members.length ? 'real' : 'example') + '">' + (sessions.length || members.length ? 'Real data · your entries' : 'Launch plan is a suggestion until you confirm it') + '</span></div>' +
      '<div class="even one"><div class="card"><div class="k-kpis">' + kpi(Math.max(0, days(LAUNCH)), 'days to launch (' + nice(LAUNCH) + ')') + kpi(open.length, 'launch tasks open') + kpi(up.length, 'sessions coming up') + kpi(members.length, 'members') + kpi(newM, 'joined in the last 30 days') + '</div></div></div>' +
      '<div class="even h-sm"><div class="card"><h3>Next sessions</h3><div class="fill">' +
        (up.slice(0, 6).map(function (s) { return '<div class="soc"><span class="mono small">' + nice(s.date) + (s.time ? ' · ' + E(s.time) : '') + '</span><span><b style="font-weight:600">' + E(s.title) + '</b><br><span class="small">' + E(s.type) + (s.course ? ' · ' + E(s.course) : '') + '</span></span><span class="st-pill ' + (s.status === 'Announced' ? 'st-vetted' : 'st-draft') + '">' + E(s.status) + '</span></div>'; }).join('') || '<p class="k-hint">No sessions planned yet. Add your first live class or Q&amp;A call under Classes &amp; sessions.</p>') +
      '</div></div><div class="card"><h3>Launch tasks due this week</h3><div class="fill">' +
        (soon.length ? '<ul class="checks">' + soon.map(function (t) { return '<li class="' + (days(t.due) < 0 ? 'stop' : 'warn') + '"><span><b style="font-weight:600">' + E(t.task) + '</b> · ' + (days(t.due) < 0 ? 'overdue since ' : 'due ') + nice(t.due) + '</span></li>'; }).join('') + '</ul>' : '<p class="k-hint">Nothing due in the next 7 days.</p>') +
      '</div></div></div>';
  }

  /* ---------- Launch plan ---------- */
  function renderLaunch() {
    var lt = launchTasks(), phases = [];
    lt.forEach(function (t) { if (phases.indexOf(t.phase) < 0) phases.push(t.phase); });
    $('sk-launch').innerHTML = head('Launch', 'Launch plan', 'Suggested plan · confirm each task', false) +
      '<div class="even one"><div class="card"><div class="toolbar"><span>Launch date</span><input class="k-in" type="date" id="sl-date" value="' + E(LAUNCH) + '" style="width:170px"><span class="k-hint">' + lt.filter(function (t) { return t.done; }).length + ' of ' + lt.length + ' tasks done</span></div><div class="meter" style="margin-top:10px"><i style="width:' + (lt.length ? lt.filter(function (t) { return t.done; }).length / lt.length * 100 : 0) + '%"></i></div></div></div>' +
      '<div class="even h-lg"><div class="card"><div class="fill"><table class="k-tbl"><thead><tr><th></th><th>Task</th><th>Phase</th><th>Due</th></tr></thead><tbody>' +
        lt.map(function (t) { return '<tr><td><label class="k-check"><input type="checkbox" data-done="' + E(t.id) + '"' + (t.done ? ' checked' : '') + '></label></td><td' + (t.done ? ' style="text-decoration:line-through;color:var(--muted)"' : '') + '>' + E(t.task) + '</td><td>' + E(t.phase) + '</td><td>' + (t.due ? nice(t.due) : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div></div>';
    $('sl-date').onchange = function () { LAUNCH = this.value || LAUNCH; save(); renderAll(); };
    document.querySelectorAll('[data-done]').forEach(function (c) { c.onchange = function () { if (c.checked) done[c.dataset.done] = PK.today(); else delete done[c.dataset.done]; save(); renderAll(); }; });
  }

  /* ---------- Classes and sessions ---------- */
  var TYPES = ['Live class', 'Q&A call', 'Workshop', 'Office hours', 'Guest session', 'Challenge day', 'Community meetup'];
  var editS = null;
  function renderSessions() {
    var up = upcoming(), past = sessions.filter(function (s) { return days(s.date) < 0 || s.status === 'Done'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    $('sk-sessions').innerHTML = head('Classes & sessions', 'Sessions calendar', sessions.length ? 'Real data · your sessions' : 'Plan your first session', !!sessions.length) +
      '<div class="even h-md"><div class="card"><h3>' + (editS ? 'Edit session' : 'Plan a session') + '</h3><form class="k-form fill" id="ss-form" autocomplete="off">' +
        '<label class="wide">Title<input id="ss-title" required placeholder="AI basics for small business: live class"></label>' +
        '<label>Type<select id="ss-type">' + TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label><label>Course or module<input id="ss-course" list="ss-courses"></label><datalist id="ss-courses">' + courses.map(function (c) { return '<option value="' + E(c.name) + '">'; }).join('') + '</datalist>' +
        '<label>Date<input id="ss-date" type="date" required></label><label>Time<input id="ss-time" type="time"></label>' +
        '<label>Length (min)<input id="ss-len" type="number" min="15" step="15" value="60"></label><label>Status<select id="ss-status"><option>Planned</option><option>Announced</option><option>Done</option><option>Canceled</option></select></label>' +
        '<label class="wide">Meeting link<input id="ss-link" placeholder="Zoom, Google Meet or Skool call link"></label>' +
        '<label>RSVPs or attendees<input id="ss-att" type="number" min="0"></label><label>Recording link<input id="ss-rec"></label>' +
        '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editS ? 'Save' : 'Add session') + '</button>' + (editS ? '<button class="btn" type="button" id="ss-cancel">Cancel</button><button class="btn" type="button" id="ss-del">Delete</button>' : '') + '</div></form></div>' +
      '<div class="card"><h3>Coming up</h3><div class="fill">' + (up.map(sRow).join('') || '<p class="k-hint">Sessions you plan show here in date order.</p>') + '</div></div></div>' +
      '<div class="even one h-sm"><div class="card"><h3>Past sessions</h3><div class="fill"><table class="k-tbl"><thead><tr><th>Date</th><th>Session</th><th>Type</th><th class="num">Attended</th><th>Recording</th><th></th></tr></thead><tbody>' +
        (past.map(function (s) { return '<tr><td>' + nice(s.date) + '</td><td>' + E(s.title) + '</td><td>' + E(s.type) + '</td><td class="num">' + E(s.att || '') + '</td><td>' + (s.rec ? '<a href="' + E(s.rec) + '" target="_blank" rel="noopener">Open</a>' : '<span class="k-hint">add the link</span>') + '</td><td class="num"><button class="btn small-btn" data-es="' + s.id + '">Edit</button></td></tr>'; }).join('') || '<tr><td colspan="6" class="k-hint">Finished sessions move here. Add the recording link so it can go into the Classroom.</td></tr>') +
      '</tbody></table></div></div></div>';
    document.querySelectorAll('[data-es]').forEach(function (b) { b.onclick = function () { editS = b.dataset.es; renderSessions(); var s = sessions.filter(function (x) { return x.id === editS; })[0];
      $('ss-title').value = s.title; $('ss-type').value = s.type; $('ss-course').value = s.course || ''; $('ss-date').value = s.date; $('ss-time').value = s.time || ''; $('ss-len').value = s.len || 60; $('ss-status').value = s.status; $('ss-link').value = s.link || ''; $('ss-att').value = s.att || ''; $('ss-rec').value = s.rec || ''; }; });
    if ($('ss-cancel')) $('ss-cancel').onclick = function () { editS = null; renderSessions(); };
    if ($('ss-del')) $('ss-del').onclick = function () { if (confirm('Delete this session?')) { sessions = sessions.filter(function (x) { return x.id !== editS; }); editS = null; save(); renderAll(); } };
    $('ss-form').onsubmit = function (e) { e.preventDefault();
      var s = { title: $('ss-title').value.trim(), type: $('ss-type').value, course: $('ss-course').value.trim(), date: $('ss-date').value, time: $('ss-time').value, len: $('ss-len').value, status: $('ss-status').value, link: $('ss-link').value.trim(), att: $('ss-att').value, rec: $('ss-rec').value.trim() };
      if (editS) Object.assign(sessions.filter(function (x) { return x.id === editS; })[0], s); else { s.id = PK.uid('s'); sessions.push(s); } editS = null; save(); renderAll(); PK.say('Session saved'); };
  }
  function sRow(s) { return '<div class="soc"><span class="mono small">' + nice(s.date) + (s.time ? ' · ' + E(s.time) : '') + '</span><span><b style="font-weight:600">' + E(s.title) + '</b><br><span class="small">' + E(s.type) + ' · ' + E(s.len || 60) + ' min' + (s.link ? ' · <a href="' + E(s.link) + '" target="_blank" rel="noopener">link</a>' : '') + '</span></span><span><button class="btn small-btn" data-es="' + s.id + '">Edit</button></span></div>'; }

  /* ---------- Classroom courses ---------- */
  var editC = null;
  function renderCourses() {
    $('sk-courses').innerHTML = head('Classes & sessions', 'Classroom courses', courses.length ? 'Real data · your courses' : 'Add your first course', !!courses.length) +
      '<div class="even h-md"><div class="card"><h3>' + (editC ? 'Edit course' : 'Add a course') + '</h3><form class="k-form fill" id="sc-form" autocomplete="off">' +
        '<label class="wide">Course name<input id="sc-name" required placeholder="Start Here: AI for your small business"></label>' +
        '<label>Access<select id="sc-access"><option>Free members</option><option>Paid members</option><option>Unlock by level</option><option>Buy separately</option></select></label><label>Status<select id="sc-status"><option>Planning</option><option>Recording</option><option>Published</option></select></label>' +
        '<label class="wide">Modules and lessons, one per line<textarea id="sc-mods" placeholder="Welcome and how this works&#10;Your first AI assistant&#10;Automate one task this week"></textarea></label>' +
        '<div class="btnrow wide"><button class="btn primary" type="submit">' + (editC ? 'Save' : 'Add course') + '</button>' + (editC ? '<button class="btn" type="button" id="sc-cancel">Cancel</button><button class="btn" type="button" id="sc-del">Delete</button>' : '') + '</div></form></div>' +
      '<div class="card"><h3>Your Classroom</h3><div class="fill">' +
        (courses.map(function (c) { var n = (c.mods || '').split('\n').filter(Boolean).length, d = (c.doneMods || []).length; return '<div class="note-box" style="margin-bottom:8px"><div class="toolbar"><b>' + E(c.name) + '</b><span style="flex:1"></span><span class="st-pill ' + (c.status === 'Published' ? 'st-vetted' : c.status === 'Recording' ? 'st-test' : 'st-draft') + '">' + E(c.status) + '</span><button class="btn small-btn" data-ec="' + c.id + '">Edit</button></div><span class="k-hint">' + E(c.access) + ' · ' + n + ' lesson' + (n === 1 ? '' : 's') + '</span></div>'; }).join('') || '<p class="k-hint">Courses live in your Skool Classroom. Plan them here: what each lesson covers, who can open it, and whether it is recorded yet.</p>') +
      '</div></div></div>';
    document.querySelectorAll('[data-ec]').forEach(function (b) { b.onclick = function () { editC = b.dataset.ec; renderCourses(); var c = courses.filter(function (x) { return x.id === editC; })[0]; $('sc-name').value = c.name; $('sc-access').value = c.access; $('sc-status').value = c.status; $('sc-mods').value = c.mods || ''; }; });
    if ($('sc-cancel')) $('sc-cancel').onclick = function () { editC = null; renderCourses(); };
    if ($('sc-del')) $('sc-del').onclick = function () { if (confirm('Delete this course plan?')) { courses = courses.filter(function (x) { return x.id !== editC; }); editC = null; save(); renderAll(); } };
    $('sc-form').onsubmit = function (e) { e.preventDefault(); var c = { name: $('sc-name').value.trim(), access: $('sc-access').value, status: $('sc-status').value, mods: $('sc-mods').value.trim() };
      if (editC) Object.assign(courses.filter(function (x) { return x.id === editC; })[0], c); else { c.id = PK.uid('c'); courses.push(c); } editC = null; save(); renderAll(); PK.say('Course saved'); };
  }

  /* ---------- Members ---------- */
  var q = '';
  function renderMembers() {
    var rows = members.filter(function (m) { return !q || (m.name + ' ' + m.email).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    $('sk-members').innerHTML = head('Members', 'Members', members.length ? 'Real data · stays on this device only' : 'Import your Skool member list', !!members.length) +
      '<div class="even one"><div class="card"><div class="k-kpis">' + kpi(members.length, 'members') + kpi(members.filter(function (m) { return /paid|premium|vip/i.test(m.tier || ''); }).length, 'paid members') + kpi(members.filter(function (m) { return m.joined && days(m.joined) >= -30; }).length, 'joined in 30 days') + kpi(members.filter(function (m) { return m.joined && days(m.joined) >= -7; }).length, 'joined this week') + '</div></div></div>' +
      '<div class="even one h-md"><div class="card"><div class="toolbar"><input id="sm-q" placeholder="Search members" value="' + E(q) + '"><span style="flex:1"></span><button class="btn small-btn" id="sm-imp">Import CSV</button><button class="btn small-btn" id="sm-add">Add member</button><button class="btn small-btn" id="sm-bak">Backup</button></div><div class="fill"><table class="k-tbl"><thead><tr><th>Member</th><th>Email</th><th>Joined</th><th>Plan</th><th>Notes</th><th></th></tr></thead><tbody class="cust-names">' +
        (rows.map(function (m, i) { return '<tr><td><b style="font-weight:600">' + E(m.name) + '</b></td><td>' + E(m.email || '') + '</td><td>' + (m.joined ? nice(m.joined) : '') + '</td><td>' + E(m.tier || 'Free') + '</td><td class="k-hint">' + E(m.notes || '') + '</td><td class="num"><button class="btn small-btn" data-rm="' + members.indexOf(m) + '">✕</button></td></tr>'; }).join('') || '<tr><td colspan="6" class="k-hint">No members yet. In Skool: Settings › Members › Export, then Import CSV here.</td></tr>') +
      '</tbody></table></div></div></div>';
    $('sm-q').oninput = function () { q = this.value; var p = this.selectionStart; renderMembers(); var i = $('sm-q'); i.focus(); i.setSelectionRange(p, p); };
    $('sm-bak').onclick = function () { PK.backup('sk_', 'skool-community'); };
    $('sm-add').onclick = function () { var n = prompt('Member name'); if (!n) return; members.push({ name: n, email: prompt('Email (optional)') || '', joined: PK.today(), tier: 'Free' }); save(); renderAll(); };
    document.querySelectorAll('#sk-members [data-rm]').forEach(function (b) { b.onclick = function () { if (confirm('Remove this member from your list?')) { members.splice(+b.dataset.rm, 1); save(); renderAll(); } }; });
    $('sm-imp').onclick = function () { PK.pickFile('.csv', function (t) { var a = 0; PK.parseCSV(t).forEach(function (r) {
      function col(names) { var k = Object.keys(r).filter(function (x) { return names.indexOf(x.toLowerCase().replace(/[^a-z]/g, '')) >= 0; })[0]; return k ? r[k] : ''; }
      var name = col(['name', 'fullname', 'membername']) || (col(['firstname']) + ' ' + col(['lastname'])).trim(), email = col(['email', 'emailaddress']);
      if (!name && !email) return; if (members.some(function (m) { return email && m.email === email; })) return;
      var j = col(['joined', 'joinedat', 'joindate', 'approvedat', 'createdat']); members.push({ name: name, email: email, joined: j ? j.slice(0, 10) : '', tier: col(['tier', 'plan', 'membership', 'price']) || 'Free', notes: col(['answers', 'notes', 'bio']).slice(0, 120) }); a++; });
      save(); renderAll(); PK.say(a + ' members imported'); }); };
  }

  /* ---------- Community posts ---------- */
  function renderPosts() {
    var all = (D.content || []).filter(function (p) { return /skool/i.test(p.channel || '') || /community|skool/i.test(p.title || ''); }).map(function (p) { return Object.assign({ src: 'plan' }, p); }).concat(posts.map(function (p) { return Object.assign({ src: 'yours' }, p); })).sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    $('sk-posts').innerHTML = head('Content', 'Community posts', posts.length ? 'Real data · your posts' : 'Suggested posts until you add yours', !!posts.length) +
      '<div class="even h-md"><div class="card"><h3>Plan a post</h3><form class="k-form fill" id="sp-form"><label class="wide">Post<input id="sp-title" required placeholder="Introduce yourself thread"></label><label>Date<input id="sp-date" type="date" required></label><label>Type<select id="sp-type"><option>Discussion</option><option>Announcement</option><option>Win of the week</option><option>Lesson drop</option><option>Event</option><option>Poll</option></select></label><label class="wide">Status<select id="sp-status"><option>Idea</option><option>Drafted</option><option>Scheduled</option><option>Posted</option></select></label><div class="btnrow wide"><button class="btn primary" type="submit">Add post</button></div></form></div>' +
      '<div class="card"><h3>Post calendar</h3><div class="fill">' + (all.map(function (p) { return '<div class="soc"><span class="mono small">' + nice(p.date) + '</span><span><b style="font-weight:600">' + E(p.title) + '</b><br><span class="small">' + E(p.type || '') + (p.src === 'plan' ? ' · from the launch content plan' : '') + '</span></span><span class="pill ' + ({ Idea: 'p-idea', Drafted: 'p-draft', Scheduled: 'p-sched', Posted: 'p-ok' }[p.status] || 'p-idea') + '">' + E(p.status) + '</span></div>'; }).join('') || '<p class="k-hint">No community posts planned yet.</p>') + '</div></div></div>';
    $('sp-form').onsubmit = function (e) { e.preventDefault(); posts.push({ id: PK.uid('p'), title: $('sp-title').value.trim(), date: $('sp-date').value, type: $('sp-type').value, status: $('sp-status').value }); save(); renderPosts(); };
  }

  /* ---------- Automations ---------- */
  function renderAutos() {
    var st = { Idea: 'st-draft', 'Ready to set up': 'st-test', On: 'st-vetted', Off: 'st-draft' };
    $('sk-auto').innerHTML = head('Automations', 'Community automations', 'Planned · nothing turns on without you', false) +
      '<div class="even one h-md"><div class="card"><div class="fill"><table class="k-tbl"><thead><tr><th>Automation</th><th>Runs in</th><th>What it does</th><th>Status</th></tr></thead><tbody>' +
        autos.map(function (a, i) { return '<tr><td><b style="font-weight:600">' + E(a.name) + '</b></td><td>' + E(a.tool) + '</td><td class="k-hint">' + E(a.what) + '</td><td><select class="k-in" data-au="' + i + '">' + ['Idea', 'Ready to set up', 'On', 'Off'].map(function (s) { return '<option' + (a.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td></tr>'; }).join('') +
      '</tbody></table></div><p class="k-hint">Status here is your checklist. Setting something to On only records that you switched it on in Skool or GoHighLevel; this page does not turn anything on by itself.</p></div></div>';
    document.querySelectorAll('[data-au]').forEach(function (s) { s.onchange = function () { autos[+s.dataset.au].status = s.value; save(); }; });
  }

  /* ---------- Message templates ---------- */
  var TPL = [
    ['Welcome (new member)', 'Hi [First name],\n\nWelcome in! I’m so glad you’re here. Start with the “Start Here” course in the Classroom, then introduce yourself in the community.\n\nOur next live session is [session] on [date]. I’d love to see you there.\n\nWith gratitude,\n\nTanika Crawford\nFounder and community host'],
    ['Session reminder', 'Hi [First name],\n\nQuick reminder: [session] is [date] at [time]. Here’s the link: [link]\n\nBring one question you want answered.\n\nWith gratitude,\n\nTanika Crawford\nFounder and community host'],
    ['Weekly recap post', 'This week in the community:\n\n• Wins: [wins]\n• New in the Classroom: [lesson]\n• Next week: [sessions]\n\nYour turn: what’s one thing you tried this week?'],
    ['We missed you', 'Hi [First name],\n\nI noticed it’s been a little while. Here’s what you missed: [highlights]. The recording of [session] is in the Classroom whenever you’re ready.\n\nWith gratitude,\n\nTanika Crawford\nFounder and community host']
  ];
  function renderMsgs() {
    $('sk-msgs').innerHTML = head('Automations', 'Message templates', 'Drafts · review before sending', false) +
      '<div class="even h-sm">' + TPL.map(function (t, i) { return '<div class="card"><div class="toolbar"><h3 style="margin:0">' + E(t[0]) + '</h3><span style="flex:1"></span><button class="btn small-btn" data-copy="' + i + '">Copy</button></div><div class="fill"><pre style="white-space:pre-wrap;font:inherit;font-size:14px;margin:0">' + E(t[1]) + '</pre></div></div>'; }).join('') + '</div>';
    document.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { navigator.clipboard.writeText(TPL[+b.dataset.copy][1]).then(function () { PK.say('Copied'); }); }; });
  }

  function renderAll() { renderToday(); renderLaunch(); renderSessions(); renderCourses(); renderMembers(); renderPosts(); renderAutos(); renderMsgs(); }
  renderAll();
  show('today');
})();
