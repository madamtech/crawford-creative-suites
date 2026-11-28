// Wave (waveapps.com) GraphQL client and the three allowed businesses.
// Tokens come from the Function secrets WAVE_TOKEN_MA / WAVE_TOKEN_AIA and are never logged or returned.
// Cron/trigger calls are checked with the x-ccs-cron-secret header against Supabase Vault
// (public.wave_runtime), which also returns the test-mode settings.

import { rpc, HttpError, type Env } from './http.ts';

export const WAVE_GQL = 'https://gql.waveapps.com/graphql/public';

export type BusinessKey = 'madam_allure' | 'allure_fusions' | 'ai_authoritech';

export const BUSINESSES: Record<BusinessKey, { label: string; businessId: string; tokenEnv: string; productId: string }> = {
  madam_allure: {
    label: 'MadamAllure, LLC',
    businessId: 'QnVzaW5lc3M6YTZlMjY5MzgtZDM3Zi00NzdkLWI0YTgtMWExNDRhZmQxNmU0',
    tokenEnv: 'WAVE_TOKEN_MA',
    productId: 'QnVzaW5lc3M6YTZlMjY5MzgtZDM3Zi00NzdkLWI0YTgtMWExNDRhZmQxNmU0O1Byb2R1Y3Q6MTQxNzUwODI4',
  },
  allure_fusions: {
    label: 'Allure Fusions Firm',
    businessId: 'QnVzaW5lc3M6ODM3NWMwMWYtMmEyMy00NjVjLTlmZDEtNTU4NTI5OWZhNDg4',
    tokenEnv: 'WAVE_TOKEN_MA',
    productId: 'QnVzaW5lc3M6ODM3NWMwMWYtMmEyMy00NjVjLTlmZDEtNTU4NTI5OWZhNDg4O1Byb2R1Y3Q6MTQxNzUwODI5',
  },
  ai_authoritech: {
    label: 'Ai AuthoriTech',
    businessId: 'QnVzaW5lc3M6MDRkNTFlYTEtNjY0NC00ZmUxLTliZDEtM2UzNTk0NzM4NmE2',
    tokenEnv: 'WAVE_TOKEN_AIA',
    productId: 'QnVzaW5lc3M6MDRkNTFlYTEtNjY0NC00ZmUxLTliZDEtM2UzNTk0NzM4NmE2O1Byb2R1Y3Q6MTQxNzUwODMw',
  },
};

// Personal and Texas Crafting Queens: never touched.
const BLOCKED = new Set([
  'QnVzaW5lc3M6ZWRkODlhNDEtYzE3MC00ZDk4LWE5ZWUtNWNlMzNjMzEzZjU3',
  'QnVzaW5lc3M6YmRmNjMzZDUtYmZhNC00MWVjLWEzMDAtMzU0NTlmYTg1ZjYy',
  'QnVzaW5lc3M6YzBhMTU5OWEtYWE2My00ZmNkLTlkODctZGExYTU3ZDYwMTY1',
]);

export function business(key: string) {
  const b = BUSINESSES[key as BusinessKey];
  if (!b || BLOCKED.has(b.businessId)) throw new HttpError(400, `Business not allowed: ${key}`);
  return b;
}

export type Runtime = { test_mode: boolean; test_email: string | null };

export async function cronAuth(req: Request, env: Env): Promise<Runtime> {
  const secret = req.headers.get('x-ccs-cron-secret') || '';
  if (!secret) throw new HttpError(401, 'Bad secret');
  try {
    const rt = await rpc(env, 'wave_runtime', { p_secret: secret });
    return { test_mode: rt?.test_mode !== false, test_email: rt?.test_email || null };
  } catch {
    throw new HttpError(401, 'Bad secret');
  }
}

export async function wave(env: Env, key: string, query: string, variables: Record<string, unknown>): Promise<any> {
  const b = business(key);
  const token = env[b.tokenEnv];
  if (!token) throw new HttpError(500, `Missing Function secret ${b.tokenEnv}`);
  const res = await fetch(WAVE_GQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors?.length) {
    const msg = (body.errors || []).map((e: any) => e.message).join('; ') || `Wave HTTP ${res.status}`;
    throw new Error(`Wave: ${msg}`.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]'));
  }
  return body.data;
}

export function inputErrors(out: any): string | null {
  if (out?.didSucceed) return null;
  const list = (out?.inputErrors || []).map((e: any) => `${(e.path || []).join('.')}: ${e.message} (${e.code})`);
  return list.join('; ') || 'Wave did not succeed';
}
