# Backend handoff for Claude — Crawford Creative Suites

**Date:** Friday, Nov 27, 2026, America/Chicago  
**Repo:** [madamtech/crawford-creative-suites](https://github.com/madamtech/crawford-creative-suites)  
**Live site:** [https://madamtech.github.io/crawford-creative-suites/](https://madamtech.github.io/crawford-creative-suites/) (building at [`/suites/`](https://madamtech.github.io/crawford-creative-suites/suites/))  
**Repo copy of this handoff:** [docs/BACKEND_HANDOFF.md](https://github.com/madamtech/crawford-creative-suites/blob/main/docs/BACKEND_HANDOFF.md)

This is the build handoff for continuing the Order Tracker and backend work. **Out of scope:** the AIAuthoriTech-OS repo (imported ChatGPT skills; do not use it unless a fact is strictly unavailable here). Use only these business inboxes: `allurefusionsfirm@gmail.com` (Allure Fusions), `ai.authoritech@gmail.com` (AI AuthoriTech), and `madamallure@gmail.com` (Madam Allure). Do not change the Fusions address, and do not use any personal inbox.

**Ownership**

| Role | Owns |
| --- | --- |
| **CLAUDE** | Code: backend, Supabase schema/RLS/Auth/Edge Functions, endpoints, and frontend changes inside the building (login, lead capture, forms, My Projects, Admin Office, checkout UI, file uploads). |
| **PEYTON** | Connect and sync after Claude finishes: deploy Apps Script if still needed as a bridge, wire live form endpoints, sync Supabase to the Sheets tracker, Drive/folder mirrors, GHL and Skool connections, Ueni email fallback, webhooks, testing, screenshots, and the admin guide. |
| **TANIKA** | Sign-ins and accounts: Supabase project, Stripe or GHL Payments, GHL sub-account, Skool admin, and secrets (never committed). The HighLevel connector is already installed on Peyton’s side and is waiting on her authorization. |

---

## Architecture decision (2026-11-27): integrate the front end, keep the systems separate

Everything client-facing goes into the existing `crawford-creative-suites` building: **one front door and one login**. That covers Client Login, lead capture, Build My Project, AI intake, Madam Allure custom requests, file uploads, and a new **My Projects** status area added as a room or floor view inside the building. An **Admin Office** view (admin role only) sits in the same building.

Backend systems stay separate and are synced:

| System | Role |
| --- | --- |
| **Supabase** (confirmed database) | System of record: clients, leads, orders, AI intake, status events, files, payments, Madam Allure orders. Auth, Storage, and Edge Functions. |
| **Google Sheets Order Tracker** | Synced operator view for now (not the long-term source of truth). |
| **GHL** | CRM, pipeline, tags, workflows, calendars, Skool invites. |
| **Skool** | Community and classes, hosted by Skool. |
| **Ueni** | Madam Allure ready-to-ship checkout only. |
| **Stripe Checkout / Payment Links or GHL Payments** | Allure Fusions and AI AuthoriTech payments (Tanika chooses). |

**Flow:** a site request writes to Supabase (and therefore to My Projects / Admin Office) and is synced to the Sheets tracker and to a GHL contact plus tags. GHL sends the Skool invite when membership applies. Payment webhooks update Paid, Deposit, Balance, and Status. Status flows back to My Projects.

**Why:** nothing is built twice, the client has one experience, and any backend system can be swapped without a site rebuild.

**Ownership:** Claude builds the in-building pieces and Supabase. Peyton wires the syncs.

**Repo check:** there is no existing client-portal stub in this repo. “Portal” in the code is marketing copy (AI AuthoriTech *builds* portals for clients, quoted per project), a CSS comment about “portal fonts,” and a disabled Supabase Storage placeholder on the Fusions form. Do not start a second frontend. Do not use AIAuthoriTech-OS as a second app.

---

## Login placement recommendation (2026-11-27)

A small, persistent **Client Login** button belongs in the **top-right of a slim top bar**, from the Arrival lobby (`index.html`) onward and on every floor and suite. Do **not** put it in the hero, on the lobby floor, or on the directory board — that would break the walk-through.

**Actual chrome (closest fit, no conflict):**

- **Arrival (`index.html`):** already has `<header class="topbar">` with only the CCS seal on the left. Put Client Login on the **right of this topbar**. Do not add it to `.hero` (`#arrival`) or the preview-lobby directory.
- **In the building (`suites/`):** a persistent `building-header` already has `header-actions` at top right (Sound, Elevator, Entrance). Add Client Login there so it stays visible on the main lobby, elevator, every suite reception, showroom, form, and lounge.

**First-time journey:** arrive in the Arrival lobby → enter the building → concierge and directory → suites. Browsing needs no login. The login control stays low-key. The **account invite** comes after submitting **Build My Project in Suite 305** (primary capture): magic-link email, no password, optional “save my details / create account.” Light email-only capture can also sit in the Maker’s Lounge and with the concierge for people not ready to submit a project.

**Returning clients:** use Client Login on arrival and jump straight to **My Projects** (status read by the signed-in email). The concierge should route “check my order” / “check my project” to that login.

Claude builds this. Peyton wires Auth redirect URLs and the status read against Supabase (and the tracker sync).

---

## Payments → portal sync (2026-11-27)

**Today:** Ueni payments are visible only in the Ueni dashboard and email receipts. The site only links out to [madamallure.ueniweb.com](https://madamallure.ueniweb.com/). The tracker’s Paid / Deposit / Balance columns are manual.

**Recommendation**

1. **Allure Fusions and AI AuthoriTech** payments go through **Stripe Checkout / Payment Links or GHL Payments** (Tanika chooses). A webhook updates Supabase (and the synced tracker) `Paid`, `Deposit`, `Balance`, and `Status`, and appends a `status_events` row. The client sees this on My Projects (for example, “Paid — in production”).
2. Add a private **Admin Office** view in the building, behind the **admin** role: new orders, paid vs owed, due / overdue, filterable by business. It mirrors the Order Tracker Dashboard tab and includes Madam Allure orders in the same office.
3. **Madam Allure stays on Ueni.**

**Ueni finding (checked 27 Nov 2026):** no public **shop-owner** order webhook or merchant API was found. Ueni’s Help Center covers the shopping cart, PayPal, connecting Stripe or Square *to the Ueni checkout itself*, coupons, and calendar sync — not an outgoing order API. Third-party 2026 roundups also list no public REST API, webhooks, or Zapier app. (A Zoho Billing case study about APIs refers to UENI the company billing *its own* subscribers, not a shop-owner integration.)

**Fallback (Peyton):** parse Ueni order-confirmation emails in the `madamallure@gmail.com` inbox into a **Madam Allure Orders** tab / `madam_allure_orders` table, on a schedule, **read-only**, and **never sending email**.

| Owner | Payments work |
| --- | --- |
| **CLAUDE** | Checkout (Fusions/AI), webhook Edge Functions, My Projects payment status, Admin Office (including Madam Allure Orders view + schema). |
| **PEYTON** | Wire Stripe/GHL webhooks, sync payments to the tracker, and the Ueni email (or API, if one appears) sync. |
| **TANIKA** | Stripe or GHL payment account and keys. |

---

## Current state

### Site

Static React 18.3 + esbuild 0.24, published on GitHub Pages. Build: `node build/patch.mjs && esbuild build/entry.js … --outfile=suites/app.js && node build/site.mjs`. Runtime patches and inboxes live in `build/send.js`, `build/patch.mjs`, `build/faq.js`, and `build/site.mjs`. The published bundle is `suites/app.js`. There is no login, no database on the site, and no server of its own.

### Eight rooms

1. Arrival lobby (`index.html`)  
2. Main lobby and concierge (`suites/`)  
3. Madam Allure, Suite 217  
4. The Powder Room  
5. Allure Fusions, Suite 305  
6. The Maker’s Lounge  
7. AI AuthoriTech, Suite 412  
8. The AI Clarity Lounge  

### Forms and mailto (today)

`build/send.js` copies the request and opens a `mailto:` to the business inbox. Keep this as a fallback until auto-route is live.

**Allure Fusions — Build My Project:** Name, Email, Phone (optional), Service type, Project type, Quantity, Dimensions, Intended use, Material, Color palette, Personalization, Artwork status, 3D file, Use, 3D details, Laser method, Laser material, Laser details, Completion date, Rush, Shipping address, Budget range, Additional instructions, Artwork ownership confirmed. File input is **disabled** (placeholder: “Secure private upload is awaiting Supabase Storage configuration.”). Inbox: `allurefusionsfirm@gmail.com`.

**AI AuthoriTech — Request an AI readiness conversation:** Name, Email, Phone (optional), Business challenge, Desired outcome, AI experience, Automation opportunity, Required integrations, Timeline, Budget range, Engagement. Inbox: `ai.authoritech@gmail.com`.

**Madam Allure:** shop products link to Ueni. “Ask about this item” (Name, Email, Phone) exists only when a product has no shop URL; current catalog items all have URLs, so the button is not shown. Custom gift and memorial items have no request form yet; that form is now in scope for auto-route. Inbox: `madamallure@gmail.com`.

**Concierge:** answers on the page only; nothing is saved. Will also offer light lead capture and “check my order” → Client Login.

### Order Tracker (Allure Fusions Drive)

[Order Tracker](https://docs.google.com/spreadsheets/d/1KBRQgttCmPeZvLh9onxJubib6TDsZeHaLHJ-I4XEWQM/edit) — operator dashboard, now to be a **synced view** of Supabase.

Tabs: **Dashboard**, **Order Tracker**, **Rates**, **AI Intake**, **Updates**, **How to use**. (Add **Madam Allure Orders** as the Ueni sync destination.)

**Order Tracker columns:** Order #, Date, Client, Contact, Service (3D/Laser), Description, Material, Qty, Quote, Status, Due Date, Paid, Notes, Email, Phone, Size, Source, Rush, Deposit, Balance, Suggested quote, Budget range, Shipping address, Project type, Details, Last status change.

**Status values:** New Request, Pending Review, Quoted, Deposit Paid, In Production, Ready, Shipped, Completed, On Hold, Cancelled.

**Paid values:** No, Deposit, Paid in Full, Refunded.

Example row **AFF-0001** was kept (do not delete). Order numbers continue as `AFF-####`.

**Rates** imports unit prices from the [Pricing Calculator](https://docs.google.com/spreadsheets/d/13XyH7fASkcMeD1tGisaMy514I0sy36g4rIm8Fa3M4qU/edit) via `IMPORTRANGE` (Needs **Allow access** once in the browser). Suggested quote looks up Material / Lookup name (PLA, Wood on the example rows). Official **Quote** stays operator-entered.

**AI Intake columns:** Timestamp, Name, Email, Phone, Business challenge, Desired outcome, AI experience, Automation opportunity, Required integrations, Timeline, Budget range, Engagement, Status, Source, Notes. AI Status: New, Contacted, Discovery scheduled, Proposal sent, Active, Completed, Declined.

**Updates columns:** Time, Sheet, Order or name, Field, Old value, New value.

### Apps Script (written, not deployed)

Saved at `/workspace/training-captures/order-tracker/apps-script.gs` and as [Order Tracker web app script](https://docs.google.com/document/d/158-mlrVx7FniWLS61k75zFVxkJVCRPaFd0o93nLPfsk/edit) in Drive folder `04 Orders & Production`. It does **not** send email.

Once Supabase is the intake path, this script is a optional bridge or can be retired after Peyton’s sync is in place. Until then it can still append rows if deployed.

| Endpoint | Behavior |
| --- | --- |
| `POST /exec` | JSON body (or form). If the payload looks like an AI readiness request (`Business challenge` / subject), append **AI Intake**; otherwise append **Order Tracker** with the next `AFF-####`. |
| `GET /exec?ping=1` | `{ "ok": true, "service": "ccs-order-tracker" }` |
| `GET /exec?order=AFF-0002&email=` | Status only if **both** order # and email match; otherwise `{ "ok": false, "error": "Not found" }`. |
| `onEdit` | Logs Status / Paid changes to **Updates**; stamps Last status change. No email. |

**POST payload (preferred):**

```json
{
  "subject": "Allure Fusions — Build My Project",
  "fields": { "Name": "…", "Email": "…", "Phone": "…", "Service type": "3D printing" }
}
```

A flat object of field names is also accepted. Responses: `{ "ok": true, "kind": "order", "orderNumber": "AFF-0002", "status": "New Request" }` or `{ "ok": true, "kind": "ai" }` or `{ "ok": false, "error": "…" }`.

Deploy still needs a browser step as `allurefusionsfirm@gmail.com` (Peyton, blocked on that sign-in) if the script will be used as a temporary bridge.

---

## Database setup — Supabase is confirmed (2026-11-27)

**Decision:** Supabase (Postgres + Auth + Storage + Edge Functions) is the system of record. Keep the Sheets tracker as a **synced operator view** for now. Peyton syncs Supabase → Sheets.

**CLAUDE** sets up the project schema, RLS, Auth, and Edge Functions for form intake and webhooks. **TANIKA** creates the Supabase account/project and enters keys as secrets: the **anon key** may be in the frontend; the **service role key must never be in the repo or the GitHub Pages bundle**.

### Proposed schema (map to the tracker)

**clients:** `id` (uuid), `auth_user_id`, `name`, `email` (unique), `phone`, `created_at`.

**leads:** `id`, `client_id` (nullable), `name`, `email`, `phone`, `business_interest` (`madam_allure` \| `allure_fusions` \| `ai_authoritech`), `source`, `utm_source`, `utm_medium`, `utm_campaign`, `consent` (boolean, required true), `message`, `created_at`.

**orders** (Allure Fusions — maps to the Order Tracker tab): `id`, `order_number` (`AFF-####`, unique), `client_id`, `created_at` (Date), `name` (Client), `email`, `phone`, `contact` (display), `service`, `description`, `material`, `qty`, `size` (Dimensions), `project_type`, `source`, `rush`, `due_date`, `budget_range`, `shipping_address`, `details`, `quote` (numeric), `suggested_quote`, `deposit`, `balance` (generated or maintained), `paid` (`no` \| `deposit` \| `paid_in_full` \| `refunded`), `status` (the ten tracker values), `notes`, `last_status_change`.

**ai_intake:** same fields as the AI Intake tab, plus `id`, `client_id`, `status`.

**status_events:** `id`, `entity_type` (`order` \| `ai_intake` \| `madam_allure_order`), `entity_id`, `field`, `old_value`, `new_value`, `created_at` (mirrors Updates).

**files:** `id`, `entity_type`, `entity_id`, `bucket`, `path`, `original_name`, `content_type`, `size_bytes`, `uploaded_by` (`client` \| `admin`), `created_at`.

**payments:** `id`, `entity_type`, `entity_id`, `provider` (`stripe` \| `ghl` \| `ueni`), `provider_ref`, `kind` (`deposit` \| `balance` \| `full` \| `refund`), `amount`, `currency`, `received_at`, `raw` (jsonb, no card numbers).

**madam_allure_orders:** `id`, `client_id` (nullable, match on email), `ueni_order_ref`, `ordered_at`, `name`, `email`, `phone`, `items`, `amount`, `paid`, `status`, `source` (`ueni_email` \| `ueni_api` if one appears later), `raw`, `created_at`. Shown in Admin Office; not mixed into Fusions production rows.

**IDs:** Fusions orders stay `AFF-####`. Suggest `AIA-####` for AI engagements and `MA-####` for Madam Allure sync rows if useful.

**RLS:** clients read only their own rows (email / `auth_user_id`). Admin role reads and writes all. Service role only on Edge Functions. No public write to tables from the browser except through Functions or authenticated Storage policies.

**Storage:** private bucket (e.g. `order-files`), folders per order (`orders/AFF-0002/…`), signed URLs for download, size and type limits (align with the form: jpg, jpeg, png, pdf, svg, dxf, stl, 3mf; set a max size, e.g. 25 MB). Files link to `files` and show on **My Projects** (the client’s files) and **Admin Office**. This **replaces** the disabled upload placeholder. Peyton may optionally mirror files to the Allure Fusions Drive, named with the Order #.

---

## API and integration points

**Site → backend POST (Claude).** Same field names as the live forms. `Content-Type: application/json` (or `text/plain` if a temporary Apps Script bridge is used, to avoid CORS preflight). Validate required fields, email format, and consent where applicable. Return the `order_number` and `status`. Keep mailto as a fallback if the POST fails.

**Status lookup.** Signed-in My Projects reads by the account email (and admin can filter). Unauthenticated lookup, if offered, must require order # **and** email, and return only that order’s status.

**File upload.** Authenticated client or admin → Supabase Storage (private, signed URLs). No keys in the repo.

**Payments.** Fusions/AI: Stripe or GHL webhook → Edge Function → `payments` + order columns + `status_events`. Madam Allure: Ueni remains checkout; Peyton syncs into `madam_allure_orders`.

**GHL and Skool.** After intake, create/update a GHL contact with pipeline and tags by business. Membership/payment can trigger a Skool invite via GHL / Zapier or Make (Skool’s native API is limited). GHL forms and calendars for classes and one-on-ones. See the Skool + GHL section.

**Env / secrets (never in the public repo):** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend OK), `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions only), Stripe/GHL webhook secrets, Turnstile secret, GHL and Skool secrets. For a static GitHub Pages frontend, only the anon key and public Turnstile site key may ship in the bundle. Use GitHub Actions secrets or a tiny config that is not the service role.

**CORS:** allow `https://madamtech.github.io` and local preview origins only.

**Spam:** honeypot field plus Cloudflare Turnstile (or equivalent) on public forms and lead capture.

**Validation:** required Name + Email on requests; consent checkbox on leads; reject empty or disposable-looking spam; never trust the client for price or paid status.

---

## Website login and lead capture

**Auth (recommend):** Supabase Auth **magic link** (no password) and optional Google sign-in later. Roles: `client`, `member`, `admin`. On a static GitHub Pages site, client-side route guards are UX only; **RLS is the real protection**. Add the live `/suites/` URL and local preview URLs to Supabase Auth redirect settings (Peyton, after Tanika creates the project).

**Lead fields (all businesses):** Name, Email, Phone, Business interest (Madam Allure / Allure Fusions / AI AuthoriTech), Source / UTM, Consent checkbox (required), Message. Store in `leads`; optional mirror to a **Leads** tab. Route by interest to the matching inbox *notification* (Peyton; do not invent a fourth inbox) and to GHL with pipeline/tags.

**Concierge hook:** after an answer, or on “leave my details” / “check my order,” offer the light capture or Client Login. Do not block the walk-through.

**Privacy:** state why contact details are kept, and only write a lead when consent is checked.

Claude builds Auth, UI, and Functions. Peyton wires redirects, GHL lead routing, and the Sheets mirror. Tanika owns the Supabase and (optional) Google OAuth consent screen.

---

## Confirmed Claude build items (2026-11-27)

Keep Peyton’s sync work in Peyton’s list, not here.

1. **Madam Allure funnel and sync (schema + Admin view).** Build a **Madam Allure Orders** view in the Admin Office and the `madam_allure_orders` table/schema so Ueni orders and payments appear in the **same** admin area as Fusions and AI. Peyton handles the sync method (API if one appears; otherwise Gmail parse).
2. **Order forms auto-route.** Every site order or request form — Build My Project, AI intake, and any Madam Allure custom/memorial request — writes to the portal (Supabase) automatically. Claude builds the form endpoints. Peyton connects those endpoints to the Sheets tracker, GHL, and notifications, and keeps mailto as backup.
3. **Supabase database backend.** Claude sets up schema (tables above), RLS, Auth, and Edge Functions for form intake and webhooks. Peyton syncs Supabase to the Sheets tracker. Tanika creates the project and secrets.
4. **File uploads.** Clients and Tanika upload through the portal via Supabase Storage (private bucket, per-order folders, signed URLs, size/type limits, rows in `files`, visible on My Projects and Admin Office). Replaces the disabled placeholder. Peyton may mirror to Drive.

---

## Skool + GoHighLevel (in plan now)

Skool’s official automation options are limited. Plan on **Zapier or Make**, Skool **invite links**, and **membership questions** (email + name) so GHL can match the contact.

**Wire after the build (Peyton), with Tanika’s accounts:**

1. Tanika authorizes the HighLevel connector (already installed, waiting) and gives Skool admin plus any API keys as secrets — never in the repo.
2. Claude (or agreed zaps) documents the event contract: `lead.created`, `order.created`, `payment.succeeded`, `member.invited`.
3. Peyton: GHL workflow creates/updates the contact, tags by business (`allure-fusions`, `madam-allure`, `ai-authoritech`), and moves the pipeline.
4. Peyton: on payment or membership purchase, GHL sends or logs the Skool invite (no unsolicited blast; follow the agreed trigger).
5. GHL forms and calendars for classes and one-on-ones; those can embed or link from the building (Claude adds the in-building links; Peyton configures GHL).
6. Test with dummy contacts, then record steps in the admin guide.

---

## Checklist before the frontend talks to a real backend

1. **TANIKA** — Create the Supabase project; give Peyton access; add anon and service keys as secrets (service key never in the repo).  
2. **CLAUDE** — Apply schema, RLS, Auth (magic link), Storage bucket and policies, and Edge Functions (intake, webhooks, status).  
3. **TANIKA / PEYTON** — Set Auth redirect URLs for the live GitHub Pages origin and local preview.  
4. **TANIKA** — Choose Stripe Checkout/Payment Links or GHL Payments; create the account; give Peyton the webhook secret.  
5. **CLAUDE** — Checkout + webhook verification + My Projects + Admin Office (including Madam Allure Orders).  
6. **TANIKA** — Authorize the HighLevel connector; Skool admin.  
7. **PEYTON** — Wire CORS, Turnstile keys, form POST URLs on the live site (mailto fallback stays), Supabase → Sheets sync, GHL tags/pipeline, Skool invite workflow, Ueni email sync, optional Drive file mirror.  
8. **PEYTON** — Test with dummy data only; no real customer email sent; screenshots and admin guide.  
9. Only then point the production forms at the live Functions.

---

## Peyton sync and wiring (separate from Claude’s build)

**Done, 27 Nov 2026:** Order Tracker upgrade (dashboard, columns, dropdowns, Rates link, AI Intake, Updates, How to use); Apps Script written (not deployed); admin guide section; portal-map Backend wiring; this handoff document; email cleanup search (no personal inbox in the repo or tracker; no code change).

**Not started, blocked on Tanika’s `allurefusionsfirm@gmail.com` browser sign-in:** Apps Script web app deploy (optional bridge); Rates **Allow access**.

**Not started, after Claude’s build:** wire form endpoints on the live site; Supabase → Sheets sync; GHL and Skool connections; Stripe/GHL webhooks to tracker; Ueni email (or API) sync into Madam Allure Orders; optional Drive file mirror; testing, screenshots, admin guide updates.

**Tanika:** Supabase project and keys; payment account; GHL sub-account authorization; Skool admin; secrets only in the secret store.

---

## Appendix — form-to-tracker field map (Fusions)

| Form field | Tracker / `orders` column |
| --- | --- |
| Name | Client / name |
| Email | Email (also Contact) |
| Phone | Phone (also Contact) |
| Service type | Service |
| Project type | Project type |
| Quantity | Qty |
| Dimensions | Size |
| Material | Material (Suggested quote lookup) |
| Completion date | Due Date |
| Rush | Rush (Yes → Pending Review) |
| Additional instructions + extra fields | Details |
| Budget range, Shipping address | their own columns |
| (set by backend) | Source = Website — Build My Project |
| (set by backend) | Status = New Request, or Pending Review for rush / review-needed |
