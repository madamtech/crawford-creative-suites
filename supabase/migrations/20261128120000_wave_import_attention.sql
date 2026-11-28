-- Wave import + "Needs attention" (built by Peyton, Nov 28 2026; TEST MODE first).
--
-- 1) Wave is the source of truth: wave-poll lists each business's invoices and upserts the ones the
--    portal does not know yet (including invoices Tanika creates by hand in Wave) into wave_invoices.
--    Matching: poNumber = order number first, then the Wave customer email -> the one open order of that
--    customer in that business. Anything else is stored unlinked (entity_id null) so the Admin Office can link it.
-- 2) Customers read their invoices through my_invoices(); the admin reads admin_invoices().
--    No table access for browsers, so nothing else in wave_invoices (errors, ids) leaks.
-- 3) Missing-information check (attention_rules = the one list to edit) -> needs_attention rows shown in the
--    Admin Office, cleared automatically when the information is filled in, plus an attention.needed event.
-- 4) invoice.ready event for invoices Wave did not email (AFF / AIA have Wave email off; hand-made invoices).
-- Nothing here sends anything: events wait in event_outbox until the paused dispatch job is turned on.

-- ---------------------------------------------------------------------------------------------
-- 0) Shipping address for Madam Allure orders (Fusions orders already have one)
-- ---------------------------------------------------------------------------------------------
alter table public.madam_allure_orders
  add column if not exists shipping_address text check (length(shipping_address) <= 1000);
grant update (shipping_address) on public.madam_allure_orders to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 1) wave_invoices can hold invoices that are not linked to an order yet
-- ---------------------------------------------------------------------------------------------
alter table public.wave_invoices
  alter column entity_type drop not null,
  alter column entity_id drop not null,
  alter column order_number drop not null,
  alter column kind drop not null;
alter table public.wave_invoices drop constraint if exists wave_invoices_amount_check;
alter table public.wave_invoices add constraint wave_invoices_amount_check check (amount >= 0);
alter table public.wave_invoices drop constraint if exists wave_invoices_entity_pair;
alter table public.wave_invoices add constraint wave_invoices_entity_pair check ((entity_type is null) = (entity_id is null));

alter table public.wave_invoices
  add column if not exists imported          boolean not null default false,   -- found in Wave, not created by us
  add column if not exists matched_by        text check (matched_by in ('po_number', 'customer_email', 'manual', 'created')),
  add column if not exists po_number         text,
  add column if not exists customer_name     text,
  add column if not exists customer_email    text,
  add column if not exists items_summary     text,
  add column if not exists invoice_date      date,
  add column if not exists due_date          date,
  add column if not exists amount_due        numeric(10,2),
  add column if not exists wave_created_at   timestamptz,
  add column if not exists last_synced_at    timestamptz,
  add column if not exists email_blocked     boolean not null default false,   -- Wave email is off for this business
  add column if not exists ready_notified_at timestamptz;                      -- invoice.ready queued
create index if not exists wave_invoices_unlinked_idx on public.wave_invoices (business) where entity_id is null;
create index if not exists wave_invoices_cust_email_idx on public.wave_invoices (lower(customer_email));

-- Browsers never read this table directly (my_invoices / admin_invoices do the filtering).
revoke select on public.wave_invoices from authenticated;

alter table public.event_outbox drop constraint if exists event_outbox_event_type_check;
alter table public.event_outbox add constraint event_outbox_event_type_check
  check (event_type in ('lead.created', 'order.created', 'payment.succeeded', 'member.invited', 'quote.approved',
                        'invoice.ready', 'attention.needed'));

-- Small helpers -------------------------------------------------------------------------------
create or replace function private.business_label(b text) returns text language sql immutable as $$
  select case b when 'allure_fusions' then 'Allure Fusions Firm' when 'ai_authoritech' then 'AI AuthoriTech'
                when 'madam_allure' then 'Madam Allure' else b end
$$;
create or replace function private.business_of(p_type text) returns text language sql immutable as $$
  select case p_type when 'order' then 'allure_fusions' when 'ai_intake' then 'ai_authoritech' else 'madam_allure' end
$$;
create or replace function private.entity_json(p_type text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  if p_type = 'order' then return (select to_jsonb(o) from public.orders o where o.id = p_id);
  elsif p_type = 'ai_intake' then return (select to_jsonb(a) from public.ai_intake a where a.id = p_id);
  elsif p_type = 'madam_allure_order' then return (select to_jsonb(m) from public.madam_allure_orders m where m.id = p_id);
  end if;
  return null;
end $$;
revoke all on function private.business_label(text), private.business_of(text), private.entity_json(text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2) The missing-information rules: ONE list. Edit rows here (or update attention_rules) to change what is checked.
--    subject  'order'   = a request / order / quote (orders, ai_intake, madam_allure_orders)
--             'invoice' = a Wave invoice
--    stage    'any' = checked as soon as the request comes in; 'quoted' = only once it is quoted, approved or invoiced
--    businesses null = all three
--    The test for each rule_key lives in private.order_missing / private.invoice_missing below.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.attention_rules (
  subject    text not null check (subject in ('order', 'invoice')),
  rule_key   text not null,
  label      text not null,
  businesses text[],
  stage      text not null default 'any' check (stage in ('any', 'quoted')),
  enabled    boolean not null default true,
  position   integer not null default 100,                  -- order used in messages
  primary key (subject, rule_key)
);
insert into public.attention_rules (subject, rule_key, label, businesses, stage, position) values
  ('order',   'customer_name',    'customer name',                 null,                                  'any', 10),
  ('order',   'customer_contact', 'customer email or phone',       null,                                  'any', 20),
  ('order',   'customer_phone',   'customer phone',                array['allure_fusions','ai_authoritech'], 'quoted', 30),
  ('order',   'description',      'items or description',          null,                                  'any', 40),
  ('order',   'amount',           'price',                         null,                                  'quoted', 50),
  ('order',   'due_date',         'due date',                      array['allure_fusions','madam_allure'], 'quoted', 60),
  ('order',   'shipping_choice',  'shipping choice (ship, pickup or none)', array['allure_fusions','madam_allure'], 'quoted', 70),
  ('order',   'shipping_amount',  'shipping amount',               array['allure_fusions','madam_allure'], 'quoted', 80),
  ('order',   'shipping_address', 'shipping address',              array['allure_fusions','madam_allure'], 'quoted', 90),
  ('invoice', 'business',         'business',                      null,                                  'any', 5),
  ('invoice', 'linked_order',     'a linked order',                null,                                  'any', 8),
  ('invoice', 'customer_name',    'customer name',                 null,                                  'any', 10),
  ('invoice', 'customer_contact', 'customer email or phone',       null,                                  'any', 20),
  ('invoice', 'amount',           'price',                         null,                                  'any', 50),
  ('invoice', 'description',      'items or description',          null,                                  'any', 40),
  ('invoice', 'due_date',         'due date',                      null,                                  'any', 60)
on conflict (subject, rule_key) do nothing;
alter table public.attention_rules enable row level security;
revoke all on public.attention_rules from anon, authenticated;
grant all on public.attention_rules to service_role;

create table if not exists public.needs_attention (
  id             bigint generated always as identity primary key,
  ref_key        text not null unique,                       -- 'order:<type>:<id>' or 'invoice:<id>'
  subject        text not null check (subject in ('order', 'invoice')),
  entity_type    text,
  entity_id      uuid,
  invoice_id     uuid references public.wave_invoices(id) on delete cascade,
  business       text not null,
  number         text,                                       -- order number, when there is one
  invoice_number text,
  message        text not null,
  missing        text[] not null default '{}',               -- rule keys still missing
  missing_labels text[] not null default '{}',
  notified_keys  text[] not null default '{}',               -- what attention.needed already told Tanika about
  is_test        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
create index if not exists needs_attention_open_idx on public.needs_attention (created_at desc) where resolved_at is null;
alter table public.needs_attention enable row level security;
drop policy if exists needs_attention_admin_read on public.needs_attention;
create policy needs_attention_admin_read on public.needs_attention for select to authenticated using ((select public.is_admin()));
revoke all on public.needs_attention from anon, authenticated;
grant select on public.needs_attention to authenticated;
grant all on public.needs_attention to service_role;

-- What is missing on a request / order / quote (rule keys) ---------------------------------------
create or replace function private.order_missing(p_type text, p_id uuid) returns text[]
language plpgsql stable security definer set search_path = public, private as $$
declare
  j jsonb := private.entity_json(p_type, p_id);
  biz text := private.business_of(p_type);
  has_inv boolean; quoted boolean; r record; ok boolean; res text[] := '{}';
begin
  if j is null then return res; end if;
  has_inv := exists (select 1 from public.wave_invoices w where w.entity_type = p_type and w.entity_id = p_id and w.wave_invoice_id is not null);
  quoted := (j ->> 'quote_approved_at') is not null or has_inv
            or (j ->> 'status') in ('Quoted', 'Deposit Paid', 'In Production', 'Ready', 'Shipped', 'Completed', 'Proposal sent', 'Active');
  for r in select * from public.attention_rules a
           where a.subject = 'order' and a.enabled and (a.businesses is null or biz = any (a.businesses)) order by a.position, a.rule_key loop
    if r.stage = 'quoted' and not quoted then continue; end if;
    ok := case r.rule_key
      when 'customer_name'    then nullif(trim(coalesce(j ->> 'name', '')), '') is not null
      when 'customer_contact' then nullif(trim(coalesce(j ->> 'email', '')), '') is not null or nullif(trim(coalesce(j ->> 'phone', '')), '') is not null
      when 'customer_phone'   then nullif(trim(coalesce(j ->> 'phone', '')), '') is not null
      when 'description'      then case p_type
          when 'order' then coalesce(nullif(trim(j ->> 'description'), ''), nullif(trim(j ->> 'project_type'), ''),
                                     nullif(trim(j ->> 'service'), ''), nullif(trim(j ->> 'details'), '')) is not null
          when 'ai_intake' then coalesce(nullif(trim(j ->> 'business_challenge'), ''), nullif(trim(j ->> 'engagement'), '')) is not null
          else (jsonb_typeof(j -> 'items') = 'array' and jsonb_array_length(j -> 'items') > 0) or nullif(trim(coalesce(j ->> 'details', '')), '') is not null end
      when 'amount'           then coalesce((case p_type when 'madam_allure_order' then j ->> 'amount' else j ->> 'quote' end)::numeric, 0) > 0
      when 'due_date'         then nullif(coalesce(case p_type when 'madam_allure_order' then j ->> 'needed_by' else j ->> 'due_date' end, ''), '') is not null
      when 'shipping_choice'  then nullif(coalesce(j ->> 'shipping_method', ''), '') is not null
      when 'shipping_amount'  then coalesce(j ->> 'shipping_method', '') <> 'ship' or coalesce((j ->> 'shipping_amount')::numeric, 0) > 0
      when 'shipping_address' then coalesce(j ->> 'shipping_method', '') <> 'ship' or nullif(trim(coalesce(j ->> 'shipping_address', '')), '') is not null
      else true end;
    if not coalesce(ok, false) then res := res || r.rule_key; end if;
  end loop;
  return res;
end $$;

-- What is missing on a Wave invoice (rule keys) -------------------------------------------------
create or replace function private.invoice_missing(p_id uuid) returns text[]
language plpgsql stable security definer set search_path = public, private as $$
declare w public.wave_invoices; r record; ok boolean; res text[] := '{}';
begin
  select * into w from public.wave_invoices where id = p_id;
  if w.id is null then return res; end if;
  for r in select * from public.attention_rules a
           where a.subject = 'invoice' and a.enabled and (a.businesses is null or w.business = any (a.businesses)) order by a.position, a.rule_key loop
    ok := case r.rule_key
      when 'business'         then w.business is not null
      when 'linked_order'     then w.entity_id is not null
      when 'customer_name'    then nullif(trim(coalesce(w.customer_name, '')), '') is not null
      when 'customer_contact' then nullif(trim(coalesce(w.customer_email, '')), '') is not null
      when 'amount'           then coalesce(w.amount, 0) > 0
      when 'description'      then nullif(trim(coalesce(w.items_summary, '')), '') is not null
      when 'due_date'         then w.due_date is not null
      else true end;
    if not coalesce(ok, false) then res := res || r.rule_key; end if;
  end loop;
  return res;
end $$;

-- Create / update / clear one attention item; queue attention.needed when something NEW is missing ---
create or replace function private.attn_upsert(p_ref text, p_subject text, p_type text, p_eid uuid, p_inv uuid,
    p_business text, p_number text, p_inv_number text, p_missing text[], p_is_test boolean, p_notify boolean)
returns void language plpgsql security definer set search_path = public, private as $$
declare labels text[]; msg text; row_ public.needs_attention; fresh text[];
begin
  if coalesce(cardinality(p_missing), 0) = 0 then
    update public.needs_attention set resolved_at = now(), updated_at = now(), missing = '{}', missing_labels = '{}', notified_keys = '{}'
      where ref_key = p_ref and resolved_at is null;
    return;
  end if;
  select coalesce(array_agg(l.label order by l.ord), '{}') into labels
    from (select k.key, k.ord, (select a.label from public.attention_rules a where a.rule_key = k.key order by a.subject limit 1) as label
            from unnest(p_missing) with ordinality as k(key, ord)) l;
  msg := case p_subject
    when 'invoice' then 'Invoice #' || coalesce(p_inv_number, '?') || ' for ' || private.business_label(p_business) || ' came in'
                        || case when p_number is not null then ' (order ' || p_number || ')' else '' end
                        || '. Missing: ' || array_to_string(labels, ', ') || '.'
    else 'Order ' || coalesce(p_number, '?') || ' for ' || private.business_label(p_business) || ' needs information. Missing: '
         || array_to_string(labels, ', ') || '.' end;
  insert into public.needs_attention (ref_key, subject, entity_type, entity_id, invoice_id, business, number, invoice_number,
                                      message, missing, missing_labels, is_test)
  values (p_ref, p_subject, p_type, p_eid, p_inv, p_business, p_number, p_inv_number, msg, p_missing, labels, coalesce(p_is_test, false))
  on conflict (ref_key) do update set
    subject = excluded.subject, entity_type = excluded.entity_type, entity_id = excluded.entity_id, invoice_id = excluded.invoice_id,
    business = excluded.business, number = excluded.number, invoice_number = excluded.invoice_number,
    message = excluded.message, missing = excluded.missing, missing_labels = excluded.missing_labels,
    is_test = excluded.is_test, resolved_at = null, updated_at = now()
  returning * into row_;
  if p_notify then
    select array(select k from unnest(p_missing) k where k <> all (row_.notified_keys)) into fresh;
    if cardinality(fresh) > 0 then
      insert into public.event_outbox (event_type, payload) values ('attention.needed', jsonb_build_object(
        'recipient', 'admin', 'subject', p_subject, 'business', p_business, 'business_label', private.business_label(p_business),
        'tags', jsonb_build_array(private.business_tag(p_business), 'needs-attention'),
        'number', p_number, 'invoice_number', p_inv_number, 'entity_type', p_type, 'entity_id', p_eid, 'invoice_id', p_inv,
        'message', msg, 'missing', to_jsonb(labels), 'where', 'Admin Office, Needs attention', 'is_test', coalesce(p_is_test, false)));
      update public.needs_attention set notified_keys = p_missing where id = row_.id;
    end if;
  end if;
end $$;

-- Refresh the item(s) for one invoice -----------------------------------------------------------
create or replace function private.attn_refresh_invoice(p_id uuid, p_notify boolean default true) returns void
language plpgsql security definer set search_path = public, private as $$
declare w public.wave_invoices; im text[]; om text[] := '{}'; allk text[]; ej jsonb;
begin
  select * into w from public.wave_invoices where id = p_id;
  if w.id is null then return; end if;
  if w.wave_invoice_id is null or coalesce(w.wave_status, '') in ('CREATING', 'DRAFT') then
    perform private.attn_upsert('invoice:' || w.id, 'invoice', w.entity_type, w.entity_id, w.id, w.business, w.order_number,
                                w.wave_invoice_number, '{}', w.test_mode, false);
    return;
  end if;
  im := private.invoice_missing(w.id);
  if w.entity_id is not null then om := private.order_missing(w.entity_type, w.entity_id); end if;
  select coalesce(array_agg(s.k order by s.o), '{}') into allk
    from (select k, min(o) o from unnest(im || om) with ordinality t(k, o) group by k) s;
  ej := case when w.entity_id is not null then private.entity_json(w.entity_type, w.entity_id) end;
  perform private.attn_upsert('invoice:' || w.id, 'invoice', w.entity_type, w.entity_id, w.id, w.business, w.order_number,
                              w.wave_invoice_number, allk, w.test_mode or coalesce((ej ->> 'is_test')::boolean, false), p_notify);
end $$;

-- Refresh the item for one order (folded into its invoice item once an invoice exists) ----------
create or replace function private.attn_refresh_entity(p_type text, p_id uuid, p_notify boolean default true) returns void
language plpgsql security definer set search_path = public, private as $$
declare j jsonb := private.entity_json(p_type, p_id); iv record; has_inv boolean := false; num text;
begin
  if j is null then return; end if;
  num := coalesce(j ->> 'order_number', j ->> 'intake_number');
  for iv in select id from public.wave_invoices
            where entity_type = p_type and entity_id = p_id and wave_invoice_id is not null and coalesce(wave_status, '') not in ('CREATING', 'DRAFT') loop
    has_inv := true;
    perform private.attn_refresh_invoice(iv.id, p_notify);
  end loop;
  perform private.attn_upsert('order:' || p_type || ':' || p_id, 'order', p_type, p_id, null, private.business_of(p_type), num, null,
                              case when has_inv then '{}'::text[] else private.order_missing(p_type, p_id) end,
                              coalesce((j ->> 'is_test')::boolean, false), p_notify);
end $$;

create or replace function private.attn_after_entity() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.attn_refresh_entity(private.etype_for(tg_table_name), new.id, true);
  return null;
end $$;

create or replace function private.attn_after_invoice() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if coalesce(current_setting('ccs.defer_attn', true), '') = 'on' then return null; end if;
  if tg_op = 'DELETE' then
    if old.entity_id is not null then perform private.attn_refresh_entity(old.entity_type, old.entity_id, false); end if;
    return null;
  end if;
  if tg_op = 'UPDATE' and old.entity_id is distinct from new.entity_id and old.entity_id is not null then
    perform private.attn_refresh_entity(old.entity_type, old.entity_id, false);
  end if;
  if new.entity_id is not null then perform private.attn_refresh_entity(new.entity_type, new.entity_id, true);
  else perform private.attn_refresh_invoice(new.id, true); end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['orders', 'madam_allure_orders', 'ai_intake'] loop
    execute format('drop trigger if exists %1$I_attn_after on public.%1$I', t);
    execute format('create trigger %1$I_attn_after after insert or update on public.%1$I for each row execute function private.attn_after_entity()', t);
  end loop;
end $$;
drop trigger if exists wave_invoices_attn_after on public.wave_invoices;
create trigger wave_invoices_attn_after after insert or update or delete on public.wave_invoices
  for each row execute function private.attn_after_invoice();

-- invoice.ready: an invoice Wave did not email (AFF / AIA email is off) or that was made by hand in Wave --------
create or replace function private.wave_invoice_ready() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare em text; nm text; ej jsonb;
begin
  if new.ready_notified_at is null and new.sent_at is null and (new.email_blocked or new.imported)
     and new.wave_view_url is not null and coalesce(new.wave_status, '') in ('SAVED', 'SENT', 'VIEWED', 'PARTIAL', 'UNPAID', 'OVERDUE') then
    ej := case when new.entity_id is not null then private.entity_json(new.entity_type, new.entity_id) end;
    em := lower(nullif(trim(coalesce(new.customer_email, ej ->> 'email', '')), ''));
    nm := coalesce(new.customer_name, ej ->> 'name');
    if em is not null then
      insert into public.event_outbox (event_type, payload) values ('invoice.ready', jsonb_build_object(
        'invoice_number', new.wave_invoice_number, 'number', new.order_number, 'business', new.business,
        'business_label', private.business_label(new.business), 'tags', jsonb_build_array(private.business_tag(new.business), 'invoice-ready'), 'kind', new.kind, 'amount', new.amount,
        'amount_due', new.amount_due, 'due_date', new.due_date, 'view_url', new.wave_view_url,
        'name', nm, 'email', em, 'where', 'My Projects (portal) or the View & pay link',
        'is_test', new.test_mode or coalesce((ej ->> 'is_test')::boolean, false)));
      new.ready_notified_at := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists wave_invoices_ready on public.wave_invoices;
create trigger wave_invoices_ready before insert or update on public.wave_invoices
  for each row execute function private.wave_invoice_ready();

-- ---------------------------------------------------------------------------------------------
-- 3) wave_update gains the fields the invoice carries; apply_status copes with unlinked invoices
-- ---------------------------------------------------------------------------------------------
create or replace function public.wave_update(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = public, private as $$
declare w public.wave_invoices;
begin
  update public.wave_invoices set
    wave_customer_id    = coalesce(p ->> 'wave_customer_id', wave_customer_id),
    wave_invoice_id     = coalesce(p ->> 'wave_invoice_id', wave_invoice_id),
    wave_invoice_number = coalesce(p ->> 'wave_invoice_number', wave_invoice_number),
    wave_view_url       = coalesce(p ->> 'wave_view_url', wave_view_url),
    wave_status         = coalesce(p ->> 'wave_status', wave_status),
    customer_name       = coalesce(p ->> 'customer_name', customer_name),
    customer_email      = coalesce(lower(p ->> 'customer_email'), customer_email),
    items_summary       = coalesce(p ->> 'items_summary', items_summary),
    invoice_date        = coalesce((p ->> 'invoice_date')::date, invoice_date),
    due_date            = coalesce((p ->> 'due_date')::date, due_date),
    po_number           = coalesce(p ->> 'po_number', po_number),
    matched_by          = coalesce(matched_by, case when entity_id is not null then 'created' end),
    email_blocked       = coalesce((p ->> 'email_blocked')::boolean, email_blocked),
    sent_at             = case when (p ->> 'sent')::boolean then now() else sent_at end,
    last_error          = case when p ? 'last_error' then left(p ->> 'last_error', 2000) else last_error end,
    updated_at          = now()
  where id = p_id returning * into w;
  if (p ->> 'sent')::boolean and w.entity_id is not null then
    perform private.set_billing(w.entity_type, w.entity_id, case w.kind when 'balance' then 'balance_due' else 'invoiced' end);
  end if;
end $$;

create or replace function public.wave_apply_status(p_id uuid, p_status text, p_amount_paid numeric) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare w public.wave_invoices; delta numeric(10,2); res jsonb := null;
begin
  select * into w from public.wave_invoices where id = p_id for update;
  if w.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  delta := round(coalesce(p_amount_paid, 0), 2) - w.amount_paid;
  -- money is only booked against a linked order; an unlinked invoice just records its status and amount paid
  if delta > 0 and w.order_number is not null then
    res := public.apply_payment(jsonb_build_object(
      'number', w.order_number, 'kind', coalesce(w.kind, 'balance'), 'amount', delta, 'provider', 'wave',
      'provider_ref', w.wave_invoice_id || ':' || round(p_amount_paid, 2)::text,
      'actor', 'wave-poll', 'raw', jsonb_build_object('wave_status', p_status, 'wave_invoice_number', w.wave_invoice_number)));
  end if;
  update public.wave_invoices set wave_status = p_status, amount_paid = greatest(round(coalesce(p_amount_paid, 0), 2), amount_paid),
    amount_due = case when p_status in ('PAID', 'OVERPAID') then 0 else greatest(amount - greatest(round(coalesce(p_amount_paid, 0), 2), amount_paid), 0) end,
    last_polled_at = now(), updated_at = now() where id = p_id;
  if p_status in ('PAID', 'OVERPAID') and w.entity_id is not null and w.kind is not null then
    perform private.set_billing(w.entity_type, w.entity_id, case w.kind when 'deposit' then 'deposit_paid' else 'paid' end);
  end if;
  return jsonb_build_object('ok', true, 'delta', greatest(delta, 0), 'payment', res, 'linked', w.entity_id is not null);
end $$;

-- Which kind (full / deposit) does an invoice of this total look like for that order?
create or replace function private.infer_kind(p_type text, p_eid uuid, p_total numeric, p_invoice uuid) returns text
language plpgsql stable security definer set search_path = public, private as $$
declare q numeric; k text;
begin
  select v.quote into q from public.projects_v v where v.entity_type = p_type and v.id = p_eid;
  if q is null or q <= 0 then return null; end if;
  if abs(p_total - q) < 0.01 then k := 'full';
  elsif q > 35 and abs(p_total - private.deposit_required(q)) < 0.01 then k := 'deposit'; end if;
  if k is not null and exists (select 1 from public.wave_invoices w where w.entity_type = p_type and w.entity_id = p_eid
                               and w.kind = k and w.id <> p_invoice) then k := null; end if;
  return k;
end $$;
revoke all on function private.infer_kind(text, uuid, numeric, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4) Import one invoice found in Wave (service role: wave-poll). Idempotent.
--    p: business, wave_invoice_id, number, view_url, status, po_number, customer_id, customer_name,
--       customer_email, total, amount_due, due_date, invoice_date, created_at, last_sent_at, items_summary, test_mode
-- ---------------------------------------------------------------------------------------------
create or replace function public.wave_import_invoice(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  w public.wave_invoices; biz text := p ->> 'business'; po text := nullif(trim(coalesce(p ->> 'po_number', '')), '');
  em text := nullif(lower(trim(coalesce(p ->> 'customer_email', ''))), '');
  tot numeric(10,2) := coalesce((p ->> 'total')::numeric, 0); et text; ei uuid; matched text; cnt int; k text; num text; created_now boolean := false;
begin
  if biz not in ('madam_allure', 'allure_fusions', 'ai_authoritech') then raise exception 'business not allowed' using errcode = '22023'; end if;
  perform set_config('ccs.defer_attn', 'on', true);   -- no notifications until the link is settled (below)
  select * into w from public.wave_invoices where wave_invoice_id = p ->> 'wave_invoice_id';
  if w.id is not null then
    update public.wave_invoices set
      wave_invoice_number = coalesce(p ->> 'number', wave_invoice_number),
      wave_view_url       = coalesce(p ->> 'view_url', wave_view_url),
      po_number           = coalesce(po, po_number),
      customer_name       = coalesce(nullif(p ->> 'customer_name', ''), customer_name),
      customer_email      = coalesce(em, customer_email),
      items_summary       = coalesce(nullif(p ->> 'items_summary', ''), items_summary),
      invoice_date        = coalesce((p ->> 'invoice_date')::date, invoice_date),
      due_date            = coalesce((p ->> 'due_date')::date, due_date),
      wave_customer_id    = coalesce(p ->> 'customer_id', wave_customer_id),
      amount              = case when imported then tot else amount end,
      sent_at             = coalesce(sent_at, (p ->> 'last_sent_at')::timestamptz),
      last_synced_at      = now(), updated_at = now()
    where id = w.id returning * into w;
    if w.entity_id is not null or w.matched_by = 'manual' or not w.imported then
      perform set_config('ccs.defer_attn', 'off', true);
      update public.wave_invoices set updated_at = now() where id = w.id;
      return jsonb_build_object('action', 'updated', 'id', w.id, 'linked', w.entity_id is not null);
    end if;
  else
    -- the app is creating this very invoice right now (reserved row, Wave id not saved yet): leave it alone
    if po is not null and exists (select 1 from public.wave_invoices x where x.wave_status = 'CREATING' and x.order_number = po and x.business = biz) then
      perform set_config('ccs.defer_attn', 'off', true);
      return jsonb_build_object('action', 'skipped', 'reason', 'being_created');
    end if;
    insert into public.wave_invoices (business, amount, wave_customer_id, wave_invoice_id, wave_invoice_number, wave_view_url, wave_status,
        imported, po_number, customer_name, customer_email, items_summary, invoice_date, due_date, wave_created_at,
        sent_at, last_synced_at, test_mode, ready_notified_at)
    values (biz, tot, p ->> 'customer_id', p ->> 'wave_invoice_id', p ->> 'number', p ->> 'view_url', coalesce(p ->> 'status', 'SAVED'),
        true, po, nullif(p ->> 'customer_name', ''), em, nullif(p ->> 'items_summary', ''), (p ->> 'invoice_date')::date, (p ->> 'due_date')::date,
        (p ->> 'created_at')::timestamptz, (p ->> 'last_sent_at')::timestamptz, now(), coalesce((p ->> 'test_mode')::boolean, true), now())
    returning * into w;
    created_now := true;
  end if;

  -- 1) poNumber = order number (same business only)
  if po is not null then
    select f.etype, f.eid into et, ei from private.find_entity(po) f;
    if ei is not null and private.business_of(et) = biz then matched := 'po_number'; end if;
  end if;
  -- 2) the customer's one open order in that business
  if matched is null and em is not null then
    select count(*) into cnt from public.projects_v v
      where v.business = biz and lower(v.email) = em and v.status not in ('Completed', 'Cancelled', 'Declined', 'Shipped');
    if cnt = 1 then
      select v.entity_type, v.id into et, ei from public.projects_v v
        where v.business = biz and lower(v.email) = em and v.status not in ('Completed', 'Cancelled', 'Declined', 'Shipped');
      matched := 'customer_email';
    end if;
  end if;
  if matched is not null then
    select v.number into num from public.projects_v v where v.entity_type = et and v.id = ei;
    k := private.infer_kind(et, ei, tot, w.id);
    update public.wave_invoices set entity_type = et, entity_id = ei, order_number = num, kind = k, matched_by = matched, updated_at = now()
      where id = w.id returning * into w;
  end if;
  -- now that the link is settled, let the triggers run once on the final row (attention item + invoice.ready)
  perform set_config('ccs.defer_attn', 'off', true);
  update public.wave_invoices set updated_at = now(), ready_notified_at = case when created_now then null else ready_notified_at end
    where id = w.id returning * into w;
  return jsonb_build_object('action', case when created_now then 'imported' else 'updated' end, 'id', w.id,
                            'linked', matched is not null, 'matched_by', matched, 'order', num, 'kind', w.kind);
end $$;

-- Admin links (or unlinks) an invoice to an order by number
create or replace function public.wave_link_invoice(p_invoice uuid, p_number text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare w public.wave_invoices; et text; ei uuid; num text; k text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into w from public.wave_invoices where id = p_invoice;
  if w.id is null then raise exception 'invoice not found' using errcode = 'P0002'; end if;
  if nullif(trim(coalesce(p_number, '')), '') is null then
    update public.wave_invoices set entity_type = null, entity_id = null, order_number = null, kind = null, matched_by = 'manual', updated_at = now() where id = w.id;
    return jsonb_build_object('ok', true, 'linked', false);
  end if;
  select f.etype, f.eid into et, ei from private.find_entity(p_number) f;
  if ei is null then raise exception 'No order or project numbered % was found', upper(trim(p_number)) using errcode = 'P0002'; end if;
  if private.business_of(et) <> w.business then
    raise exception 'That order belongs to another business than this invoice' using errcode = '22023';
  end if;
  select v.number into num from public.projects_v v where v.entity_type = et and v.id = ei;
  k := private.infer_kind(et, ei, w.amount, w.id);
  update public.wave_invoices set entity_type = et, entity_id = ei, order_number = num, kind = k, matched_by = 'manual', updated_at = now() where id = w.id;
  return jsonb_build_object('ok', true, 'linked', true, 'order', num, 'kind', k);
end $$;

-- ---------------------------------------------------------------------------------------------
-- 5) Browser-facing RPCs. SECURITY DEFINER with the filtering inside, keyed on the signed-in email.
-- ---------------------------------------------------------------------------------------------
create or replace function public.my_invoices() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id, 'invoice_number', w.wave_invoice_number, 'business', w.business, 'kind', w.kind,
    'amount', w.amount, 'amount_paid', w.amount_paid, 'amount_due', w.amount_due, 'status', w.wave_status,
    'due_date', w.due_date, 'invoice_date', w.invoice_date, 'view_url', w.wave_view_url,
    'order_number', w.order_number, 'entity_type', w.entity_type, 'entity_id', w.entity_id,
    'test', w.test_mode or coalesce((select (private.entity_json(w.entity_type, w.entity_id) ->> 'is_test')::boolean), false)
  ) order by w.created_at desc), '[]'::jsonb)
  from public.wave_invoices w
  where private.my_email() is not null
    and w.wave_invoice_id is not null and w.wave_view_url is not null
    and coalesce(w.wave_status, '') in ('SAVED', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERPAID', 'UNPAID', 'OVERDUE')
    and (lower(w.customer_email) = private.my_email()
         or exists (select 1 from public.projects_v v where v.entity_type = w.entity_type and v.id = w.entity_id and lower(v.email) = private.my_email()))
$$;

create or replace function public.admin_invoices() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'unmatched', (select count(*) from public.wave_invoices where entity_id is null and wave_invoice_id is not null
                    and coalesce(wave_status, '') <> 'CREATING' and coalesce(matched_by, '') <> 'manual'),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object(
        'id', w.id, 'invoice_number', w.wave_invoice_number, 'business', w.business, 'kind', w.kind, 'amount', w.amount,
        'amount_paid', w.amount_paid, 'amount_due', w.amount_due, 'status', w.wave_status, 'due_date', w.due_date,
        'invoice_date', w.invoice_date, 'view_url', w.wave_view_url, 'order_number', w.order_number, 'entity_type', w.entity_type,
        'entity_id', w.entity_id, 'matched_by', w.matched_by, 'imported', w.imported, 'po_number', w.po_number,
        'customer_name', w.customer_name, 'customer_email', w.customer_email, 'items_summary', w.items_summary,
        'sent_at', w.sent_at, 'email_blocked', w.email_blocked, 'last_error', w.last_error, 'last_synced_at', w.last_synced_at,
        'test', w.test_mode) order by w.created_at desc)
      from (select * from public.wave_invoices x where x.wave_invoice_id is not null and coalesce(x.wave_status, '') <> 'CREATING'
            order by x.created_at desc limit 500) w), '[]'::jsonb));
end $$;

create or replace function public.admin_attention() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', n.id, 'subject', n.subject, 'business', n.business, 'number', n.number, 'invoice_number', n.invoice_number,
      'entity_type', n.entity_type, 'entity_id', n.entity_id, 'invoice_id', n.invoice_id, 'message', n.message,
      'missing', n.missing_labels, 'is_test', n.is_test, 'created_at', n.created_at, 'updated_at', n.updated_at)
      order by n.created_at desc) from public.needs_attention n where n.resolved_at is null), '[]'::jsonb);
end $$;

-- Re-check every record (used once after this migration; no notifications)
create or replace function public.attn_refresh_all(p_notify boolean default false) returns integer
language plpgsql security definer set search_path = public, private as $$
declare r record; n int := 0;
begin
  for r in select 'order' t, id from public.orders union all select 'ai_intake', id from public.ai_intake
           union all select 'madam_allure_order', id from public.madam_allure_orders loop
    perform private.attn_refresh_entity(r.t, r.id, p_notify); n := n + 1;
  end loop;
  for r in select id from public.wave_invoices where entity_id is null loop
    perform private.attn_refresh_invoice(r.id, p_notify); n := n + 1;
  end loop;
  -- a quiet pass (no notifications) also records what is already flagged, so later edits only notify about NEW gaps
  if not p_notify then update public.needs_attention set notified_keys = missing where resolved_at is null; end if;
  return n;
end $$;

revoke all on function public.wave_import_invoice(jsonb), public.wave_link_invoice(uuid, text), public.my_invoices(), public.admin_invoices(),
  public.admin_attention(), public.attn_refresh_all(boolean), public.wave_update(uuid, jsonb), public.wave_apply_status(uuid, text, numeric)
  from public, anon, authenticated;
revoke all on function private.order_missing(text, uuid), private.invoice_missing(uuid), private.attn_upsert(text, text, text, uuid, uuid, text, text, text, text[], boolean, boolean),
  private.attn_refresh_invoice(uuid, boolean), private.attn_refresh_entity(text, uuid, boolean), private.attn_after_entity(), private.attn_after_invoice(),
  private.wave_invoice_ready() from public, anon, authenticated;
grant execute on function public.wave_import_invoice(jsonb), public.attn_refresh_all(boolean), public.wave_update(uuid, jsonb),
  public.wave_apply_status(uuid, text, numeric) to service_role;
grant execute on function public.my_invoices(), public.admin_invoices(), public.admin_attention(), public.wave_link_invoice(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 6) Settings the Functions read (service role): test mode + GHL delivery flags + import start date
--    Vault names: wave_test_mode, wave_test_email, ghl_webhook_url, ghl_in_test_mode ('true' lets test-mode
--    events reach GHL; default OFF), admin_notify_email (live recipient for attention.needed), wave_import_since.
-- ---------------------------------------------------------------------------------------------
create or replace function public.ccs_test_settings() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select case when to_regclass('vault.decrypted_secrets') is null
    then jsonb_build_object('test_mode', false, 'test_email', null, 'ghl_in_test_mode', false, 'ghl_webhook_url', null,
                            'admin_notify_email', null, 'import_since', null)
    else jsonb_build_object(
      'test_mode', coalesce(private.vault_secret('wave_test_mode'), 'true') <> 'false',
      'test_email', private.vault_secret('wave_test_email'),
      'ghl_in_test_mode', coalesce(private.vault_secret('ghl_in_test_mode'), 'false') = 'true',
      'ghl_webhook_url', private.vault_secret('ghl_webhook_url'),
      'admin_notify_email', private.vault_secret('admin_notify_email'),
      'import_since', private.vault_secret('wave_import_since')) end
$$;
revoke all on function public.ccs_test_settings() from public, anon, authenticated;
grant execute on function public.ccs_test_settings() to service_role;

-- One pass over what already exists (flags missing information; queues no notifications)
select public.attn_refresh_all(false);
