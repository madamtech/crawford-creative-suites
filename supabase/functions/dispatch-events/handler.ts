// POST /functions/v1/dispatch-events   header x-ccs-dispatch-secret: <DISPATCH_SECRET>
// Sends waiting events (lead.created, order.created, payment.succeeded, member.invited)
// to EVENTS_WEBHOOK_URL (a GHL inbound webhook, Make or Zapier), signed with
// EVENTS_SIGNING_SECRET. Run it on a schedule (see docs/EVENT_CONTRACT.md).
// Failed sends stay in the outbox and are retried up to 10 times.

import { json, rpc, type Env } from '../_shared/http.ts';
import { safeEqual, signEvent } from '../_shared/security.ts';

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  if (!env.DISPATCH_SECRET || !safeEqual(req.headers.get('x-ccs-dispatch-secret') || '', env.DISPATCH_SECRET)) {
    return json({ ok: false, error: 'Bad secret' }, 401);
  }
  if (!env.EVENTS_WEBHOOK_URL) return json({ ok: true, sent: 0, note: 'EVENTS_WEBHOOK_URL not set; events wait in the outbox' }, 200);

  const events = await rpc(env, 'claim_events', { p_limit: 25 });
  let sent = 0, failed = 0;
  for (const ev of events || []) {
    const body = JSON.stringify({ id: ev.id, type: ev.event_type, created_at: ev.created_at, data: ev.payload });
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-CCS-Event': ev.event_type };
      if (env.EVENTS_SIGNING_SECRET) headers['X-CCS-Signature'] = await signEvent(env.EVENTS_SIGNING_SECRET, body);
      const res = await fetch(env.EVENTS_WEBHOOK_URL, { method: 'POST', headers, body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await rpc(env, 'mark_event', { p_id: ev.id, p_ok: true });
      sent++;
    } catch (e) {
      await rpc(env, 'mark_event', { p_id: ev.id, p_ok: false, p_error: String((e as Error).message || e) });
      failed++;
    }
  }
  return json({ ok: true, sent, failed }, 200);
}
