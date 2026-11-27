-- Database functions used by the Edge Functions (service role only) and by the
-- building's Client Login, My Projects and Admin Office (signed-in users).
-- Every browser-callable function is SECURITY INVOKER unless noted, so RLS applies.

-- ---------------------------------------------------------------------------
-- One list of every project across the three businesses (RLS applies).
-- ---------------------------------------------------------------------------
create or replace view public.projects_v with (security_invoker = true) as
  select 'order'::text as entity_type, o.id, o.order_number as number, 'allure_fusions'::text as business,
         'order'::text as kind,
         coalesce(nullif(o.project_type, ''), nullif(o.service, ''), 'Custom project') as title,
         o.name, o.email, o.phone, o.status, o.paid, o.quote, o.amount_paid, o.balance,
         o.deposit_required, o.deposit, o.due_date, o.created_at, o.updated_at, o.last_status_change,
         o.payment_link, o.notes, o.details, o.source, o.rush, o.form_fields
  from public.orders o
  union all
  select 'ai_intake', a.id, a.intake_number, 'ai_authoritech', 'ai_intake',
         coalesce(nullif(a.engagement, ''), 'AI readiness conversation'),
         a.name, a.email, a.phone, a.status, a.paid, a.quote, a.amount_paid, a.balance,
         a.deposit_due, a.deposit, null::date, a.created_at, a.updated_at, a.last_status_change,
         a.payment_link, a.notes, a.business_challenge, a.source, false, a.form_fields
  from public.ai_intake a
  union all
  select 'madam_allure_order', m.id, m.order_number, 'madam_allure', m.kind,
         case m.kind when 'custom' then 'Custom gift request'
                     when 'memorial' then 'Memorial gift request'
                     else 'Shop order' end,
         m.name, m.email, m.phone, m.status, m.paid, m.amount, m.amount_paid,
         greatest(coalesce(m.amount, 0) - m.amount_paid, 0), null::numeric, 0::numeric, m.needed_by,
         m.ordered_at, m.updated_at, m.last_status_change, null::text, m.notes, m.details,
         m.source, false, m.form_fields
  from public.madam_allure_orders m;

grant select on public.projects_v to authenticated, service_role;

create or replace function private.business_tag(b text) returns text
language sql immutable as $$
  select replace(b, '_', '-')
$$;

create or replace function private.upsert_client(p_email text, p_name text, p_phone text) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare cid uuid;
begin
  insert into public.clients (email, name, phone)
  values (lower(p_email), nullif(p_name, ''), nullif(p_phone, ''))
  on conflict (email) do update
    set name = coalesce(public.clients.name, excluded.name),
        phone = coalesce(public.clients.phone, excluded.phone)
  returning id into cid;
  return cid;
end $$;

-- ---------------------------------------------------------------------------
-- submit_request: the single write path for website forms (service role).
-- p.form: 'order' | 'ai_intake' | 'ma_request' | 'lead'
-- p.data: the mapped columns (see supabase/functions/_shared/mapping.ts)
-- ---------------------------------------------------------------------------
create or replace function public.submit_request(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  f text := p ->> 'form';
  d jsonb := coalesce(p -> 'data', '{}'::jsonb);
  e text := lower(trim(d ->> 'email'));
  cid uuid;
  rid uuid;
  num text;
  st text;
  biz text;
  evt jsonb;
begin
  if not private.valid_email(e) then raise exception 'invalid email' using errcode = '22023'; end if;
  if coalesce(trim(d ->> 'name'), '') = '' then raise exception 'name required' using errcode = '22023'; end if;
  perform set_config('ccs.actor', 'website', true);

  if f = 'lead' then
    if coalesce((d ->> 'consent')::boolean, false) is not true then
      raise exception 'consent required' using errcode = '22023';
    end if;
    cid := private.upsert_client(e, d ->> 'name', d ->> 'phone');
    insert into public.leads (client_id, name, email, phone, business_interest, source,
                              utm_source, utm_medium, utm_campaign, consent, message)
    values (cid, d ->> 'name', e, nullif(d ->> 'phone', ''), d ->> 'business_interest',
            coalesce(nullif(d ->> 'source', ''), 'Website - lead capture'),
            d ->> 'utm_source', d ->> 'utm_medium', d ->> 'utm_campaign', true, d ->> 'message')
    returning id into rid;
    biz := d ->> 'business_interest';
    insert into public.event_outbox (event_type, payload) values ('lead.created', jsonb_build_object(
      'lead_id', rid, 'business', biz, 'tags', jsonb_build_array(private.business_tag(biz), 'website-lead'),
      'name', d ->> 'name', 'email', e, 'phone', nullif(d ->> 'phone', ''), 'message', d ->> 'message',
      'source', coalesce(nullif(d ->> 'source', ''), 'Website - lead capture'),
      'utm', jsonb_build_object('source', d ->> 'utm_source', 'medium', d ->> 'utm_medium', 'campaign', d ->> 'utm_campaign'),
      'consent', true));
    return jsonb_build_object('ok', true, 'kind', 'lead');
  end if;

  cid := private.upsert_client(e, d ->> 'name', d ->> 'phone');

  if f = 'order' then
    st := case when coalesce((d ->> 'rush')::boolean, false) then 'Pending Review' else 'New Request' end;
    insert into public.orders (client_id, name, email, phone, service, description, material, qty, size,
                               project_type, source, rush, due_date, budget_range, shipping_address,
                               details, form_fields, status)
    values (cid, d ->> 'name', e, nullif(d ->> 'phone', ''), d ->> 'service', d ->> 'description',
            d ->> 'material', (d ->> 'qty')::integer, d ->> 'size', d ->> 'project_type',
            coalesce(nullif(d ->> 'source', ''), 'Website — Build My Project'),
            coalesce((d ->> 'rush')::boolean, false), (d ->> 'due_date')::date, d ->> 'budget_range',
            d ->> 'shipping_address', d ->> 'details', coalesce(d -> 'form_fields', '{}'::jsonb), st)
    returning id, order_number into rid, num;
    biz := 'allure_fusions';
    evt := jsonb_build_object('entity_type', 'order', 'kind', 'order',
      'summary', concat_ws(' · ', d ->> 'service', d ->> 'project_type', nullif(d ->> 'qty', '')));
  elsif f = 'ai_intake' then
    st := 'New';
    insert into public.ai_intake (client_id, name, email, phone, business_challenge, desired_outcome,
                                  ai_experience, automation_opportunity, required_integrations, timeline,
                                  budget_range, engagement, form_fields)
    values (cid, d ->> 'name', e, nullif(d ->> 'phone', ''), d ->> 'business_challenge', d ->> 'desired_outcome',
            d ->> 'ai_experience', d ->> 'automation_opportunity', d ->> 'required_integrations',
            d ->> 'timeline', d ->> 'budget_range', d ->> 'engagement', coalesce(d -> 'form_fields', '{}'::jsonb))
    returning id, intake_number into rid, num;
    biz := 'ai_authoritech';
    evt := jsonb_build_object('entity_type', 'ai_intake', 'kind', 'ai_intake', 'summary', d ->> 'engagement');
  elsif f = 'ma_request' then
    st := 'New Request';
    insert into public.madam_allure_orders (client_id, kind, name, email, phone, details, needed_by,
                                            budget_range, form_fields, source, items)
    values (cid, case when d ->> 'kind' = 'memorial' then 'memorial' else 'custom' end, d ->> 'name', e,
            nullif(d ->> 'phone', ''), d ->> 'details', (d ->> 'needed_by')::date, d ->> 'budget_range',
            coalesce(d -> 'form_fields', '{}'::jsonb), 'website', '[]'::jsonb)
    returning id, order_number into rid, num;
    biz := 'madam_allure';
    evt := jsonb_build_object('entity_type', 'madam_allure_order',
      'kind', case when d ->> 'kind' = 'memorial' then 'memorial' else 'custom' end, 'summary', d ->> 'item');
  else
    raise exception 'unknown form %', f using errcode = '22023';
  end if;

  insert into public.event_outbox (event_type, payload) values ('order.created', evt || jsonb_build_object(
    'id', rid, 'number', num, 'business', biz, 'status', st,
    'tags', jsonb_build_array(private.business_tag(biz), 'website-request'),
    'name', d ->> 'name', 'email', e, 'phone', nullif(d ->> 'phone', ''),
    'source', 'website', 'wants_account', coalesce((d ->> 'wants_account')::boolean, false)));

  return jsonb_build_object('ok', true, 'kind', f, 'entity_type', evt ->> 'entity_type',
                            'id', rid, 'number', num, 'status', st);
end $$;

-- Files sent with a new website request (uploaded with signed upload URLs).
create or replace function public.register_intake_files(p jsonb) returns integer
language plpgsql security definer set search_path = public, private as $$
declare
  f jsonb;
  ent record;
  n integer := 0;
begin
  for f in select * from jsonb_array_elements(coalesce(p -> 'files', '[]'::jsonb)) loop
    select * into ent from private.entity_for_path(f ->> 'path');
    if ent.eid is null or ent.eid <> (p ->> 'id')::uuid or not private.allowed_file_name(f ->> 'path') then
      raise exception 'file path does not match the request' using errcode = '22023';
    end if;
    insert into public.files (entity_type, entity_id, path, original_name, content_type, size_bytes, uploaded_by)
    values (ent.etype, ent.eid, f ->> 'path', left(f ->> 'original_name', 255), f ->> 'content_type',
            (f ->> 'size_bytes')::bigint, 'client')
    on conflict (path) do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Files added later from My Projects or the Admin Office (already in storage).
create or replace function public.register_file(p_path text, p_name text, p_type text, p_size bigint) returns jsonb
language plpgsql security definer set search_path = public, private, storage as $$
declare
  ent record;
  fid uuid;
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode = '42501'; end if;
  if not private.can_access_path(p_path) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'order-files' and o.name = p_path) then
    raise exception 'file not uploaded' using errcode = '22023';
  end if;
  select * into ent from private.entity_for_path(p_path);
  insert into public.files (entity_type, entity_id, path, original_name, content_type, size_bytes, uploaded_by)
  values (ent.etype, ent.eid, p_path, left(p_name, 255), p_type, p_size,
          case when public.is_admin() then 'admin' else 'client' end)
  on conflict (path) do update set original_name = excluded.original_name
  returning id into fid;
  return jsonb_build_object('ok', true, 'id', fid);
end $$;

-- Unauthenticated lookup: needs the number AND the email, returns status only.
create or replace function public.lookup_status(p_number text, p_email text) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'number', v.number, 'status', v.status, 'paid', v.paid,
                              'due_date', v.due_date, 'last_status_change', v.last_status_change)
    from public.projects_v v
    where upper(v.number) = upper(trim(p_number)) and v.email = lower(trim(p_email))
    limit 1), jsonb_build_object('ok', false, 'error', 'Not found'))
$$;

-- ---------------------------------------------------------------------------
-- Payments (service role from the webhook; admins through admin_record_payment)
-- ---------------------------------------------------------------------------
create or replace function private.find_entity(p_number text, out etype text, out eid uuid)
language plpgsql stable security definer set search_path = public, private as $$
begin
  select v.entity_type, v.id into etype, eid from public.projects_v v where upper(v.number) = upper(trim(p_number));
end $$;

create or replace function public.apply_payment(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  ent record;
  amt numeric(10,2) := round((p ->> 'amount')::numeric, 2);
  k text := p ->> 'kind';
  pid uuid;
  q numeric; req numeric; paid_now numeric; dep numeric; st text;
  new_paid numeric; new_flag text; new_status text;
  em text; nm text;
begin
  if amt is null or amt <= 0 then raise exception 'amount must be positive' using errcode = '22023'; end if;
  if k not in ('deposit', 'balance', 'full', 'refund') then raise exception 'bad kind' using errcode = '22023'; end if;
  select * into ent from private.find_entity(p ->> 'number');
  if ent.eid is null then raise exception 'record % not found', p ->> 'number' using errcode = 'P0002'; end if;

  insert into public.payments (entity_type, entity_id, provider, provider_ref, kind, amount, currency, received_at, raw)
  values (ent.etype, ent.eid, p ->> 'provider', p ->> 'provider_ref', k, amt,
          coalesce(lower(p ->> 'currency'), 'usd'), coalesce((p ->> 'received_at')::timestamptz, now()), p -> 'raw')
  on conflict (provider, provider_ref) do nothing
  returning id into pid;
  if pid is null then
    return jsonb_build_object('ok', true, 'duplicate', true);   -- webhook retried; already counted
  end if;

  perform set_config('ccs.actor', coalesce(p ->> 'actor', 'payment webhook'), true);

  if ent.etype = 'order' then
    select quote, deposit_required, amount_paid, deposit, status, email, name
      into q, req, paid_now, dep, st, em, nm from public.orders where id = ent.eid for update;
  elsif ent.etype = 'ai_intake' then
    select quote, deposit_due, amount_paid, deposit, status, email, name
      into q, req, paid_now, dep, st, em, nm from public.ai_intake where id = ent.eid for update;
  else
    select amount, amount, amount_paid, 0, status, email, name
      into q, req, paid_now, dep, st, em, nm from public.madam_allure_orders where id = ent.eid for update;
  end if;

  new_paid := greatest(paid_now + case when k = 'refund' then -amt else amt end, 0);
  new_flag := case
    when k = 'refund' and new_paid = 0 then 'refunded'
    when q is not null and new_paid >= q then 'paid_in_full'
    when new_paid > 0 then 'deposit'
    else 'no' end;
  new_status := st;
  if k <> 'refund' and new_paid >= coalesce(req, 0.01) then
    if ent.etype = 'ai_intake' and st in ('New', 'Contacted', 'Discovery scheduled', 'Proposal sent') then
      new_status := 'Active';
    elsif ent.etype <> 'ai_intake' and st in ('New Request', 'Pending Review', 'Quoted') then
      new_status := 'Deposit Paid';
    end if;
  end if;

  if ent.etype = 'order' then
    update public.orders set amount_paid = new_paid, paid = new_flag, status = new_status,
      deposit = case when k = 'deposit' then deposit + amt else deposit end where id = ent.eid;
  elsif ent.etype = 'ai_intake' then
    update public.ai_intake set amount_paid = new_paid, paid = new_flag, status = new_status,
      deposit = case when k = 'deposit' then deposit + amt else deposit end where id = ent.eid;
  else
    update public.madam_allure_orders set amount_paid = new_paid, paid = new_flag, status = new_status where id = ent.eid;
  end if;

  if k <> 'refund' then
    insert into public.event_outbox (event_type, payload) values ('payment.succeeded', jsonb_build_object(
      'payment_id', pid, 'number', upper(trim(p ->> 'number')), 'entity_type', ent.etype,
      'business', case ent.etype when 'order' then 'allure_fusions' when 'ai_intake' then 'ai_authoritech' else 'madam_allure' end,
      'tags', jsonb_build_array(case ent.etype when 'order' then 'allure-fusions' when 'ai_intake' then 'ai-authoritech' else 'madam-allure' end, 'paid'),
      'provider', p ->> 'provider', 'provider_ref', p ->> 'provider_ref', 'kind', k, 'amount', amt,
      'currency', coalesce(lower(p ->> 'currency'), 'usd'), 'paid', new_flag,
      'balance', greatest(coalesce(q, 0) - new_paid, 0), 'status', new_status, 'email', em, 'name', nm));
  end if;

  return jsonb_build_object('ok', true, 'payment_id', pid, 'paid', new_flag, 'status', new_status,
                            'amount_paid', new_paid, 'balance', greatest(coalesce(q, 0) - new_paid, 0));
end $$;

-- What a signed-in client may pay now. The amount always comes from the
-- database, never from the browser.
create or replace function public.checkout_amount(p_number text, p_kind text, p_email text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare v record; due numeric;
begin
  select * into v from public.projects_v where upper(number) = upper(trim(p_number)) and email = lower(trim(p_email));
  if v.id is null or v.entity_type = 'madam_allure_order' then
    return jsonb_build_object('ok', false, 'error', 'Not found');
  end if;
  if v.quote is null or v.status in ('Cancelled', 'On Hold', 'Declined') then
    return jsonb_build_object('ok', false, 'error', 'Nothing to pay yet');
  end if;
  due := case when p_kind = 'deposit' then greatest(coalesce(v.deposit_required, v.quote) - v.amount_paid, 0)
              else v.balance end;
  if due <= 0 then return jsonb_build_object('ok', false, 'error', 'Nothing to pay'); end if;
  return jsonb_build_object('ok', true, 'number', v.number, 'entity_type', v.entity_type,
    'business', v.business, 'kind', case when p_kind = 'deposit' and due < v.balance then 'deposit'
                                         when v.amount_paid = 0 then 'full' else 'balance' end,
    'amount', due, 'title', v.title, 'email', v.email, 'payment_link', v.payment_link);
end $$;

-- ---------------------------------------------------------------------------
-- Event outbox (dispatch-events Function or a Make/Zapier pull)
-- ---------------------------------------------------------------------------
create or replace function public.claim_events(p_limit integer default 25) returns setof public.event_outbox
language sql security definer set search_path = public as $$
  update public.event_outbox set attempts = attempts + 1
  where id in (select id from public.event_outbox where delivered_at is null and attempts < 10
               order by id limit greatest(1, least(p_limit, 100)) for update skip locked)
  returning *
$$;

create or replace function public.mark_event(p_id bigint, p_ok boolean, p_error text default null) returns void
language sql security definer set search_path = public as $$
  update public.event_outbox
     set delivered_at = case when p_ok then now() else null end,
         last_error = case when p_ok then null else left(p_error, 1000) end
   where id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Signed-in client: My Projects
-- ---------------------------------------------------------------------------
create or replace function public.my_projects() returns jsonb
language sql stable security invoker set search_path = public, private as $$
  select jsonb_build_object(
    'email', private.my_email(),
    'is_admin', public.is_admin(),
    'is_member', coalesce((select c.is_member from public.clients c where c.email = private.my_email()), false),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entity_type', v.entity_type, 'id', v.id, 'number', v.number, 'business', v.business, 'kind', v.kind,
        'title', v.title, 'status', v.status, 'paid', v.paid, 'quote', v.quote, 'amount_paid', v.amount_paid,
        'balance', v.balance, 'deposit_required', v.deposit_required, 'due_date', v.due_date,
        'created_at', v.created_at, 'last_status_change', v.last_status_change,
        'can_pay', v.entity_type <> 'madam_allure_order' and v.quote is not null and v.balance > 0
                   and v.status not in ('Cancelled', 'On Hold', 'Declined'),
        'payment_link', v.payment_link,
        'events', coalesce((select jsonb_agg(jsonb_build_object('field', s.field, 'old', s.old_value,
                                   'new', s.new_value, 'at', s.created_at) order by s.created_at desc)
                            from public.status_events s
                            where s.entity_type = v.entity_type and s.entity_id = v.id and s.field in ('status', 'paid')), '[]'::jsonb),
        'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'path', f.path, 'name', f.original_name,
                                  'size', f.size_bytes, 'by', f.uploaded_by, 'at', f.created_at) order by f.created_at)
                           from public.files f where f.entity_type = v.entity_type and f.entity_id = v.id), '[]'::jsonb)
      ) order by v.created_at desc)
      from public.projects_v v where v.email = private.my_email()), '[]'::jsonb))
$$;

-- ---------------------------------------------------------------------------
-- Admin Office
-- ---------------------------------------------------------------------------
create or replace function private.require_admin() returns void
language plpgsql stable as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
end $$;
grant execute on function private.require_admin() to authenticated;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security invoker set search_path = public, private as $$
declare r jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'totals', (select jsonb_build_object(
        'new', count(*) filter (where status in ('New Request', 'New', 'Pending Review')),
        'open', count(*) filter (where status not in ('Completed', 'Cancelled', 'Declined', 'Shipped')),
        'paid_total', coalesce(sum(amount_paid), 0),
        'owed_total', coalesce(sum(balance) filter (where status not in ('Cancelled', 'Declined') and quote is not null), 0),
        'overdue', count(*) filter (where due_date < current_date and status not in ('Completed', 'Shipped', 'Cancelled', 'Ready')),
        'due_this_week', count(*) filter (where due_date between current_date and current_date + 7
                                          and status not in ('Completed', 'Shipped', 'Cancelled')))
      from public.projects_v),
    'projects', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object(
        'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'path', f.path, 'name', f.original_name,
                                  'size', f.size_bytes, 'by', f.uploaded_by, 'at', f.created_at) order by f.created_at)
                           from public.files f where f.entity_type = v.entity_type and f.entity_id = v.id), '[]'::jsonb),
        'events', coalesce((select jsonb_agg(jsonb_build_object('field', s.field, 'old', s.old_value, 'new', s.new_value,
                                   'by', s.actor, 'at', s.created_at) order by s.created_at desc)
                            from public.status_events s where s.entity_type = v.entity_type and s.entity_id = v.id), '[]'::jsonb),
        'overdue', v.due_date < current_date and v.status not in ('Completed', 'Shipped', 'Cancelled', 'Ready'),
        'is_member', coalesce((select c.is_member from public.clients c where c.email = v.email), false)
      ) order by v.created_at desc) from public.projects_v v), '[]'::jsonb),
    'leads', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc) from public.leads l), '[]'::jsonb),
    'outbox_pending', (select count(*) from public.event_outbox where delivered_at is null)
  ) into r;
  return r;
end $$;

-- Admin edits: only these fields; status, quote and dates are logged to status_events.
create or replace function public.admin_update(p_entity_type text, p_id uuid, p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path = public, private as $$
declare n integer;
begin
  perform private.require_admin();
  if p_entity_type = 'order' then
    update public.orders set
      status = coalesce(p_patch ->> 'status', status),
      quote = case when p_patch ? 'quote' then (nullif(p_patch ->> 'quote', ''))::numeric else quote end,
      due_date = case when p_patch ? 'due_date' then (nullif(p_patch ->> 'due_date', ''))::date else due_date end,
      notes = case when p_patch ? 'notes' then p_patch ->> 'notes' else notes end,
      payment_link = case when p_patch ? 'payment_link' then nullif(p_patch ->> 'payment_link', '') else payment_link end
    where id = p_id;
  elsif p_entity_type = 'ai_intake' then
    update public.ai_intake set
      status = coalesce(p_patch ->> 'status', status),
      quote = case when p_patch ? 'quote' then (nullif(p_patch ->> 'quote', ''))::numeric else quote end,
      deposit_due = case when p_patch ? 'deposit_due' then (nullif(p_patch ->> 'deposit_due', ''))::numeric else deposit_due end,
      notes = case when p_patch ? 'notes' then p_patch ->> 'notes' else notes end,
      payment_link = case when p_patch ? 'payment_link' then nullif(p_patch ->> 'payment_link', '') else payment_link end
    where id = p_id;
  elsif p_entity_type = 'madam_allure_order' then
    update public.madam_allure_orders set
      status = coalesce(p_patch ->> 'status', status),
      amount = case when p_patch ? 'quote' then (nullif(p_patch ->> 'quote', ''))::numeric else amount end,
      needed_by = case when p_patch ? 'due_date' then (nullif(p_patch ->> 'due_date', ''))::date else needed_by end,
      notes = case when p_patch ? 'notes' then p_patch ->> 'notes' else notes end
    where id = p_id;
  else
    raise exception 'unknown record type' using errcode = '22023';
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;

-- Cash, Zelle or other money received outside the online checkout.
create or replace function public.admin_record_payment(p_number text, p_kind text, p_amount numeric, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return public.apply_payment(jsonb_build_object(
    'number', p_number, 'provider', 'manual', 'provider_ref', 'manual-' || gen_random_uuid(),
    'kind', p_kind, 'amount', p_amount, 'actor', private.my_email(),
    'raw', jsonb_build_object('note', p_note, 'recorded_by', private.my_email())));
end $$;

-- Mark a client as a Skool member; GHL sends the invite from member.invited.
create or replace function public.admin_invite_member(p_email text, p_business text default 'ai_authoritech') returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare e text := lower(trim(p_email)); c record;
begin
  perform private.require_admin();
  if not private.valid_email(e) then raise exception 'invalid email' using errcode = '22023'; end if;
  if p_business not in ('madam_allure', 'allure_fusions', 'ai_authoritech') then
    raise exception 'unknown business' using errcode = '22023';
  end if;
  perform private.upsert_client(e, null, null);
  update public.clients set is_member = true where email = e returning * into c;
  insert into public.user_roles (email, role) values (e, 'member') on conflict do nothing;
  insert into public.event_outbox (event_type, payload) values ('member.invited', jsonb_build_object(
    'email', e, 'name', c.name, 'business', p_business,
    'tags', jsonb_build_array(private.business_tag(p_business), 'skool-member'),
    'invited_by', private.my_email()));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
revoke all on function public.submit_request(jsonb), public.register_intake_files(jsonb),
  public.lookup_status(text, text), public.apply_payment(jsonb), public.checkout_amount(text, text, text),
  public.claim_events(integer), public.mark_event(bigint, boolean, text),
  public.my_projects(), public.admin_overview(), public.admin_update(text, uuid, jsonb),
  public.admin_record_payment(text, text, numeric, text), public.admin_invite_member(text, text),
  public.register_file(text, text, text, bigint)
  from public, anon, authenticated;

grant execute on function public.submit_request(jsonb), public.register_intake_files(jsonb),
  public.lookup_status(text, text), public.apply_payment(jsonb), public.checkout_amount(text, text, text),
  public.claim_events(integer), public.mark_event(bigint, boolean, text) to service_role;

grant execute on function public.my_projects(), public.admin_overview(), public.admin_update(text, uuid, jsonb),
  public.admin_record_payment(text, text, numeric, text), public.admin_invite_member(text, text),
  public.register_file(text, text, text, bigint) to authenticated;

revoke all on function private.next_number(text), private.upsert_client(text, text, text),
  private.find_entity(text), private.link_auth_user(), private.log_changes(),
  private.business_tag(text) from public, anon, authenticated;
grant execute on function private.next_number(text) to authenticated, service_role;
