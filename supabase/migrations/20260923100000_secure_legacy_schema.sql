-- The previous application connected to Postgres directly and never enabled
-- row level security, so its tables were reachable through PostgREST with the
-- public anon key. legacy_users in particular exposed email, password_hash and
-- role to anyone holding that key.
--
-- Enable RLS with no policies at all: anon and authenticated get nothing, while
-- service_role still bypasses RLS for any cleanup that is needed later.

alter table if exists public.legacy_products enable row level security;
alter table if exists public.legacy_categories enable row level security;
alter table if exists public.legacy_brands enable row level security;
alter table if exists public.legacy_product_images enable row level security;
alter table if exists public.legacy_sales_log enable row level security;
alter table if exists public.legacy_finance_transactions enable row level security;
alter table if exists public.legacy_social_posts enable row level security;
alter table if exists public.legacy_users enable row level security;
