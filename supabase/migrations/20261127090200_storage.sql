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
