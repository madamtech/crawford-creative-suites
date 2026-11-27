// POST /functions/v1/order-status  { number: "AFF-0002", email: "you@example.com" }
// Lookup without signing in. Needs BOTH the number and the email on the order,
// and returns only that record's status, payment state and due date.

import { browserGate, handleError, json, readJson, rpc, HttpError, type Env } from '../_shared/http.ts';

const NUMBER = /^(AFF|AIA|MA)-\d{4,}$/i;

export async function handle(req: Request, env: Env): Promise<Response> {
  const gate = browserGate(req, env);
  if (gate instanceof Response) return gate;
  try {
    const { number, email } = await readJson(req, 2048);
    if (typeof number !== 'string' || !NUMBER.test(number.trim()) || typeof email !== 'string' || !email.includes('@')) {
      throw new HttpError(400, 'Enter your order number (for example AFF-0002) and the email you used');
    }
    const r = await rpc(env, 'lookup_status', { p_number: number.trim(), p_email: email.trim() });
    return json(r, r.ok ? 200 : 404, gate);
  } catch (e) {
    return handleError(e, gate);
  }
}
