// Local preview with a stand-in backend (no Supabase account, no real email, no real money).
//   node build/dev-backend.mjs      then open http://127.0.0.1:4180/
//
// Serves the site, and imitates the Supabase pieces the site uses:
//   /auth/v1      magic-link sign-in (the "email" appears at /dev/mailbox instead of being sent)
//   /rest/v1/rpc  database functions, run as anon / authenticated / service_role with RLS
//   /storage/v1   private bucket with signed upload and download URLs
//   /functions/v1 the real Edge Function handlers from supabase/functions/*/handler.ts
//   /dev/stripe   a pretend Stripe Checkout page that fires a signed webhook
// The database is real Postgres (PGlite) loaded with supabase/migrations and seed.sql,
// fresh on every start.
import { createServer } from 'node:http';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openDb } from '../supabase/tests/pg.mjs';
import { hmacHex } from '../supabase/functions/_shared/security.ts';

const PORT = Number(process.env.PORT || 4180);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const root = fileURLToPath(new URL('..', import.meta.url));
const storeDir = join(root, '.tmp', 'dev-storage');
rmSync(storeDir, { recursive: true, force: true });
mkdirSync(storeDir, { recursive: true });

// ---------- dev-only keys (never used anywhere real) ----------
const JWT_SECRET = 'dev-only-jwt-secret-not-for-production';
const b64u = (b) => Buffer.from(b).toString('base64url');
function sign(payload) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  return `${head}.${body}.${createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
}
function verify(token) {
  const [h, b, s] = String(token || '').split('.');
  if (!s || createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url') !== s) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  return p.exp && p.exp < Date.now() / 1000 ? null : p;
}
const ANON_KEY = sign({ role: 'anon', iss: 'dev' });
const SERVICE_KEY = sign({ role: 'service_role', iss: 'dev' });

const ENV = {
  SUPABASE_URL: ORIGIN, SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  ALLOWED_ORIGINS: `${ORIGIN},http://localhost:${PORT}`,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'stripe',
  STRIPE_SECRET_KEY: 'sk_test_dev_only', STRIPE_WEBHOOK_SECRET: 'whsec_dev_only',
  STRIPE_API_BASE: `${ORIGIN}/dev/stripe`, SITE_URL: `${ORIGIN}/suites/`,
  GHL_WEBHOOK_SECRET: 'dev-ghl-secret', DISPATCH_SECRET: 'dev-dispatch-secret',
  EVENTS_WEBHOOK_URL: `${ORIGIN}/dev/events-sink`, EVENTS_SIGNING_SECRET: 'dev-events-secret',
};

const db = await openDb({ seed: true });
const mailbox = [];       // pretend emails
const sentEvents = [];    // what GHL / Make would receive
const otps = new Map(), refresh = new Map(), uploadTokens = new Map(), downloadTokens = new Map(), sessions = new Map();

const handlers = {};
for (const name of ['intake', 'order-status', 'checkout', 'payments-webhook', 'dispatch-events']) {
  handlers[name] = (await import(pathToFileURL(join(root, 'supabase', 'functions', name, 'handler.ts')).href)).handle;
}

// ---------- helpers ----------
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json', '.pdf': 'application/pdf' };
const send = (res, status, body, headers = {}) => {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-upsert',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', ...(isBuf || typeof body === 'string' ? {} : { 'Content-Type': 'application/json' }), ...headers });
  res.end(isBuf || typeof body === 'string' ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function caller(req) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.headers.apikey;
  const p = verify(bearer);
  if (!p) return null;
  return { role: p.role, claims: p };
}

async function rpc(who, name, args) {
  if (!/^[a-z_]+$/.test(name)) throw Object.assign(new Error('bad function'), { status: 404 });
  const meta = (await db.query(`select proretset, prorettype::regtype::text t from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [name])).rows[0];
  if (!meta) throw Object.assign(new Error(`function ${name} not found`), { status: 404 });
  const keys = Object.keys(args || {});
  if (keys.some((k) => !/^[a-z_]+$/.test(k))) throw Object.assign(new Error('bad args'), { status: 400 });
  const call = `public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`;
  const sql = meta.proretset ? `select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) as out from ${call} r`
    : meta.t === 'void' ? `select ${call}, null::jsonb as out` : `select to_jsonb(${call}) as out`;
  const vals = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]));
  return db.as(who.role, who.claims, async (t) => (await t.query(sql, vals)).rows[0].out);
}
function pgError(e) {
  const code = e.code || '';
  const status = e.status || (code === '42501' ? 403 : code === 'P0002' ? 404 : 400);
  return [status, { code, message: e.message }];
}

function tokens(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access = sign({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp, app_metadata: { provider: 'email' } });
  const rt = randomBytes(16).toString('hex');
  refresh.set(rt, user);
  return { access_token: access, refresh_token: rt, expires_in: 3600, expires_at: exp, token_type: 'bearer', user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated' } };
}

async function objectFile(bucket, path) { return join(storeDir, bucket, ...path.split('/')); }

// ---------- server ----------
createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname;
  try {
    // Edge Functions answer their own CORS preflight (their real allow-list).
    if (req.method === 'OPTIONS' && !p.startsWith('/functions/v1/')) return send(res, 204, '');

    // ----- auth -----
    if (p === '/auth/v1/otp' && req.method === 'POST') {
      const { email } = JSON.parse((await readBody(req)).toString() || '{}');
      const e = String(email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return send(res, 400, { msg: 'Invalid email' });
      const token = randomBytes(12).toString('hex');
      const redirect = url.searchParams.get('redirect_to') || `${ORIGIN}/suites/`;
      otps.set(token, { email: e, redirect });
      mailbox.unshift({ at: new Date(), to: e, subject: 'Your sign-in link for Crawford Creative Suites',
        link: `${ORIGIN}/auth/v1/verify?token=${token}&type=magiclink&redirect_to=${encodeURIComponent(redirect)}` });
      return send(res, 200, {});
    }
    if (p === '/auth/v1/verify') {
      const o = otps.get(url.searchParams.get('token'));
      if (!o) return send(res, 400, 'This sign-in link has expired. Ask for a new one.', { 'Content-Type': 'text/plain' });
      otps.delete(url.searchParams.get('token'));
      let u = (await db.query('select id, email from auth.users where email = $1', [o.email])).rows[0];
      if (!u) u = (await db.query('insert into auth.users (email) values ($1) returning id, email', [o.email])).rows[0];
      const t = tokens(u);
      const hash = new URLSearchParams({ access_token: t.access_token, expires_at: t.expires_at, expires_in: t.expires_in, refresh_token: t.refresh_token, token_type: 'bearer', type: 'magiclink' });
      return send(res, 303, '', { Location: `${o.redirect.replace(/#.*$/, '')}#${hash}` });
    }
    if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const { refresh_token } = JSON.parse((await readBody(req)).toString() || '{}');
      const u = refresh.get(refresh_token);
      if (!u) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
      refresh.delete(refresh_token);
      return send(res, 200, tokens(u));
    }
    if (p === '/auth/v1/user') {
      const c = caller(req);
      if (!c || c.role !== 'authenticated') return send(res, 401, { msg: 'Not signed in' });
      return send(res, 200, { id: c.claims.sub, email: c.claims.email, aud: 'authenticated', role: 'authenticated', app_metadata: c.claims.app_metadata, user_metadata: {} });
    }
    if (p === '/auth/v1/logout') return send(res, 204, '');

    // ----- database functions -----
    if (p.startsWith('/rest/v1/rpc/') && req.method === 'POST') {
      const who = caller(req);
      if (!who) return send(res, 401, { message: 'Invalid API key' });
      const args = JSON.parse((await readBody(req)).toString() || '{}');
      try { return send(res, 200, await rpc(who, p.slice('/rest/v1/rpc/'.length), args)); }
      catch (e) { const [s, b] = pgError(e); return send(res, s, b); }
    }

    // ----- storage -----
    let m;
    if ((m = p.match(/^\/storage\/v1\/object\/upload\/sign\/([^/]+)\/(.+)$/))) {
      const bucket = m[1], path = decodeURIComponent(m[2]);
      if (req.method === 'POST') {
        if (caller(req)?.role !== 'service_role') return send(res, 403, { error: 'service role only' });
        const token = randomBytes(12).toString('hex');
        uploadTokens.set(token, { bucket, path });
        return send(res, 200, { url: `/object/upload/sign/${bucket}/${m[2]}?token=${token}`, token });
      }
      if (req.method === 'PUT') {
        const t = uploadTokens.get(url.searchParams.get('token'));
        if (!t || t.bucket !== bucket || t.path !== path) return send(res, 400, { error: 'Invalid upload token' });
        const body = await readBody(req);
        const b = (await db.query('select file_size_limit, allowed_mime_types from storage.buckets where id = $1', [bucket])).rows[0];
        const type = (req.headers['content-type'] || 'application/octet-stream').split(';')[0];
        if (body.length > b.file_size_limit) return send(res, 413, { error: 'Payload too large' });
        if (!b.allowed_mime_types.includes(type)) return send(res, 415, { error: `mime type ${type} is not supported` });
        uploadTokens.delete(url.searchParams.get('token'));
        await db.as('service_role', {}, (t2) => t2.query('insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)', [bucket, path, JSON.stringify({ size: body.length, mimetype: type })]));
        const f = await objectFile(bucket, path); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, body);
        return send(res, 200, { Key: `${bucket}/${path}` });
      }
    }
    if ((m = p.match(/^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/))) {
      const bucket = m[1], path = decodeURIComponent(m[2]);
      if (req.method === 'POST') {
        const who = caller(req);
        if (!who || who.role === 'anon') return send(res, 401, { error: 'sign in required' });
        const seen = await db.as(who.role, who.claims, async (t) => (await t.query('select name from storage.objects where bucket_id = $1 and name = $2', [bucket, path])).rows);
        if (!seen.length) return send(res, 400, { error: 'Object not found' });
        const token = randomBytes(12).toString('hex');
        downloadTokens.set(token, { bucket, path, exp: Date.now() + 120000 });
        return send(res, 200, { signedURL: `/object/sign/${bucket}/${m[2]}?token=${token}` });
      }
      const t = downloadTokens.get(url.searchParams.get('token'));
      if (!t || t.path !== path || t.exp < Date.now()) return send(res, 400, 'Link expired', { 'Content-Type': 'text/plain' });
      const f = await objectFile(bucket, path);
      return send(res, 200, readFileSync(f), { 'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream',
        'Content-Disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename="${path.split('/').pop().replace(/"/g, '')}"` });
    }
    if ((m = p.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/)) && req.method === 'POST') {
      const bucket = m[1], path = decodeURIComponent(m[2]);
      const who = caller(req);
      if (!who || who.role !== 'authenticated') return send(res, 401, { error: 'sign in required' });
      const body = await readBody(req);
      const b = (await db.query('select file_size_limit, allowed_mime_types from storage.buckets where id = $1', [bucket])).rows[0];
      const type = (req.headers['content-type'] || 'application/octet-stream').split(';')[0];
      if (body.length > b.file_size_limit) return send(res, 413, { error: 'Payload too large' });
      if (!b.allowed_mime_types.includes(type)) return send(res, 415, { error: `mime type ${type} is not supported` });
      try {
        await db.as('authenticated', who.claims, (t) => t.query('insert into storage.objects (bucket_id, name, owner, metadata) values ($1, $2, $3, $4)', [bucket, path, who.claims.sub, JSON.stringify({ size: body.length, mimetype: type })]));
      } catch (e) { return send(res, 403, { error: 'new row violates row-level security policy', message: e.message }); }
      const f = await objectFile(bucket, path); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, body);
      return send(res, 200, { Key: `${bucket}/${path}` });
    }

    if ((m = p.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/)) && req.method === 'DELETE') {
      const bucket = m[1], path = decodeURIComponent(m[2]);
      const who = caller(req);
      if (!who || who.role !== 'authenticated') return send(res, 401, { error: 'sign in required' });
      const gone = await db.as('authenticated', who.claims, async (t) => (await t.query('delete from storage.objects where bucket_id = $1 and name = $2 returning name', [bucket, path])).rows);
      if (!gone.length) return send(res, 404, { error: 'Object not found' });
      rmSync(await objectFile(bucket, path), { force: true });
      return send(res, 200, { message: 'Successfully deleted' });
    }

    // ----- Edge Functions (the real handlers) -----
    if ((m = p.match(/^\/functions\/v1\/([a-z-]+)$/)) && handlers[m[1]]) {
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
      const wreq = new Request(url, { method: req.method, headers: req.headers, body });
      const wres = await handlers[m[1]](wreq, ENV);
      const headers = Object.fromEntries(wres.headers.entries());
      res.writeHead(wres.status, headers);
      return res.end(Buffer.from(await wres.arrayBuffer()));
    }

    // ----- pretend Stripe -----
    if (p === '/dev/stripe/v1/checkout/sessions' && req.method === 'POST') {
      const f = new URLSearchParams((await readBody(req)).toString());
      const id = `cs_test_${randomBytes(8).toString('hex')}`;
      sessions.set(id, { id, number: f.get('metadata[number]'), kind: f.get('metadata[kind]'), email: f.get('customer_email'),
        amount_total: Number(f.get('line_items[0][price_data][unit_amount]')), name: f.get('line_items[0][price_data][product_data][name]'),
        success_url: f.get('success_url'), cancel_url: f.get('cancel_url') });
      return send(res, 200, { id, url: `${ORIGIN}/dev/stripe/pay/${id}` });
    }
    if ((m = p.match(/^\/dev\/stripe\/pay\/(cs_test_\w+)$/))) {
      const s = sessions.get(m[1]);
      if (!s) return send(res, 404, 'Unknown checkout', { 'Content-Type': 'text/plain' });
      if (req.method === 'POST') {
        const event = { id: `evt_${randomBytes(8).toString('hex')}`, type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000),
          data: { object: { id: s.id, object: 'checkout.session', payment_status: 'paid', amount_total: s.amount_total, currency: 'usd',
            client_reference_id: s.number, customer_email: s.email, metadata: { number: s.number, kind: s.kind } } } };
        const raw = JSON.stringify(event);
        const t = Math.floor(Date.now() / 1000);
        await fetch(`${ORIGIN}/functions/v1/payments-webhook?provider=stripe`, { method: 'POST', body: raw,
          headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${await hmacHex(ENV.STRIPE_WEBHOOK_SECRET, `${t}.${raw}`)}` } });
        return send(res, 303, '', { Location: s.success_url });
      }
      return send(res, 200, page('Preview checkout', `<p class="tag">PREVIEW ONLY · NO REAL MONEY · NO CARD NEEDED</p>
        <h1>${esc(s.name)}</h1><p class="amt">$${(s.amount_total / 100).toFixed(2)}</p><p>For ${esc(s.email)}</p>
        <form method="post"><button>Pay (pretend)</button></form><p><a href="${esc(s.cancel_url)}">Cancel and go back</a></p>`), { 'Content-Type': 'text/html; charset=utf-8' });
    }

    // ----- pretend GHL / Make receiver and the preview mailbox -----
    if (p === '/dev/events-sink' && req.method === 'POST') {
      const raw = (await readBody(req)).toString();
      sentEvents.unshift({ at: new Date(), type: req.headers['x-ccs-event'], signature: req.headers['x-ccs-signature'], body: JSON.parse(raw) });
      return send(res, 200, { ok: true });
    }
    if (p === '/dev/mailbox') {
      await fetch(`${ORIGIN}/functions/v1/dispatch-events`, { method: 'POST', headers: { 'x-ccs-dispatch-secret': ENV.DISPATCH_SECRET } });
      const mails = mailbox.map((e) => `<li><small>${e.at.toLocaleTimeString()} · to ${esc(e.to)}</small><strong>${esc(e.subject)}</strong>
        <p>Tap the button to sign in. No password is needed.</p><a class="btn" href="${esc(e.link)}">Sign in to Crawford Creative Suites</a></li>`).join('') || '<li>No emails yet. Use Client Login on the site and ask for a sign-in link.</li>';
      const evs = sentEvents.slice(0, 30).map((e) => `<li><small>${e.at.toLocaleTimeString()}</small><strong>${esc(e.type)}</strong><code>${esc(JSON.stringify(e.body.data))}</code></li>`).join('') || '<li>None yet.</li>';
      return send(res, 200, page('Preview mailbox', `<p class="tag">PREVIEW ONLY · NOTHING HERE IS REALLY SENT</p>
        <h1>Preview mailbox</h1><p>On the live site these sign-in emails come from Supabase. Here they wait on this page.</p>
        <ul class="mail">${mails}</ul><h2>Events GHL would receive</h2><p>lead.created, order.created, payment.succeeded and member.invited, as sent to the GHL / Make webhook.</p><ul class="mail">${evs}</ul>
        <p><a href="/suites/">Back to the building</a></p>`), { 'Content-Type': 'text/html; charset=utf-8' });
    }

    // ----- site files -----
    if (p === '/suites/backend-config.js') {
      return send(res, 200, `// Local preview settings (served by build/dev-backend.mjs; not the real file).
window.CCS_BACKEND = ${JSON.stringify({ url: ORIGIN, anonKey: ANON_KEY, turnstileSiteKey: '', paymentProvider: ENV.PAYMENT_PROVIDER, preview: true,
        links: { classes: '', booking: '' } }, null, 2)};\n`, { 'Content-Type': 'text/javascript' });
    }
    let path = normalize(decodeURIComponent(p)).replace(/^([/\\])+/, '');
    if (path === '' || path.endsWith('/') || path.endsWith('\\')) path = join(path, 'index.html');
    const file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file)) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    return send(res, 200, readFileSync(file), { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: String(e.message || e) });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Preview with test backend at ${ORIGIN}/  (mailbox: ${ORIGIN}/dev/mailbox)`));

function page(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;background:#100e0d;color:#f4ece6;font:15px/1.55 Lora,Georgia,serif;display:flex;justify-content:center}
main{width:min(720px,100% - 32px);padding:40px 0}h1{font:400 2rem "Instrument Serif",Georgia,serif;margin:.2em 0}h2{font:400 1.4rem Georgia,serif;margin-top:2em}
.tag{color:#cb9671;letter-spacing:.18em;font-size:.7rem}.amt{font-size:2.2rem;color:#eccbb0;margin:.2em 0}
button,.btn{display:inline-block;cursor:pointer;padding:12px 18px;border:1px solid #daa681;background:linear-gradient(135deg,#eccbb0,#b9805d);color:#21150d;font-weight:700;text-decoration:none}
a{color:#9fe3dc}.mail{list-style:none;padding:0}.mail li{border:1px solid rgba(255,255,255,.18);border-top:2px solid #cb9671;border-radius:12px;padding:14px 16px;margin:12px 0;background:rgba(255,255,255,.04)}
.mail small{display:block;color:#b9aca3}.mail strong{display:block;margin:.2em 0}code{display:block;white-space:pre-wrap;word-break:break-all;font-size:.75rem;color:#cfc3ba}</style></head><body><main>${inner}</main></body></html>`;
}
