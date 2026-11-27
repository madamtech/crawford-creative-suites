// POST /functions/v1/checkout  { number: "AFF-0002", kind: "deposit" | "balance" }
// Signed-in clients only (Authorization: Bearer <their session token>).
// The amount always comes from the database (quote, deposit rule, amount paid).
//
// PAYMENT_PROVIDER decides how the client pays (Tanika's choice):
//   stripe -> a Stripe Checkout page is created and its URL returned
//   ghl    -> the GHL payment link saved on the record in the Admin Office is returned
// Madam Allure stays on Ueni and has no checkout here.

import { browserGate, handleError, json, readJson, rpc, userFromRequest, HttpError, type Env } from '../_shared/http.ts';

export async function handle(req: Request, env: Env): Promise<Response> {
  const gate = browserGate(req, env);
  if (gate instanceof Response) return gate;
  try {
    const user = await userFromRequest(req, env);
    if (!user) throw new HttpError(401, 'Please sign in first');
    const { number, kind } = await readJson(req, 2048);
    if (typeof number !== 'string' || !['deposit', 'balance'].includes(kind)) throw new HttpError(400, 'Bad request');

    const due = await rpc(env, 'checkout_amount', { p_number: number, p_kind: kind, p_email: user.email });
    if (!due.ok) throw new HttpError(404, due.error || 'Nothing to pay');

    const provider = (env.PAYMENT_PROVIDER || '').toLowerCase();
    if (provider === 'stripe') {
      const url = await stripeSession(env, due, user.email);
      return json({ ok: true, url }, 200, gate);
    }
    if (due.payment_link) return json({ ok: true, url: due.payment_link }, 200, gate);
    throw new HttpError(409, 'Online payment is not set up for this project yet. We will email you a payment link.');
  } catch (e) {
    return handleError(e, gate);
  }
}

async function stripeSession(env: Env, due: any, email: string): Promise<string> {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(500, 'Payments are not configured');
  const site = (env.SITE_URL || 'https://madamtech.github.io/crawford-creative-suites/suites/').replace(/#.*$/, '');
  const label = due.business === 'ai_authoritech' ? 'AI AuthoriTech' : 'Allure Fusions';
  const what = due.kind === 'deposit' ? 'deposit' : due.kind === 'full' ? 'payment' : 'balance';
  const cents = Math.round(Number(due.amount) * 100);
  const form = new URLSearchParams({
    mode: 'payment',
    customer_email: email,
    client_reference_id: due.number,
    success_url: `${site}#projects-paid`,
    cancel_url: `${site}#projects`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][product_data][name]': `${label} ${due.number} ${what}`,
    'line_items[0][price_data][product_data][description]': String(due.title || '').slice(0, 200) || label,
    'metadata[number]': due.number,
    'metadata[kind]': due.kind,
    'metadata[entity_type]': due.entity_type,
    'payment_intent_data[metadata][number]': due.number,
    'payment_intent_data[metadata][kind]': due.kind,
  });
  const res = await fetch(`${env.STRIPE_API_BASE || 'https://api.stripe.com'}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Same project, kind and amount within a short window gets the same page.
      'Idempotency-Key': `${due.number}-${due.kind}-${cents}-${Math.floor(Date.now() / 600000)}`,
    },
    body: form,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.url) throw new HttpError(502, 'Could not start checkout');
  return out.url;
}
