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
