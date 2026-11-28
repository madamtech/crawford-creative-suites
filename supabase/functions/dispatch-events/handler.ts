// POST /functions/v1/dispatch-events
//   header x-ccs-dispatch-secret: <DISPATCH_SECRET>   (Function secret), or
//   header x-ccs-cron-secret: <Vault ccs_cron_secret>  (used by the pg_cron job)
// Sends waiting events (lead.created, order.created, payment.succeeded, member.invited,
// quote.approved) to EVENTS_WEBHOOK_URL (a GHL inbound webhook, Make or Zapier), signed with
// EVENTS_SIGNING_SECRET. Run it on a schedule (pg_cron job ccs-dispatch-events, created PAUSED).
// Failed sends stay in the outbox and are retried up to 10 times.
// Body { "dry_run": true } reports what is waiting and what is configured; it sends and claims nothing.
// TEST MODE (Vault wave_test_mode, on unless 'false'): every "email" in the payload is replaced by the
// Vault test address and the event carries test_mode: true, so notifications only reach that address.

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

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  if (!(await authorized(req, env))) return json({ ok: false, error: 'Bad secret' }, 401);
  const body = await readJson(req).catch(() => ({}));
  const t = await rpc(env, 'ccs_test_settings', {});
  const testMode = t?.test_mode !== false;

  if (body.dry_run) {
    return json({
      ok: true, dry_run: true, test_mode: testMode, test_address_set: !!t?.test_email,
      webhook_configured: !!env.EVENTS_WEBHOOK_URL, signing_configured: !!env.EVENTS_SIGNING_SECRET,
      pending: await rpc(env, 'outbox_summary', {}),
    }, 200);
  }
  if (!env.EVENTS_WEBHOOK_URL) return json({ ok: true, sent: 0, note: 'EVENTS_WEBHOOK_URL not set; events wait in the outbox' }, 200);
  if (testMode && !t?.test_email) return json({ ok: false, sent: 0, error: 'Test mode is on but no test address is stored; nothing sent' }, 200);

  const events = await rpc(env, 'claim_events', { p_limit: 25 });
  let sent = 0, failed = 0;
  for (const ev of events || []) {
    const data = testMode ? { ...(forceEmail(ev.payload, t.test_email) as Record<string, unknown>), test_mode: true } : ev.payload;
    const payload = JSON.stringify({ id: ev.id, type: ev.event_type, created_at: ev.created_at, data });
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-CCS-Event': ev.event_type };
      if (env.EVENTS_SIGNING_SECRET) headers['X-CCS-Signature'] = await signEvent(env.EVENTS_SIGNING_SECRET, payload);
      const res = await fetch(env.EVENTS_WEBHOOK_URL, { method: 'POST', headers, body: payload });
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
