// POST /functions/v1/wave-poll   header x-ccs-cron-secret: <Vault ccs_cron_secret>
// Wave's free Starter plan has no webhooks, so pg_cron calls this every 15 minutes.
// For each open Wave invoice it reads status + amount paid and records new money as a
// 'wave' payment (public.wave_apply_status -> apply_payment), which moves paid / status /
// billing_status (deposit_paid, balance_due, paid).

import { json, rpc, HttpError, type Env } from '../_shared/http.ts';
import { business, cronAuth, wave } from '../_shared/wave.ts';

const Q_INVOICE = `query ($b: ID!, $i: ID!) { business(id: $b) { invoice(id: $i) {
  id status amountPaid { value } amountDue { value } } } }`;

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  try {
    await cronAuth(req, env);
    const open = (await rpc(env, 'wave_open_invoices', {})) || [];
    let checked = 0, changed = 0, failed = 0;
    const results: unknown[] = [];
    for (const w of open) {
      try {
        const b = business(w.business);
        const inv = (await wave(env, w.business, Q_INVOICE, { b: b.businessId, i: w.wave_invoice_id }))?.business?.invoice;
        if (!inv) throw new Error('invoice not found in Wave');
        const paid = Number(inv.amountPaid?.value || 0);
        const r = await rpc(env, 'wave_apply_status', { p_id: w.id, p_status: inv.status, p_amount_paid: paid });
        checked++;
        if (Number(r?.delta || 0) > 0 || inv.status !== w.wave_status) changed++;
        results.push({ number: w.order_number, kind: w.kind, wave_invoice_number: w.wave_invoice_number, status: inv.status, paid });
      } catch (e) {
        failed++;
        results.push({ number: w.order_number, kind: w.kind, error: String((e as Error).message || e) });
      }
    }
    return json({ ok: true, checked, changed, failed, results }, 200);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
}
