-- The publishing worker lives on Vercel, but Vercel's Hobby plan only allows a
-- daily cron and a scheduled post that goes out a day late is worse than one
-- that never goes out. Postgres already runs next to the data, so it does the
-- waking instead: every five minutes it calls the worker, which claims the due
-- rows with fn_claim_due_posts and publishes them.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- The worker url and the shared secret are data, not schema: they are written
-- into Vault separately so neither ends up in this file.
create or replace function public.fn_ping_publish_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
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

  perform extensions.net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function public.fn_ping_publish_worker() from public, anon, authenticated;

-- cron.schedule replaces a job of the same name, so re-running this is safe.
select cron.schedule(
  'cora-publish-due-posts',
  '*/5 * * * *',
  $$select public.fn_ping_publish_worker()$$
);
