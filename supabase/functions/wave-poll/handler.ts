// POST /functions/v1/wave-poll   header x-ccs-cron-secret: <Vault ccs_cron_secret>
// Wave's free Starter plan has no webhooks, so pg_cron calls this every 15 minutes.
// 1) IMPORT: list each business's recent invoices (Madam Allure, Allure Fusions Firm, AI AuthoriTech only) and
//    upsert the ones the portal does not know yet, including invoices made by hand in Wave
//    (public.wave_import_invoice matches poNumber = order number, then the customer's email; otherwise unlinked).
//    Only invoices created on/after the per-business cutoff are imported; DRAFTs are skipped.
//    Defaults: Madam Allure 2021-01-25 00:00 CT (covers the 26 older real invoices); AFF and AIA stay Nov 28 2026.
//    Vault wave_import_since may be a single date (the default) or JSON:
//      {"default":"2026-11-28T00:00:00-06:00","madam_allure":"2021-01-25T00:00:00-06:00"}
// 2) POLL: for each open Wave invoice it reads status + amount paid and records new money as a
// 'wave' payment (public.wave_apply_status -> apply_payment), which moves paid / status /
// billing_status (deposit_paid, balance_due, paid).

import { json, rpc, readJson, HttpError, type Env } from '../_shared/http.ts';
import { BUSINESSES, business, cronAuth, wave, type BusinessKey } from '../_shared/wave.ts';

export const DEFAULT_IMPORT_SINCE = '2026-11-28T00:00:00-06:00';
// Madam Allure's 26 older real invoices begin 2021-01-25 2:56 PM CT; this start-of-day covers all of them.
export const DEFAULT_IMPORT_SINCE_BY_BUSINESS: Partial<Record<BusinessKey, string>> = {
  madam_allure: '2021-01-25T00:00:00-06:00',
};
const MAX_PAGES = 5;      // 100 invoices a page, newest first

function money(v: unknown): string {
  return String(v ?? '0').replace(/,/g, '');
}

// Vault wave_import_since: a date string (default for every business) or JSON { default, madam_allure, ... }.
export function sinceFor(settings: any, key: BusinessKey): Date {
  const map: Record<string, string> = { default: DEFAULT_IMPORT_SINCE, ...DEFAULT_IMPORT_SINCE_BY_BUSINESS };
  const raw = settings?.import_since;
  if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim();
    if (t.startsWith('{')) {
      try { Object.assign(map, JSON.parse(t)); } catch { /* keep defaults */ }
    } else {
      map.default = t;
    }
  } else if (raw && typeof raw === 'object') {
    Object.assign(map, raw);
  }
  return new Date(map[key] || map.default || DEFAULT_IMPORT_SINCE);
}
const Q_LIST = `query ($b: ID!, $p: Int!) { business(id: $b) { invoices(page: $p, pageSize: 100, sort: [CREATED_AT_DESC]) {
  pageInfo { currentPage totalPages totalCount }
  edges { node { id invoiceNumber poNumber viewUrl status createdAt invoiceDate dueDate lastSentAt
    total { value } amountPaid { value } amountDue { value }
    customer { id name email } items { description product { name } } } } } } }`;


// Read-only listing (no database writes, no Wave changes). Dates and amounts only; never emails or tokens.
export async function listInvoices(env: Env, key: BusinessKey) {
  const b = business(key);
  const invoices: Array<Record<string, unknown>> = [];
  let totalCount = 0, totalPages = 1;
  for (let page = 1; page <= 20; page++) {
    const data = await wave(env, key, Q_LIST, { b: b.businessId, p: page });
    const conn = data?.business?.invoices;
    totalCount = conn?.pageInfo?.totalCount || invoices.length;
    totalPages = conn?.pageInfo?.totalPages || page;
    for (const { node: n } of conn?.edges || []) {
      invoices.push({
        number: n.invoiceNumber,
        status: n.status,
        created_at: n.createdAt,
        invoice_date: n.invoiceDate,
        due_date: n.dueDate,
        total: n.total?.value ?? null,
        amount_paid: n.amountPaid?.value ?? null,
        amount_due: n.amountDue?.value ?? null,
        has_po: !!String(n.poNumber || '').trim(),
        po_number: n.poNumber || null,
        has_customer: !!n.customer,
        has_email: !!String(n.customer?.email || '').trim(),
        last_sent: n.lastSentAt || null,
      });
    }
    if (page >= totalPages) break;
  }
  const cutoff = new Date('2026-11-28T00:00:00-06:00');
  const older = invoices.filter((i) => i.created_at && new Date(String(i.created_at)) < cutoff);
  const on_or_after = invoices.filter((i) => i.created_at && new Date(String(i.created_at)) >= cutoff);
  const dates = invoices.map((i) => String(i.created_at || '')).filter(Boolean).sort();
  return {
    business: key, total_count: totalCount, listed: invoices.length,
    older_than_nov_28: older.length, on_or_after_nov_28: on_or_after.length,
    earliest_created_at: dates[0] || null, latest_created_at: dates[dates.length - 1] || null,
    invoices,
  };
}

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
          total: money(n.total?.value), amount_due: money(n.amountDue?.value), due_date: n.dueDate, invoice_date: n.invoiceDate,
          created_at: n.createdAt, last_sent_at: n.lastSentAt, items_summary: items.slice(0, 4).join('; ').slice(0, 400), test_mode: testMode,
        } });
        if (r?.action === 'imported') out.imported++; else if (r?.action === 'skipped') out.skipped++; else out.updated++;
        if (r?.action !== 'skipped') { if (r?.linked) out.linked++; else out.unlinked++; }
        const paid = Number(money(n.amountPaid?.value));
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
    if (body?.list_only) {
      const listed: unknown[] = [];
      const keys = (body.business ? [body.business] : Object.keys(BUSINESSES)) as BusinessKey[];
      for (const key of keys) {
        try { listed.push(await listInvoices(env, key)); }
        catch (e) { listed.push({ business: key, error: String((e as Error).message || e).slice(0, 300) }); }
      }
      return json({ ok: true, list_only: true, test_mode: rt.test_mode, listed }, 200);
    }
    let imported: unknown[] | undefined;
    if (body?.import !== false) {
      const settings = await rpc(env, 'ccs_test_settings', {});
      imported = [];
      for (const key of Object.keys(BUSINESSES) as BusinessKey[]) {
        try { imported.push({ since: sinceFor(settings, key).toISOString(), ...await importInvoices(env, key, sinceFor(settings, key), rt.test_mode) }); }
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
