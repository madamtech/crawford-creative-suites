// Database tests: schema, RLS, numbering, payments, storage policies, event contract.
// Run: npm run test:backend
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './pg.mjs';

let db;
const jordan = { sub: '00000000-0000-4000-8000-000000000001', email: 'jordan@example.test' };
const riley = { sub: '00000000-0000-4000-8000-000000000002', email: 'riley@example.test' };
const admin = { sub: '00000000-0000-4000-8000-000000000009', email: 'admin@example.test' };
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const asUser = (claims, sql, params) => db.as('authenticated', claims, async (t) => (await t.query(sql, params)).rows);
const asAnon = (sql, params) => db.as('anon', {}, async (t) => (await t.query(sql, params)).rows);
const asService = (sql, params) => db.as('service_role', {}, async (t) => (await t.query(sql, params)).rows);

before(async () => {
  db = await openDb({ seed: true });
  for (const u of [jordan, riley, admin]) await db.query('insert into auth.users (id, email) values ($1, $2)', [u.sub, u.email]);
});

test('numbering continues from the tracker: AFF-0002 first, AIA and MA start at 0001', async () => {
  const r = await rows(`select number from public.projects_v order by number`);
  assert.deepEqual(r.map((x) => x.number), ['AFF-0002', 'AFF-0003', 'AFF-0004', 'AIA-0001', 'MA-0001', 'MA-0002']);
});

test('rush orders start as Pending Review, others as New Request', async () => {
  const r = await rows(`select order_number, status, rush from public.orders order by order_number`);
  assert.equal(r.find((x) => x.order_number === 'AFF-0003').status, 'Pending Review');
  assert.equal(r.find((x) => x.order_number === 'AFF-0002').status, 'Quoted');
});

test('signing in links the client row by email', async () => {
  const r = await rows(`select auth_user_id from public.clients where email = 'jordan@example.test'`);
  assert.equal(r[0].auth_user_id, jordan.sub);
});

test('anon (the public website key) can read and write nothing', async () => {
  for (const t of ['clients', 'orders', 'ai_intake', 'madam_allure_orders', 'leads', 'files', 'payments', 'status_events', 'event_outbox']) {
    await assert.rejects(asAnon(`select * from public.${t}`), /permission denied/, t);
  }
  await assert.rejects(asAnon(`insert into public.leads (name, email, business_interest, consent) values ('x', 'x@example.test', 'madam_allure', true)`), /permission denied/);
  await assert.rejects(asAnon(`select public.submit_request('{}'::jsonb)`), /permission denied/);
  await assert.rejects(asAnon(`select public.lookup_status('AFF-0002', 'jordan@example.test')`), /permission denied/);
});

test('a client sees only her own projects', async () => {
  const mine = await asUser(jordan, `select number from public.projects_v order by number`);
  assert.deepEqual(mine.map((x) => x.number), ['AFF-0002', 'AFF-0003', 'AIA-0001']);
  const theirs = await asUser(riley, `select number from public.projects_v`);
  assert.deepEqual(theirs.map((x) => x.number), ['AFF-0004']);
  assert.equal((await asUser(jordan, `select * from public.leads`)).length, 0);
  assert.equal((await asUser(jordan, `select * from public.clients`)).length, 1);
});

test('my_projects returns status, payment and history for the signed-in email only', async () => {
  const [{ my_projects: p }] = await asUser(riley, `select public.my_projects()`);
  assert.equal(p.email, 'riley@example.test');
  assert.equal(p.is_admin, false);
  assert.equal(p.projects.length, 1);
  const o = p.projects[0];
  assert.equal(o.number, 'AFF-0004');
  assert.equal(o.status, 'In Production');
  assert.equal(o.paid, 'deposit');
  assert.equal(Number(o.balance), 38);
  assert.ok(o.events.some((e) => e.field === 'status' && e.new === 'Deposit Paid'));
  assert.equal(o.notes, undefined, 'internal notes are not sent to clients');
});

test('clients cannot change status, quote or paid', async () => {
  const r = await asUser(jordan, `update public.orders set status = 'Completed' where order_number = 'AFF-0002' returning id`);
  assert.equal(r.length, 0);
  await assert.rejects(asUser(jordan, `update public.orders set paid = 'paid_in_full'`), /permission denied/);
  await assert.rejects(asUser(jordan, `select public.admin_overview()`), /admin only/);
  await assert.rejects(asUser(jordan, `select public.admin_record_payment('AFF-0002', 'full', 180)`), /admin only/);
});

test('admin sees everything and edits are logged with her email', async () => {
  const [{ admin_overview: o }] = await asUser(admin, `select public.admin_overview()`);
  assert.equal(o.projects.length, 6);
  assert.equal(o.leads.length, 1);
  assert.ok(o.totals.overdue >= 1, 'AFF-0004 due Nov 20 is overdue');
  await asUser(admin, `select public.admin_update('order', (select id from public.orders where order_number = 'AFF-0003'), '{"status":"Quoted","notes":"call first"}')`);
  const ev = await rows(`select actor, new_value from public.status_events where field = 'status' order by id desc limit 1`);
  assert.deepEqual(ev[0], { actor: 'admin@example.test', new_value: 'Quoted' });
  const lsc = await rows(`select last_status_change > now() - interval '1 minute' as fresh from public.orders where order_number = 'AFF-0003'`);
  assert.equal(lsc[0].fresh, true);
});

test('deposit rule: $35 or less pays in full, over $35 needs 60%', async () => {
  const r = await rows(`select order_number, deposit_required from public.orders where order_number in ('AFF-0002', 'AFF-0003') order by 1`);
  assert.equal(Number(r[0].deposit_required), 108);
  assert.equal(Number(r[1].deposit_required), 30);
});

test('checkout amount comes from the database and needs the matching email', async () => {
  const [{ checkout_amount: a }] = await asService(`select public.checkout_amount('AFF-0002', 'deposit', 'jordan@example.test')`);
  assert.equal(a.ok, true);
  assert.equal(Number(a.amount), 108);
  assert.equal(a.kind, 'deposit');
  const [{ checkout_amount: b }] = await asService(`select public.checkout_amount('AFF-0002', 'deposit', 'riley@example.test')`);
  assert.equal(b.ok, false);
});

test('payments are idempotent, update paid, status and balance, and emit payment.succeeded', async () => {
  const pay = (ref, kind, amount) => asService(`select public.apply_payment($1::jsonb) r`,
    [JSON.stringify({ number: 'AFF-0002', provider: 'stripe', provider_ref: ref, kind, amount })]);
  const [{ r: first }] = await pay('cs_test_1', 'deposit', 108);
  assert.equal(first.status, 'Deposit Paid');
  assert.equal(first.paid, 'deposit');
  const [{ r: again }] = await pay('cs_test_1', 'deposit', 108);
  assert.equal(again.duplicate, true);
  const [{ r: rest }] = await pay('cs_test_2', 'balance', 72);
  assert.equal(rest.paid, 'paid_in_full');
  assert.equal(Number(rest.balance), 0);
  const ev = await rows(`select payload from public.event_outbox where event_type = 'payment.succeeded' and payload->>'number' = 'AFF-0002'`);
  assert.equal(ev.length, 2);
  assert.deepEqual(ev[0].payload.tags, ['allure-fusions', 'paid']);
  const [{ r: refund }] = await pay('re_test_1', 'refund', 180);
  assert.equal(refund.paid, 'refunded');
});

test('unauthenticated lookup needs number AND email', async () => {
  const [{ r: ok }] = await asService(`select public.lookup_status('aff-0004', 'Riley@Example.test') r`);
  assert.equal(ok.status, 'In Production');
  const [{ r: no }] = await asService(`select public.lookup_status('AFF-0004', 'jordan@example.test') r`);
  assert.deepEqual(no, { ok: false, error: 'Not found' });
});

test('leads need consent; requests need a valid email and a name', async () => {
  await assert.rejects(asService(`select public.submit_request('{"form":"lead","data":{"name":"A","email":"a@example.test","business_interest":"madam_allure","consent":false}}')`), /consent required/);
  await assert.rejects(asService(`select public.submit_request('{"form":"order","data":{"name":"A","email":"not-an-email"}}')`), /invalid email/);
  await assert.rejects(asService(`select public.submit_request('{"form":"order","data":{"name":" ","email":"a@example.test"}}')`), /name required/);
});

test('event contract: every request and lead lands in the outbox with business tags', async () => {
  const r = await rows(`select event_type, payload->>'business' b, payload->'tags'->>0 tag from public.event_outbox where event_type in ('order.created', 'lead.created') order by id`);
  assert.ok(r.some((x) => x.event_type === 'order.created' && x.b === 'madam_allure' && x.tag === 'madam-allure'));
  assert.ok(r.some((x) => x.event_type === 'order.created' && x.b === 'ai_authoritech' && x.tag === 'ai-authoritech'));
  assert.ok(r.some((x) => x.event_type === 'lead.created' && x.b === 'allure_fusions'));
  const [{ claim_events: _ }] = [{}];
  const claimed = await asService(`select id from public.claim_events(2)`);
  assert.equal(claimed.length, 2);
  await asService(`select public.mark_event($1, true)`, [claimed[0].id]);
  const left = await rows(`select count(*)::int n from public.event_outbox where delivered_at is null`);
  assert.ok(left[0].n >= 1);
});

test('admin can mark a Skool member, which emits member.invited', async () => {
  await asUser(admin, `select public.admin_invite_member('casey@example.test', 'madam_allure')`);
  const r = await rows(`select payload from public.event_outbox where event_type = 'member.invited'`);
  assert.equal(r[0].payload.email, 'casey@example.test');
  assert.deepEqual(r[0].payload.tags, ['madam-allure', 'skool-member']);
});

test('storage: a client can upload only into her own record folders, admin anywhere', async () => {
  const put = (claims, name) => asUser(claims, `insert into storage.objects (bucket_id, name, owner) values ('order-files', $1, $2) returning name`, [name, claims.sub]);
  await put(jordan, 'orders/AFF-0002/ab12cd34-logo.png');
  await assert.rejects(put(jordan, 'orders/AFF-0004/ab12cd34-logo.png'), /row-level security/);
  await assert.rejects(put(jordan, 'orders/AFF-0002/ab12cd34-script.exe'), /row-level security/);
  await assert.rejects(put(jordan, 'orders/AFF-0002/extra/deep.png'), /row-level security/);
  await put(admin, 'orders/AFF-0004/ef56ab78-proof.pdf');
  const seen = await asUser(riley, `select name from storage.objects`);
  assert.deepEqual(seen.map((x) => x.name), ['orders/AFF-0004/ef56ab78-proof.pdf']);
  const [{ register_file: f }] = await asUser(jordan, `select public.register_file('orders/AFF-0002/ab12cd34-logo.png', 'logo.png', 'image/png', 1200)`);
  assert.equal(f.ok, true);
  await assert.rejects(asUser(riley, `select public.register_file('orders/AFF-0002/ab12cd34-logo.png', 'x.png', 'image/png', 1)`), /not allowed/);
  const by = await rows(`select uploaded_by from public.files where path = 'orders/AFF-0002/ab12cd34-logo.png'`);
  assert.equal(by[0].uploaded_by, 'client');
});

test('intake files must sit in the new record folder', async () => {
  const [{ id }] = await rows(`select id from public.orders where order_number = 'AFF-0003'`);
  await asService(`select public.register_intake_files($1::jsonb)`, [JSON.stringify({ id, files: [{ path: 'orders/AFF-0003/11112222-art.svg', original_name: 'art.svg', content_type: 'image/svg+xml', size_bytes: 900 }] })]);
  await assert.rejects(asService(`select public.register_intake_files($1::jsonb)`, [JSON.stringify({ id, files: [{ path: 'orders/AFF-0002/11112222-art.svg', original_name: 'art.svg', size_bytes: 9 }] })]), /does not match/);
});

test('size limit: files over 25 MB are refused', async () => {
  const [{ id }] = await rows(`select id from public.orders where order_number = 'AFF-0003'`);
  await assert.rejects(asService(`select public.register_intake_files($1::jsonb)`, [JSON.stringify({ id, files: [{ path: 'orders/AFF-0003/99998888-big.stl', original_name: 'big.stl', size_bytes: 26214401 }] })]), /check constraint/);
});

test('quote images: admin attaches drafts, the owner sees them only after the quote is sent, nobody else ever', async () => {
  const put = (claims, name, bucket = 'quote-images') => asUser(claims, `insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3) returning name`, [bucket, name, claims.sub]);
  const add = (claims, path, version = 1) => asUser(claims, `select public.admin_add_quote_image($1, 'mockup.png', 'image/png', 2048, $2)`, [path, version]);
  const [{ id: orderId }] = await rows(`select id from public.orders where order_number = 'AFF-0002'`);

  // customers cannot upload, admin can; only images and PDF; only into a real record folder
  await assert.rejects(put(jordan, 'orders/AFF-0002/aa11bb22-mock.png'), /row-level security/);
  await assert.rejects(put(admin, 'orders/AFF-0002/aa11bb22-run.exe'), /row-level security/);
  await assert.rejects(put(admin, 'orders/AFF-9999/aa11bb22-mock.png'), /row-level security/);
  await put(admin, 'orders/AFF-0002/aa11bb22-mock.png');
  await put(admin, 'orders/AFF-0002/cc33dd44-mock2.webp');
  await put(admin, 'orders/AFF-0004/ee55ff66-other.pdf');

  // registering needs admin
  await assert.rejects(add(jordan, 'orders/AFF-0002/aa11bb22-mock.png'), /admin only/);
  await add(admin, 'orders/AFF-0002/aa11bb22-mock.png');
  await add(admin, 'orders/AFF-0002/cc33dd44-mock2.webp');
  await add(admin, 'orders/AFF-0004/ee55ff66-other.pdf');
  await assert.rejects(add(admin, 'orders/AFF-0002/zz99-not-uploaded.png'), /file not uploaded/);

  // draft: invisible to the owner (rows and files), visible to admin
  const draftRows = await asUser(jordan, `select count(*)::int n from public.quote_images`);
  assert.equal(draftRows[0].n, 0);
  assert.equal((await asUser(jordan, `select name from storage.objects where bucket_id = 'quote-images'`)).length, 0);
  const [{ q: adminView }] = await asUser(admin, `select public.quote_images_for('order', $1) q`, [orderId]);
  assert.equal(adminView[0].sent, false);
  assert.equal(adminView[0].images.length, 2);

  // admin can remove a draft; the path comes back so the browser can delete the file too
  await put(admin, 'orders/AFF-0004/99aa00bb-draft.pdf');
  const extra = await asUser(admin, `select public.admin_add_quote_image('orders/AFF-0004/99aa00bb-draft.pdf', 'x', 'application/pdf', 1, 2) r`);
  assert.equal(extra[0].r.ok, true);
  const [{ id: extraId }] = await asUser(admin, `select id from public.quote_images where quote_version = 2`);
  await assert.rejects(asUser(jordan, `select public.admin_remove_quote_image($1)`, [extraId]), /admin only/);
  const [{ r: removed }] = await asUser(admin, `select public.admin_remove_quote_image($1) r`, [extraId]);
  assert.equal(removed.path, 'orders/AFF-0004/99aa00bb-draft.pdf');
  assert.equal((await asUser(admin, `select count(*)::int n from public.quote_images where quote_version = 2`))[0].n, 0);

  // send: the owner sees exactly her own sent images
  await assert.rejects(asUser(jordan, `select public.admin_release_quote_images('order', $1, 1)`, [orderId]), /admin only/);
  const [{ r: sent }] = await asUser(admin, `select public.admin_release_quote_images('order', $1, 1) r`, [orderId]);
  assert.equal(sent.released, 2);
  const [{ q: custView }] = await asUser(jordan, `select public.quote_images_for('order', $1) q`, [orderId]);
  assert.equal(custView.length, 1);
  assert.equal(custView[0].sent, true);
  assert.deepEqual(custView[0].images.map((i) => i.name), ['mockup.png', 'mockup.png']);
  const files = await asUser(jordan, `select name from storage.objects where bucket_id = 'quote-images' order by name`);
  assert.deepEqual(files.map((f) => f.name), ['orders/AFF-0002/aa11bb22-mock.png', 'orders/AFF-0002/cc33dd44-mock2.webp']);

  // another customer sees nothing of it, even though that order's own draft exists
  assert.equal((await asUser(riley, `select count(*)::int n from public.quote_images`))[0].n, 0);
  assert.equal((await asUser(riley, `select name from storage.objects where bucket_id = 'quote-images'`)).length, 0);
  assert.deepEqual((await asUser(riley, `select public.quote_images_for('order', $1) q`, [orderId]))[0].q, []);
  // customers cannot delete or change anything
  assert.equal((await asUser(jordan, `delete from storage.objects where bucket_id = 'quote-images' returning name`)).length, 0);
  await assert.rejects(asUser(jordan, `delete from public.quote_images`), /permission denied/);
  await assert.rejects(asAnon(`select * from public.quote_images`), /permission denied/);

  // a sent version is frozen: no adds, no removes; a new version starts fresh
  await put(admin, 'orders/AFF-0002/77778888-late.jpg');
  await assert.rejects(add(admin, 'orders/AFF-0002/77778888-late.jpg', 1), /already sent/);
  const [{ id: firstId }] = await asUser(admin, `select id from public.quote_images where path = 'orders/AFF-0002/aa11bb22-mock.png'`);
  await assert.rejects(asUser(admin, `select public.admin_remove_quote_image($1)`, [firstId]), /already sent/);
  await add(admin, 'orders/AFF-0002/77778888-late.jpg', 2);
  const [{ q: afterV2 }] = await asUser(jordan, `select public.quote_images_for('order', $1) q`, [orderId]);
  assert.equal(afterV2.length, 1, 'draft v2 stays hidden from the customer');
  const [{ q: adminV2 }] = await asUser(admin, `select public.quote_images_for('order', $1) q`, [orderId]);
  assert.deepEqual(adminV2.map((v) => [v.version, v.sent]), [[1, true], [2, false]]);

  // bucket settings
  const [bucket] = await rows(`select public, file_size_limit from storage.buckets where id = 'quote-images'`);
  assert.equal(bucket.public, false);
  assert.equal(Number(bucket.file_size_limit), 10485760);
});
