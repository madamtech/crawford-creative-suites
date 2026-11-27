// CORS, JSON helpers and the Supabase REST calls the Functions make.
// No third-party imports, so the same code runs in Supabase (Deno) and in the
// local test server (Node).

export type Env = Record<string, string | undefined>;

const DEFAULT_ORIGINS = [
  'https://madamtech.github.io',
  'http://127.0.0.1:4173', 'http://localhost:4173',
  'http://127.0.0.1:4180', 'http://localhost:4180',
  'http://127.0.0.1:8417',
];

export function allowedOrigins(env: Env): string[] {
  const list = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ORIGINS;
}

export function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowedOrigins(env).includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export function json(body: unknown, status: number, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

// Browser-facing preamble: preflight, origin check, POST only.
export function browserGate(req: Request, env: Env): Response | Record<string, string> {
  const cors = corsHeaders(req, env);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405, cors);
  const origin = req.headers.get('origin');
  if (origin && !allowedOrigins(env).includes(origin)) return json({ ok: false, error: 'Origin not allowed' }, 403, cors);
  return cors;
}

export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<any> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request too large');
  try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'Invalid JSON'); }
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function serviceHeaders(env: Env): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!env.SUPABASE_URL || !key) throw new HttpError(500, 'Backend is not configured');
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys do not.
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

// Call a database function as the service role.
export async function rpc(env: Env, name: string, args: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: serviceHeaders(env), body: JSON.stringify(args),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || `rpc ${name} failed`;
    throw new HttpError(res.status >= 500 ? 502 : 400, msg);
  }
  return body;
}

// A one-time upload URL for a private file (no key reaches the browser).
export async function signedUploadUrl(env: Env, bucket: string, path: string): Promise<string> {
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${encodePath(path)}`, {
    method: 'POST', headers: serviceHeaders(env), body: '{}',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new HttpError(502, 'Could not prepare file upload');
  return `${env.SUPABASE_URL}/storage/v1${body.url}`;
}

export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

// The signed-in user behind a browser request (null when not signed in).
export async function userFromRequest(req: Request, env: Env): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token === env.SUPABASE_ANON_KEY || !token.startsWith('eyJ')) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.email ? { id: u.id, email: String(u.email).toLowerCase() } : null;
}

export function handleError(e: unknown, cors: Record<string, string>): Response {
  if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status, cors);
  console.error(e);
  return json({ ok: false, error: 'Something went wrong' }, 500, cors);
}
