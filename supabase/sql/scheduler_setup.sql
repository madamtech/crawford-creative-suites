-- Live-only scheduler setup (pg_cron + pg_net + Vault). Applied on project aclfvmsuhadvhjhpbiae
-- by Peyton, Nov 28, 2026. Not in migrations/ because the local PGlite tests have no pg_cron,
-- pg_net or Vault. Contains no secret values: the cron secret is generated inside the database.
-- The test-mode recipient (Vault: wave_test_email) is added separately and never written to files.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'ccs_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ccs_cron_secret',
      'x-ccs-cron-secret header: pg_cron / triggers -> Edge Functions (wave-invoice, wave-poll, dispatch-events)');
  end if;
  if not exists (select 1 from vault.secrets where name = 'ccs_functions_url') then
    perform vault.create_secret('https://aclfvmsuhadvhjhpbiae.supabase.co/functions/v1', 'ccs_functions_url', 'Edge Functions base URL');
  end if;
  if not exists (select 1 from vault.secrets where name = 'wave_test_mode') then
    perform vault.create_secret('true', 'wave_test_mode', 'true = every Wave invoice and notification goes only to wave_test_email');
  end if;
end $$;

-- POST to one of our Edge Functions with the Vault cron secret (async; returns the pg_net request id).
create or replace function private.call_function(p_name text, p_body jsonb default '{}'::jsonb) returns bigint
language plpgsql security definer set search_path = public, private as $$
declare u text := private.vault_secret('ccs_functions_url'); s text := private.vault_secret('ccs_cron_secret'); rid bigint;
begin
  if u is null or s is null then raise exception 'Vault ccs_functions_url / ccs_cron_secret missing'; end if;
  select net.http_post(url := u || '/' || p_name, body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ccs-cron-secret', s),
    timeout_milliseconds := 60000) into rid;
  return rid;
end $$;
revoke all on function private.call_function(text, jsonb) from public, anon, authenticated;

-- Notifications: every 10 minutes. Created PAUSED: no event goes out until Tanika says go:
--   select cron.alter_job((select jobid from cron.job where jobname = 'ccs-dispatch-events'), active := true);
select cron.schedule('ccs-dispatch-events', '*/10 * * * *', $c$select private.call_function('dispatch-events')$c$);
select cron.alter_job((select jobid from cron.job where jobname = 'ccs-dispatch-events'), active := false);

-- Wave payments: poll open invoices every 15 minutes (Starter plan has no webhooks).
select cron.schedule('ccs-wave-poll', '*/15 * * * *', $c$select private.call_function('wave-poll')$c$);

-- Wave invoices: safety sweep for approved quotes the trigger missed (offset from the poll).
select cron.schedule('ccs-wave-invoice-sweep', '7,22,37,52 * * * *', $c$select private.call_function('wave-invoice', '{"sweep": true}'::jsonb)$c$);
