-- Atomic order status transitions.
-- Stock is only ever moved through the ledger, and never partially: the whole
-- transition happens inside this function or not at all.

create or replace function public.fn_set_order_status(
  p_order_id uuid,
  p_status text,
  p_user_id uuid default null
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_status text;
  was_committed boolean;
  will_commit boolean;
  item record;
  available int;
begin
  if p_status not in ('pending', 'confirmed', 'delivered', 'cancelled', 'returned') then
    raise exception 'Тодорхойгүй төлөв: %', p_status;
  end if;

  select status into current_status
    from public.orders
   where id = p_order_id
     for update;

  if current_status is null then
    raise exception 'Захиалга олдсонгүй';
  end if;

  if current_status = p_status then
    return current_status;
  end if;

  -- These two states mean the goods have left the shelf.
  was_committed := current_status in ('confirmed', 'delivered');
  will_commit := p_status in ('confirmed', 'delivered');

  if will_commit and not was_committed then
    for item in
      select i.variant_id, i.qty, i.unit_cost, i.product_name_snapshot, i.variant_label_snapshot
        from public.order_items i
       where i.order_id = p_order_id
    loop
      select coalesce(sum(m.qty), 0) into available
        from public.stock_movements m
       where m.variant_id = item.variant_id;

      if available < item.qty then
        raise exception 'Нөөц хүрэхгүй байна: % % (үлдэгдэл %, шаардлагатай %)',
          item.product_name_snapshot,
          coalesce(item.variant_label_snapshot, ''),
          available,
          item.qty;
      end if;
    end loop;

    insert into public.stock_movements (variant_id, qty, reason, unit_cost, reference_id, note, created_by)
    select i.variant_id, -i.qty, 'sale', i.unit_cost, p_order_id, 'Захиалга баталгаажсан', p_user_id
      from public.order_items i
     where i.order_id = p_order_id;

  elsif was_committed and not will_commit then
    insert into public.stock_movements (variant_id, qty, reason, unit_cost, reference_id, note, created_by)
    select i.variant_id, i.qty, 'return', i.unit_cost, p_order_id,
           case when p_status = 'returned' then 'Буцаалт' else 'Захиалга цуцлагдсан' end,
           p_user_id
      from public.order_items i
     where i.order_id = p_order_id;
  end if;

  update public.orders
     set status = p_status,
         payment_status = case
           when p_status = 'delivered' then 'paid'
           when p_status in ('cancelled', 'returned') then 'unpaid'
           else payment_status
         end
   where id = p_order_id;

  return p_status;
end;
$$;

revoke all on function public.fn_set_order_status(uuid, text, uuid) from public, anon;
grant execute on function public.fn_set_order_status(uuid, text, uuid) to authenticated;
