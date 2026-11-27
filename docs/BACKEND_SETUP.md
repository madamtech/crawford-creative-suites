# Backend setup: Supabase, Client Login, My Projects, Admin Office

**Built by Claude, Nov 27, 2026.** Follow these steps in order. Steps marked **TANIKA** need her own sign-in. Steps marked **PEYTON** are the sync and wiring work. Nothing goes live until Tanika has previewed it and said yes.

Until step 5 is done, the live site behaves exactly as it does today: forms open an email, and Client Login stays hidden.

## What was built

| Piece | Where |
| --- | --- |
| Database tables, numbering (AFF / AIA / MA), history log, payments, event outbox | `supabase/migrations/20261127090000_core_schema.sql` |
| Row Level Security (clients see only their own rows; admins see all) | `supabase/migrations/20261127090100_rls_and_grants.sql` |
| Private file bucket `order-files` (25 MB, JPG PNG PDF SVG DXF STL 3MF) | `supabase/migrations/20261127090200_storage.sql` |
| Database functions for forms, My Projects, Admin Office, payments | `supabase/migrations/20261127090300_functions.sql` |
| Edge Functions: `intake`, `order-status`, `checkout`, `payments-webhook`, `dispatch-events` | `supabase/functions/` |
| Dummy data for a test project only | `supabase/seed.sql` |
| Client Login, My Projects, Admin Office, Madam Allure request form, lead capture | `build/portal.js`, `build/backend.js`, `build/portal.css` |
| Public settings file (URL and public key only) | `suites/backend-config.js` |
| Event contract for GHL / Skool | `docs/EVENT_CONTRACT.md` |
| Tests (28) and the local preview | `supabase/tests/`, `build/dev-backend.mjs` |

## Try it locally first (no accounts needed)

```powershell
npm install
```

```powershell
npm run preview:backend
```

Open http://127.0.0.1:4180/ . It runs a stand-in for Supabase with dummy data, so no real email is sent and no real money moves.

- **Client view:** Client Login, then `jordan@example.test`. Open http://127.0.0.1:4180/dev/mailbox and tap the sign-in button.
- **Admin view:** sign in the same way as `admin@example.test`, then tap **Admin Office**.
- **Pretend payment:** in My Projects, tap a Pay button. The preview checkout page has a "Pay (pretend)" button.
- The mailbox page also lists the events GHL would receive.

Run the tests:

```powershell
npm run test:backend
```

## 1. TANIKA: create the project

1. Sign in at supabase.com (Ai AuthoriTech organization) and open or create the project **Crawford Creative Suites**.
2. Pick a strong database password and keep it in your password manager. Do not send it to anyone.
3. Give Peyton access if Peyton will run steps 2 to 4 (Project Settings, Team).

## 2. Apply the database (Claude's SQL)

Either:

- **SQL Editor:** paste and run each file in `supabase/migrations/` in name order (four files), or
- **Supabase CLI:** `supabase link --project-ref <ref>` then `supabase db push`.

Do **not** run `supabase/seed.sql` on the live project. It is dummy data for a test project only.

Then make the admin account (use the business inbox you will sign in with):

```sql
insert into public.user_roles (email, role) values ('ai.authoritech@gmail.com', 'admin');
```

## 3. Auth settings (magic link)

Authentication, URL Configuration:

- **Site URL:** `https://madamtech.github.io/crawford-creative-suites/suites/`
- **Redirect URLs:** the same address, plus `http://127.0.0.1:4180/suites/` for local preview.

Authentication, Providers, Email: keep Email on. No password is used on the site.

Recommended: Authentication, SMTP Settings, send from one of the three business inboxes (or a sending service). Supabase's built-in email is limited to a few messages an hour, which is fine for testing but not for customers.

## 4. Edge Functions and their secrets

Deploy (CLI): `supabase functions deploy intake order-status checkout payments-webhook dispatch-events --no-verify-jwt`

Secrets (Project Settings, Edge Functions, Secrets). `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase automatically.

| Secret | Needed for | Notes |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | all browser calls | `https://madamtech.github.io,http://127.0.0.1:4180` |
| `SITE_URL` | checkout return page | `https://madamtech.github.io/crawford-creative-suites/suites/` |
| `TURNSTILE_SECRET` | spam check (optional) | Cloudflare Turnstile secret key |
| `PAYMENT_PROVIDER` | checkout and webhook | `stripe` or `ghl` (Tanika's choice) |
| `STRIPE_SECRET_KEY` | Stripe only | starts `sk_`; use test mode first |
| `STRIPE_WEBHOOK_SECRET` | Stripe only | starts `whsec_` |
| `GHL_WEBHOOK_SECRET` | GHL only | any long random text; the same text goes in the GHL webhook header |
| `EVENTS_WEBHOOK_URL` | GHL / Skool sync | the GHL inbound webhook, Make or Zapier URL |
| `EVENTS_SIGNING_SECRET` | GHL / Skool sync | any long random text |
| `DISPATCH_SECRET` | event sender | any long random text |

## 5. Turn it on in the site

Edit `suites/backend-config.js`:

```js
window.CCS_BACKEND = {
  url: 'https://<project-ref>.supabase.co',
  anonKey: '<anon or publishable key>',
  turnstileSiteKey: '',        // optional
  paymentProvider: 'stripe',   // or 'ghl', or '' for no online payments yet
  links: { booking: '', classes: '' },  // optional GHL booking and Skool class links
};
```

Only the **anon / publishable** key goes here. Never the service role key, a `sb_secret_` key, a Stripe secret or a webhook secret. A test checks the public files for those.

Rebuild (`npm run build`), preview, and publish only after Tanika says yes.

## 6. Payments (after Tanika chooses)

**Stripe:** Developers, Webhooks, add endpoint `https://<ref>.supabase.co/functions/v1/payments-webhook?provider=stripe` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

**GHL Payments:** paste the GHL payment link on each project in the Admin Office ("Payment link"). In a GHL workflow triggered by the payment, add a Custom Webhook action:

- URL: `https://<ref>.supabase.co/functions/v1/payments-webhook?provider=ghl`
- Header `x-ccs-webhook-secret`: the `GHL_WEBHOOK_SECRET` value
- JSON body: `{ "number": "AFF-0002", "amount": 108.00, "kind": "deposit", "transaction_id": "<GHL transaction id>", "currency": "usd" }`

Either way: the amount a client pays always comes from the database (quote, deposit rule, amount already paid). Orders of $35 or less are paid in full; over $35 need a 60% deposit. AI AuthoriTech deposits come from the "Deposit due" field set from the proposal. Cash or Zelle: use **Record payment** in the Admin Office.

**Madam Allure stays on Ueni.** Peyton's email sync writes Ueni orders into `madam_allure_orders` (`source = 'ueni_email'`, `kind = 'shop'`, unique `ueni_order_ref`), using the service role. They show under Admin Office, Madam Allure Orders.

## 7. Events to GHL and Skool

See `docs/EVENT_CONTRACT.md`. Schedule `dispatch-events` every 5 minutes (SQL editor, needs the `pg_cron` and `pg_net` extensions):

```sql
select cron.schedule('ccs-dispatch-events', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/dispatch-events',
    headers := jsonb_build_object('x-ccs-dispatch-secret', '<DISPATCH_SECRET>'))
$$);
```

## 8. Sheets tracker sync (PEYTON)

Read with the service role from `orders`, `ai_intake`, `madam_allure_orders`, `status_events`, `payments` (or the `projects_v` view). Column names follow the tracker (see the appendix of `docs/BACKEND_HANDOFF.md`). Status, Paid, Deposit, Balance and Last status change are kept by the database; do not write them back from the sheet except through the Admin Office.

## Where to find things in the Admin Office

- **Overview:** new requests, open, paid, owed, overdue, due this week; totals by business; a "Needs attention" list.
- **Allure Fusions / AI AuthoriTech:** filter by status, search, open a row to change status, quote, due date, payment link and private notes, record a payment, add files, see change history, and send a Skool invite (through GHL).
- **Madam Allure Orders:** website custom and memorial requests, then Ueni shop orders.
- **Leads:** light capture from the concierge and the lounges (only saved when the visitor ticks the consent box).
