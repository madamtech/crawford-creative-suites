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

---

# Part 2: Wave import, portal invoices, missing-information check (Nov 28 2026, TEST MODE)

Migration `20261128120000_wave_import_attention.sql`. Wave is the source of truth: the portal reads
invoices from Wave instead of parsing invoice emails (Wave email is off for Allure Fusions Firm and AI AuthoriTech).

## Import (wave-poll, every 15 minutes)
`wave-poll` first lists each business's newest invoices (Madam Allure, Allure Fusions Firm, AI AuthoriTech only; never
Personal or Texas Crafting Queens) and hands each to `public.wave_import_invoice`. That includes invoices Tanika makes by hand.
- **Match order:** (1) `poNumber` = order number, same business only; (2) the Wave customer's email = the one open order
  of that customer in that business. Otherwise the invoice is stored **unlinked** (`entity_id` null) and shows in
  Admin Office, Invoices, "Unmatched only". An unlinked invoice still shows to the customer whose email is on it.
- **Kind:** an imported invoice linked to an order is labeled `full` when its total equals the quote, `deposit` when it equals
  the 60% deposit, otherwise no kind. A kind already used by another invoice of that order is never reused (no double invoicing).
- **Stored:** number, amounts, due/invoice date, status, view/pay URL, business, customer name and email, PO number, items,
  `last_synced_at`. Payments on linked invoices are booked as `wave` payments; unlinked invoices only record status and paid.
- **Safety:** DRAFT invoices are skipped. Only invoices created on or after Vault `wave_import_since`
  (default 2026-11-28 00:00 CT) are imported, so older real invoices are not pulled in. Older ones are counted in the
  poll result (`old`). Change the Vault value to backfill.
- The app's own invoices (created by `wave-invoice`) are recognised by Wave id and only get their details refreshed.

## Portal
- **My Projects** (`my_invoices()`): each order lists its invoices (number, kind, amount, status, **View & pay** to the Wave
  view URL). Invoices not tied to a shown order appear under "Other invoices for you".
- **Admin Office** (`admin_invoices()`, `admin_attention()`, `wave_link_invoice()`): an **Invoices** tab (business filter,
  search, **Unmatched only**, link to an order by number or unlink) and the missing-information list on Overview.
- Browsers have no table access to `wave_invoices`; the RPCs filter by the signed-in email (customers) or require admin.
  Wave tokens never leave the Edge Functions.

## Missing-information check (one list: `public.attention_rules`)
Runs on every insert/update of an order, AI intake, Madam Allure order or Wave invoice. To change what is checked, edit
rows in `attention_rules` (`enabled`, `businesses`, `stage`, `label`, `position`); the seed is in the migration. New kinds
of check need a branch in `private.order_missing` / `private.invoice_missing`.

| Subject | Rule | Applies to | Stage |
| --- | --- | --- | --- |
| order | customer name; customer email or phone; items or description | all | any |
| order | price | all | once quoted / approved / invoiced |
| order | customer phone | Allure Fusions, AI AuthoriTech | once quoted |
| order | due date; shipping choice; shipping amount (if "ship"); shipping address (if "ship") | Allure Fusions, Madam Allure | once quoted |
| invoice | business; linked order; customer name; customer email; price; items; due date | all | any |

A brand-new request is not nagged for a price (it has none yet); once it is quoted, approved or invoiced it is.
An item reads like "Invoice #2184 for AI AuthoriTech came in (order AIA-0002). Missing: customer phone." Once an invoice
exists, the order's gaps are folded into the invoice's item (no duplicate). Items **clear by themselves** as soon as the
information is filled in. Madam Allure orders gained a `shipping_address` column for this.

## Events (all wait in the outbox; dispatch job stays paused)
- `attention.needed` (to Tanika): queued when an item is created or a NEW gap appears (not on every edit).
  Payload has `message`, `missing` (labels), `business`, `number`, `invoice_number`, `recipient: "admin"`. Dispatch adds
  `notify_email`: the test address in test mode, otherwise Vault `admin_notify_email`.
- `invoice.ready` (to the customer): queued once when an invoice that Wave did not email becomes visible (Wave email off for the
  business, or a hand-made invoice not sent from Wave). Payload has `email`, `name`, `view_url`, `invoice_number`, `amount`, `due_date`.

## GoHighLevel delivery (one webhook for all three businesses)
Tanika's GHL location (AI AuthoriTech, `hv7cL5QHtnNNLxjA7ocU`) is the umbrella for all three businesses, so there is ONE webhook;
the business is in the body (`business`, `business_label`, `tags`, and `data.business`) and the `X-CCS-Business` header.
- Webhook URL: Vault `ghl_webhook_url` (or the `EVENTS_WEBHOOK_URL` Function secret). Signed with `EVENTS_SIGNING_SECRET`.
- **Switch:** in test mode GHL delivery is **OFF**. Vault `ghl_in_test_mode` = `true` turns it on (default off), because test
  mode puts the test address in the email fields. Live mode (`wave_test_mode` = `false`) delivers whenever a webhook is set.
- Needed on the GHL side (Muse, nothing built yet): one workflow with an **Inbound Webhook** trigger ("CCS Events"), branching
  on `type`: `lead.created` / `order.created` (contact + tags + pipeline), `payment.succeeded`, `quote.approved`,
  `invoice.ready` (email/SMS the customer the `view_url`), `attention.needed` (internal notification to `notify_email`).
  The existing published "Webhook Lead Processing" workflow is a different, older ContentIQ flow (it emails a brand audit) and must not be reused.
