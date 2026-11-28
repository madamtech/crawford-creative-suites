// POST /functions/v1/wave-invoice   header x-ccs-cron-secret: <Vault ccs_cron_secret>
// Body { entity_type, entity_id } (sent by the database trigger when a quote is approved or
// shipping is decided) or { sweep: true } (pg_cron safety sweep).
// For each record it asks public.wave_plan what is due next ($35 or less: full invoice after
// shipping; over $35: 60% deposit, then 40% balance + shipping), then in the right Wave business:
// find or create the customer, create the invoice (Standard Item product, website/quote price,
// poNumber = order number), approve it and send it. TEST MODE sends only to the Vault test address.

import { json, rpc, readJson, HttpError, type Env } from '../_shared/http.ts';
import { business, cronAuth, inputErrors, wave, type Runtime } from '../_shared/wave.ts';

const Q_BUSINESS = `query ($id: ID!) { business(id: $id) { id emailSendEnabled } }`;
const Q_CUSTOMER = `query ($id: ID!, $email: String) { business(id: $id) {
  customers(page: 1, pageSize: 5, sort: [CREATED_AT_ASC], email: $email) { edges { node { id email } } } } }`;
const M_CUSTOMER = `mutation ($input: CustomerCreateInput!) { customerCreate(input: $input) {
  didSucceed inputErrors { code message path } customer { id } } }`;
const M_INVOICE = `mutation ($input: InvoiceCreateInput!) { invoiceCreate(input: $input) {
  didSucceed inputErrors { code message path }
  invoice { id invoiceNumber viewUrl status invoiceDate dueDate total { value } } } }`;
const M_APPROVE = `mutation ($input: InvoiceApproveInput!) { invoiceApprove(input: $input) {
  didSucceed inputErrors { code message path } invoice { id status } } }`;
const M_SEND = `mutation ($input: InvoiceSendInput!) { invoiceSend(input: $input) {
  didSucceed inputErrors { code message path } invoice { id status lastSentAt } } }`;

async function findOrCreateCustomer(env: Env, key: string, name: string, email: string): Promise<string> {
  const b = business(key);
  const found = await wave(env, key, Q_CUSTOMER, { id: b.businessId, email });
  const hit = found?.business?.customers?.edges?.find((e: any) => (e.node.email || '').toLowerCase() === email.toLowerCase());
  if (hit) return hit.node.id;
  const out = (await wave(env, key, M_CUSTOMER, { input: { businessId: b.businessId, name: name || email, email } })).customerCreate;
  const err = inputErrors(out);
  if (err) throw new Error(`customerCreate: ${err}`);
  return out.customer.id;
}

async function invoiceOne(env: Env, rt: Runtime, plan: any): Promise<Record<string, unknown>> {
  const next = plan.next;
  const key = plan.business;
  const b = business(key);
  const base = { number: plan.number, kind: next.kind, amount: Number(next.amount), test_mode: rt.test_mode };

  if (rt.test_mode && !rt.test_email) return { ...base, ok: false, error: 'Test mode is on but no test address is stored' };
  if (!rt.test_mode && plan.is_test) return { ...base, ok: false, error: 'Test records are never invoiced outside test mode' };
  if (!plan.customer?.email) return { ...base, ok: false, error: 'Record has no customer email' };

  const rid = await rpc(env, 'wave_reserve', { p: { ...plan, ...next, test_mode: rt.test_mode } });
  if (!rid) return { ...base, ok: true, skipped: 'already invoiced' };

  let invoiceId: string | null = null;
  try {
    const biz = (await wave(env, key, Q_BUSINESS, { id: b.businessId })).business;
    const customerId = await findOrCreateCustomer(env, key, plan.customer.name, plan.customer.email);

    const created = (await wave(env, key, M_INVOICE, { input: {
      businessId: b.businessId,
      customerId,
      status: 'DRAFT',
      poNumber: plan.number,
      items: next.lines.map((l: any) => ({
        productId: b.productId, description: String(l.description).slice(0, 250), quantity: '1', unitPrice: String(l.unitPrice),
      })),
      memo: rt.test_mode || plan.is_test ? 'TEST MODE: test invoice from Crawford Creative Suites. Not a real bill.' : undefined,
    } })).invoiceCreate;
    const cErr = inputErrors(created);
    if (cErr) throw new Error(`invoiceCreate: ${cErr}`);
    const inv = created.invoice;
    invoiceId = inv.id;
    await rpc(env, 'wave_update', { p_id: rid, p: {
      wave_customer_id: customerId, wave_invoice_id: inv.id, wave_invoice_number: inv.invoiceNumber,
      wave_view_url: inv.viewUrl, wave_status: inv.status, po_number: plan.number,
      customer_name: plan.customer.name, customer_email: plan.customer.email,
      items_summary: next.lines.map((l: any) => String(l.description)).join('; ').slice(0, 400),
      invoice_date: inv.invoiceDate, due_date: inv.dueDate,
    } });

    const approved = (await wave(env, key, M_APPROVE, { input: { invoiceId: inv.id } })).invoiceApprove;
    const aErr = inputErrors(approved);
    if (aErr) throw new Error(`invoiceApprove: ${aErr}`);
    await rpc(env, 'wave_update', { p_id: rid, p: { wave_status: approved.invoice.status } });

    const out = { ...base, ok: true, wave_invoice_number: inv.invoiceNumber, wave_total: inv.total?.value, sent: false };
    if (!biz?.emailSendEnabled) {
      await rpc(env, 'wave_update', { p_id: rid, p: { email_blocked: true, last_error: `Invoice email is off in Wave for ${b.label}; invoice approved but not sent. The customer is told through an invoice.ready notification and My Projects.` } });
      return { ...out, note: 'email sending is off for this Wave business' };
    }

    const to = rt.test_mode ? [rt.test_email as string] : [plan.customer.email];
    const label = next.kind === 'deposit' ? '60% deposit' : next.kind === 'balance' ? 'balance' : 'invoice';
    const sent = (await wave(env, key, M_SEND, { input: {
      invoiceId: inv.id,
      to,
      subject: `${rt.test_mode ? '[TEST] ' : ''}${plan.number}: your ${label} from ${b.label}`,
      message: rt.test_mode
        ? `TEST MODE. This is a test ${label} for ${plan.number}. No payment is due.`
        : `Thank you! Here is your ${label} for ${plan.number}.`,
      attachPDF: false,
    } })).invoiceSend;
    const sErr = inputErrors(sent);
    if (sErr) throw new Error(`invoiceSend: ${sErr}`);
    await rpc(env, 'wave_update', { p_id: rid, p: { wave_status: sent.invoice.status, sent: true, last_error: null } });
    return { ...out, sent: true, wave_status: sent.invoice.status, sent_to: rt.test_mode ? 'test address' : 'customer' };
  } catch (e) {
    const msg = String((e as Error).message || e);
    if (invoiceId) await rpc(env, 'wave_update', { p_id: rid, p: { last_error: msg } });
    else await rpc(env, 'wave_release', { p_id: rid, p_error: msg });
    return { ...base, ok: false, error: msg };
  }
}

// TEST MODE ONLY: make a clearly labeled test invoice directly in Wave, the way Tanika might by hand
// (no portal order needed), so the import can be tested. Never emailed; example-domain customers only.
async function testInvoice(env: Env, rt: Runtime, t: any): Promise<Record<string, unknown>> {
  if (!rt.test_mode) throw new HttpError(403, 'Test invoices are only made in test mode');
  const key = String(t.business || '');
  const b = business(key);
  const email = String(t.customer_email || '').toLowerCase();
  if (!/@example\.(com|test|org)$/.test(email)) throw new HttpError(400, 'Test invoices use an example.com / example.test customer only');
  const amount = Number(t.amount);
  if (!(amount > 0 && amount < 1000)) throw new HttpError(400, 'Bad amount');
  const customerId = await findOrCreateCustomer(env, key, String(t.customer_name || 'TEST customer'), email);
  const created = (await wave(env, key, M_INVOICE, { input: {
    businessId: b.businessId, customerId, status: 'DRAFT',
    poNumber: t.po_number ? String(t.po_number) : undefined,
    items: [{ productId: b.productId, description: String(t.description || 'TEST invoice (made by hand in Wave)').slice(0, 250), quantity: '1', unitPrice: String(amount) }],
    memo: 'TEST MODE: test invoice. Not a real bill.',
  } })).invoiceCreate;
  const cErr = inputErrors(created);
  if (cErr) throw new Error(`invoiceCreate: ${cErr}`);
  const approved = (await wave(env, key, M_APPROVE, { input: { invoiceId: created.invoice.id } })).invoiceApprove;
  const aErr = inputErrors(approved);
  if (aErr) throw new Error(`invoiceApprove: ${aErr}`);
  return { ok: true, business: key, wave_invoice_number: created.invoice.invoiceNumber, status: approved.invoice.status, total: created.invoice.total?.value, po_number: t.po_number || null, emailed: false };
}

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  try {
    const rt = await cronAuth(req, env);
    const body = await readJson(req);
    if (body.test_invoice) return json({ ok: true, test_mode: rt.test_mode, result: await testInvoice(env, rt, body.test_invoice) }, 200);
    let targets: Array<{ entity_type: string; entity_id: string }> = [];
    if (body.entity_type && body.entity_id) targets = [{ entity_type: body.entity_type, entity_id: body.entity_id }];
    else if (body.sweep) targets = (await rpc(env, 'wave_pending', {})) || [];
    else throw new HttpError(400, 'Send { entity_type, entity_id } or { sweep: true }');

    const results: unknown[] = [];
    for (const t of targets) {
      for (let step = 0; step < 2; step++) {          // deposit and, if shipping is already set, balance
        const plan = await rpc(env, 'wave_plan', { p_entity_type: t.entity_type, p_entity_id: t.entity_id });
        if (!plan?.ok || !plan.next) {
          if (body.entity_id && step === 0) results.push({ number: plan?.number, waiting: plan?.reason });
          break;
        }
        const r = await invoiceOne(env, rt, plan);
        results.push(r);
        if (!r.ok || r.skipped) break;
      }
    }
    return json({ ok: true, test_mode: rt.test_mode, results }, 200);
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
}
