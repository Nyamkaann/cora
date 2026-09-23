-- Reporting aggregation. All grouping happens here in SQL, never in JS.
--
-- Shared rules, identical in every function below:
--   * only 'confirmed', 'delivered' and 'returned' orders count; 'cancelled'
--     and 'pending' never do
--   * 'returned' contributes with a negative sign
--   * COGS always comes from order_items.unit_cost, the snapshot taken when the
--     order was saved, never from the current variant cost
--   * dates are bucketed by the Ulaanbaatar calendar day
--   * expenses land in the period of their expense_date

create or replace function public.fn_sales_series(
  p_from date,
  p_to date,
  p_bucket text default 'day'
)
returns table (
  bucket date,
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  order_count bigint,
  unit_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'Тодорхойгүй бүлэглэлт: %', p_bucket;
  end if;

  return query
  with scoped as (
    select
      o.id,
      o.discount_amount,
      case when o.status = 'returned' then -1 else 1 end as sign,
      date_trunc(p_bucket, (o.ordered_at at time zone 'Asia/Ulaanbaatar'))::date as bucket
    from public.orders o
    where o.status in ('confirmed', 'delivered', 'returned')
      and (o.ordered_at at time zone 'Asia/Ulaanbaatar')::date between p_from and p_to
  ),
  item_agg as (
    select
      s.bucket,
      coalesce(sum(s.sign * i.qty * i.unit_price), 0) as gross_revenue,
      coalesce(sum(s.sign * i.qty * i.unit_cost), 0) as cogs,
      coalesce(sum(s.sign * i.qty), 0)::bigint as unit_count
    from scoped s
    join public.order_items i on i.order_id = s.id
    group by s.bucket
  ),
  order_agg as (
    select
      s.bucket,
      coalesce(sum(s.sign * s.discount_amount), 0) as discount,
      count(*)::bigint as order_count
    from scoped s
    group by s.bucket
  )
  select
    coalesce(ia.bucket, oa.bucket) as bucket,
    coalesce(ia.gross_revenue, 0) - coalesce(oa.discount, 0) as revenue,
    coalesce(ia.cogs, 0) as cogs,
    coalesce(ia.gross_revenue, 0) - coalesce(oa.discount, 0) - coalesce(ia.cogs, 0) as gross_profit,
    coalesce(oa.order_count, 0) as order_count,
    coalesce(ia.unit_count, 0) as unit_count
  from item_agg ia
  full join order_agg oa on oa.bucket = ia.bucket
  order by 1;
end;
$$;

create or replace function public.fn_sales_by_channel(p_from date, p_to date)
returns table (
  channel text,
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  order_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select
      o.id,
      o.channel,
      o.discount_amount,
      case when o.status = 'returned' then -1 else 1 end as sign
    from public.orders o
    where o.status in ('confirmed', 'delivered', 'returned')
      and (o.ordered_at at time zone 'Asia/Ulaanbaatar')::date between p_from and p_to
  ),
  item_agg as (
    select
      s.channel,
      coalesce(sum(s.sign * i.qty * i.unit_price), 0) as gross_revenue,
      coalesce(sum(s.sign * i.qty * i.unit_cost), 0) as cogs
    from scoped s
    join public.order_items i on i.order_id = s.id
    group by s.channel
  ),
  order_agg as (
    select
      s.channel,
      coalesce(sum(s.sign * s.discount_amount), 0) as discount,
      count(*)::bigint as order_count
    from scoped s
    group by s.channel
  )
  select
    coalesce(ia.channel, oa.channel) as channel,
    coalesce(ia.gross_revenue, 0) - coalesce(oa.discount, 0) as revenue,
    coalesce(ia.cogs, 0) as cogs,
    coalesce(ia.gross_revenue, 0) - coalesce(oa.discount, 0) - coalesce(ia.cogs, 0) as gross_profit,
    coalesce(oa.order_count, 0) as order_count
  from item_agg ia
  full join order_agg oa on oa.channel = ia.channel
  order by 2 desc;
$$;

-- Product and variant level revenue is gross of the order level discount:
-- a discount belongs to an order, not to one line.
create or replace function public.fn_top_products(p_from date, p_to date, p_limit int default 10)
returns table (
  product_id uuid,
  product_name text,
  units_sold bigint,
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  margin_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select
      i.variant_id,
      i.product_name_snapshot,
      case when o.status = 'returned' then -1 else 1 end * i.qty as qty,
      i.unit_price,
      i.unit_cost
    from public.orders o
    join public.order_items i on i.order_id = o.id
    where o.status in ('confirmed', 'delivered', 'returned')
      and (o.ordered_at at time zone 'Asia/Ulaanbaatar')::date between p_from and p_to
  ),
  per_product as (
    select
      v.product_id,
      min(s.product_name_snapshot) as product_name,
      coalesce(sum(s.qty), 0)::bigint as units_sold,
      coalesce(sum(s.qty * s.unit_price), 0) as revenue,
      coalesce(sum(s.qty * s.unit_cost), 0) as cogs
    from scoped s
    join public.product_variants v on v.id = s.variant_id
    group by v.product_id
  )
  select
    p.product_id,
    p.product_name,
    p.units_sold,
    p.revenue,
    p.cogs,
    p.revenue - p.cogs as gross_profit,
    case when p.revenue = 0 then 0 else round((p.revenue - p.cogs) / p.revenue * 100, 2) end as margin_pct
  from per_product p
  order by (p.revenue - p.cogs) desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.fn_variant_report(p_from date, p_to date)
returns table (
  variant_id uuid,
  product_name text,
  variant_label text,
  sku text,
  units_sold bigint,
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  margin_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select
      i.variant_id,
      i.product_name_snapshot,
      i.variant_label_snapshot,
      case when o.status = 'returned' then -1 else 1 end * i.qty as qty,
      i.unit_price,
      i.unit_cost
    from public.orders o
    join public.order_items i on i.order_id = o.id
    where o.status in ('confirmed', 'delivered', 'returned')
      and (o.ordered_at at time zone 'Asia/Ulaanbaatar')::date between p_from and p_to
  ),
  per_variant as (
    select
      s.variant_id,
      min(s.product_name_snapshot) as product_name,
      min(coalesce(s.variant_label_snapshot, '')) as variant_label,
      coalesce(sum(s.qty), 0)::bigint as units_sold,
      coalesce(sum(s.qty * s.unit_price), 0) as revenue,
      coalesce(sum(s.qty * s.unit_cost), 0) as cogs
    from scoped s
    group by s.variant_id
  )
  select
    pv.variant_id,
    pv.product_name,
    pv.variant_label,
    v.sku,
    pv.units_sold,
    pv.revenue,
    pv.cogs,
    pv.revenue - pv.cogs as gross_profit,
    case when pv.revenue = 0 then 0 else round((pv.revenue - pv.cogs) / pv.revenue * 100, 2) end as margin_pct
  from per_variant pv
  left join public.product_variants v on v.id = pv.variant_id
  order by (pv.revenue - pv.cogs) desc;
$$;

create or replace function public.fn_expenses_by_category(p_from date, p_to date)
returns table (category text, total numeric, entry_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.category,
    coalesce(sum(e.amount), 0) as total,
    count(*)::bigint as entry_count
  from public.expenses e
  where e.expense_date between p_from and p_to
  group by e.category
  order by 2 desc;
$$;

-- Month by month profit and loss, one row per calendar month in the range.
create or replace function public.fn_profit_by_month(p_from date, p_to date)
returns table (
  month date,
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  expenses numeric,
  net_profit numeric,
  order_count bigint,
  unit_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with months as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as month
  ),
  sales as (
    select * from public.fn_sales_series(p_from, p_to, 'month')
  ),
  spend as (
    select
      date_trunc('month', e.expense_date)::date as month,
      coalesce(sum(e.amount), 0) as expenses
    from public.expenses e
    where e.expense_date between p_from and p_to
    group by 1
  )
  select
    m.month,
    coalesce(s.revenue, 0) as revenue,
    coalesce(s.cogs, 0) as cogs,
    coalesce(s.gross_profit, 0) as gross_profit,
    coalesce(x.expenses, 0) as expenses,
    coalesce(s.gross_profit, 0) - coalesce(x.expenses, 0) as net_profit,
    coalesce(s.order_count, 0) as order_count,
    coalesce(s.unit_count, 0) as unit_count
  from months m
  left join sales s on s.bucket = m.month
  left join spend x on x.month = m.month
  order by m.month;
$$;

create or replace function public.fn_expenses_by_category_month(p_from date, p_to date)
returns table (month date, category text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    date_trunc('month', e.expense_date)::date as month,
    e.category,
    coalesce(sum(e.amount), 0) as total
  from public.expenses e
  where e.expense_date between p_from and p_to
  group by 1, 2
  order by 1, 3 desc;
$$;

-- Variants that need restocking.
create or replace function public.fn_low_stock(p_threshold int default 5)
returns table (
  variant_id uuid,
  product_name text,
  variant_label text,
  sku text,
  current_stock int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    v.id as variant_id,
    p.name as product_name,
    coalesce((select string_agg(value, ' / ' order by key) from jsonb_each_text(v.attributes)), '') as variant_label,
    v.sku,
    s.current_stock
  from public.product_variants v
  join public.products p on p.id = v.product_id
  join public.v_variant_stock s on s.variant_id = v.id
  where v.deleted_at is null
    and p.deleted_at is null
    and v.is_active
    and s.current_stock < p_threshold
  order by s.current_stock asc, p.name asc;
$$;

revoke all on function public.fn_sales_series(date, date, text) from public, anon;
revoke all on function public.fn_sales_by_channel(date, date) from public, anon;
revoke all on function public.fn_top_products(date, date, int) from public, anon;
revoke all on function public.fn_variant_report(date, date) from public, anon;
revoke all on function public.fn_expenses_by_category(date, date) from public, anon;
revoke all on function public.fn_profit_by_month(date, date) from public, anon;
revoke all on function public.fn_expenses_by_category_month(date, date) from public, anon;
revoke all on function public.fn_low_stock(int) from public, anon;

grant execute on function public.fn_sales_series(date, date, text) to authenticated;
grant execute on function public.fn_sales_by_channel(date, date) to authenticated;
grant execute on function public.fn_top_products(date, date, int) to authenticated;
grant execute on function public.fn_variant_report(date, date) to authenticated;
grant execute on function public.fn_expenses_by_category(date, date) to authenticated;
grant execute on function public.fn_profit_by_month(date, date) to authenticated;
grant execute on function public.fn_expenses_by_category_month(date, date) to authenticated;
grant execute on function public.fn_low_stock(int) to authenticated;
