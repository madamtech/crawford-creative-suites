-- Wave invoicing (built by Peyton, Nov 28, 2026, approved by Tanika; TEST MODE first).
--
-- Flow: the customer approves the quote (quote_approved_at) -> quote.approved event +
-- the wave-invoice Edge Function creates, approves and sends the Wave invoice.
--   $35 or less : one FULL invoice, only after shipping is decided (ship + amount, or pickup/none).
--   over $35    : 60% DEPOSIT invoice right after approval; 40% BALANCE + shipping line
--                 only after shipping is decided.
-- wave-poll (pg_cron, every 15 min) reads open invoices and records payments.
-- Secrets (cron secret, test mode, test address) live in Supabase Vault, never in this file.
-- This migration needs no pg_cron / pg_net / vault, so the PGlite tests still load it;
-- the live-only scheduler setup is supabase/sql/scheduler_setup.sql.

-- 1) Quote approval, shipping and billing stage on all three record types ----------------
do $$
declare t text;
begin
  foreach t in array array['orders', 'madam_allure_orders', 'ai_intake'] loop
    execute format($f$
      alter table public.%1$I
        add column if not exists quote_approved_at timestamptz,
        add column if not exists quote_approved_by text check (length(quote_approved_by) <= 254),
        add column if not exists shipping_method text check (shipping_method in ('ship', 'pickup', 'none')),
        add column if not exists shipping_amount numeric(10,2) check (shipping_amount >= 0),
        add column if not exists billing_status text
          check (billing_status in ('quote_approved', 'invoiced', 'deposit_paid', 'balance_due', 'paid')),
        add column if not exists is_test boolean not null default false
    $f$, t);
  end loop;
end $$;

comment on column public.orders.shipping_method is
  'ship (needs shipping_amount), pickup or none. Must be chosen explicitly before a full or balance invoice is sent.';

-- 2) Wave invoices ---------------------------------------------------------------------
create table if not exists public.wave_invoices (
  id                  uuid primary key default gen_random_uuid(),
  entity_type         text not null check (entity_type in ('order', 'ai_intake', 'madam_allure_order')),
  entity_id           uuid not null,
  order_number        text not null,
  business            text not null check (business in ('madam_allure', 'allure_fusions', 'ai_authoritech')),
  kind                text not null check (kind in ('full', 'deposit', 'balance')),
  amount              numeric(10,2) not null check (amount > 0),        -- invoice total incl. shipping
  shipping_amount     numeric(10,2) not null default 0 check (shipping_amount >= 0),
  wave_customer_id    text,
  wave_invoice_id     text unique,
  wave_invoice_number text,
  wave_view_url       text check (wave_view_url is null or wave_view_url ~ '^https://'),
  wave_status         text,
  amount_paid         numeric(10,2) not null default 0,
  test_mode           boolean not null default true,
  sent_at             timestamptz,
  last_error          text,
  last_polled_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (entity_type, entity_id, kind)
);
create index if not exists wave_invoices_open_idx on public.wave_invoices (wave_status) where wave_invoice_id is not null;

alter table public.wave_invoices enable row level security;
drop policy if exists wave_invoices_admin_read on public.wave_invoices;
create policy wave_invoices_admin_read on public.wave_invoices for select to authenticated
  using ((select public.is_admin()));
revoke all on public.wave_invoices from anon;
grant select on public.wave_invoices to authenticated;
grant all on public.wave_invoices to service_role;

-- 3) Allow 'wave' payments and the quote.approved event ----------------------------------
alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('stripe', 'ghl', 'ueni', 'manual', 'wave'));

alter table public.event_outbox drop constraint if exists event_outbox_event_type_check;
alter table public.event_outbox add constraint event_outbox_event_type_check
  check (event_type in ('lead.created', 'order.created', 'payment.succeeded', 'member.invited', 'quote.approved'));

-- 4) Helpers ------------------------------------------------------------------------------
create or replace function private.vault_secret(p_name text) returns text
language plpgsql stable security definer set search_path = public, private as $$
declare v text;
begin
  if to_regclass('vault.decrypted_secrets') is null then return null; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v using p_name;
  return v;
end $$;
revoke all on function private.vault_secret(text) from public, anon, authenticated;

-- Called by the Wave / dispatch Functions with the x-ccs-cron-secret header.
-- Raises on a bad secret; returns test-mode settings. Test mode is ON unless Vault says 'false'.
create or replace function public.wave_runtime(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare s text := private.vault_secret('ccs_cron_secret');
begin
  if s is null or p_secret is null or length(p_secret) <> length(s) or p_secret <> s then
    raise exception 'bad secret' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'test_mode', coalesce(private.vault_secret('wave_test_mode'), 'true') <> 'false',
    'test_email', private.vault_secret('wave_test_email'));
end $$;

-- Ask the wave-invoice Function to act on one record (async via pg_net; no-op without it).
create or replace function private.kick_wave_invoice(p_type text, p_id uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u text := private.vault_secret('ccs_functions_url'); s text := private.vault_secret('ccs_cron_secret');
begin
  if to_regnamespace('net') is null or u is null or s is null then return; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 60000)'
    using u || '/wave-invoice',
          jsonb_build_object('entity_type', p_type, 'entity_id', p_id),
          jsonb_build_object('Content-Type', 'application/json', 'x-ccs-cron-secret', s);
end $$;
revoke all on function private.kick_wave_invoice(text, uuid) from public, anon, authenticated;

create or replace function private.etype_for(p_table text) returns text language sql immutable as $$
  select case p_table when 'orders' then 'order' when 'ai_intake' then 'ai_intake' else 'madam_allure_order' end
$$;

-- BEFORE: stamp billing_status when the quote is approved.
create or replace function private.wave_before() returns trigger
language plpgsql set search_path = public, private as $$
begin
  if new.quote_approved_at is not null and (tg_op = 'INSERT' or old.quote_approved_at is null)
     and new.billing_status is null then
    new.billing_status := 'quote_approved';
  end if;
  return new;
end $$;

-- AFTER: quote.approved event + kick wave-invoice on approval or when shipping is decided.
create or replace function private.wave_after() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  j jsonb := to_jsonb(new);
  et text := private.etype_for(tg_table_name);
  approved_now boolean := new.quote_approved_at is not null and (tg_op = 'INSERT' or old.quote_approved_at is null);
  ship_changed boolean := tg_op = 'UPDATE' and new.quote_approved_at is not null and
    (old.shipping_method is distinct from new.shipping_method or old.shipping_amount is distinct from new.shipping_amount);
begin
  if approved_now then
    insert into public.event_outbox (event_type, payload) values ('quote.approved', jsonb_build_object(
      'entity_type', et, 'number', coalesce(j ->> 'order_number', j ->> 'intake_number'),
      'business', case et when 'order' then 'allure_fusions' when 'ai_intake' then 'ai_authoritech' else 'madam_allure' end,
      'approved_at', new.quote_approved_at, 'approved_by', new.quote_approved_by,
      'quote', coalesce(j ->> 'quote', j ->> 'amount'), 'is_test', new.is_test));
  end if;
  if approved_now or ship_changed then
    perform private.kick_wave_invoice(et, new.id);
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['orders', 'madam_allure_orders', 'ai_intake'] loop
    execute format('drop trigger if exists %1$s_wave_before on public.%1$I', t);
    execute format('create trigger %1$s_wave_before before insert or update on public.%1$I
                    for each row execute function private.wave_before()', t);
    execute format('drop trigger if exists %1$s_wave_after on public.%1$I', t);
    execute format('create trigger %1$s_wave_after after insert or update on public.%1$I
                    for each row execute function private.wave_after()', t);
  end loop;
end $$;

-- 5) What invoice (if any) is due next for one record --------------------------------------
create or replace function public.wave_plan(p_entity_type text, p_entity_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  v record; r jsonb; item text; total numeric(10,2);
  approved timestamptz; ship_m text; ship_a numeric(10,2); test boolean;
  ship_ready boolean; ship_amt numeric(10,2) := 0; dep record; lines jsonb; amt numeric(10,2);
begin
  select * into v from public.projects_v where entity_type = p_entity_type and id = p_entity_id;
  if v.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  if p_entity_type = 'order' then
    select to_jsonb(o) into r from public.orders o where o.id = p_entity_id;
    item := coalesce(nullif(r ->> 'service', ''), nullif(r ->> 'project_type', ''), 'Custom project')
            || coalesce(' — ' || nullif(left(r ->> 'description', 120), ''), '');
  elsif p_entity_type = 'ai_intake' then
    select to_jsonb(a) into r from public.ai_intake a where a.id = p_entity_id;
    item := coalesce(nullif(r ->> 'engagement', ''), 'AI AuthoriTech project');
  else
    select to_jsonb(m) into r from public.madam_allure_orders m where m.id = p_entity_id;
    select string_agg(coalesce(e ->> 'name', e ->> 'title'), ', ') into item
      from jsonb_array_elements(coalesce(r -> 'items', '[]'::jsonb)) e;
    item := coalesce(nullif(item, ''), v.title);
  end if;
  item := left(item, 250);

  total := v.quote;
  approved := (r ->> 'quote_approved_at')::timestamptz;
  ship_m := r ->> 'shipping_method';
  ship_a := (r ->> 'shipping_amount')::numeric;
  test := coalesce((r ->> 'is_test')::boolean, false);

  r := jsonb_build_object('ok', true, 'entity_type', p_entity_type, 'entity_id', p_entity_id,
         'number', v.number, 'business', v.business, 'is_test', test,
         'customer', jsonb_build_object('name', v.name, 'email', v.email));

  if approved is null then return r || jsonb_build_object('next', null, 'reason', 'quote_not_approved'); end if;
  if total is null or total <= 0 then return r || jsonb_build_object('next', null, 'reason', 'no_quote'); end if;

  -- AI AuthoriTech work is a service: no shipping step.
  ship_ready := coalesce(p_entity_type = 'ai_intake' or ship_m in ('pickup', 'none') or (ship_m = 'ship' and ship_a is not null), false);
  if ship_m = 'ship' then ship_amt := coalesce(ship_a, 0); end if;

  if total <= 35 then
    if exists (select 1 from public.wave_invoices w where w.entity_type = p_entity_type and w.entity_id = p_entity_id and w.kind = 'full') then
      return r || jsonb_build_object('next', null, 'reason', 'done');
    end if;
    if not ship_ready then return r || jsonb_build_object('next', null, 'reason', 'waiting_for_shipping'); end if;
    lines := jsonb_build_array(jsonb_build_object('description', item, 'unitPrice', total));
    amt := total + ship_amt;
    if ship_amt > 0 then lines := lines || jsonb_build_object('description', 'Shipping', 'unitPrice', ship_amt); end if;
    return r || jsonb_build_object('next', jsonb_build_object('kind', 'full', 'amount', amt, 'shipping', ship_amt, 'lines', lines));
  end if;

  select * into dep from public.wave_invoices w where w.entity_type = p_entity_type and w.entity_id = p_entity_id and w.kind = 'deposit';
  if dep.id is null then
    amt := round(total * 0.60, 2);
    return r || jsonb_build_object('next', jsonb_build_object('kind', 'deposit', 'amount', amt, 'shipping', 0,
      'lines', jsonb_build_array(jsonb_build_object('description', 'Deposit (60%) — ' || item, 'unitPrice', amt))));
  end if;
  if exists (select 1 from public.wave_invoices w where w.entity_type = p_entity_type and w.entity_id = p_entity_id and w.kind = 'balance') then
    return r || jsonb_build_object('next', null, 'reason', 'done');
  end if;
  if dep.wave_invoice_id is null then return r || jsonb_build_object('next', null, 'reason', 'deposit_in_progress'); end if;
  if not ship_ready then return r || jsonb_build_object('next', null, 'reason', 'waiting_for_shipping'); end if;
  amt := total - dep.amount;
  lines := jsonb_build_array(jsonb_build_object('description', 'Balance (40%) — ' || item, 'unitPrice', amt));
  if ship_amt > 0 then lines := lines || jsonb_build_object('description', 'Shipping', 'unitPrice', ship_amt); end if;
  return r || jsonb_build_object('next', jsonb_build_object('kind', 'balance', 'amount', amt + ship_amt, 'shipping', ship_amt, 'lines', lines));
end $$;

-- Reserve the invoice row first so two runs never create the same invoice twice.
create or replace function public.wave_reserve(p jsonb) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare nid uuid;
begin
  insert into public.wave_invoices (entity_type, entity_id, order_number, business, kind, amount, shipping_amount, test_mode, wave_status)
  values (p ->> 'entity_type', (p ->> 'entity_id')::uuid, p ->> 'number', p ->> 'business', p ->> 'kind',
          (p ->> 'amount')::numeric, coalesce((p ->> 'shipping')::numeric, 0), coalesce((p ->> 'test_mode')::boolean, true), 'CREATING')
  on conflict (entity_type, entity_id, kind) do nothing
  returning id into nid;
  return nid;
end $$;

-- Drop a reservation whose Wave invoice was never created (so a later run can retry).
create or replace function public.wave_release(p_id uuid, p_error text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  delete from public.wave_invoices where id = p_id and wave_invoice_id is null;
  if not found then update public.wave_invoices set last_error = left(p_error, 2000), updated_at = now() where id = p_id; end if;
end $$;

create or replace function private.set_billing(p_type text, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  perform set_config('ccs.actor', 'wave', true);
  if p_type = 'order' then update public.orders set billing_status = p_status where id = p_id;
  elsif p_type = 'ai_intake' then update public.ai_intake set billing_status = p_status where id = p_id;
  else update public.madam_allure_orders set billing_status = p_status where id = p_id; end if;
end $$;
revoke all on function private.set_billing(text, uuid, text) from public, anon, authenticated;

-- Save Wave ids / status after create, approve and send.
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
    sent_at             = case when (p ->> 'sent')::boolean then now() else sent_at end,
    last_error          = case when p ? 'last_error' then left(p ->> 'last_error', 2000) else last_error end,
    updated_at          = now()
  where id = p_id returning * into w;
  if (p ->> 'sent')::boolean then
    perform private.set_billing(w.entity_type, w.entity_id, case w.kind when 'balance' then 'balance_due' else 'invoiced' end);
  end if;
end $$;

-- Records that still need an invoice step (safety sweep; the trigger normally handles it).
create or replace function public.wave_pending() returns table (entity_type text, entity_id uuid)
language sql stable security definer set search_path = public, private as $$
  select 'order', id from public.orders where quote_approved_at is not null and coalesce(billing_status, '') <> 'paid'
  union all
  select 'madam_allure_order', id from public.madam_allure_orders where quote_approved_at is not null and coalesce(billing_status, '') <> 'paid'
  union all
  select 'ai_intake', id from public.ai_intake where quote_approved_at is not null and coalesce(billing_status, '') <> 'paid'
$$;

create or replace function public.wave_open_invoices() returns setof public.wave_invoices
language sql stable security definer set search_path = public, private as $$
  select * from public.wave_invoices
  where wave_invoice_id is not null and coalesce(wave_status, '') not in ('PAID', 'OVERPAID')
  order by created_at
$$;

-- Apply a polled Wave status: record any newly paid amount as a 'wave' payment.
create or replace function public.wave_apply_status(p_id uuid, p_status text, p_amount_paid numeric) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare w public.wave_invoices; delta numeric(10,2); res jsonb := null;
begin
  select * into w from public.wave_invoices where id = p_id for update;
  if w.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  delta := round(coalesce(p_amount_paid, 0), 2) - w.amount_paid;
  if delta > 0 then
    res := public.apply_payment(jsonb_build_object(
      'number', w.order_number, 'kind', w.kind, 'amount', delta, 'provider', 'wave',
      'provider_ref', w.wave_invoice_id || ':' || round(p_amount_paid, 2)::text,
      'actor', 'wave-poll', 'raw', jsonb_build_object('wave_status', p_status, 'wave_invoice_number', w.wave_invoice_number)));
  end if;
  update public.wave_invoices set wave_status = p_status, amount_paid = greatest(round(coalesce(p_amount_paid, 0), 2), amount_paid),
    last_polled_at = now(), updated_at = now() where id = p_id;
  if p_status in ('PAID', 'OVERPAID') then
    perform private.set_billing(w.entity_type, w.entity_id, case w.kind when 'deposit' then 'deposit_paid' else 'paid' end);
  end if;
  return jsonb_build_object('ok', true, 'delta', greatest(delta, 0), 'payment', res);
end $$;

revoke all on function public.wave_runtime(text), public.wave_plan(text, uuid), public.wave_reserve(jsonb),
  public.wave_release(uuid, text), public.wave_update(uuid, jsonb), public.wave_pending(),
  public.wave_open_invoices(), public.wave_apply_status(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.wave_runtime(text), public.wave_plan(text, uuid), public.wave_reserve(jsonb),
  public.wave_release(uuid, text), public.wave_update(uuid, jsonb), public.wave_pending(),
  public.wave_open_invoices(), public.wave_apply_status(uuid, text, numeric) to service_role;

-- 6) Notification dispatch helpers (read-only) ----------------------------------------------
-- Test-mode settings for service-only callers that are already authenticated another way.
-- Live Supabase always has Vault: test mode is ON unless Vault wave_test_mode = 'false'.
-- A database with no Vault at all is the local PGlite test/preview setup: test mode off there.
create or replace function public.ccs_test_settings() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select case when to_regclass('vault.decrypted_secrets') is null
    then jsonb_build_object('test_mode', false, 'test_email', null)
    else jsonb_build_object(
      'test_mode', coalesce(private.vault_secret('wave_test_mode'), 'true') <> 'false',
      'test_email', private.vault_secret('wave_test_email')) end
$$;

-- Undelivered outbox counts, for dispatch-events dry runs (claims nothing).
create or replace function public.outbox_summary() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_object_agg(event_type, n), '{}'::jsonb)
  from (select event_type, count(*) as n from public.event_outbox where delivered_at is null group by event_type) s
$$;

revoke all on function public.ccs_test_settings(), public.outbox_summary() from public, anon, authenticated;
grant execute on function public.ccs_test_settings(), public.outbox_summary() to service_role;
