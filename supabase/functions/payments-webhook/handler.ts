// POST /functions/v1/payments-webhook?provider=stripe | ghl
// Server-to-server only. Records the payment, updates Paid / Deposit / Balance / Status,
// writes a status_events row, and emits payment.succeeded (all inside apply_payment).
//
// Stripe: verified with the Stripe-Signature header and STRIPE_WEBHOOK_SECRET.
//   Events used: checkout.session.completed, checkout.session.async_payment_succeeded,
//   charge.refunded.
// GHL: a workflow "Custom Webhook" action posts JSON with the header
//   x-ccs-webhook-secret: <GHL_WEBHOOK_SECRET>
//   body: { "number": "AFF-0002", "amount": 108.00, "kind": "deposit", "transaction_id": "...", "currency": "usd" }
//   (amount in dollars; kind deposit | balance | full | refund)

import { json, rpc, HttpError, type Env } from '../_shared/http.ts';
import { safeEqual, verifyStripe } from '../_shared/security.ts';

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  const provider = new URL(req.url).searchParams.get('provider') || env.PAYMENT_PROVIDER || '';
  const raw = await req.text();
  if (raw.length > 256 * 1024) return json({ ok: false, error: 'Too large' }, 413);
  try {
    if (provider === 'stripe') return await stripe(req, env, raw);
    if (provider === 'ghl') return await ghl(req, env, raw);
    return json({ ok: false, error: 'Unknown provider' }, 400);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status === 400 && /not found/i.test(e.message) ? 404 : e.status);
    console.error(e);
    return json({ ok: false, error: 'Something went wrong' }, 500);
  }
}

async function stripe(req: Request, env: Env, raw: string): Promise<Response> {
  if (!(await verifyStripe(raw, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET || ''))) {
    return json({ ok: false, error: 'Bad signature' }, 400);
  }
  const event = JSON.parse(raw);
  const o = event?.data?.object || {};
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    if (o.payment_status !== 'paid') return json({ ok: true, ignored: 'not paid yet' }, 200);
    const number = o.metadata?.number || o.client_reference_id;
    if (!number) return json({ ok: true, ignored: 'no project number' }, 200);
    const r = await rpc(env, 'apply_payment', { p: {
      number, provider: 'stripe', provider_ref: o.id, kind: o.metadata?.kind || 'full',
      amount: (o.amount_total || 0) / 100, currency: o.currency || 'usd',
      received_at: new Date((event.created || Date.now() / 1000) * 1000).toISOString(),
      raw: { event: event.id, type: event.type, session: o.id, payment_intent: o.payment_intent, amount_total: o.amount_total },
    } });
    return json({ ok: true, result: r }, 200);
  }
  if (event.type === 'charge.refunded') {
    const number = o.metadata?.number;
    const delta = (o.amount_refunded || 0) - (event.data?.previous_attributes?.amount_refunded || 0);
    if (!number || delta <= 0) return json({ ok: true, ignored: 'nothing to record' }, 200);
    const r = await rpc(env, 'apply_payment', { p: {
      number, provider: 'stripe', provider_ref: event.id, kind: 'refund', amount: delta / 100,
      currency: o.currency || 'usd', raw: { event: event.id, charge: o.id, amount_refunded: o.amount_refunded },
    } });
    return json({ ok: true, result: r }, 200);
  }
  return json({ ok: true, ignored: event.type }, 200);
}

async function ghl(req: Request, env: Env, raw: string): Promise<Response> {
  const secret = env.GHL_WEBHOOK_SECRET || '';
  if (!secret || !safeEqual(req.headers.get('x-ccs-webhook-secret') || '', secret)) {
    return json({ ok: false, error: 'Bad secret' }, 401);
  }
  const b = JSON.parse(raw || '{}');
  const number = String(b.number || b.order_number || '').trim();
  const ref = String(b.transaction_id || b.id || '').trim();
  const amount = Number(b.amount);
  const kind = ['deposit', 'balance', 'full', 'refund'].includes(b.kind) ? b.kind : 'balance';
  if (!number || !ref || !(amount > 0)) return json({ ok: false, error: 'number, amount and transaction_id are required' }, 400);
  const r = await rpc(env, 'apply_payment', { p: {
    number, provider: 'ghl', provider_ref: ref, kind, amount, currency: String(b.currency || 'usd').toLowerCase(),
    raw: { transaction_id: ref, contact_id: b.contact_id || null, source: 'ghl workflow' },
  } });
  return json({ ok: true, result: r }, 200);
}
