// Client Login, My Projects and the Admin Office, inside the building.
// Plain DOM like send.js, so the original ChatGPT building code stays untouched.
// Everything here is hidden until suites/backend-config.js has the project URL.
import * as api from './backend.js';

const BUSINESS = { allure_fusions: 'Allure Fusions', ai_authoritech: 'AI AuthoriTech', madam_allure: 'Madam Allure' };
const ACCENT = { allure_fusions: '#21b8b0', ai_authoritech: '#4f7cff', madam_allure: '#cb9671' };
const ORDER_STATUS = ['New Request', 'Pending Review', 'Quoted', 'Deposit Paid', 'In Production', 'Ready', 'Shipped', 'Completed', 'On Hold', 'Cancelled'];
const AI_STATUS = ['New', 'Contacted', 'Discovery scheduled', 'Proposal sent', 'Active', 'Completed', 'Declined'];
const PAID = { no: 'Not paid yet', deposit: 'Deposit received', paid_in_full: 'Paid in full', refunded: 'Refunded' };
const FOLDER = { order: 'orders', ai_intake: 'ai', madam_allure_order: 'madam-allure' };

const money = (n) => (n == null || n === '' ? '' : `$${Number(n).toFixed(2).replace(/\.00$/, '')}`);
const day = (d) => (d ? new Date(String(d).length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const when = (d) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

// ---------- panel shell ----------
let panel, body, lastFocus;
function openPanel(title, eyebrow) {
  // Owner, Nov 27: switching pages inside an open panel must not replay the slide-in
  // (it faded from transparent and showed the receptionist in between pages).
  const switching = !!panel;
  if (!panel) {
    lastFocus = document.activeElement;
    panel = h('div', { class: 'ccs-portal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ccs-portal-title' });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
    panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
    document.body.appendChild(panel);
    document.body.dataset.portalOpen = '';
  }
  panel.replaceChildren();
  const sheet = h('section', { class: switching ? 'ccs-portal-sheet stay' : 'ccs-portal-sheet' });
  const head = h('header', {},
    h('div', {}, h('small', { text: eyebrow || 'CRAWFORD CREATIVE SUITES' }), h('h2', { id: 'ccs-portal-title', text: title })),
    h('button', { type: 'button', class: 'ccs-x', 'aria-label': 'Close', onclick: closePanel, text: '×' }));
  body = h('div', { class: 'ccs-portal-body' });
  sheet.append(head, body);
  panel.append(sheet);
  setTimeout(() => (panel.querySelector('input,select,button:not(.ccs-x)') || panel.querySelector('.ccs-x'))?.focus(), 30);
  return body;
}
function closePanel() {
  panel?.remove();
  panel = null;
  delete document.body.dataset.portalOpen;
  if (/^#(login|projects|admin)/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  lastFocus?.focus?.();
}
const note = (text, kind = '') => h('p', { class: `ccs-note ${kind}`, role: kind === 'err' ? 'alert' : 'status', text });
const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };

// ---------- Client Login ----------
function showLogin(message) {
  const b = openPanel('Client Login', 'MY ORDERS');
  const form = h('form', { class: 'ccs-form' },
    h('p', { text: 'No password needed. Enter the email you used for your order or request, and we will email you a secure sign-in link.' }),
    h('label', {}, 'Email', h('input', { name: 'email', type: 'email', autocomplete: 'email', required: true, value: api.currentEmail() || '' })),
    h('button', { class: 'ccs-primary', type: 'submit', text: 'Email me a sign-in link' }));
  const out = h('div');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    busy(btn, true, 'Sending…');
    try {
      await api.sendMagicLink(form.email.value.trim());
      out.replaceChildren(note(`Check ${form.email.value.trim()} for an email from Crawford Creative Suites, and tap the link to open My Orders. It can take a minute to arrive.`, 'ok'),
        previewMailboxLink());
      busy(btn, false, 'Send it again');
    } catch (err) {
      out.replaceChildren(note(err.message, 'err'));
      busy(btn, false, 'Email me a sign-in link');
    }
  };
  b.append(message ? note(message, 'err') : '', form, out, lookupBox());
}

function previewMailboxLink() {
  if (!window.CCS_BACKEND?.preview) return '';
  return h('p', { class: 'ccs-preview' }, 'Preview mode: the email waits in the ', h('a', { href: `${window.CCS_BACKEND.url}/dev/mailbox`, target: '_blank', text: 'preview mailbox' }), '.');
}

function lookupBox() {
  const d = h('details', { class: 'ccs-lookup' }, h('summary', { text: 'Check one order without signing in' }));
  const form = h('form', { class: 'ccs-form' },
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Order number', h('input', { name: 'number', placeholder: 'AFF-0002', required: true, autocapitalize: 'characters' })),
      h('label', {}, 'Email on the order', h('input', { name: 'email', type: 'email', autocomplete: 'email', required: true }))),
    h('button', { type: 'submit', text: 'Check status' }));
  const out = h('div', { 'aria-live': 'polite' });
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.fn('order-status', { number: form.number.value, email: form.email.value });
      out.replaceChildren(h('div', { class: 'ccs-status-card' }, h('strong', { text: r.number }), statusPill(r.status),
        h('span', { text: PAID[r.paid] || '' }), r.due_date ? h('span', { text: `Due ${day(r.due_date)}` }) : ''));
    } catch (err) {
      out.replaceChildren(note(err.status === 404 ? 'We could not find that order with that email. Check the number in your confirmation.' : err.message, 'err'));
    }
  };
  d.append(form, out);
  return d;
}

const statusPill = (s) => h('span', { class: 'ccs-pill', 'data-status': s, text: s });

// ---------- My Projects ----------
async function showProjects(flash) {
  const b = openPanel('Your orders & projects', 'MY ORDERS');
  b.append(note('Loading your projects…'));
  let data;
  try { data = await api.rpc('my_projects'); } catch (err) {
    if (/sign in/i.test(err.message) || err.status === 401) return showLogin('Your sign-in has expired. Ask for a new link.');
    b.replaceChildren(note(err.message, 'err')); return;
  }
  b.replaceChildren();
  const bar = h('div', { class: 'ccs-bar' }, h('span', { text: `Signed in as ${data.email}` }),
    data.is_admin ? h('button', { type: 'button', class: 'ccs-primary', onclick: () => showAdmin(), text: 'Admin Office' }) : '',
    h('button', { type: 'button', onclick: async () => { await api.signOut(); closePanel(); }, text: 'Sign out' }));
  b.append(bar);
  if (flash) b.append(note(flash, 'ok'));
  if (!data.projects.length) {
    b.append(h('div', { class: 'ccs-empty' }, h('p', { text: 'There are no orders or projects under this email yet.' }),
      h('p', { text: 'Requests sent from Allure Fusions, AI AuthoriTech or Madam Allure appear here once they are received.' })));
  }
  for (const p of data.projects) b.append(projectCard(p));
  b.append(linksBox());
}

function paymentLine(p) {
  if (p.quote == null) return p.business === 'madam_allure' && p.kind === 'shop' ? PAID[p.paid] : 'Your quote is being prepared.';
  const parts = [`Quote ${money(p.quote)}`, PAID[p.paid]];
  if (Number(p.balance) > 0 && p.paid !== 'refunded') parts.push(`${money(p.balance)} balance`);
  return parts.filter(Boolean).join(' · ');
}

function projectCard(p) {
  const card = h('article', { class: 'ccs-card', style: `--biz:${ACCENT[p.business]}` },
    h('header', {}, h('small', { text: `${BUSINESS[p.business]} · ${p.number}` }), statusPill(p.status)),
    h('h3', { text: p.title }),
    h('p', { class: 'ccs-pay', text: paymentLine(p) }),
    p.due_date ? h('p', { class: 'ccs-meta', text: `${p.business === 'madam_allure' ? 'Needed by' : 'Due'} ${day(p.due_date)}` }) : '',
    h('p', { class: 'ccs-meta', text: `Sent ${day(p.created_at)} · last update ${day(p.last_status_change)}` }));

  if (p.can_pay && window.CCS_BACKEND?.paymentProvider) {
    const due = Math.max(Number(p.deposit_required ?? p.quote) - Number(p.amount_paid), 0);
    const pay = h('div', { class: 'ccs-actions' });
    if (due > 0 && due < Number(p.balance)) pay.append(h('button', { type: 'button', class: 'ccs-primary', onclick: (e) => checkout(e.target, p.number, 'deposit'), text: `Pay deposit ${money(due)}` }));
    pay.append(h('button', { type: 'button', class: due > 0 && due < Number(p.balance) ? '' : 'ccs-primary', onclick: (e) => checkout(e.target, p.number, 'balance'), text: `Pay ${Number(p.amount_paid) > 0 ? 'balance' : 'in full'} ${money(p.balance)}` }));
    card.append(pay);
  } else if (p.can_pay) {
    card.append(h('p', { class: 'ccs-meta', text: "We'll send your invoice (card via Wave or PayPal)." }));
  }
  if (p.events.length) {
    card.append(h('details', { class: 'ccs-history' }, h('summary', { text: 'History' }),
      h('ol', {}, p.events.map((e) => h('li', {}, h('span', { text: when(e.at) }), ` ${e.field === 'paid' ? 'Payment' : 'Status'}: ${e.field === 'paid' ? PAID[e.new] || e.new : e.new}`)))));
  }
  card.append(filesBox(p, false));
  return card;
}

async function checkout(btn, number, kind) {
  const label = btn.textContent;
  busy(btn, true, 'Opening checkout…');
  try {
    const r = await api.fn('checkout', { number, kind }, { auth: true });
    location.href = r.url;
  } catch (err) {
    busy(btn, false, label);
    btn.after(note(err.message, 'err'));
  }
}

function filesBox(p, admin) {
  const box = h('div', { class: 'ccs-files' }, h('strong', { text: 'Files' }));
  const list = h('ul');
  for (const f of p.files || []) {
    list.append(h('li', {}, h('button', { type: 'button', class: 'ccs-link', onclick: async (e) => {
      try { window.open(await api.downloadUrl(f.path), '_blank', 'noopener'); } catch (err) { e.target.after(note(err.message, 'err')); }
    }, text: f.name }), h('small', { text: ` ${f.by === 'admin' ? (admin ? 'from you' : 'from us') : (admin ? 'from client' : 'from you')} · ${day(f.at)}` })));
  }
  if (!list.children.length) list.append(h('li', { class: 'ccs-meta', text: 'No files yet.' }));
  const input = h('input', { type: 'file', accept: api.FILE_TYPES, multiple: true, 'aria-label': `Add files to ${p.number}` });
  const status = h('div', { 'aria-live': 'polite' });
  input.onchange = async () => {
    for (const file of input.files) {
      const bad = api.checkFile(file);
      if (bad) { status.append(note(bad, 'err')); continue; }
      const line = note(`Uploading ${file.name}…`);
      status.append(line);
      try {
        await api.uploadFile(`${FOLDER[p.entity_type]}/${p.number}`, file);
        line.textContent = `${file.name} uploaded.`;
        line.className = 'ccs-note ok';
      } catch (err) { line.textContent = `${file.name}: ${err.message}`; line.className = 'ccs-note err'; }
    }
    input.value = '';
  };
  box.append(list, h('label', { class: 'ccs-upload' }, 'Add a file (JPG, PNG, PDF, SVG, DXF, STL or 3MF, up to 25 MB)', input), status);
  return box;
}

function linksBox() {
  const l = window.CCS_BACKEND?.links || {};
  if (!l.classes && !l.booking) return '';
  return h('div', { class: 'ccs-links' }, h('strong', { text: 'Classes and one-on-ones' }),
    l.booking ? h('a', { href: l.booking, target: '_blank', rel: 'noopener', text: 'Book a one-on-one ↗' }) : '',
    l.classes ? h('a', { href: l.classes, target: '_blank', rel: 'noopener', text: 'Classes and community ↗' }) : '');
}

// ---------- Admin Office ----------
let adminState = { tab: 'overview', status: '', q: '' };
async function showAdmin(flash) {
  // Already in the Admin Office (changing tabs, Refresh)? Keep the current page on screen
  // until the new one is ready, instead of flashing "Loading…".
  const inAdmin = panel && panel.querySelector('#ccs-portal-title')?.textContent === 'Admin Office';
  const fresh = () => { const body = openPanel('Admin Office', 'PRIVATE · ADMIN ONLY'); panel.querySelector('.ccs-portal-sheet').classList.add('wide'); return body; };
  let b = inAdmin ? null : fresh();
  if (b) b.append(note('Loading…'));
  else panel.querySelector('.ccs-portal-sheet').setAttribute('aria-busy', 'true');
  let d;
  try { d = await api.rpc('admin_overview'); } catch (err) {
    b = b || fresh();
    b.replaceChildren(note(err.status === 403 || /admin only/.test(err.message) ? 'The Admin Office is only for Crawford Creative Suites staff.' : err.message, 'err'));
    return;
  }
  if (!b) {
    const scroll = panel.querySelector('.ccs-portal-sheet').scrollTop;
    b = fresh();
    panel.querySelector('.ccs-portal-sheet').scrollTop = scroll;
  }
  const tabs = [['overview', 'Overview'], ['allure_fusions', 'Allure Fusions'], ['ai_authoritech', 'AI AuthoriTech'], ['madam_allure', 'Madam Allure Orders'], ['leads', 'Leads']];
  const nav = h('nav', { class: 'ccs-tabs', role: 'tablist' }, tabs.map(([k, label]) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': String(adminState.tab === k), onclick: () => { adminState.tab = k; adminState.status = ''; showAdmin(); }, text: label })));
  const top = h('div', { class: 'ccs-bar' }, h('button', { type: 'button', onclick: () => showProjects(), text: '← My Orders' }),
    h('button', { type: 'button', onclick: () => showAdmin(), text: 'Refresh' }));
  b.replaceChildren(top, nav);
  if (flash) b.append(note(flash, 'ok'));
  if (adminState.tab === 'overview') return b.append(overview(d));
  if (adminState.tab === 'leads') return b.append(leadsList(d.leads));
  b.append(projectList(d.projects.filter((p) => p.business === adminState.tab)));
}

function overview(d) {
  const t = d.totals;
  const tile = (n, label, warn) => h('div', { class: `ccs-tile${warn ? ' warn' : ''}` }, h('strong', { text: n }), h('span', { text: label }));
  const wrap = h('div', {},
    h('div', { class: 'ccs-tiles' }, tile(t.new, 'New requests'), tile(t.open, 'Open'), tile(money(t.paid_total) || '$0', 'Paid'),
      tile(money(t.owed_total) || '$0', 'Owed'), tile(t.overdue, 'Overdue', t.overdue > 0), tile(t.due_this_week, 'Due this week')));
  const byBiz = h('table', { class: 'ccs-table' }, h('thead', {}, h('tr', {}, ['Business', 'Open', 'Paid', 'Owed'].map((x) => h('th', { text: x })))),
    h('tbody', {}, Object.keys(BUSINESS).map((k) => {
      const rows = d.projects.filter((p) => p.business === k);
      const open = rows.filter((p) => !['Completed', 'Cancelled', 'Declined', 'Shipped'].includes(p.status)).length;
      const paid = rows.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
      const owed = rows.filter((p) => p.quote != null && !['Cancelled', 'Declined'].includes(p.status)).reduce((s, p) => s + Number(p.balance || 0), 0);
      return h('tr', {}, h('td', { text: BUSINESS[k] }), h('td', { text: open }), h('td', { text: money(paid) || '$0' }), h('td', { text: money(owed) || '$0' }));
    })));
  const newest = d.projects.filter((p) => ['New Request', 'New', 'Pending Review'].includes(p.status) || p.overdue);
  wrap.append(byBiz, h('h3', { text: 'Needs attention' }), newest.length ? projectList(newest, true) : note('Nothing new or overdue.'),
    h('p', { class: 'ccs-meta', text: `${d.outbox_pending} event(s) waiting to send to GHL.` }));
  return wrap;
}

function projectList(rows, compact) {
  const wrap = h('div');
  if (!compact) {
    const statuses = [...new Set(rows.map((r) => r.status))];
    const filter = h('div', { class: 'ccs-filter' },
      h('label', {}, 'Status', h('select', { onchange: (e) => { adminState.status = e.target.value; render(); } },
        h('option', { value: '', text: 'All' }), statuses.map((s) => h('option', { value: s, text: s, selected: adminState.status === s ? 'selected' : null })))),
      h('label', {}, 'Search', h('input', { type: 'search', value: adminState.q, placeholder: 'Name, email or number', oninput: (e) => { adminState.q = e.target.value; render(); } })));
    wrap.append(filter);
  }
  const list = h('div', { class: 'ccs-rows' });
  wrap.append(list);
  function render() {
    const q = adminState.q.toLowerCase();
    const shown = compact ? rows : rows.filter((r) => (!adminState.status || r.status === adminState.status)
      && (!q || [r.number, r.name, r.email, r.title].some((x) => String(x || '').toLowerCase().includes(q))));
    list.replaceChildren(...(shown.length ? shown.map(adminRow) : [note('No records match.')]));
    if (!compact && adminState.tab === 'madam_allure') {
      const web = shown.filter((r) => r.kind !== 'shop'), shop = shown.filter((r) => r.kind === 'shop');
      list.replaceChildren(h('h3', { text: 'Custom and memorial requests (website)' }), ...(web.length ? web.map(adminRow) : [note('None yet.')]),
        h('h3', { text: 'Ueni shop orders (synced from email)' }), ...(shop.length ? shop.map(adminRow) : [note('None synced yet.')]));
    }
  }
  render();
  return wrap;
}

function adminRow(p) {
  const d = h('details', { class: `ccs-row${p.overdue ? ' overdue' : ''}`, style: `--biz:${ACCENT[p.business]}` });
  d.append(h('summary', {},
    h('span', { class: 'n', text: p.number }), h('span', { class: 'who', text: p.name }), h('span', { class: 'what', text: p.title }),
    statusPill(p.status), h('span', { class: 'm', text: p.quote != null ? `${money(p.amount_paid) || '$0'} of ${money(p.quote)}` : PAID[p.paid] }),
    h('span', { class: 'due', text: p.due_date ? `${p.overdue ? 'Overdue · ' : ''}${day(p.due_date)}` : '' })));
  d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) d.append(adminDetail(p)); }, { once: false });
  return d;
}

function adminDetail(p) {
  const wrap = h('div', { class: 'ccs-detail' });
  const contact = h('p', { class: 'ccs-meta' }, h('a', { href: `mailto:${p.email}`, text: p.email }), p.phone ? ` · ${p.phone}` : '', ` · ${String(p.source || '').replace(/\s*—\s*/g, ': ')}`, p.rush ? ' · RUSH' : '');
  const fields = p.form_fields && Object.keys(p.form_fields).length
    ? h('details', { class: 'ccs-history' }, h('summary', { text: 'Everything they sent' }),
        h('dl', {}, Object.entries(p.form_fields).flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])))
    : (p.details ? h('p', { class: 'ccs-details', text: p.details }) : '');
  const statuses = p.entity_type === 'ai_intake' ? AI_STATUS : ORDER_STATUS;
  const form = h('form', { class: 'ccs-form ccs-edit' },
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Status', h('select', { name: 'status' }, statuses.map((s) => h('option', { value: s, text: s, selected: s === p.status ? 'selected' : null })))),
      h('label', {}, p.entity_type === 'madam_allure_order' ? 'Amount' : 'Quote', h('input', { name: 'quote', type: 'number', min: '0', step: '0.01', value: p.quote ?? '' }))),
    h('div', { class: 'ccs-pair' },
      p.entity_type === 'ai_intake'
        ? h('label', {}, 'Deposit due (from proposal)', h('input', { name: 'deposit_due', type: 'number', min: '0', step: '0.01', value: p.deposit_required ?? '' }))
        : h('label', {}, p.entity_type === 'madam_allure_order' ? 'Needed by' : 'Due date', h('input', { name: 'due_date', type: 'date', value: p.due_date || '' })),
      p.entity_type === 'madam_allure_order' ? h('span') : h('label', {}, 'Payment link (GHL or Stripe)', h('input', { name: 'payment_link', type: 'url', placeholder: 'https://', value: p.payment_link || '' }))),
    h('label', {}, 'Private notes (clients never see these)', h('textarea', { name: 'notes', rows: 3, text: p.notes || '' })),
    h('button', { class: 'ccs-primary', type: 'submit', text: 'Save changes' }));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const patch = {};
    for (const el of form.elements) if (el.name) patch[el.name] = el.value;
    try { await api.rpc('admin_update', { p_entity_type: p.entity_type, p_id: p.id, p_patch: patch }); showAdmin(`${p.number} saved.`); }
    catch (err) { form.append(note(err.message, 'err')); }
  };
  const payForm = h('form', { class: 'ccs-form ccs-pair3' },
    h('label', {}, 'Amount received', h('input', { name: 'amount', type: 'number', min: '0.01', step: '0.01', required: true })),
    h('label', {}, 'Type', h('select', { name: 'kind' }, [['deposit', 'Deposit'], ['balance', 'Balance'], ['full', 'Paid in full'], ['refund', 'Refund']].map(([v, t]) => h('option', { value: v, text: t })))),
    h('label', {}, 'Note', h('input', { name: 'note', placeholder: 'Wave invoice, PayPal invoice, cash…' })),
    h('button', { type: 'submit', text: 'Record payment' }));
  payForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api.rpc('admin_record_payment', { p_number: p.number, p_kind: payForm.kind.value, p_amount: Number(payForm.amount.value), p_note: payForm.note.value });
      showAdmin(`Payment recorded on ${p.number}.`);
    } catch (err) { payForm.append(note(err.message, 'err')); }
  };
  const member = h('button', { type: 'button', disabled: p.is_member ? true : null, text: p.is_member ? 'Skool member' : 'Send Skool invite (through GHL)', onclick: async (e) => {
    try { await api.rpc('admin_invite_member', { p_email: p.email, p_business: p.business }); e.target.textContent = 'Invite queued for GHL'; e.target.disabled = true; }
    catch (err) { e.target.after(note(err.message, 'err')); }
  } });
  const hist = p.events?.length ? h('details', { class: 'ccs-history' }, h('summary', { text: 'Change history' }),
    h('ol', {}, p.events.map((ev) => h('li', {}, h('span', { text: when(ev.at) }), ` ${ev.field}: ${ev.old ?? '(blank)'} → ${ev.new ?? '(blank)'} `, h('small', { text: ev.by || '' }))))) : '';
  wrap.append(contact, fields, form, h('h4', { text: 'Payments' }), payForm, filesBox(p, true), hist, h('div', { class: 'ccs-actions' }, member));
  return wrap;
}

function leadsList(leads) {
  if (!leads.length) return note('No leads yet.');
  return h('table', { class: 'ccs-table' }, h('thead', {}, h('tr', {}, ['Date', 'Name', 'Email', 'Interest', 'Source', 'Message'].map((x) => h('th', { text: x })))),
    h('tbody', {}, leads.map((l) => h('tr', {}, h('td', { text: day(l.created_at) }), h('td', { text: l.name }), h('td', {}, h('a', { href: `mailto:${l.email}`, text: l.email })),
      h('td', { text: BUSINESS[l.business_interest] }), h('td', { text: l.source }), h('td', { text: l.message || '' })))));
}

// ---------- website requests (forms) ----------
const FORM_OF = [[/^Allure Fusions/i, 'order'], [/^AI AuthoriTech/i, 'ai_intake'], [/^Madam Allure/i, 'ma_request']];

// Returns true when the request was saved online; false means "use the email fallback".
export async function submitRequest(subject, formEl) {
  if (!api.ready() || !formEl) return false;
  const form = (FORM_OF.find(([re]) => re.test(subject)) || [])[1];
  if (!form) return false;
  const fields = {};
  let hp = '';
  for (const [k, v] of new FormData(formEl).entries()) {
    if (typeof v !== 'string') continue;
    if (k === '_hp') { hp = v; continue; }
    if (!k.startsWith('_')) fields[k] = v;
  }
  if (form === 'ma_request' && !fields['Request type']) fields['Request type'] = 'Product question';
  const files = [...formEl.querySelectorAll('input[type=file]')].flatMap((i) => [...(i.files || [])]);
  const bad = files.map(api.checkFile).find(Boolean);
  if (bad) { sentNotice({ error: bad }); return true; }

  sentNotice({ working: true });
  let r;
  try {
    r = await api.fn('intake', { form, fields, _hp: hp, files: files.map((f) => ({ name: f.name, type: api.mimeFor(f), size: f.size })),
      turnstileToken: await api.turnstileToken(), utm: api.utm() });
  } catch (err) {
    if (err.status >= 400 && err.status < 500) { sentNotice({ error: err.message }); return true; }
    document.querySelector('.ccs-sent')?.remove();
    return false;   // network or server trouble: fall back to email
  }
  const failed = [];
  for (const u of r.uploads || []) {
    const file = files.find((f) => f.name === u.name);
    try { await api.uploadToSignedUrl(u.url, file); } catch { failed.push(u.name); }
  }
  sentNotice({ number: r.number, email: fields.Email, failed });
  return true;
}

function sentNotice({ working, error, number, email, failed = [] }) {
  document.querySelector('.ccs-sent')?.remove();
  const box = h('div', { class: 'ccs-sent', role: 'dialog', 'aria-label': 'Your request' });
  if (working) box.append(h('strong', { text: 'Sending your request…' }));
  else if (error) box.append(h('strong', { text: 'Please check your request' }), h('p', { text: error }), h('div', {}, h('button', { type: 'button', 'data-close': '', onclick: () => box.remove(), text: 'Close' })));
  else {
    box.append(h('strong', { text: 'Request received' }),
      h('p', { text: number ? `Thank you! Your request number is ${number}. We will reply by email.` : 'Thank you! We will reply by email.' }),
      failed.length ? h('p', { text: `${failed.join(', ')} did not upload. You can add it from My Orders after you sign in.` }) : '');
    const actions = h('div');
    if (api.signedIn() && api.currentEmail() === String(email || '').toLowerCase()) {
      actions.append(h('button', { type: 'button', 'data-copy': '', onclick: () => { box.remove(); open('projects'); }, text: 'Open My Orders' }));
    } else if (email) {
      actions.append(h('button', { type: 'button', 'data-copy': '', text: 'Follow it online: email me a sign-in link', onclick: async (e) => {
        busy(e.target, true, 'Sending…');
        try { await api.sendMagicLink(email); e.target.replaceWith(note(`Sign-in link sent to ${email}. No password needed.`, 'ok')); box.append(previewMailboxLink()); }
        catch (err) { busy(e.target, false, 'Try again'); box.append(note(err.message, 'err')); }
      } }));
    }
    actions.append(h('button', { type: 'button', 'data-close': '', onclick: () => box.remove(), text: 'Close' }));
    box.append(actions);
  }
  document.body.appendChild(box);
  box.querySelector('button')?.focus();
}

// Madam Allure custom gift / memorial request (works by email too, before Supabase is live).
export function maRequest(kind = 'custom') {
  const b = openPanel(kind === 'memorial' ? 'Request a memorial piece' : 'Request a custom gift', 'MADAM ALLURE');
  panel.dataset.suite = '217';
  const form = h('form', { class: 'ccs-form' },
    h('p', { text: 'Tell us what you have in mind. Every personalized piece is reviewed before we send a quote.' }),
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Name', h('input', { name: 'Name', autocomplete: 'name', required: true })),
      h('label', {}, 'Email', h('input', { name: 'Email', type: 'email', autocomplete: 'email', required: true }))),
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Phone (optional)', h('input', { name: 'Phone', type: 'tel', autocomplete: 'tel' })),
      h('label', {}, 'Request type', h('select', { name: 'Request type' },
        h('option', { text: 'Custom gift', selected: kind !== 'memorial' ? 'selected' : null }), h('option', { text: 'Memorial gift', selected: kind === 'memorial' ? 'selected' : null })))),
    h('label', {}, 'Item or occasion', h('input', { name: 'Item', placeholder: kind === 'memorial' ? 'Memorial ribbons, fans, a plaque…' : 'Bridal set, birthday box, corporate gifts…' })),
    h('label', {}, 'Personalization', h('textarea', { name: 'Personalization', rows: 2, placeholder: 'Names, dates, colors or wording' })),
    h('label', {}, 'Details', h('textarea', { name: 'Details', rows: 3, required: true })),
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Needed by', h('input', { name: 'Needed by', type: 'date' })),
      h('label', {}, 'Budget range', h('input', { name: 'Budget range' }))),
    h('label', {}, 'Quantity', h('input', { name: 'Quantity', type: 'number', min: '1', value: '1' })),
    api.ready() ? h('label', { class: 'ccs-upload' }, 'Photos or artwork (optional, JPG, PNG or PDF, up to 25 MB)', h('input', { type: 'file', name: '_files', accept: '.jpg,.jpeg,.png,.pdf', multiple: true })) : '',
    h('input', { name: '_hp', class: 'ccs-hp', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
    h('button', { class: 'ccs-primary', type: 'submit', text: 'Send my request' }));
  form.onsubmit = (e) => {
    e.preventDefault();
    const lines = [];
    for (const [k, v] of new FormData(form).entries()) if (typeof v === 'string' && v.trim() && !k.startsWith('_')) lines.push(`${k}: ${v}`);
    closePanel();
    window.ccsSendRequest(`Madam Allure: ${kind === 'memorial' ? 'Memorial request' : 'Custom gift request'}`, lines.join('\n'), form);
  };
  b.append(form);
}

// Light capture for visitors not ready to send a project (concierge, Maker's Lounge).
export function lead(interest = '', source = 'Website - lead capture') {
  const b = openPanel('Leave your details', 'STAY IN TOUCH');
  const form = h('form', { class: 'ccs-form' },
    h('p', { text: 'Not ready for a full request? Leave your details and we will reach out about what you are interested in.' }),
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Name', h('input', { name: 'Name', autocomplete: 'name', required: true })),
      h('label', {}, 'Email', h('input', { name: 'Email', type: 'email', autocomplete: 'email', required: true }))),
    h('div', { class: 'ccs-pair' },
      h('label', {}, 'Phone (optional)', h('input', { name: 'Phone', type: 'tel', autocomplete: 'tel' })),
      h('label', {}, 'Interested in', h('select', { name: 'Business interest', required: true },
        h('option', { value: '', text: 'Choose one' }), Object.entries(BUSINESS).map(([k, v]) => h('option', { value: k, text: v, selected: k === interest ? 'selected' : null }))))),
    h('label', {}, 'Message (optional)', h('textarea', { name: 'Message', rows: 3 })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'Consent', value: 'yes', required: true }),
      ' Yes, you may keep my name and contact details to follow up with me. We never sell or share them.'),
    h('input', { name: '_hp', class: 'ccs-hp', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
    h('button', { class: 'ccs-primary', type: 'submit', text: 'Send my details' }));
  const out = h('div', { 'aria-live': 'polite' });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const fields = {};
    for (const [k, v] of new FormData(form).entries()) if (!k.startsWith('_')) fields[k] = v;
    busy(btn, true, 'Sending…');
    try {
      await api.fn('intake', { form: 'lead', fields, _hp: form._hp.value, source, utm: api.utm(), turnstileToken: await api.turnstileToken() });
      form.replaceWith(note('Thank you! Your details are saved, and we will be in touch soon.', 'ok'));
    } catch (err) { busy(btn, false, 'Send my details'); out.replaceChildren(note(err.message, 'err')); }
  };
  b.append(form, out);
}

// ---------- entry points ----------
export function open(view) {
  if (!api.ready()) return;
  if (view === 'admin') return api.signedIn() ? showAdmin() : showLogin();
  if (view === 'projects' || view === 'paid') {
    return api.signedIn() ? showProjects(view === 'paid' ? 'Thank you! Your payment is being recorded and will show here in a moment.' : '') : showLogin();
  }
  return api.signedIn() ? showProjects() : showLogin();
}

function syncLoginButtons() {
  const label = api.signedIn() ? 'My Orders' : 'Log In';
  document.querySelectorAll('[data-client-login]').forEach((b) => { if (b.textContent !== label) b.textContent = label; });
}

// Maker's Lounge: a small "leave your details" link for visitors not ready to submit.
function decorateLounges() {
  const lounge = document.querySelector('.business-showroom.lounge');
  if (!lounge || lounge.querySelector('.ccs-lounge-lead')) return;
  const suite = lounge.closest('[data-suite]')?.dataset.suite;
  const interest = { 217: 'madam_allure', 305: 'allure_fusions', 412: 'ai_authoritech' }[suite] || '';
  const where = { 217: 'The Powder Room', 305: 'The Designer Lounge', 412: 'The AI Clarity Lounge' }[suite] || 'Lounge';
  lounge.append(h('p', { class: 'ccs-lounge-lead' }, 'Not ready to start a project? ',
    h('button', { type: 'button', class: 'ccs-link', onclick: () => lead(interest, where), text: 'Leave your details' })));
}

window.ccsPortal = { ready: api.ready, open, lead, maRequest, submitRequest, close: closePanel };
window.ccsUploadsReady = api.ready;
window.ccsMaRequest = maRequest;

if (api.ready()) {
  const redirected = api.consumeRedirect();
  const start = () => {
    if (redirected?.error) showLogin(`That sign-in link did not work (${redirected.error}). Ask for a new one.`);
    else if (redirected?.signedIn) showProjects('You are signed in.');
    else if (location.hash === '#login') open('login');
    else if (location.hash === '#projects') open('projects');
    else if (location.hash === '#projects-paid') open('paid');
    else if (location.hash === '#admin') open('admin');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
  new MutationObserver(() => { syncLoginButtons(); decorateLounges(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('ccs-auth', syncLoginButtons);
}
