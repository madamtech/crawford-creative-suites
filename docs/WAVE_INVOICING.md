# Wave invoicing (TEST MODE build, Nov 28 2026)

Built by Peyton on Tanika's approval (voice call, 4:06 AM CT Nov 28 2026).

## Flow
1. Customer approves the quote -> set `quote_approved_at` on the order row
   (`orders`, `madam_allure_orders`, or `ai_intake`). No invoice exists before this.
2. Trigger writes a `quote.approved` outbox event (replaces `order.approved`) and
   calls the `wave-invoice` Edge Function through pg_net.
3. `public.wave_plan()` decides the next invoice:
   - total <= $35: one **full** invoice (item + separate "Shipping" line), only after
     shipping is chosen (`shipping_method` = `ship` with `shipping_amount`, or an
     explicit `pickup` / `none` for $0).
   - total > $35: **deposit** invoice for 60% right away; **balance** invoice
     (remaining 40% + Shipping line) once shipping is chosen.
   - AI AuthoriTech intake (service) has no shipping step.
4. `wave-invoice` finds/creates the Wave customer (by email) in the right business
   (Madam Allure + Allure Fusions Firm use `WAVE_TOKEN_MA`, AI AuthoriTech uses
   `WAVE_TOKEN_AIA`), creates the invoice with the business's "Standard Item"
   product and `poNumber` = order number, approves it, sends it, and stores IDs +
   view URL in `public.wave_invoices`.
5. `wave-poll` (pg_cron every 15 min) reads Wave status; payments land in
   `public.payments` (provider `wave`) via `apply_payment`, and the order's
   `billing_status` moves `invoiced` -> `deposit_paid` / `balance_due` -> `paid`.

## Test mode
Vault secrets `wave_test_mode` (= `true`) and `wave_test_email` (set directly in
the database, never in this repo). In test mode every Wave invoice send and every
dispatched notification is forced to the test address. Records flagged
`is_test = true` are refused when test mode is off.

## Scheduler (supabase/sql/scheduler_setup.sql, live-only)
pg_cron + pg_net. Jobs: `ccs-dispatch-events` (created PAUSED), `ccs-wave-poll`
(*/15), `ccs-wave-invoice-sweep` (retries pending invoices). The function URL and
a random cron secret live in Vault; functions check it with `public.wave_runtime`.

Turn dispatch on only with Tanika's OK:
`select cron.alter_job((select jobid from cron.job where jobname='ccs-dispatch-events'), active := true);`

## Wave limits
Invoice email (`emailSendEnabled`) cannot be turned on through the Wave API.
Allure Fusions Firm and AI AuthoriTech currently have it off; their invoices are
created and approved but not emailed until it is enabled in the Wave web app.
