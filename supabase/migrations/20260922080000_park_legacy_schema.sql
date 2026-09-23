-- Parks the previous Cora application's schema (Drizzle + NextAuth based) under
-- a legacy_ prefix so the MVP schema can own these table names.
--
-- Renaming rather than dropping: nothing is deleted here, so the old rows stay
-- recoverable. Verified before writing this migration that every legacy table
-- held 0 rows except public.users, which held the single seeded admin@cora.mn
-- NextAuth row. The MVP authenticates through Supabase Auth instead.
--
-- Once the MVP is confirmed working, these can be removed with a follow up
-- migration: drop table public.legacy_* cascade.

alter table if exists public.products rename to legacy_products;
alter table if exists public.categories rename to legacy_categories;
alter table if exists public.brands rename to legacy_brands;
alter table if exists public.product_images rename to legacy_product_images;
alter table if exists public.sales_log rename to legacy_sales_log;
alter table if exists public.finance_transactions rename to legacy_finance_transactions;
alter table if exists public.social_posts rename to legacy_social_posts;
alter table if exists public.users rename to legacy_users;

-- The legacy enum types (finance_type, product_image_status, sales_channel,
-- social_platform, social_post_status, user_role) do not collide with anything
-- the MVP creates, so they are left untouched.
