-- RLS on every table. MVP policy: authenticated does everything, anon nothing.
-- There is no public storefront in the MVP, so nothing finer is needed.

do $$
declare
  target text;
  tables text[] := array[
    'profiles',
    'brands',
    'categories',
    'products',
    'product_images',
    'product_variants',
    'stock_movements',
    'orders',
    'order_items',
    'expenses',
    'poster_templates'
  ];
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

-- Reporting helpers stay reachable for signed in users only.
revoke all on function public.fn_profit_report(date, date) from public, anon;
grant execute on function public.fn_profit_report(date, date) to authenticated;
