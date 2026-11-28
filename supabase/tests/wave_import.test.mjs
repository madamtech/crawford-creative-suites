// Wave import, customer/admin invoice RPCs, and the missing-information check
// (migration 20261128120000_wave_import_attention.sql). Run: npm run test:backend
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './pg.mjs';

let db;
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const all = async (sql, params) => (await db.query(sql, params)).rows;
let seq = 5000;
const imp = async (o) => (await one('select public.wave_import_invoice($1) as r', [JSON.stringify({
  business: 'allure_fusions', wave_invoice_id: 'wv-' + (++seq), number: String(seq), view_url: 'https://next.waveapps.com/x/' + seq,
  status: 'SAVED', total: 100, customer_name: 'Pat Customer', customer_email: 'pat@example.test', due_date: '2026-12-31',
  invoice_date: '2026-11-28', items_summary: 'Laser cut sign', test_mode: true, ...o })])).r;
const attn = (ref) => one('select * from public.needs_attention where ref_key like $1 order by id desc limit 1', [ref]);
const newAff = async (o = {}) => one(`insert into public.orders (name, email, phone, description, status, quote, due_date, shipping_address, is_test)
  values ($1, $2, $3, $4, $5, $6, $7, $8, true) returning id, order_number`,
  [o.name ?? 'TEST Pat', o.email ?? 'pat@example.test', o.phone ?? null, o.description === undefined ? 'Sign' : o.description, o.status ?? 'New Request', o.quote ?? null, o.due ?? null, o.addr ?? null]);

before(async () => { db = await openDb({ seed: true }); });

test('import matches by poNumber first, in the right business only', async () => {
  const o = await newAff({ quote: 100, status: 'Quoted' });
  const r = await imp({ po_number: o.order_number, customer_email: 'someone-else@example.test' });
  assert.equal(r.action, 'imported'); assert.equal(r.matched_by, 'po_number'); assert.equal(r.order, o.order_number);
  assert.equal(r.kind, 'full');                                      // total = quote
  const wrongBiz = await imp({ po_number: o.order_number, business: 'ai_authoritech', customer_email: 'nobody@example.test' });
  assert.equal(wrongBiz.linked, false);                              // an AFF number on an AIA invoice is not linked
});

test('import falls back to the customers one open order by email, else stays unlinked', async () => {
  const o = await newAff({ email: 'solo@example.test' });
  const r = await imp({ customer_email: 'SOLO@example.test', po_number: null });
  assert.equal(r.matched_by, 'customer_email'); assert.equal(r.order, o.order_number);
  await newAff({ email: 'two@example.test' }); await newAff({ email: 'two@example.test' });
  assert.equal((await imp({ customer_email: 'two@example.test' })).linked, false);   // two open orders: ambiguous
  assert.equal((await imp({ customer_email: 'stranger@example.test', po_number: 'NOPE-1' })).linked, false);
});

test('import is idempotent and keeps paid state out of the way until the poll books it', async () => {
  const body = { wave_invoice_id: 'wv-idem', po_number: null, customer_email: 'idem@example.test' };
  const a = await imp(body); const b = await imp(body);
  assert.equal(a.action, 'imported'); assert.equal(b.action, 'updated');
  assert.equal((await one(`select count(*)::int n from public.wave_invoices where wave_invoice_id = 'wv-idem'`)).n, 1);
});

test('an invoice the app is creating right now is not imported twice', async () => {
  const o = await newAff({ quote: 100, status: 'Quoted' });
  await db.query(`insert into public.wave_invoices (entity_type, entity_id, order_number, business, kind, amount, wave_status)
    values ('order', $1, $2, 'allure_fusions', 'deposit', 60, 'CREATING')`, [o.id, o.order_number]);
  assert.equal((await imp({ po_number: o.order_number, wave_invoice_id: 'wv-race' })).action, 'skipped');
});

test('customers see only their own invoices; admin sees all; browsers cannot read the table', async () => {
  const o = await newAff({ email: 'mine@example.test' });
  await imp({ po_number: o.order_number, customer_email: 'mine@example.test', wave_invoice_id: 'wv-mine', total: 40 });
  await imp({ customer_email: 'other@example.test', wave_invoice_id: 'wv-other', po_number: null });
  await imp({ customer_email: 'mine@example.test', wave_invoice_id: 'wv-draft', status: 'DRAFT', po_number: null });
  const mine = await db.as('authenticated', { email: 'mine@example.test' }, async (t) => (await t.query('select public.my_invoices() as r')).rows[0].r);
  assert.deepEqual(mine.map((i) => i.invoice_number).sort(), [mine.find((i) => i.order_number === o.order_number).invoice_number].sort());
  assert.ok(mine.every((i) => i.view_url.startsWith('https://')));
  assert.ok(!JSON.stringify(mine).includes('other@example.test'));
  assert.ok(!JSON.stringify(mine).match(/last_error|wave_customer_id|customer_email/));       // nothing internal leaks
  const nobody = await db.as('anon', {}, async (t) => { try { return (await t.query('select public.my_invoices() as r')).rows[0].r; } catch (e) { return 'denied'; } });
  assert.equal(nobody, 'denied');
  await assert.rejects(db.as('authenticated', { email: 'mine@example.test' }, (t) => t.query('select * from public.wave_invoices')), /permission denied/);
  await assert.rejects(db.as('authenticated', { email: 'mine@example.test' }, (t) => t.query('select public.admin_invoices()')), /admin only/);
  const adm = await db.as('authenticated', { email: 'admin@example.test' }, async (t) => (await t.query('select public.admin_invoices() as r')).rows[0].r);
  assert.ok(adm.invoices.length >= 3 && adm.unmatched >= 1);
});

test('admin can link an unmatched invoice to an order of the same business only; customers cannot', async () => {
  const o = await newAff({ email: 'link@example.test', quote: 55, status: 'Quoted' });
  const inv = await imp({ customer_email: 'nolink@example.test', po_number: 'X-1', total: 55 });
  await assert.rejects(db.as('authenticated', { email: 'link@example.test' }, (t) => t.query('select public.wave_link_invoice($1, $2)', [inv.id, o.order_number])), /admin only/);
  const ai = await one(`insert into public.ai_intake (name, email, status) values ('TEST AI', 'ai@example.test', 'New') returning intake_number`);
  await assert.rejects(db.as('authenticated', { email: 'admin@example.test' }, (t) => t.query('select public.wave_link_invoice($1, $2)', [inv.id, ai.intake_number])), /another business/);
  await assert.rejects(db.as('authenticated', { email: 'admin@example.test' }, (t) => t.query('select public.wave_link_invoice($1, $2)', [inv.id, 'AFF-9999'])), /was found/);
  const r = await db.as('authenticated', { email: 'admin@example.test' }, async (t) => (await t.query('select public.wave_link_invoice($1, $2) as r', [inv.id, o.order_number])).rows[0].r);
  assert.equal(r.order, o.order_number); assert.equal(r.kind, 'full');
  const row = await one('select entity_id, matched_by from public.wave_invoices where id = $1', [inv.id]);
  assert.deepEqual([row.entity_id, row.matched_by], [o.id, 'manual']);
  const mine = await db.as('authenticated', { email: 'link@example.test' }, async (t) => (await t.query('select public.my_invoices() as r')).rows[0].r);
  assert.equal(mine.length, 1);                                       // the order's owner now sees it
});

test('payments on a linked invoice are booked; on an unlinked one only status is recorded', async () => {
  const o = await newAff({ quote: 100, status: 'Quoted' });
  const linked = await imp({ po_number: o.order_number, total: 100 });
  const r = (await one(`select public.wave_apply_status($1, 'PAID', 100) as r`, [linked.id])).r;
  assert.equal(Number(r.delta), 100);
  assert.equal(Number((await one('select amount_paid from public.orders where id = $1', [o.id])).amount_paid), 100);
  const loose = await imp({ po_number: null, customer_email: 'loose@example.test', total: 30 });
  const r2 = (await one(`select public.wave_apply_status($1, 'PAID', 30) as r`, [loose.id])).r;
  assert.equal(r2.linked, false);
  assert.equal((await one('select wave_status from public.wave_invoices where id = $1', [loose.id])).wave_status, 'PAID');
});

test('an unmatched invoice lands in Needs attention in plain words, queues attention.needed once, and clears when linked', async () => {
  const before = (await one(`select count(*)::int n from public.event_outbox where event_type = 'attention.needed'`)).n;
  const inv = await imp({ customer_email: 'att@example.test', po_number: 'NO-ORDER', wave_invoice_id: 'wv-att', number: '2184', total: 75 });
  const item = await attn('invoice:' + inv.id);
  assert.equal(item.resolved_at, null);
  assert.match(item.message, /^Invoice #2184 for Allure Fusions Firm came in\. Missing: a linked order\.$/);
  assert.equal((await one(`select count(*)::int n from public.event_outbox where event_type = 'attention.needed'`)).n, before + 1);
  await db.query(`update public.wave_invoices set updated_at = now() where id = $1`, [inv.id]);        // touching again must not re-notify
  assert.equal((await one(`select count(*)::int n from public.event_outbox where event_type = 'attention.needed'`)).n, before + 1);
  const ev = await one(`select payload from public.event_outbox where event_type = 'attention.needed' order by id desc limit 1`);
  assert.equal(ev.payload.recipient, 'admin'); assert.ok(!('email' in ev.payload));
  const o = await newAff({ email: 'att@example.test', quote: 75, status: 'Quoted', due: '2026-12-20', addr: '1 Main St', phone: '555-0101' });
  await db.query(`update public.orders set shipping_method = 'pickup' where id = $1`, [o.id]);
  await db.as('authenticated', { email: 'admin@example.test' }, (t) => t.query('select public.wave_link_invoice($1, $2)', [inv.id, o.order_number]));
  assert.notEqual((await attn('invoice:' + inv.id)).resolved_at, null);
});

test('a quoted order missing shipping info and phone is flagged on the invoice and clears when filled in', async () => {
  const o = await newAff({ quote: 90, status: 'Quoted', due: '2026-12-20' });
  await db.query(`update public.orders set shipping_method = 'ship' where id = $1`, [o.id]);
  const inv = await imp({ po_number: o.order_number, total: 54, wave_invoice_id: 'wv-miss', number: '2190' });
  let item = await attn('invoice:' + inv.id);
  assert.deepEqual(item.missing.sort(), ['customer_phone', 'shipping_address', 'shipping_amount']);
  assert.match(item.message, /Invoice #2190 for Allure Fusions Firm came in \(order AFF-\d+\)\. Missing: customer phone, shipping amount, shipping address\./);
  assert.equal((await attn('order:order:' + o.id)).resolved_at !== null, true);   // folded into the invoice item, no duplicate
  await db.query(`update public.orders set phone = '555-0100', shipping_amount = 12, shipping_address = '9 Elm St' where id = $1`, [o.id]);
  item = await attn('invoice:' + inv.id);
  assert.notEqual(item.resolved_at, null);
  assert.deepEqual(item.missing, []);
});

test('a new order without a quote is not nagged for a price; an approved one is', async () => {
  const o = await newAff({ name: '', email: 'x@example.test' }).catch(() => null);   // name is required by the table itself
  assert.equal(o, null);
  const n = await newAff({ description: null, status: 'New Request' });
  assert.deepEqual((await attn('order:order:' + n.id)).missing, ['description']);
  await db.query(`update public.orders set description = 'Sign', status = 'Quoted' where id = $1`, [n.id]);
  assert.deepEqual((await attn('order:order:' + n.id)).missing.sort(), ['amount', 'customer_phone', 'due_date', 'shipping_choice']);
});

test('invoice.ready is queued for an invoice Wave did not email, never for one already sent or paid', async () => {
  const c = async () => (await one(`select count(*)::int n from public.event_outbox where event_type = 'invoice.ready'`)).n;
  const n0 = await c();
  const a = await imp({ customer_email: 'ready@example.test', po_number: null });
  assert.equal(await c(), n0 + 1);
  const ev = await one(`select payload from public.event_outbox where event_type = 'invoice.ready' order by id desc limit 1`);
  assert.equal(ev.payload.email, 'ready@example.test'); assert.match(ev.payload.view_url, /^https:\/\//);
  await imp({ customer_email: 'ready@example.test', po_number: null, wave_invoice_id: 'wv-sent', last_sent_at: '2026-11-28T12:00:00Z' });
  await imp({ customer_email: 'ready@example.test', po_number: null, wave_invoice_id: 'wv-paid', status: 'PAID' });
  await imp({ customer_email: 'ready@example.test', po_number: null, wave_invoice_id: 'wv-d', status: 'DRAFT' });
  assert.equal(await c(), n0 + 1);
  await db.query(`update public.wave_invoices set updated_at = now() where id = $1`, [a.id]);
  assert.equal(await c(), n0 + 1);                                    // only once
});

test('the new functions are not open to browsers', async () => {
  await assert.rejects(db.as('anon', {}, (t) => t.query(`select public.admin_attention()`)), /permission denied/);
  await assert.rejects(db.as('authenticated', { email: 'x@example.test' }, (t) => t.query(`select public.wave_import_invoice('{}')`)), /permission denied/);
  await assert.rejects(db.as('authenticated', { email: 'x@example.test' }, (t) => t.query(`select public.admin_attention()`)), /admin only/);
  const rows = await db.as('authenticated', { email: 'admin@example.test' }, async (t) => (await t.query('select public.admin_attention() as r')).rows[0].r);
  assert.ok(Array.isArray(rows) && rows.length > 0);
});

test('historical invoices parse comma amounts, stay unlinked from TEST orders, and stay quiet when paid', async () => {
  // A TEST order with the same email as a real past invoice must never receive it.
  await one(`insert into public.madam_allure_orders (name, email, amount, status, source, is_test, items)
    values ('TEST bait', 'past.client@example.test', 32, 'Quoted', 'website', true, '[{"name":"x"}]') returning id`);
  const beforeA = (await one(`select count(*)::int n from public.event_outbox where event_type = 'attention.needed'`)).n;
  const beforeR = (await one(`select count(*)::int n from public.event_outbox where event_type = 'invoice.ready'`)).n;
  const r = (await one('select public.wave_import_invoice($1) as r', [JSON.stringify({
    business: 'madam_allure', wave_invoice_id: 'wv-hist-1', number: '8', view_url: 'https://next.waveapps.com/x/8',
    status: 'PAID', total: '1,750.00', customer_name: 'Past Client', customer_email: 'past.client@example.test',
    due_date: '2021-04-02', invoice_date: '2021-03-19', created_at: '2021-04-02T18:44:21.846Z',
    last_sent_at: '2021-04-02T19:00:00Z', items_summary: 'Past order', test_mode: true,
  })])).r;
  assert.equal(r.action, 'imported');
  assert.equal(r.linked, false);
  assert.equal(r.historical, true);
  const row = await one(`select amount, historical, test_mode, entity_id, wave_status from public.wave_invoices where wave_invoice_id = 'wv-hist-1'`);
  assert.equal(Number(row.amount), 1750);
  assert.equal(row.historical, true);
  assert.equal(row.test_mode, false);
  assert.equal(row.entity_id, null);
  const item = await one(`select resolved_at is not null as cleared, missing from public.needs_attention where invoice_id = $1`, [r.id]);
  assert.equal(item == null || item.cleared === true || (item.missing || []).length === 0, true);
  assert.equal((await one(`select count(*)::int n from public.event_outbox where event_type = 'attention.needed'`)).n, beforeA);
  assert.equal((await one(`select count(*)::int n from public.event_outbox where event_type = 'invoice.ready'`)).n, beforeR);
});

test('an unpaid historical invoice can still be flagged, but is not auto-linked by email', async () => {
  await one(`insert into public.madam_allure_orders (name, email, amount, status, source, is_test, items)
    values ('TEST bait 2', 'overdue.client@example.test', 200, 'Quoted', 'website', true, '[{"name":"x"}]') returning id`);
  const r = (await one('select public.wave_import_invoice($1) as r', [JSON.stringify({
    business: 'madam_allure', wave_invoice_id: 'wv-hist-overdue', number: '2180', view_url: 'https://next.waveapps.com/x/2180',
    status: 'OVERDUE', total: '270.63', customer_name: 'Past Due Client', customer_email: 'overdue.client@example.test',
    due_date: '2026-10-03', invoice_date: '2026-10-03', created_at: '2026-10-13T16:37:25.789Z',
    last_sent_at: '2026-10-13T17:00:00Z', items_summary: 'Unpaid past invoice', test_mode: true,
  })])).r;
  assert.equal(r.linked, false);
  assert.equal(r.historical, true);
  const item = await one(`select message, resolved_at, missing from public.needs_attention where invoice_id = $1`, [r.id]);
  assert.equal(item.resolved_at, null);
  assert.ok(item.missing.includes('linked_order'));
  assert.match(item.message, /Invoice #2180 for Madam Allure came in\. Missing: a linked order\./);
});
