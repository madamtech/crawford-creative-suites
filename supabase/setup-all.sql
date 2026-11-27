-- Crawford Creative Suites: whole database setup in one paste (Supabase SQL Editor > New query > paste > Run).
-- Same as the four files in supabase/migrations, in order. Safe to run once on the empty project.

-- ===== supabase/migrations/20261127090000_core_schema.sql =====
-- Crawford Creative Suites: core schema (system of record).
-- Tables map to the Google Sheets Order Tracker (see docs/BACKEND_HANDOFF.md).
-- Run on a fresh Supabase project. Safe to read top to bottom; no data is deleted.

-- gen_random_uuid() is built into Postgres 13+; no extension needed.

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Shared value lists (kept as CHECK constraints so the tracker dropdowns match)
-- ---------------------------------------------------------------------------
-- Order status (Order Tracker "Status"):
--   New Request, Pending Review, Quoted, Deposit Paid, In Production, Ready,
--   Shipped, Completed, On Hold, Cancelled
-- Paid (Order Tracker "Paid"): no, deposit, paid_in_full, refunded
-- AI status (AI Intake "Status"):
--   New, Contacted, Discovery scheduled, Proposal sent, Active, Completed, Declined

create or replace function private.valid_email(e text) returns boolean
language sql immutable as $$
  select e is not null and e = lower(e) and length(e) <= 254
     and e ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
$$;

-- ---------------------------------------------------------------------------
-- clients: one row per person who has contacted any business
-- ---------------------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  name          text check (length(name) <= 200),
  email         text not null unique check (private.valid_email(email)),
  phone         text check (length(phone) <= 40),
  is_member     boolean not null default false,   -- Skool member (role "member")
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Roles beyond "client": admin (Admin Office) and member (Skool).
-- Managed only from the SQL editor or service role. Keyed by email so an
-- admin can be added before she first signs in.
create table public.user_roles (
  email       text not null check (private.valid_email(email)),
  role        text not null check (role in ('admin', 'member')),
  created_at  timestamptz not null default now(),
  primary key (email, role)
);

-- ---------------------------------------------------------------------------
-- leads (all businesses, light capture; written only with consent)
-- ---------------------------------------------------------------------------
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references public.clients(id) on delete set null,
  name              text not null check (length(name) between 1 and 200),
  email             text not null check (private.valid_email(email)),
  phone             text check (length(phone) <= 40),
  business_interest text not null check (business_interest in ('madam_allure', 'allure_fusions', 'ai_authoritech')),
  source            text not null default 'Website - lead capture' check (length(source) <= 120),
  utm_source        text check (length(utm_source) <= 200),
  utm_medium        text check (length(utm_medium) <= 200),
  utm_campaign      text check (length(utm_campaign) <= 200),
  consent           boolean not null check (consent),
  message           text check (length(message) <= 5000),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Numbering: AFF-#### (Fusions), AIA-#### (AI AuthoriTech), MA-#### (Madam Allure)
-- AFF starts at 0002 because AFF-0001 is the kept example row in the tracker.
-- ---------------------------------------------------------------------------
create sequence public.aff_number_seq start 2;
create sequence public.aia_number_seq start 1;
create sequence public.ma_number_seq start 1;

create or replace function private.next_number(prefix text) returns text
language plpgsql volatile security definer set search_path = public, private as $$
declare n bigint;
begin
  if prefix = 'AFF' then n := nextval('public.aff_number_seq');
  elsif prefix = 'AIA' then n := nextval('public.aia_number_seq');
  elsif prefix = 'MA' then n := nextval('public.ma_number_seq');
  else raise exception 'unknown prefix %', prefix;
  end if;
  return prefix || '-' || lpad(n::text, 4, '0');
end $$;

-- Deposit rule shown on the site: orders of $35 or less are paid in full,
-- orders over $35 need a 60% production deposit.
create or replace function private.deposit_required(quote numeric) returns numeric
language sql immutable as $$
  select case when quote is null then null
              when quote <= 35 then quote
              else round(quote * 0.60, 2) end
$$;

-- ---------------------------------------------------------------------------
-- orders: Allure Fusions (Order Tracker tab)
-- ---------------------------------------------------------------------------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique default private.next_number('AFF') check (order_number ~ '^AFF-[0-9]{4,}$'),
  client_id          uuid references public.clients(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  name               text not null check (length(name) between 1 and 200),
  email              text not null check (private.valid_email(email)),
  phone              text check (length(phone) <= 40),
  contact            text generated always as (trim(both ' ' from email || coalesce(' / ' || nullif(phone, ''), ''))) stored,
  service            text check (length(service) <= 120),
  description        text check (length(description) <= 2000),
  material           text check (length(material) <= 200),
  qty                integer check (qty is null or qty between 1 and 100000),
  size               text check (length(size) <= 200),
  project_type       text check (length(project_type) <= 200),
  source             text not null default 'Website — Build My Project' check (length(source) <= 120),
  rush               boolean not null default false,
  due_date           date,
  budget_range       text check (length(budget_range) <= 120),
  shipping_address   text check (length(shipping_address) <= 1000),
  details            text check (length(details) <= 20000),
  form_fields        jsonb not null default '{}'::jsonb,   -- every field as submitted
  quote              numeric(10,2) check (quote is null or quote >= 0),
  suggested_quote    numeric(10,2) check (suggested_quote is null or suggested_quote >= 0),
  deposit_required   numeric(10,2) generated always as (private.deposit_required(quote)) stored,
  deposit            numeric(10,2) not null default 0 check (deposit >= 0),   -- deposit received
  amount_paid        numeric(10,2) not null default 0 check (amount_paid >= 0), -- all money received, less refunds
  balance            numeric(10,2) generated always as (greatest(coalesce(quote, 0) - amount_paid, 0)) stored,
  paid               text not null default 'no' check (paid in ('no', 'deposit', 'paid_in_full', 'refunded')),
  payment_link       text check (payment_link is null or payment_link ~ '^https://'),
  status             text not null default 'New Request' check (status in (
                       'New Request', 'Pending Review', 'Quoted', 'Deposit Paid', 'In Production',
                       'Ready', 'Shipped', 'Completed', 'On Hold', 'Cancelled')),
  notes              text check (length(notes) <= 10000),
  last_status_change timestamptz not null default now()
);
create index orders_email_idx on public.orders (email);
create index orders_status_idx on public.orders (status);

-- ---------------------------------------------------------------------------
-- ai_intake: AI AuthoriTech readiness conversations (AI Intake tab)
-- ---------------------------------------------------------------------------
create table public.ai_intake (
  id                     uuid primary key default gen_random_uuid(),
  intake_number          text not null unique default private.next_number('AIA') check (intake_number ~ '^AIA-[0-9]{4,}$'),
  client_id              uuid references public.clients(id) on delete set null,
  created_at             timestamptz not null default now(),   -- Timestamp
  updated_at             timestamptz not null default now(),
  name                   text not null check (length(name) between 1 and 200),
  email                  text not null check (private.valid_email(email)),
  phone                  text check (length(phone) <= 40),
  business_challenge     text check (length(business_challenge) <= 5000),
  desired_outcome        text check (length(desired_outcome) <= 5000),
  ai_experience          text check (length(ai_experience) <= 2000),
  automation_opportunity text check (length(automation_opportunity) <= 5000),
  required_integrations  text check (length(required_integrations) <= 2000),
  timeline               text check (length(timeline) <= 200),
  budget_range           text check (length(budget_range) <= 120),
  engagement             text check (length(engagement) <= 200),
  form_fields            jsonb not null default '{}'::jsonb,
  status                 text not null default 'New' check (status in (
                           'New', 'Contacted', 'Discovery scheduled', 'Proposal sent', 'Active', 'Completed', 'Declined')),
  source                 text not null default 'Website — AI readiness conversation' check (length(source) <= 120),
  notes                  text check (length(notes) <= 10000),
  quote                  numeric(10,2) check (quote is null or quote >= 0),
  deposit                numeric(10,2) not null default 0 check (deposit >= 0),
  amount_paid            numeric(10,2) not null default 0 check (amount_paid >= 0),
  balance                numeric(10,2) generated always as (greatest(coalesce(quote, 0) - amount_paid, 0)) stored,
  paid                   text not null default 'no' check (paid in ('no', 'deposit', 'paid_in_full', 'refunded')),
  deposit_due            numeric(10,2) check (deposit_due is null or deposit_due >= 0), -- set from the written proposal
  payment_link           text check (payment_link is null or payment_link ~ '^https://'),
  last_status_change     timestamptz not null default now()
);
create index ai_intake_email_idx on public.ai_intake (email);

-- ---------------------------------------------------------------------------
-- madam_allure_orders: Ueni orders (synced by Peyton, read-only from Ueni)
-- plus custom / memorial requests sent from the website.
-- Kept apart from Fusions production rows.
-- ---------------------------------------------------------------------------
create table public.madam_allure_orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default private.next_number('MA') check (order_number ~ '^MA-[0-9]{4,}$'),
  client_id        uuid references public.clients(id) on delete set null,
  kind             text not null default 'shop' check (kind in ('shop', 'custom', 'memorial')),
  ueni_order_ref   text unique check (length(ueni_order_ref) <= 120),
  ordered_at       timestamptz not null default now(),
  name             text not null check (length(name) between 1 and 200),
  email            text not null check (private.valid_email(email)),
  phone            text check (length(phone) <= 40),
  items            jsonb not null default '[]'::jsonb,   -- [{name, qty, price}]
  details          text check (length(details) <= 20000),
  needed_by        date,
  budget_range     text check (length(budget_range) <= 120),
  form_fields      jsonb not null default '{}'::jsonb,
  amount           numeric(10,2) check (amount is null or amount >= 0),
  amount_paid      numeric(10,2) not null default 0 check (amount_paid >= 0),
  paid             text not null default 'no' check (paid in ('no', 'deposit', 'paid_in_full', 'refunded')),
  status           text not null default 'New Request' check (status in (
                     'New Request', 'Pending Review', 'Quoted', 'Deposit Paid', 'In Production',
                     'Ready', 'Shipped', 'Completed', 'On Hold', 'Cancelled')),
  source           text not null default 'ueni_email' check (source in ('ueni_email', 'ueni_api', 'website')),
  notes            text check (length(notes) <= 10000),
  raw              jsonb,          -- parsed email / API payload; never card numbers
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_status_change timestamptz not null default now()
);
create index madam_allure_orders_email_idx on public.madam_allure_orders (email);

-- ---------------------------------------------------------------------------
-- status_events: mirrors the tracker "Updates" tab
-- ---------------------------------------------------------------------------
create table public.status_events (
  id           bigint generated always as identity primary key,
  entity_type  text not null check (entity_type in ('order', 'ai_intake', 'madam_allure_order')),
  entity_id    uuid not null,
  field        text not null,
  old_value    text,
  new_value    text,
  actor        text,   -- admin email, 'website', 'payment webhook', 'sync'
  created_at   timestamptz not null default now()
);
create index status_events_entity_idx on public.status_events (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- files: one row per uploaded file (private bucket "order-files")
-- ---------------------------------------------------------------------------
create table public.files (
  id             uuid primary key default gen_random_uuid(),
  entity_type    text not null check (entity_type in ('order', 'ai_intake', 'madam_allure_order')),
  entity_id      uuid not null,
  bucket         text not null default 'order-files',
  path           text not null unique check (length(path) <= 500),
  original_name  text not null check (length(original_name) between 1 and 255),
  content_type   text check (length(content_type) <= 120),
  size_bytes     bigint check (size_bytes between 0 and 26214400),   -- 25 MB
  uploaded_by    text not null check (uploaded_by in ('client', 'admin')),
  created_at     timestamptz not null default now()
);
create index files_entity_idx on public.files (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- payments: one row per provider transaction (idempotent on provider + ref)
-- ---------------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null check (entity_type in ('order', 'ai_intake', 'madam_allure_order')),
  entity_id     uuid not null,
  provider      text not null check (provider in ('stripe', 'ghl', 'ueni', 'manual')),
  provider_ref  text not null check (length(provider_ref) between 1 and 255),
  kind          text not null check (kind in ('deposit', 'balance', 'full', 'refund')),
  amount        numeric(10,2) not null check (amount > 0),
  currency      text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  received_at   timestamptz not null default now(),
  raw           jsonb,   -- provider event, trimmed; never card numbers
  created_at    timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index payments_entity_idx on public.payments (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- event_outbox: the Skool / GHL event contract (docs/EVENT_CONTRACT.md)
-- lead.created, order.created, payment.succeeded, member.invited
-- ---------------------------------------------------------------------------
create table public.event_outbox (
  id            bigint generated always as identity primary key,
  event_type    text not null check (event_type in ('lead.created', 'order.created', 'payment.succeeded', 'member.invited')),
  payload       jsonb not null,
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz,
  attempts      integer not null default 0,
  last_error    text
);
create index event_outbox_pending_idx on public.event_outbox (id) where delivered_at is null;

-- ---------------------------------------------------------------------------
-- Triggers: updated_at, status/paid history, last_status_change
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger clients_touch before update on public.clients for each row execute function private.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function private.touch_updated_at();
create trigger ai_intake_touch before update on public.ai_intake for each row execute function private.touch_updated_at();
create trigger madam_allure_orders_touch before update on public.madam_allure_orders for each row execute function private.touch_updated_at();

-- Who made the change: the signed-in admin's email, or a label the Functions set
-- with set_config('ccs.actor', ...).
create or replace function private.current_actor() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('ccs.actor', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
                  'system')
$$;

create or replace function private.log_changes() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  etype text := case tg_table_name when 'orders' then 'order'
                                   when 'ai_intake' then 'ai_intake'
                                   else 'madam_allure_order' end;
  f text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
begin
  foreach f in array array['status', 'paid', 'quote', 'amount', 'due_date', 'needed_by'] loop
    if n ? f and (o ->> f) is distinct from (n ->> f) then
      insert into public.status_events (entity_type, entity_id, field, old_value, new_value, actor)
      values (etype, new.id, f, o ->> f, n ->> f, private.current_actor());
    end if;
  end loop;
  return null;
end $$;

create or replace function private.stamp_status_change() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.last_status_change := now();
  end if;
  return new;
end $$;

create trigger orders_log after update on public.orders for each row execute function private.log_changes();
create trigger ai_intake_log after update on public.ai_intake for each row execute function private.log_changes();
create trigger madam_allure_orders_log after update on public.madam_allure_orders for each row execute function private.log_changes();
create trigger orders_stamp before update on public.orders for each row execute function private.stamp_status_change();
create trigger ai_intake_stamp before update on public.ai_intake for each row execute function private.stamp_status_change();
create trigger madam_allure_orders_stamp before update on public.madam_allure_orders for each row execute function private.stamp_status_change();

-- Link a new sign-in to the client row with the same email (or create one).
create or replace function private.link_auth_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare e text := lower(new.email);
begin
  if e is null or not private.valid_email(e) then return new; end if;
  insert into public.clients (email, auth_user_id)
  values (e, new.id)
  on conflict (email) do update set auth_user_id = excluded.auth_user_id
    where public.clients.auth_user_id is null;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.link_auth_user();

-- ===== supabase/migrations/20261127090100_rls_and_grants.sql =====
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

-- ===== supabase/migrations/20261127090200_storage.sql =====
-- Private file storage: bucket "order-files", one folder per record.
--   orders/AFF-0002/<random>-<file name>        Allure Fusions
--   ai/AIA-0001/<random>-<file name>            AI AuthoriTech
--   madam-allure/MA-0001/<random>-<file name>   Madam Allure
-- Downloads use short-lived signed URLs. 25 MB per file. No public access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-files', 'order-files', false, 26214400, array[
  'image/jpeg', 'image/png', 'application/pdf', 'image/svg+xml',
  'application/dxf', 'image/vnd.dxf', 'image/x-dxf', 'application/x-dxf',
  'model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'model/x.stl-binary',
  'model/3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  'application/octet-stream'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Which record a storage path belongs to: ('order', uuid) etc., or null.
create or replace function private.entity_for_path(p text, out etype text, out eid uuid)
language plpgsql stable security definer set search_path = public, private as $$
declare
  top text := split_part(p, '/', 1);
  num text := split_part(p, '/', 2);
begin
  if split_part(p, '/', 3) = '' or split_part(p, '/', 4) <> '' then return; end if;
  if top = 'orders' then
    etype := 'order'; select id into eid from public.orders where order_number = num;
  elsif top = 'ai' then
    etype := 'ai_intake'; select id into eid from public.ai_intake where intake_number = num;
  elsif top = 'madam-allure' then
    etype := 'madam_allure_order'; select id into eid from public.madam_allure_orders where order_number = num;
  end if;
  if eid is null then etype := null; end if;
end $$;

create or replace function private.allowed_file_name(p text) returns boolean
language sql immutable as $$
  select lower(p) ~ '\.(jpe?g|png|pdf|svg|dxf|stl|3mf)$' and length(p) <= 500
$$;

create or replace function private.can_access_path(p text) returns boolean
language sql stable security definer set search_path = public, private as $$
  select coalesce((select private.can_see_entity(e.etype, e.eid)
                   from private.entity_for_path(p) e where e.eid is not null), false)
$$;

grant execute on function private.entity_for_path(text) to authenticated, service_role;
grant execute on function private.allowed_file_name(text) to authenticated, service_role;
grant execute on function private.can_access_path(text) to authenticated, service_role;

-- Signed-in clients may add files to their own records; admins to any.
create policy "order-files read own" on storage.objects for select to authenticated
  using (bucket_id = 'order-files' and private.can_access_path(name));
create policy "order-files upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'order-files' and private.allowed_file_name(name) and private.can_access_path(name));
create policy "order-files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'order-files' and public.is_admin());

-- ===== supabase/migrations/20261127090300_functions.sql =====
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

