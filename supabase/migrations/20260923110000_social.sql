-- Phase 8: Facebook and Instagram publishing.
--
-- Four tables: the connected accounts and their encrypted tokens, the posts an
-- admin has composed, one result row per platform per post, and a log of every
-- Graph API call.

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'instagram')),
  -- Facebook page id, or Instagram business user id.
  external_id text not null,
  name text,
  -- AES-256-GCM ciphertext. A token is never stored in plain text.
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  -- Instagram publishes through its parent page's token.
  parent_page_id text,
  is_active boolean not null default true,
  connected_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_accounts_platform_external_unique unique (platform, external_id)
);

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  template_id uuid references public.poster_templates (id) on delete set null,
  caption text,
  hashtags text[] not null default '{}',
  -- Subset of {facebook, instagram}.
  platforms text[] not null default '{}',
  -- Storage path of the rendered poster in the posters bucket.
  poster_path text,
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'publishing', 'published', 'partial', 'failed', 'cancelled')),
  attempts int not null default 0,
  last_error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_posts_platforms_not_empty check (cardinality(platforms) > 0)
);

-- One row per platform per post. The unique constraint is what stops a retry
-- from publishing twice to a platform that already succeeded.
create table public.post_results (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references public.scheduled_posts (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  status text not null default 'pending' check (status in ('pending', 'published', 'failed')),
  external_post_id text,
  permalink text,
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_results_post_platform_unique unique (scheduled_post_id, platform)
);

create table public.social_api_log (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  method text not null,
  endpoint text not null,
  status_code int,
  -- Summaries only: tokens are stripped before anything is written here.
  request_summary jsonb,
  response_summary jsonb,
  error text,
  duration_ms int,
  scheduled_post_id uuid references public.scheduled_posts (id) on delete set null,
  created_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.social_accounts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.scheduled_posts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.post_results
  for each row execute function public.set_updated_at();

create index social_accounts_platform_idx on public.social_accounts (platform);
create index scheduled_posts_status_scheduled_at_idx on public.scheduled_posts (status, scheduled_at);
create index scheduled_posts_product_id_idx on public.scheduled_posts (product_id);
create index scheduled_posts_created_by_idx on public.scheduled_posts (created_by);
create index post_results_scheduled_post_id_idx on public.post_results (scheduled_post_id);
create index social_api_log_created_at_idx on public.social_api_log (created_at desc);
create index social_api_log_scheduled_post_id_idx on public.social_api_log (scheduled_post_id);

-- Same MVP policy as every other table: authenticated does everything, anon
-- nothing. The cron worker uses the service role, which bypasses RLS.
do $$
declare
  target text;
  tables text[] := array['social_accounts', 'scheduled_posts', 'post_results', 'social_api_log'];
begin
  foreach target in array tables loop
    execute format('alter table public.%I enable row level security', target);
    execute format('drop policy if exists authenticated_all on public.%I', target);
    execute format(
      'create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)',
      target
    );
  end loop;
end;
$$;

-- Claims the posts that are due, locking them so two overlapping cron runs
-- never pick up the same row.
create or replace function public.fn_claim_due_posts(p_limit int default 10)
returns setof public.scheduled_posts
language sql
volatile
security invoker
set search_path = public
as $$
  update public.scheduled_posts
     set status = 'publishing',
         attempts = attempts + 1
   where id in (
     select id
       from public.scheduled_posts
      where status = 'queued'
        and scheduled_at is not null
        and scheduled_at <= now()
        and attempts < 3
      order by scheduled_at
        for update skip locked
      limit greatest(p_limit, 1)
   )
  returning *;
$$;

revoke all on function public.fn_claim_due_posts(int) from public, anon;
grant execute on function public.fn_claim_due_posts(int) to authenticated, service_role;
