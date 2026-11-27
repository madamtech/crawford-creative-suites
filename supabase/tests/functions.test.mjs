// End-to-end: the real Edge Function handlers, run by the local preview server
// (build/dev-backend.mjs) against real Postgres with the migrations and dummy data.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hmacHex } from '../functions/_shared/security.ts';

const PORT = 4199;
const O = `http://127.0.0.1:${PORT}`;
let server, cfg;

before(async () => {
  server = spawn(process.execPath, [fileURLToPath(new URL('../../build/dev-backend.mjs', import.meta.url))], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ok, fail) => {
    server.stdout.on('data', (d) => { if (String(d).includes('Preview with test backend')) ok(); });
    server.on('exit', (c) => fail(new Error(`server exited ${c}`)));
  });
  const js = await (await fetch(`${O}/suites/backend-config.js`)).text();
  cfg = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1));
});
after(() => server?.kill());

const fn = (name, body, headers = {}) => fetch(`${O}/functions/v1/${name}`, { method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: O, apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, ...headers }, body: JSON.stringify(body) });
const rpc = (token, name, args = {}) => fetch(`${O}/rest/v1/rpc/${name}`, { method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: `Bearer ${token}` }, body: JSON.stringify(args) });

async function signIn(email) {
  assert.equal((await fetch(`${O}/auth/v1/otp?redirect_to=${encodeURIComponent(`${O}/suites/`)}`, { method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })).status, 200);
  const box = await (await fetch(`${O}/dev/mailbox`)).text();
  const link = box.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)[1].replace(/&amp;/g, '&');
  const r = await fetch(link, { redirect: 'manual' });
  assert.equal(r.status, 303);
  const hash = new URLSearchParams(r.headers.get('location').split('#')[1]);
  return hash.get('access_token');
}

let newOrder;

test('Build My Project: saved with the next AFF number, rush goes to Pending Review, file uploads privately', async () => {
  const res = await fn('intake', { form: 'order', fields: {
    Name: 'Avery Test', Email: 'avery@example.test', Phone: '', 'Service type': '3D printing', 'Project type': 'Keychains',
    Quantity: '25', Dimensions: '2 in', Material: 'PETG', 'Completion date': '2026-12-20', Rush: 'Yes — Pending Review',
    'Shipping address': '1 Test Lane', 'Budget range': '$50', 'Additional instructions': 'Teal and rose gold', 'Color palette': 'Teal',
    'Artwork ownership confirmed': 'Yes' }, files: [{ name: 'logo.png', type: 'image/png', size: 8 }] });
  const r = await res.json();
  assert.equal(res.status, 200, JSON.stringify(r));
  assert.match(r.number, /^AFF-\d{4}$/);
  assert.equal(r.status, 'Pending Review');
  assert.equal(r.uploads.length, 1);
  assert.match(r.uploads[0].path, new RegExp(`^orders/${r.number}/[0-9a-f]{8}-logo\\.png$`));
  const up = await fetch(r.uploads[0].url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: Buffer.from('89504e47', 'hex') });
  assert.equal(up.status, 200);
  newOrder = r.number;
});

test('AI intake and Madam Allure memorial request get AIA and MA numbers', async () => {
  const ai = await (await fn('intake', { form: 'ai_intake', fields: { Name: 'Avery Test', Email: 'avery@example.test', 'Business challenge': 'Too many tabs', Engagement: 'One-time' } })).json();
  assert.match(ai.number, /^AIA-\d{4}$/);
  assert.equal(ai.status, 'New');
  const ma = await (await fn('intake', { form: 'ma_request', fields: { Name: 'Avery Test', Email: 'avery@example.test', 'Request type': 'Memorial gift', Item: 'Ribbons', Details: 'Purple', 'Needed by': '2026-12-01' } })).json();
  assert.match(ma.number, /^MA-\d{4}$/);
});

test('validation, honeypot, disposable email and CORS', async () => {
  let r = await fn('intake', { form: 'order', fields: { Name: 'X', Email: 'nope' } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /valid email/);
  r = await fn('intake', { form: 'order', fields: { Name: 'X', Email: 'x@mailinator.com' } });
  assert.equal(r.status, 400);
  r = await fn('intake', { form: 'lead', fields: { Name: 'X', Email: 'x@example.test', 'Business interest': 'madam_allure' } });
  assert.match((await r.json()).error, /tick the box/);
  r = await fn('intake', { form: 'order', _hp: 'http://spam', fields: { Name: 'Bot', Email: 'bot@example.test' } });
  assert.deepEqual(await r.json(), { ok: true, kind: 'order', number: null, status: 'New Request' });
  r = await fn('intake', { form: 'order', fields: { Name: 'X', Email: 'x@example.test' }, files: [{ name: 'virus.exe', size: 10 }] });
  assert.equal(r.status, 400);
  r = await fn('intake', { form: 'order', fields: { Name: 'X', Email: 'x@example.test' }, files: [{ name: 'huge.stl', size: 30e6 }] });
  assert.match((await r.json()).error, /25 MB/);
  r = await fn('intake', { form: 'order', fields: { Name: 'X', Email: 'x@example.test' } }, { Origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  const pre = await fetch(`${O}/functions/v1/intake`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(pre.headers.get('access-control-allow-origin'), null);
});

test('lead with consent is saved', async () => {
  const r = await fn('intake', { form: 'lead', source: "Maker's Lounge", utm: { utm_source: 'tiktok' }, fields: { Name: 'Lee', Email: 'lee@example.test', 'Business interest': 'allure_fusions', Consent: 'yes', Message: 'Classes?' } });
  assert.deepEqual(await r.json(), { ok: true, kind: 'lead' });
});

test('order-status needs number AND email', async () => {
  let r = await fn('order-status', { number: newOrder, email: 'avery@example.test' });
  assert.equal((await r.json()).status, 'Pending Review');
  r = await fn('order-status', { number: newOrder, email: 'jordan@example.test' });
  assert.equal(r.status, 404);
});

test('magic link sign-in, My Projects, own upload, and private download', async () => {
  const t = await signIn('avery@example.test');
  const p = await (await rpc(t, 'my_projects')).json();
  assert.equal(p.email, 'avery@example.test');
  assert.deepEqual(p.projects.map((x) => x.business).sort(), ['ai_authoritech', 'allure_fusions', 'madam_allure']);
  const mine = p.projects.find((x) => x.number === newOrder);
  assert.equal(mine.files.length, 1);
  // upload into her own folder works; into someone else's is refused
  let up = await fetch(`${O}/storage/v1/object/order-files/orders/${newOrder}/abcd1234-proof.pdf`, { method: 'POST', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/pdf' }, body: '%PDF-1.4' });
  assert.equal(up.status, 200);
  up = await fetch(`${O}/storage/v1/object/order-files/orders/AFF-0002/abcd1234-x.pdf`, { method: 'POST', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/pdf' }, body: '%PDF' });
  assert.equal(up.status, 403);
  assert.equal((await rpc(t, 'register_file', { p_path: `orders/${newOrder}/abcd1234-proof.pdf`, p_name: 'proof.pdf', p_type: 'application/pdf', p_size: 8 })).status, 200);
  const s = await (await fetch(`${O}/storage/v1/object/sign/order-files/${mine.files[0].path}`, { method: 'POST', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: '{"expiresIn":120}' })).json();
  assert.ok(s.signedURL);
  assert.equal((await fetch(`${O}/storage/v1${s.signedURL}`)).status, 200);
  const other = await fetch(`${O}/storage/v1/object/sign/order-files/orders/AFF-0002/x.png`, { method: 'POST', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(other.status, 400);
  assert.equal((await rpc(t, 'admin_overview')).status, 403);
});

test('checkout: amount from the database, Stripe webhook marks it paid, bad signatures refused', async () => {
  const admin = await signIn('admin@example.test');
  const ov = await (await rpc(admin, 'admin_overview')).json();
  const row = ov.projects.find((x) => x.number === newOrder);
  assert.equal((await rpc(admin, 'admin_update', { p_entity_type: 'order', p_id: row.id, p_patch: { quote: '100', status: 'Quoted' } })).status, 200);

  const t = await signIn('avery@example.test');
  assert.equal((await fn('checkout', { number: newOrder, kind: 'deposit' })).status, 401, 'needs sign-in');
  const co = await (await fn('checkout', { number: newOrder, kind: 'deposit' }, { Authorization: `Bearer ${t}` })).json();
  assert.match(co.url, /\/dev\/stripe\/pay\/cs_test_/);
  assert.equal((await fn('checkout', { number: 'AFF-0002', kind: 'deposit' }, { Authorization: `Bearer ${t}` })).status, 404, 'not her order');
  const paid = await fetch(co.url, { method: 'POST', redirect: 'manual' });
  assert.equal(paid.status, 303);
  const p = (await (await rpc(t, 'my_projects')).json()).projects.find((x) => x.number === newOrder);
  assert.equal(p.status, 'Deposit Paid');
  assert.equal(p.paid, 'deposit');
  assert.equal(Number(p.balance), 40);

  const raw = JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed', data: { object: { id: 'cs_fake', payment_status: 'paid', amount_total: 4000, metadata: { number: newOrder, kind: 'balance' } } } });
  let r = await fetch(`${O}/functions/v1/payments-webhook?provider=stripe`, { method: 'POST', body: raw, headers: { 'Stripe-Signature': 't=1,v1=deadbeef' } });
  assert.equal(r.status, 400);
  const ts = Math.floor(Date.now() / 1000);
  r = await fetch(`${O}/functions/v1/payments-webhook?provider=stripe`, { method: 'POST', body: raw, headers: { 'Stripe-Signature': `t=${ts},v1=${await hmacHex('whsec_dev_only', `${ts}.${raw}`)}` } });
  assert.equal(r.status, 200);
  const again = await fetch(`${O}/functions/v1/payments-webhook?provider=stripe`, { method: 'POST', body: raw, headers: { 'Stripe-Signature': `t=${ts},v1=${await hmacHex('whsec_dev_only', `${ts}.${raw}`)}` } });
  assert.equal((await again.json()).result.duplicate, true);
  const done = (await (await rpc(t, 'my_projects')).json()).projects.find((x) => x.number === newOrder);
  assert.equal(done.paid, 'paid_in_full');
});

test('GHL payment webhook needs the shared secret', async () => {
  const body = JSON.stringify({ number: 'AFF-0002', amount: 50, kind: 'deposit', transaction_id: 'ghl_txn_1' });
  let r = await fetch(`${O}/functions/v1/payments-webhook?provider=ghl`, { method: 'POST', body, headers: { 'x-ccs-webhook-secret': 'wrong' } });
  assert.equal(r.status, 401);
  r = await fetch(`${O}/functions/v1/payments-webhook?provider=ghl`, { method: 'POST', body, headers: { 'x-ccs-webhook-secret': 'dev-ghl-secret' } });
  assert.equal((await r.json()).result.paid, 'deposit');
  r = await fetch(`${O}/functions/v1/payments-webhook?provider=ghl`, { method: 'POST', body: JSON.stringify({ number: 'AFF-9999', amount: 5, transaction_id: 'z' }), headers: { 'x-ccs-webhook-secret': 'dev-ghl-secret' } });
  assert.equal(r.status, 404);
});

test('dispatch-events sends signed events to the GHL / Make webhook', async () => {
  assert.equal((await fetch(`${O}/functions/v1/dispatch-events`, { method: 'POST' })).status, 401);
  const r = await (await fetch(`${O}/functions/v1/dispatch-events`, { method: 'POST', headers: { 'x-ccs-dispatch-secret': 'dev-dispatch-secret' } })).json();
  assert.equal(r.ok, true);
  const box = await (await fetch(`${O}/dev/mailbox`)).text();
  for (const type of ['order.created', 'lead.created', 'payment.succeeded']) assert.ok(box.includes(type), type);
});

test('the public site files hold no secret keys', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['../../suites/backend-config.js', '../../suites/app.js', '../../index.html']) {
    const s = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/service_role|sb_secret_\w|sk_live_\w|sk_test_\w|whsec_\w|eyJ[\w-]{20,}\.[\w-]{20,}/.test(s), f);
  }
});
