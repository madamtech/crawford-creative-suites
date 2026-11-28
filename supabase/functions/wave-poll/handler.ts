// POST /functions/v1/wave-poll   header x-ccs-cron-secret: <Vault ccs_cron_secret>
// Wave's free Starter plan has no webhooks, so pg_cron calls this every 15 minutes.
// 1) IMPORT: list each business's recent invoices (Madam Allure, Allure Fusions Firm, AI AuthoriTech only) and
//    upsert the ones the portal does not know yet, including invoices made by hand in Wave
//    (public.wave_import_invoice matches poNumber = order number, then the customer's email; otherwise unlinked).
//    Only invoices created on/after Vault wave_import_since (default Nov 28 2026) are imported; DRAFTs are skipped.
// 2) POLL: for each open Wave invoice it reads status + amount paid and records new money as a
// 'wave' payment (public.wave_apply_status -> apply_payment), which moves paid / status /
// billing_status (deposit_paid, balance_due, paid).

import { json, rpc, readJson, HttpError, type Env } from '../_shared/http.ts';
import { BUSINESSES, business, cronAuth, wave, type BusinessKey } from '../_shared/wave.ts';

export const DEFAULT_IMPORT_SINCE = '2026-11-28T00:00:00-06:00';
const MAX_PAGES = 5;      // 100 invoices a page, newest first
const Q_LIST = `query ($b: ID!, $p: Int!) { business(id: $b) { invoices(page: $p, pageSize: 100, sort: [CREATED_AT_DESC]) {
  pageInfo { currentPage totalPages totalCount }
  edges { node { id invoiceNumber poNumber viewUrl status createdAt invoiceDate dueDate lastSentAt
    total { value } amountPaid { value } amountDue { value }
    customer { id name email } items { description product { name } } } } } } }`;

// List one business's invoices and hand each to the database. Never returns customer emails.
export async function importInvoices(env: Env, key: BusinessKey, since: Date, testMode: boolean) {
  const b = business(key);
  const out = { business: key, seen: 0, imported: 0, updated: 0, linked: 0, unlinked: 0, skipped: 0, old: 0, drafts: 0, errors: [] as string[] };
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await wave(env, key, Q_LIST, { b: b.businessId, p: page });
    const conn = data?.business?.invoices;
    let reachedOld = false;
    for (const { node: n } of conn?.edges || []) {
      out.seen++;
      if (new Date(n.createdAt) < since) { out.old++; reachedOld = true; continue; }
      if (n.status === 'DRAFT') { out.drafts++; continue; }
      try {
        const items = (n.items || []).map((i: any) => String(i.description || i.product?.name || '').trim()).filter(Boolean);
        const r = await rpc(env, 'wave_import_invoice', { p: {
          business: key, wave_invoice_id: n.id, number: n.invoiceNumber, view_url: n.viewUrl, status: n.status,
          po_number: n.poNumber, customer_id: n.customer?.id, customer_name: n.customer?.name, customer_email: n.customer?.email,
          total: n.total?.value, amount_due: n.amountDue?.value, due_date: n.dueDate, invoice_date: n.invoiceDate,
          created_at: n.createdAt, last_sent_at: n.lastSentAt, items_summary: items.slice(0, 4).join('; ').slice(0, 400), test_mode: testMode,
        } });
        if (r?.action === 'imported') out.imported++; else if (r?.action === 'skipped') out.skipped++; else out.updated++;
        if (r?.action !== 'skipped') { if (r?.linked) out.linked++; else out.unlinked++; }
        const paid = Number(n.amountPaid?.value || 0);
        if (r?.id && paid > 0) await rpc(env, 'wave_apply_status', { p_id: r.id, p_status: n.status, p_amount_paid: paid });
      } catch (e) {
        out.errors.push(`${n.invoiceNumber}: ${String((e as Error).message || e).slice(0, 200)}`);
      }
    }
    const total = conn?.pageInfo?.totalPages || 1;
    if (reachedOld || page >= total) break;
  }
  return out;
}

const Q_INVOICE = `query ($b: ID!, $i: ID!) { business(id: $b) { invoice(id: $i) {
  id status amountPaid { value } amountDue { value } } } }`;

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  try {
    const rt = await cronAuth(req, env);
    const body = await readJson(req).catch(() => ({}));
    let imported: unknown[] | undefined;
    if (body?.import !== false) {
      const settings = await rpc(env, 'ccs_test_settings', {});
      const since = new Date(settings?.import_since || DEFAULT_IMPORT_SINCE);
      imported = [];
      for (const key of Object.keys(BUSINESSES) as BusinessKey[]) {
        try { imported.push(await importInvoices(env, key, since, rt.test_mode)); }
        catch (e) { imported.push({ business: key, error: String((e as Error).message || e).slice(0, 300) }); }
      }
    }
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
    return json({ ok: true, imported, checked, changed, failed, results }, 200);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
}
