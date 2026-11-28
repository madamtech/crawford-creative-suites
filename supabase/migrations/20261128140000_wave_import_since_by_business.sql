-- Per-business Wave import cutoff, historical (past-client) invoices, and safer linking.
-- Built by Peyton, Nov 28 2026, so Tanika's 26 older real Madam Allure invoices can come into the portal.
-- Default cutoffs: Madam Allure 2021-01-25 00:00 CT (covers all 26); Allure Fusions and AI AuthoriTech stay Nov 28 2026.
-- Historical invoices are never auto-linked by email (and never to a test record by PO number).
-- Paid historical invoices do not create Needs attention or invoice.ready events.
-- Amounts from Wave may include commas (e.g. 1,750.00); those now parse.

-- 1) Flag -----------------------------------------------------------------
alter table public.wave_invoices
  add column if not exists historical boolean not null default false;
comment on column public.wave_invoices.historical is
  'Invoice was created in Wave before 2026-11-28 (past-client history). Not a current TEST or new portal invoice.';

create or replace function private.entity_is_test(p_type text, p_id uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select coalesce((private.entity_json(p_type, p_id) ->> 'is_test')::boolean, false)
$$;
create or replace function private.money_num(p text) returns numeric
language sql immutable as $$
  select nullif(replace(replace(trim(coalesce(p, '')), ',', ''), '$', ''), '')::numeric
$$;
revoke all on function private.entity_is_test(text, uuid), private.money_num(text) from public, anon, authenticated;

-- 2) Import: parse money, mark historical, never auto-link past invoices to test records or by email
create or replace function public.wave_import_invoice(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  w public.wave_invoices; biz text := p ->> 'business'; po text := nullif(trim(coalesce(p ->> 'po_number', '')), '');
  em text := nullif(lower(trim(coalesce(p ->> 'customer_email', ''))), '');
  tot numeric(10,2) := coalesce(private.money_num(p ->> 'total'), 0);
  wave_at timestamptz := (p ->> 'created_at')::timestamptz;
  hist boolean := wave_at is not null and wave_at < '2026-11-28 00:00:00-06'::timestamptz;
  tes boolean := case when hist then false else coalesce((p ->> 'test_mode')::boolean, true) end;
  et text; ei uuid; matched text; cnt int; k text; num text; created_now boolean := false;
begin
  if biz not in ('madam_allure', 'allure_fusions', 'ai_authoritech') then raise exception 'business not allowed' using errcode = '22023'; end if;
  perform set_config('ccs.defer_attn', 'on', true);
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
      wave_created_at     = coalesce(wave_created_at, wave_at),
      historical          = historical or hist,
      test_mode           = case when historical or hist then false else test_mode end,
      amount              = case when imported then tot else amount end,
      sent_at             = coalesce(sent_at, (p ->> 'last_sent_at')::timestamptz),
      last_synced_at      = now(), updated_at = now()
    where id = w.id returning * into w;
    if w.entity_id is not null or w.matched_by = 'manual' or not w.imported then
      perform set_config('ccs.defer_attn', 'off', true);
      update public.wave_invoices set updated_at = now() where id = w.id;
      return jsonb_build_object('action', 'updated', 'id', w.id, 'linked', w.entity_id is not null, 'historical', w.historical);
    end if;
  else
    if po is not null and exists (select 1 from public.wave_invoices x where x.wave_status = 'CREATING' and x.order_number = po and x.business = biz) then
      perform set_config('ccs.defer_attn', 'off', true);
      return jsonb_build_object('action', 'skipped', 'reason', 'being_created');
    end if;
    insert into public.wave_invoices (business, amount, wave_customer_id, wave_invoice_id, wave_invoice_number, wave_view_url, wave_status,
        imported, po_number, customer_name, customer_email, items_summary, invoice_date, due_date, wave_created_at,
        sent_at, last_synced_at, test_mode, ready_notified_at, historical)
    values (biz, tot, p ->> 'customer_id', p ->> 'wave_invoice_id', p ->> 'number', p ->> 'view_url', coalesce(p ->> 'status', 'SAVED'),
        true, po, nullif(p ->> 'customer_name', ''), em, nullif(p ->> 'items_summary', ''), (p ->> 'invoice_date')::date, (p ->> 'due_date')::date,
        wave_at, (p ->> 'last_sent_at')::timestamptz, now(), tes, now(), hist)
    returning * into w;
    created_now := true;
  end if;

  -- 1) poNumber = order number, same business, never onto a test record (real past invoices must not attach to TEST orders)
  if po is not null then
    select f.etype, f.eid into et, ei from private.find_entity(po) f;
    if ei is not null and private.business_of(et) = biz
       and (not hist or not private.entity_is_test(et, ei)) then
      matched := 'po_number';
    end if;
  end if;
  -- 2) email match: one open non-test order in that business. Skipped entirely for historical invoices
  --    so a real client's invoice can never land on a TEST portal record.
  if matched is null and em is not null and not coalesce(w.historical, hist, false) then
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
  perform set_config('ccs.defer_attn', 'off', true);
  update public.wave_invoices set updated_at = now(), ready_notified_at = case when created_now then null else ready_notified_at end
    where id = w.id returning * into w;
  return jsonb_build_object('action', case when created_now then 'imported' else 'updated' end, 'id', w.id,
                            'linked', matched is not null, 'matched_by', matched, 'order', num, 'kind', w.kind,
                            'historical', w.historical);
end $$;

-- 3) Attention / invoice.ready: paid (or already-sent) historical invoices stay quiet
create or replace function private.attn_refresh_invoice(p_id uuid, p_notify boolean default true) returns void
language plpgsql security definer set search_path = public, private as $$
declare w public.wave_invoices; im text[]; om text[] := '{}'; allk text[]; ej jsonb; quiet boolean;
begin
  select * into w from public.wave_invoices where id = p_id;
  if w.id is null then return; end if;
  -- Past paid invoices are history, not incomplete current work.
  quiet := w.historical and coalesce(w.wave_status, '') in ('PAID', 'OVERPAID');
  if quiet or w.wave_invoice_id is null or coalesce(w.wave_status, '') in ('CREATING', 'DRAFT') then
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

create or replace function private.wave_invoice_ready() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare em text; nm text; ej jsonb;
begin
  -- Historical past-client invoices are not new "an invoice is waiting" notices.
  if coalesce(new.historical, false) then return new; end if;
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

-- 4) RPCs include the historical flag so the Admin Office can filter "Past clients"
create or replace function public.my_invoices() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id, 'invoice_number', w.wave_invoice_number, 'business', w.business, 'kind', w.kind,
    'amount', w.amount, 'amount_paid', w.amount_paid, 'amount_due', w.amount_due, 'status', w.wave_status,
    'due_date', w.due_date, 'invoice_date', w.invoice_date, 'view_url', w.wave_view_url,
    'order_number', w.order_number, 'entity_type', w.entity_type, 'entity_id', w.entity_id,
    'historical', w.historical,
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
                    and coalesce(wave_status, '') <> 'CREATING' and coalesce(matched_by, '') <> 'manual' and not historical),
    'historical', (select count(*) from public.wave_invoices where historical and wave_invoice_id is not null),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object(
        'id', w.id, 'invoice_number', w.wave_invoice_number, 'business', w.business, 'kind', w.kind, 'amount', w.amount,
        'amount_paid', w.amount_paid, 'amount_due', w.amount_due, 'status', w.wave_status, 'due_date', w.due_date,
        'invoice_date', w.invoice_date, 'view_url', w.wave_view_url, 'order_number', w.order_number, 'entity_type', w.entity_type,
        'entity_id', w.entity_id, 'matched_by', w.matched_by, 'imported', w.imported, 'po_number', w.po_number,
        'customer_name', w.customer_name, 'customer_email', w.customer_email, 'items_summary', w.items_summary,
        'sent_at', w.sent_at, 'email_blocked', w.email_blocked, 'last_error', w.last_error, 'last_synced_at', w.last_synced_at,
        'historical', w.historical, 'test', w.test_mode) order by w.created_at desc)
      from (select * from public.wave_invoices x where x.wave_invoice_id is not null and coalesce(x.wave_status, '') <> 'CREATING'
            order by x.created_at desc limit 500) w), '[]'::jsonb));
end $$;

-- 5) Settings: import_since may be a date (the default for every business) or JSON
--    {"default":"2026-11-28T00:00:00-06:00","madam_allure":"2021-01-25T00:00:00-06:00"}
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

revoke all on function public.wave_import_invoice(jsonb), public.my_invoices(), public.admin_invoices(), public.ccs_test_settings()
  from public, anon, authenticated;
grant execute on function public.wave_import_invoice(jsonb), public.ccs_test_settings() to service_role;
grant execute on function public.my_invoices(), public.admin_invoices() to authenticated, service_role;
