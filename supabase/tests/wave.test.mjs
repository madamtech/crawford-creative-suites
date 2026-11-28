// Wave invoicing rules (migration 20261128100000_wave_invoicing.sql).
// Run: npm run test:backend
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './pg.mjs';

let db;
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const plan = async (type, id) => (await one('select public.wave_plan($1, $2) as p', [type, id])).p;

async function newMa(amount) {
  return (await one(`insert into public.madam_allure_orders (name, email, amount, status, source, is_test, items)
    values ('TEST Wave', 'wave-test@example.test', $1, 'Quoted', 'website', true, '[{"name":"TEST item"}]') returning id, order_number`, [amount]));
}
async function fakeCreated(type, id, p) {
  const rid = (await one('select public.wave_reserve($1) as id', [JSON.stringify({ ...p, entity_type: type, entity_id: id, ...p.next })])).id;
  await db.query('select public.wave_update($1, $2)', [rid, JSON.stringify({ wave_invoice_id: 'inv-' + p.next.kind + id, sent: true })]);
  return rid;
}

before(async () => { db = await openDb({ seed: true }); });

test('no invoice before the customer approves the quote', async () => {
  const o = await newMa(20);
  assert.equal((await plan('madam_allure_order', o.id)).reason, 'quote_not_approved');
});

test('$35 or less: one full invoice, only after shipping is chosen, shipping as its own line', async () => {
  const o = await newMa(24);
  await db.query(`update public.madam_allure_orders set quote_approved_at = now() where id = $1`, [o.id]);
  assert.equal((await one('select billing_status from public.madam_allure_orders where id = $1', [o.id])).billing_status, 'quote_approved');
  assert.equal((await plan('madam_allure_order', o.id)).reason, 'waiting_for_shipping');
  await db.query(`update public.madam_allure_orders set shipping_method = 'ship', shipping_amount = 5 where id = $1`, [o.id]);
  const p = await plan('madam_allure_order', o.id);
  assert.equal(p.next.kind, 'full');
  assert.equal(Number(p.next.amount), 29);
  assert.deepEqual(p.next.lines.map((l) => [l.description, Number(l.unitPrice)]), [['TEST item', 24], ['Shipping', 5]]);
  const ev = await one(`select count(*)::int n from public.event_outbox where event_type = 'quote.approved'`);
  assert.ok(ev.n >= 1);
});

test('over $35: 60% deposit now, 40% balance + shipping only after shipping is chosen', async () => {
  const o = await newMa(80);
  await db.query(`update public.madam_allure_orders set quote_approved_at = now() where id = $1`, [o.id]);
  let p = await plan('madam_allure_order', o.id);
  assert.equal(p.next.kind, 'deposit');
  assert.equal(Number(p.next.amount), 48);
  await fakeCreated('madam_allure_order', o.id, p);
  assert.equal((await one('select billing_status from public.madam_allure_orders where id = $1', [o.id])).billing_status, 'invoiced');
  assert.equal((await plan('madam_allure_order', o.id)).reason, 'waiting_for_shipping');
  await db.query(`update public.madam_allure_orders set shipping_method = 'pickup' where id = $1`, [o.id]);
  p = await plan('madam_allure_order', o.id);
  assert.equal(p.next.kind, 'balance');
  assert.equal(Number(p.next.amount), 32);
  assert.equal(p.next.lines.length, 1);
});

test('a second reservation for the same invoice kind is refused', async () => {
  const o = await newMa(10);
  const body = JSON.stringify({ entity_type: 'madam_allure_order', entity_id: o.id, number: o.order_number, business: 'madam_allure', kind: 'full', amount: 10 });
  assert.ok((await one('select public.wave_reserve($1) as id', [body])).id);
  assert.equal((await one('select public.wave_reserve($1) as id', [body])).id, null);
});

test('a polled payment becomes a wave payment and moves the billing stage', async () => {
  const o = await newMa(80);
  await db.query(`update public.madam_allure_orders set quote_approved_at = now() where id = $1`, [o.id]);
  const p = await plan('madam_allure_order', o.id);
  const rid = await fakeCreated('madam_allure_order', o.id, p);
  const r = (await one(`select public.wave_apply_status($1, 'PAID', 48) as r`, [rid])).r;
  assert.equal(Number(r.delta), 48);
  const pay = await one(`select provider, kind, amount from public.payments where entity_id = $1`, [o.id]);
  assert.deepEqual([pay.provider, pay.kind, Number(pay.amount)], ['wave', 'deposit', 48]);
  const m = await one('select billing_status, amount_paid from public.madam_allure_orders where id = $1', [o.id]);
  assert.deepEqual([m.billing_status, Number(m.amount_paid)], ['deposit_paid', 48]);
  // polling again does not double count
  assert.equal(Number((await one(`select public.wave_apply_status($1, 'PAID', 48) as r`, [rid])).r.delta), 0);
});

test('the Wave functions are service-only', async () => {
  await assert.rejects(db.as('anon', {}, (t) => t.query(`select public.wave_plan('order', gen_random_uuid())`)), /permission denied/);
  await assert.rejects(db.as('authenticated', { email: 'x@example.test' }, (t) => t.query(`select public.wave_open_invoices()`)), /permission denied/);
});
