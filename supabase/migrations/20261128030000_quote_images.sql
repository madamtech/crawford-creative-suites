-- Quote images: mock-ups and other pictures attached to a quote before it is sent.
-- Added Nov 28 2026 (Peyton). NOT applied to the live database yet; Claude reviews and applies it
-- together with the quote-approval work (quote_draft -> quote_sent -> approved).
--
-- Flow
--   1. Admin attaches images to a quote version (private bucket "quote-images"). They are DRAFT: only admins see them.
--   2. When the quote is sent, admin_release_quote_images() marks that version as sent. From then on the
--      customer who owns the order can read exactly those images (signed URLs) and nobody else can.
--   3. A sent version is frozen: images cannot be added or removed. "Request changes" = a new version.
--
-- Storage paths:  orders/AFF-0002/<random>-<file>   ai/AIA-0001/...   madam-allure/MA-0001/...
-- (same folder convention as the order-files bucket, so private.entity_for_path() is reused).

-- ---------------------------------------------------------------------------
-- Bucket: private, 10 MB per file, images and PDF only
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-images', 'quote-images', false, 10485760, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- quote_images: one row per attached file, linked to the record and the quote version
-- ---------------------------------------------------------------------------
create table public.quote_images (
  id             uuid primary key default gen_random_uuid(),
  entity_type    text not null check (entity_type in ('order', 'ai_intake', 'madam_allure_order')),
  entity_id      uuid not null,
  quote_version  integer not null default 1 check (quote_version between 1 and 99),
  path           text not null unique check (length(path) <= 500),
  original_name  text not null check (length(original_name) between 1 and 255),
  content_type   text check (length(content_type) <= 120),
  size_bytes     bigint check (size_bytes between 1 and 10485760),   -- 10 MB
  uploaded_by    text not null default 'admin',
  created_at     timestamptz not null default now(),
  released_at    timestamptz                                          -- null = draft; set when the quote is sent
);
create index quote_images_entity_idx on public.quote_images (entity_type, entity_id, quote_version);

alter table public.quote_images enable row level security;
revoke all on public.quote_images from anon, authenticated;
grant select on public.quote_images to authenticated;      -- rows are filtered by the policy below
grant all on public.quote_images to service_role;

-- Admin sees everything; the owner sees only versions that were sent.
create policy quote_images_read on public.quote_images for select to authenticated
  using ((select public.is_admin())
         or (released_at is not null and (select private.can_see_entity(entity_type, entity_id))));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.allowed_quote_image_name(p text) returns boolean
language sql immutable as $$
  select lower(p) ~ '\.(jpe?g|png|webp|heic|heif|pdf)$' and length(p) <= 500
$$;

-- Can the signed-in customer open this storage object? Only if it belongs to a SENT quote of their own record.
create or replace function private.can_read_quote_image(p text) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.quote_images q
    where q.path = p and q.released_at is not null and private.can_see_entity(q.entity_type, q.entity_id))
$$;

revoke all on function private.allowed_quote_image_name(text), private.can_read_quote_image(text) from public, anon, authenticated;
grant execute on function private.allowed_quote_image_name(text), private.can_read_quote_image(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage policies (bucket "quote-images"). Customers can never upload or delete here.
-- ---------------------------------------------------------------------------
create policy "quote-images admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-images' and (select public.is_admin())
              and private.allowed_quote_image_name(name) and private.can_access_path(name));
create policy "quote-images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'quote-images' and (select public.is_admin()));
create policy "quote-images read" on storage.objects for select to authenticated
  using (bucket_id = 'quote-images' and ((select public.is_admin()) or private.can_read_quote_image(name)));

-- ---------------------------------------------------------------------------
-- Functions called from the Admin Office / My Projects
-- ---------------------------------------------------------------------------

-- Register a file the admin already uploaded to storage as part of quote version p_version.
create or replace function public.admin_add_quote_image(p_path text, p_name text, p_type text, p_size bigint, p_version integer default 1)
returns jsonb
language plpgsql security definer set search_path = public, private, storage as $$
declare
  ent record;
  fid uuid;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into ent from private.entity_for_path(p_path);
  if ent.eid is null then raise exception 'unknown record folder' using errcode = '22023'; end if;
  if not private.allowed_quote_image_name(p_path) then raise exception 'file type not allowed' using errcode = '22023'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'quote-images' and o.name = p_path) then
    raise exception 'file not uploaded' using errcode = '22023';
  end if;
  if exists (select 1 from public.quote_images q where q.entity_type = ent.etype and q.entity_id = ent.eid
             and q.quote_version = p_version and q.released_at is not null) then
    raise exception 'this quote version was already sent; start a new version' using errcode = '22023';
  end if;
  insert into public.quote_images (entity_type, entity_id, quote_version, path, original_name, content_type, size_bytes, uploaded_by)
  values (ent.etype, ent.eid, p_version, p_path, left(p_name, 255), p_type, p_size, private.current_actor())
  returning id into fid;
  return jsonb_build_object('ok', true, 'id', fid);
end $$;

-- Remove a DRAFT image. Returns its storage path so the browser can delete the file too.
create or replace function public.admin_remove_quote_image(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare q public.quote_images;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into q from public.quote_images where id = p_id;
  if not found then return jsonb_build_object('ok', false); end if;
  if q.released_at is not null then raise exception 'this quote version was already sent; start a new version' using errcode = '22023'; end if;
  delete from public.quote_images where id = p_id;
  return jsonb_build_object('ok', true, 'path', q.path);
end $$;

-- "Send": makes this version's images visible to the customer. The quote_sent step should call this.
create or replace function public.admin_release_quote_images(p_entity_type text, p_entity_id uuid, p_version integer)
returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.quote_images set released_at = now()
   where entity_type = p_entity_type and entity_id = p_entity_id and quote_version = p_version and released_at is null;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'released', n);
end $$;

-- Images grouped by quote version. Runs as the caller, so the policy decides: admin sees drafts and sent
-- versions; the customer sees only sent versions of their own records.
create or replace function public.quote_images_for(p_entity_type text, p_entity_id uuid) returns jsonb
language sql stable security invoker set search_path = public, private as $$
  select coalesce(jsonb_agg(v order by (v ->> 'version')::int), '[]'::jsonb) from (
    select jsonb_build_object('version', q.quote_version, 'sent', bool_and(q.released_at is not null),
             'sent_at', max(q.released_at),
             'images', jsonb_agg(jsonb_build_object('id', q.id, 'path', q.path, 'name', q.original_name,
                         'type', q.content_type, 'size', q.size_bytes, 'at', q.created_at) order by q.created_at)) as v
    from public.quote_images q
    where q.entity_type = p_entity_type and q.entity_id = p_entity_id
    group by q.quote_version) t
$$;

revoke all on function public.admin_add_quote_image(text, text, text, bigint, integer), public.admin_remove_quote_image(uuid),
  public.admin_release_quote_images(text, uuid, integer), public.quote_images_for(text, uuid) from public, anon, authenticated;
grant execute on function public.admin_add_quote_image(text, text, text, bigint, integer), public.admin_remove_quote_image(uuid),
  public.admin_release_quote_images(text, uuid, integer), public.quote_images_for(text, uuid) to authenticated;
