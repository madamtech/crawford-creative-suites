// POST /functions/v1/dispatch-events
//   header x-ccs-dispatch-secret: <DISPATCH_SECRET>   (Function secret), or
//   header x-ccs-cron-secret: <Vault ccs_cron_secret>  (used by the pg_cron job)
// Sends waiting events (lead.created, order.created, payment.succeeded, member.invited, quote.approved,
// invoice.ready, attention.needed) to ONE GoHighLevel inbound webhook for all three businesses
// (Vault ghl_webhook_url, or the EVENTS_WEBHOOK_URL Function secret), signed with EVENTS_SIGNING_SECRET.
// The business travels in the body: top-level `business` + `business_label` + `tags`, and in `data`. Run it on a schedule (pg_cron job ccs-dispatch-events, created PAUSED).
// Failed sends stay in the outbox and are retried up to 10 times.
// Body { "dry_run": true } reports what is waiting and what is configured; it sends and claims nothing.
// TEST MODE (Vault wave_test_mode, on unless 'false'): every "email" in the payload is replaced by the
// Vault test address and the event carries test_mode: true, so notifications only reach that address.
// GHL DELIVERY IN TEST MODE IS OFF by default (Vault ghl_in_test_mode = 'true' turns it on), so test-mode events
// just wait in the outbox. attention.needed is addressed to Tanika: data.notify_email is the test address in test
// mode, otherwise Vault admin_notify_email (or the ADMIN_NOTIFY_EMAIL Function secret).

import { json, rpc, readJson, type Env } from '../_shared/http.ts';
import { safeEqual, signEvent } from '../_shared/security.ts';

function forceEmail(v: unknown, to: string): unknown {
  if (Array.isArray(v)) return v.map((x) => forceEmail(x, to));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = /^e?mail$|_email$|^email_/i.test(k) && typeof x === 'string' ? to : forceEmail(x, to);
    return out;
  }
  return v;
}

async function authorized(req: Request, env: Env): Promise<boolean> {
  const d = req.headers.get('x-ccs-dispatch-secret') || '';
  if (env.DISPATCH_SECRET && d && safeEqual(d, env.DISPATCH_SECRET)) return true;
  const c = req.headers.get('x-ccs-cron-secret') || '';
  if (!c) return false;
  try { await rpc(env, 'wave_runtime', { p_secret: c }); return true; } catch { return false; }
}

const LABEL: Record<string, string> = { allure_fusions: 'Allure Fusions Firm', ai_authoritech: 'AI AuthoriTech', madam_allure: 'Madam Allure' };

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  if (!(await authorized(req, env))) return json({ ok: false, error: 'Bad secret' }, 401);
  const body = await readJson(req).catch(() => ({}));
  const t = await rpc(env, 'ccs_test_settings', {});
  const testMode = t?.test_mode !== false;
  const webhook: string | undefined = t?.ghl_webhook_url || env.EVENTS_WEBHOOK_URL;
  const ghlOn = !testMode || t?.ghl_in_test_mode === true;     // test mode keeps GHL off unless switched on
  const adminEmail: string | undefined = t?.admin_notify_email || env.ADMIN_NOTIFY_EMAIL;

  if (body.dry_run) {
    return json({
      ok: true, dry_run: true, test_mode: testMode, test_address_set: !!t?.test_email,
      ghl_delivery: ghlOn ? 'on' : 'off (test mode)', ghl_in_test_mode: t?.ghl_in_test_mode === true,
      webhook_configured: !!webhook, signing_configured: !!env.EVENTS_SIGNING_SECRET, admin_notify_configured: !!adminEmail,
      pending: await rpc(env, 'outbox_summary', {}),
    }, 200);
  }
  if (!ghlOn) return json({ ok: true, sent: 0, test_mode: testMode, note: 'GHL delivery is OFF in test mode (Vault ghl_in_test_mode); events wait in the outbox' }, 200);
  if (!webhook) return json({ ok: true, sent: 0, note: 'No GHL webhook set (Vault ghl_webhook_url or EVENTS_WEBHOOK_URL); events wait in the outbox' }, 200);
  if (testMode && !t?.test_email) return json({ ok: false, sent: 0, error: 'Test mode is on but no test address is stored; nothing sent' }, 200);

  const events = await rpc(env, 'claim_events', { p_limit: 25 });
  let sent = 0, failed = 0;
  for (const ev of events || []) {
    try {
      let data: Record<string, unknown> = { ...(ev.payload || {}) };
      if (ev.event_type === 'attention.needed') {
        const to = testMode ? t.test_email : adminEmail;
        if (!to) throw new Error('No admin notification address (Vault admin_notify_email) for attention.needed');
        data.notify_email = to;
      }
      if (testMode) data = { ...(forceEmail(data, t.test_email) as Record<string, unknown>), test_mode: true };
      const business = (data.business as string) || undefined;
      const payload = JSON.stringify({
        id: ev.id, type: ev.event_type, created_at: ev.created_at,
        business, business_label: business ? LABEL[business] || business : undefined,
        tags: Array.isArray(data.tags) ? data.tags : undefined, data,
      });
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-CCS-Event': ev.event_type };
      if (business) headers['X-CCS-Business'] = business;
      if (env.EVENTS_SIGNING_SECRET) headers['X-CCS-Signature'] = await signEvent(env.EVENTS_SIGNING_SECRET, payload);
      const res = await fetch(webhook, { method: 'POST', headers, body: payload });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await rpc(env, 'mark_event', { p_id: ev.id, p_ok: true });
      sent++;
    } catch (e) {
      await rpc(env, 'mark_event', { p_id: ev.id, p_ok: false, p_error: String((e as Error).message || e) });
      failed++;
    }
  }
  return json({ ok: true, sent, failed, test_mode: testMode }, 200);
}
