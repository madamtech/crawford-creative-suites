-- Row Level Security: the real protection for a static site.
-- Clients read only their own rows (matched on the signed-in email).
-- Admins read and write everything. Nobody writes from the browser except
-- through the RPC functions below or the Edge Functions (service role).

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.user_roles r
    where r.role = 'admin'
      and r.email = lower(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', ''))
  )
$$;

create or replace function private.my_email() returns text
language sql stable as $$
  select lower(nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', ''))
$$;

alter table public.clients enable row level security;
alter table public.user_roles enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.ai_intake enable row level security;
alter table public.madam_allure_orders enable row level security;
alter table public.status_events enable row level security;
alter table public.files enable row level security;
alter table public.payments enable row level security;
alter table public.event_outbox enable row level security;

-- Start from nothing, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.my_email() to authenticated, service_role;
grant execute on function private.valid_email(text) to authenticated, service_role;
grant execute on function private.deposit_required(numeric) to authenticated, service_role;
grant execute on function private.current_actor() to authenticated, service_role;

grant select on public.clients, public.orders, public.ai_intake, public.madam_allure_orders,
                public.status_events, public.files, public.payments to authenticated;
grant select on public.leads, public.user_roles, public.event_outbox to authenticated;  -- admin only, via RLS
grant update (status, quote, suggested_quote, due_date, notes, payment_link, material, qty, size, service, project_type, description)
  on public.orders to authenticated;
grant update (status, quote, deposit_due, notes, payment_link) on public.ai_intake to authenticated;
grant update (status, amount, notes, needed_by) on public.madam_allure_orders to authenticated;
grant update (is_member, name, phone) on public.clients to authenticated;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- clients
create policy clients_self_read on public.clients for select to authenticated
  using (email = private.my_email() or public.is_admin());
create policy clients_admin_update on public.clients for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- user_roles, leads, event_outbox: admin only
create policy user_roles_admin_read on public.user_roles for select to authenticated using (public.is_admin() or email = private.my_email());
create policy leads_admin_read on public.leads for select to authenticated using (public.is_admin());
create policy outbox_admin_read on public.event_outbox for select to authenticated using (public.is_admin());

-- orders, ai_intake, madam_allure_orders: own rows or admin; only admin updates
create policy orders_read on public.orders for select to authenticated
  using (email = private.my_email() or public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy ai_intake_read on public.ai_intake for select to authenticated
  using (email = private.my_email() or public.is_admin());
create policy ai_intake_admin_update on public.ai_intake for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy ma_orders_read on public.madam_allure_orders for select to authenticated
  using (email = private.my_email() or public.is_admin());
create policy ma_orders_admin_update on public.madam_allure_orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Child rows follow their parent record.
create or replace function private.can_see_entity(etype text, eid uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select public.is_admin() or case etype
    when 'order' then exists (select 1 from public.orders o where o.id = eid and o.email = private.my_email())
    when 'ai_intake' then exists (select 1 from public.ai_intake a where a.id = eid and a.email = private.my_email())
    when 'madam_allure_order' then exists (select 1 from public.madam_allure_orders m where m.id = eid and m.email = private.my_email())
    else false end
$$;
grant execute on function private.can_see_entity(text, uuid) to authenticated, service_role;

create policy status_events_read on public.status_events for select to authenticated
  using (private.can_see_entity(entity_type, entity_id));
create policy files_read on public.files for select to authenticated
  using (private.can_see_entity(entity_type, entity_id));
create policy payments_read on public.payments for select to authenticated
  using (private.can_see_entity(entity_type, entity_id));

-- New functions and tables get no automatic access from the browser.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
