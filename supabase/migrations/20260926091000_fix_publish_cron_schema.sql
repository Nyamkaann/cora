-- pg_net puts its functions in a schema it names itself, `net`, whatever schema
-- the extension was created with. The previous version called
-- extensions.net.http_get, which does not resolve, so the worker was never
-- pinged.

create or replace function public.fn_ping_publish_worker()
returns void
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'publish_worker_url';

  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'publish_worker_secret';

  -- Nothing configured yet: stay quiet rather than erroring every five minutes.
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function public.fn_ping_publish_worker() from public, anon, authenticated;
