-- Reporting views and the profit report function.
-- All aggregation happens in SQL, never in JS.

-- Current stock is always the sum of the ledger, never a stored column.
create or replace view public.v_variant_stock
with (security_invoker = on) as
select
  v.id as variant_id,
  v.product_id,
  coalesce(sum(m.qty), 0)::int as current_stock
from public.product_variants v
left join public.stock_movements m on m.variant_id = v.id
group by v.id, v.product_id;

-- Per order revenue and profit. Delivery fee is not revenue.
create or replace view public.v_order_profit
with (security_invoker = on) as
select
  o.id as order_id,
  coalesce(sum(i.qty * i.unit_price), 0) - o.discount_amount as revenue,
  coalesce(sum(i.qty * i.unit_cost), 0) as cost,
  coalesce(sum(i.qty * (i.unit_price - i.unit_cost)), 0) - o.discount_amount as gross_profit,
  case
    when coalesce(sum(i.qty * i.unit_price), 0) - o.discount_amount = 0 then 0
    else round(
      (coalesce(sum(i.qty * (i.unit_price - i.unit_cost)), 0) - o.discount_amount)
      / (coalesce(sum(i.qty * i.unit_price), 0) - o.discount_amount) * 100,
      2
    )
  end as margin_pct
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id, o.discount_amount;

-- Units sold, revenue and profit per product. Only settled orders count.
create or replace view public.v_top_products
with (security_invoker = on) as
select
  p.id as product_id,
  p.name as product_name,
  coalesce(sum(i.qty) filter (where o.status in ('confirmed', 'delivered')), 0)::bigint as units_sold,
  coalesce(sum(i.qty * i.unit_price) filter (where o.status in ('confirmed', 'delivered')), 0) as revenue,
  coalesce(sum(i.qty * i.unit_cost) filter (where o.status in ('confirmed', 'delivered')), 0) as cost,
  coalesce(
    sum(i.qty * (i.unit_price - i.unit_cost)) filter (where o.status in ('confirmed', 'delivered')),
    0
  ) as gross_profit
from public.products p
left join public.product_variants v on v.product_id = p.id and v.deleted_at is null
left join public.order_items i on i.variant_id = v.id
left join public.orders o on o.id = i.order_id
where p.deleted_at is null
group by p.id, p.name;

-- Profit report for a date range. Returned orders subtract, cancelled are ignored.
create or replace function public.fn_profit_report(p_from date, p_to date)
returns table (
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
  with scoped_orders as (
    select
      o.id,
      o.discount_amount,
      case when o.status = 'returned' then -1 else 1 end as sign
    from public.orders o
    where o.status in ('confirmed', 'delivered', 'returned')
      and (o.ordered_at at time zone 'Asia/Ulaanbaatar')::date between p_from and p_to
  ),
  item_totals as (
    select
      coalesce(sum(s.sign * i.qty * i.unit_price), 0) as gross_revenue,
      coalesce(sum(s.sign * i.qty * i.unit_cost), 0) as cogs,
      coalesce(sum(s.sign * i.qty), 0)::bigint as unit_count
    from scoped_orders s
    join public.order_items i on i.order_id = s.id
  ),
  order_totals as (
    select
      coalesce(sum(s.sign * s.discount_amount), 0) as discount,
      count(*)::bigint as order_count
    from scoped_orders s
  ),
  expense_totals as (
    select coalesce(sum(e.amount), 0) as expenses
    from public.expenses e
    where e.expense_date between p_from and p_to
  )
  select
    (it.gross_revenue - ot.discount) as revenue,
    it.cogs,
    (it.gross_revenue - ot.discount - it.cogs) as gross_profit,
    et.expenses,
    (it.gross_revenue - ot.discount - it.cogs - et.expenses) as net_profit,
    ot.order_count,
    it.unit_count
  from item_totals it, order_totals ot, expense_totals et;
$$;
