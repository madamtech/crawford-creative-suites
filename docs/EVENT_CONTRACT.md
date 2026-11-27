# Event contract: website and database to GHL and Skool

**Claude, Nov 27, 2026.** The database writes one row to `public.event_outbox` for each event below, in the same transaction as the change, so nothing is lost if GHL is down. The `dispatch-events` Edge Function sends waiting events to `EVENTS_WEBHOOK_URL` (a GHL inbound webhook, Make or Zapier) every few minutes and retries failures up to 10 times. Peyton builds the GHL side.

## Delivery

`POST <EVENTS_WEBHOOK_URL>` with `Content-Type: application/json` and:

| Header | Value |
| --- | --- |
| `X-CCS-Event` | the event type |
| `X-CCS-Signature` | `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with EVENTS_SIGNING_SECRET>` |

Body:

```json
{ "id": 42, "type": "order.created", "created_at": "2026-11-27T17:05:00Z", "data": { ... } }
```

`id` only goes up. Use it to ignore repeats: a retry can deliver the same `id` twice.

Every `data` has `business` (`madam_allure` | `allure_fusions` | `ai_authoritech`) and `tags` (`madam-allure` | `allure-fusions` | `ai-authoritech` plus one more).

## lead.created

Light capture (concierge, lounges). Only written when the visitor ticked consent.

```json
{ "lead_id": "uuid", "business": "allure_fusions", "tags": ["allure-fusions", "website-lead"],
  "name": "Sam Rivera", "email": "sam@example.test", "phone": null, "message": "Classes?",
  "source": "Maker's Lounge", "utm": { "source": "tiktok", "medium": null, "campaign": null }, "consent": true }
```

GHL: create or update the contact by email, add the tags, put it in the business pipeline at "New lead".

## order.created

Build My Project (`kind: order`, `AFF-####`), AI readiness request (`kind: ai_intake`, `AIA-####`), Madam Allure custom or memorial request (`kind: custom | memorial`, `MA-####`).

```json
{ "id": "uuid", "number": "AFF-0002", "entity_type": "order", "kind": "order", "business": "allure_fusions",
  "status": "New Request", "tags": ["allure-fusions", "website-request"], "name": "Jordan Lee",
  "email": "jordan@example.test", "phone": "555-0100", "summary": "3D printing · Display stands · 12",
  "source": "website", "wants_account": false }
```

GHL: contact plus tags, opportunity in the business pipeline named with `number`. Send Tanika the internal notification to that business's inbox only (allurefusionsfirm@gmail.com, ai.authoritech@gmail.com, madamallure@gmail.com). Do not email the customer from here.

## payment.succeeded

From the Stripe or GHL webhook, or a payment Tanika records in the Admin Office. Refunds update the record but send no event.

```json
{ "payment_id": "uuid", "number": "AFF-0002", "entity_type": "order", "business": "allure_fusions",
  "tags": ["allure-fusions", "paid"], "provider": "stripe", "provider_ref": "cs_...", "kind": "deposit",
  "amount": 108, "currency": "usd", "paid": "deposit", "balance": 72, "status": "Deposit Paid",
  "email": "jordan@example.test", "name": "Jordan Lee" }
```

`paid` is `no` | `deposit` | `paid_in_full` | `refunded`. GHL: move the opportunity stage; if this purchase includes membership, this is the agreed trigger for the Skool invite.

## member.invited

Tanika taps **Send Skool invite** on a record in the Admin Office. The client is marked as a member (role `member`).

```json
{ "email": "casey@example.test", "name": "Casey Morgan", "business": "madam_allure",
  "tags": ["madam-allure", "skool-member"], "invited_by": "admin email" }
```

GHL: add the `skool-member` tag and run the Skool invite (Zapier or Make, or send the invite link). Only this event sends an invite; there is no bulk send.

## Pulling instead of pushing

If Make or Zapier should pull instead, call the database function `claim_events(p_limit)` and then `mark_event(p_id, p_ok, p_error)` with the service role (server side only).
