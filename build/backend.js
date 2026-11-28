// Small browser client for the Supabase backend: magic-link sign-in, database
// functions (RLS applies), Edge Functions and private file storage.
// Settings come from suites/backend-config.js (public values only: the project URL,
// the anon / publishable key and the Turnstile site key). Until that file has a URL,
// the site behaves exactly as before: forms open an email, and Client Login is hidden.

const KEY = 'ccs_session';
const cfg = () => window.CCS_BACKEND || {};

export function ready() {
  const c = cfg();
  return !!(c.url && c.anonKey);
}

function base() { return String(cfg().url).replace(/\/+$/, ''); }

// ---------- session ----------
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function save(s) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('ccs-auth', { detail: { signedIn: !!s } }));
}
function claims(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
}

// After the magic link: the URL hash holds the session. Store it and tidy the address bar.
export function consumeRedirect() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (h.get('error_description')) {
    history.replaceState(null, '', location.pathname + location.search);
    return { error: h.get('error_description') };
  }
  const access = h.get('access_token');
  if (!access) return null;
  const c = claims(access);
  save({ access_token: access, refresh_token: h.get('refresh_token'), expires_at: Number(h.get('expires_at')) || c.exp, email: c.email });
  history.replaceState(null, '', location.pathname + location.search + '#projects');
  return { signedIn: true };
}

export function currentEmail() { return load()?.email || null; }
export function signedIn() { return !!load(); }

async function accessToken() {
  const s = load();
  if (!s) return null;
  if (s.expires_at && s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  const res = await fetch(`${base()}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: cfg().anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!res.ok) { save(null); return null; }
  const t = await res.json();
  save({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, email: t.user?.email || s.email });
  return t.access_token;
}

// Magic link: no password. Supabase emails a one-time link back to this page.
export async function sendMagicLink(email) {
  const redirect = location.origin + location.pathname.replace(/[^/]*$/, '') ;
  const to = /\/suites\/$/.test(redirect) ? redirect : redirect + 'suites/';
  const res = await fetch(`${base()}/auth/v1/otp?redirect_to=${encodeURIComponent(to)}`, {
    method: 'POST', headers: { apikey: cfg().anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(res.status === 429 ? 'Our sign-in emails are busy right now. Please try again a little later, or use "Check one order without signing in" below.' : (b.msg || b.error_description || 'Could not send the sign-in link'));
  }
}

export async function signOut() {
  const t = load()?.access_token;
  save(null);
  if (t) fetch(`${base()}/auth/v1/logout`, { method: 'POST', headers: { apikey: cfg().anonKey, Authorization: `Bearer ${t}` } }).catch(() => {});
}

async function headers(auth) {
  const h = { apikey: cfg().anonKey, 'Content-Type': 'application/json' };
  const t = auth ? await accessToken() : null;
  if (auth && !t) throw new Error('Please sign in again');
  h.Authorization = `Bearer ${t || cfg().anonKey}`;
  return h;
}

async function parse(res) {
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!res.ok) {
    const e = new Error((body && (body.error || body.message)) || `Request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return body;
}

// Database function as the signed-in user (RLS decides what she may see).
export async function rpc(name, args = {}) {
  const res = await fetch(`${base()}/rest/v1/rpc/${name}`, { method: 'POST', headers: await headers(true), body: JSON.stringify(args) });
  return parse(res);
}

// Edge Function; sends the user's token when signed in, otherwise the public key.
export async function fn(name, body, { auth = false } = {}) {
  const h = await headers(auth && signedIn());
  const res = await fetch(`${base()}/functions/v1/${name}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return parse(res);
}

// ---------- files ----------
export const FILE_TYPES = '.jpg,.jpeg,.png,.pdf,.svg,.dxf,.stl,.3mf';
export const MAX_BYTES = 25 * 1024 * 1024;
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf', svg: 'image/svg+xml',
  dxf: 'application/dxf', stl: 'model/stl', '3mf': 'model/3mf' };
export function mimeFor(file) {
  const ext = String(file.name).toLowerCase().split('.').pop();
  return MIME[ext] || 'application/octet-stream';
}
export function checkFile(file) {
  if (!new RegExp(`\\.(${Object.keys(MIME).join('|')})$`, 'i').test(file.name)) return `${file.name} is not a JPG, PNG, PDF, SVG, DXF, STL, or 3MF file.`;
  if (file.size > MAX_BYTES) return `${file.name} is larger than 25 MB.`;
  if (!file.size) return `${file.name} is empty.`;
  return null;
}

// One-time URL handed back by the intake Function (no sign-in needed).
export async function uploadToSignedUrl(url, file) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': mimeFor(file), 'x-upsert': 'false' }, body: file });
  return parse(res);
}

// Signed-in upload into one of her own record folders.
export async function uploadFile(folderPath, file) {
  const safe = file.name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(-80) || 'file';
  const path = `${folderPath}/${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}-${safe}`;
  const t = await accessToken();
  const res = await fetch(`${base()}/storage/v1/object/order-files/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: cfg().anonKey, Authorization: `Bearer ${t}`, 'Content-Type': mimeFor(file), 'x-upsert': 'false' }, body: file,
  });
  await parse(res);
  await rpc('register_file', { p_path: path, p_name: file.name, p_type: mimeFor(file), p_size: file.size });
  return path;
}

// Short-lived private download link (2 minutes). SVG and 3D files always download.
export async function downloadUrl(path) {
  const t = await accessToken();
  const res = await fetch(`${base()}/storage/v1/object/sign/order-files/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: cfg().anonKey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 120 }),
  });
  const b = await parse(res);
  const download = /\.(svg|dxf|stl|3mf)$/i.test(path) ? '&download=' : '';
  return `${base()}/storage/v1${b.signedURL}${download}`;
}

// ---------- quote images (private bucket "quote-images") ----------
// Admin attaches mock-ups to a quote; the customer sees them only after the quote is sent.
export const QUOTE_IMAGE_TYPES = '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf';
export const QUOTE_IMAGE_MAX = 10 * 1024 * 1024;
const QUOTE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' };
const quoteMime = (file) => QUOTE_MIME[String(file.name).toLowerCase().split('.').pop()];
export function checkQuoteImage(file) {
  if (!quoteMime(file)) return `${file.name} is not a JPG, PNG, WEBP, HEIC or PDF file.`;
  if (file.size > QUOTE_IMAGE_MAX) return `${file.name} is larger than 10 MB.`;
  if (!file.size) return `${file.name} is empty.`;
  return null;
}
const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

// Admin: upload into the record's folder, then register it on quote version `version`.
export async function uploadQuoteImage(folderPath, file, version) {
  const safe = file.name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(-80) || 'file';
  const path = `${folderPath}/${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}-${safe}`;
  const t = await accessToken();
  const res = await fetch(`${base()}/storage/v1/object/quote-images/${encodePath(path)}`, {
    method: 'POST', headers: { apikey: cfg().anonKey, Authorization: `Bearer ${t}`, 'Content-Type': quoteMime(file), 'x-upsert': 'false' }, body: file,
  });
  await parse(res);
  await rpc('admin_add_quote_image', { p_path: path, p_name: file.name, p_type: quoteMime(file), p_size: file.size, p_version: version });
  return path;
}

// Admin: remove a draft image (database row first, then the file).
export async function removeQuoteImage(id) {
  const r = await rpc('admin_remove_quote_image', { p_id: id });
  if (r?.path) {
    const t = await accessToken();
    await fetch(`${base()}/storage/v1/object/quote-images/${encodePath(r.path)}`, { method: 'DELETE', headers: { apikey: cfg().anonKey, Authorization: `Bearer ${t}` } }).catch(() => {});
  }
}

// Short-lived private link (1 hour, long enough to look at a page of thumbnails).
export async function quoteImageUrl(path) {
  const t = await accessToken();
  const res = await fetch(`${base()}/storage/v1/object/sign/quote-images/${encodePath(path)}`, {
    method: 'POST', headers: { apikey: cfg().anonKey, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  const b = await parse(res);
  return `${base()}/storage/v1${b.signedURL}`;
}

// ---------- spam check ----------
let turnstileLoad;
export async function turnstileToken() {
  const key = cfg().turnstileSiteKey;
  if (!key) return null;
  turnstileLoad ||= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
  await turnstileLoad;
  return new Promise((ok) => {
    const box = document.createElement('div');
    box.className = 'ccs-turnstile';
    document.body.appendChild(box);
    window.turnstile.render(box, { sitekey: key, appearance: 'interaction-only',
      callback: (t) => { ok(t); setTimeout(() => box.remove(), 500); },
      'error-callback': () => { ok(null); box.remove(); } });
  });
}

export function utm() {
  const q = new URLSearchParams(location.search);
  const saved = JSON.parse(sessionStorage.getItem('ccs_utm') || '{}');
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (q.get(k)) saved[k] = q.get(k);
  sessionStorage.setItem('ccs_utm', JSON.stringify(saved));
  return saved;
}
