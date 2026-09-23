-- Demo data so the S4 dashboard is never empty.
-- Safe to re-run after `supabase db reset`.

insert into public.brands (id, name, slug, logo_url) values
  ('11111111-1111-4111-8111-111111111111', 'Cora', 'cora', null)
on conflict (slug) do nothing;

insert into public.categories (id, name, slug, sort_order) values
  ('22222222-2222-4222-8222-000000000001', 'Хувцас', 'huvtsas', 1),
  ('22222222-2222-4222-8222-000000000002', 'Гоо сайхан', 'goo-saihan', 2),
  ('22222222-2222-4222-8222-000000000003', 'Гэр ахуй', 'ger-ahui', 3),
  ('22222222-2222-4222-8222-000000000004', 'Аксессуар', 'aksessuar', 4)
on conflict (slug) do nothing;

insert into public.products (id, brand_id, category_id, name, slug, description, option_types, status, is_featured) values
  ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001',
   'Оверсайз хүрэм', 'oversize-hurem', 'Намрын нимгэн хөвөнтэй хүрэм.', '{Size}', 'active', true),
  ('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001',
   'Кашемир цамц', 'kashemir-tsamts', 'Монгол кашемираар нэхсэн цамц.', '{Size}', 'active', true),
  ('33333333-3333-4333-8333-000000000003', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000002',
   'Сарнайн усан тос', 'sarnain-usan-tos', 'Арьс тэжээх сарнайн тос.', '{Volume}', 'active', false),
  ('33333333-3333-4333-8333-000000000004', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000003',
   'Гар угаах шингэн саван', 'shingen-savan', 'Байгалийн гаралтай шингэн саван.', '{Volume}', 'active', false),
  ('33333333-3333-4333-8333-000000000005', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000004',
   'Арьсан гар цүнх', 'arsan-gar-tsunh', 'Гар аргаар оёсон арьсан цүнх.', '{}', 'active', true),
  ('33333333-3333-4333-8333-000000000006', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000004',
   'Торгон ороолт', 'torgon-oroolt', 'Хээтэй торгон ороолт.', '{}', 'active', false)
on conflict (slug) do nothing;

insert into public.product_variants (id, product_id, sku, attributes, cost_price, sale_price, sort_order) values
  -- Оверсайз хүрэм / Size
  ('44444444-4444-4444-8444-000000000101', '33333333-3333-4333-8333-000000000001', 'CORA-OVERSIZE-HUREM-M',  '{"Size":"M"}',      68000, 135000, 1),
  ('44444444-4444-4444-8444-000000000102', '33333333-3333-4333-8333-000000000001', 'CORA-OVERSIZE-HUREM-L',  '{"Size":"L"}',      68000, 135000, 2),
  ('44444444-4444-4444-8444-000000000103', '33333333-3333-4333-8333-000000000001', 'CORA-OVERSIZE-HUREM-XL', '{"Size":"XL"}',     72000, 145000, 3),
  -- Кашемир цамц / Size
  ('44444444-4444-4444-8444-000000000201', '33333333-3333-4333-8333-000000000002', 'CORA-KASHEMIR-TSAMTS-M',  '{"Size":"M"}',     80000, 150000, 1),
  ('44444444-4444-4444-8444-000000000202', '33333333-3333-4333-8333-000000000002', 'CORA-KASHEMIR-TSAMTS-L',  '{"Size":"L"}',     80000, 150000, 2),
  ('44444444-4444-4444-8444-000000000203', '33333333-3333-4333-8333-000000000002', 'CORA-KASHEMIR-TSAMTS-XL', '{"Size":"XL"}',    84000, 158000, 3),
  -- Сарнайн усан тос / Volume
  ('44444444-4444-4444-8444-000000000301', '33333333-3333-4333-8333-000000000003', 'CORA-SARNAIN-TOS-100ML', '{"Volume":"100ml"}', 25000, 49000, 1),
  ('44444444-4444-4444-8444-000000000302', '33333333-3333-4333-8333-000000000003', 'CORA-SARNAIN-TOS-300ML', '{"Volume":"300ml"}', 42000, 79000, 2),
  ('44444444-4444-4444-8444-000000000303', '33333333-3333-4333-8333-000000000003', 'CORA-SARNAIN-TOS-500ML', '{"Volume":"500ml"}', 58000, 105000, 3),
  -- Шингэн саван / Volume
  ('44444444-4444-4444-8444-000000000401', '33333333-3333-4333-8333-000000000004', 'CORA-SHINGEN-SAVAN-100ML', '{"Volume":"100ml"}', 26000, 45000, 1),
  ('44444444-4444-4444-8444-000000000402', '33333333-3333-4333-8333-000000000004', 'CORA-SHINGEN-SAVAN-300ML', '{"Volume":"300ml"}', 38000, 72000, 2),
  ('44444444-4444-4444-8444-000000000403', '33333333-3333-4333-8333-000000000004', 'CORA-SHINGEN-SAVAN-500ML', '{"Volume":"500ml"}', 52000, 96000, 3),
  -- Variant-гүй бараа
  ('44444444-4444-4444-8444-000000000501', '33333333-3333-4333-8333-000000000005', 'CORA-ARSAN-GAR-TSUNH', '{}', 75000, 148000, 1),
  ('44444444-4444-4444-8444-000000000601', '33333333-3333-4333-8333-000000000006', 'CORA-TORGON-OROOLT',   '{}', 29000, 58000, 1)
on conflict (sku) do nothing;

-- Opening stock through the ledger, never a direct update.
insert into public.stock_movements (variant_id, qty, reason, unit_cost, note)
select v.id, 40, 'stock_in', v.cost_price, 'Эхний үлдэгдэл'
from public.product_variants v
where not exists (
  select 1 from public.stock_movements m where m.variant_id = v.id and m.reason = 'stock_in'
);

-- 18 orders spread over the last 60 days, plus their sale movements.
do $$
declare
  i int;
  j int;
  line_count int;
  new_order_id uuid;
  order_status text;
  order_channel text;
  ordered timestamptz;
  picked record;
  line_qty int;
begin
  if exists (select 1 from public.orders) then
    return;
  end if;

  for i in 1..18 loop
    ordered := now() - ((i * 3 + (i % 4)) || ' days')::interval;
    order_status := (array['delivered', 'delivered', 'confirmed', 'delivered', 'cancelled', 'confirmed'])[1 + (i % 6)];
    order_channel := (array['facebook', 'instagram', 'offline', 'other'])[1 + (i % 4)];

    insert into public.orders (
      channel, customer_name, customer_phone, delivery_address,
      delivery_fee, discount_amount, status, payment_status, ordered_at, note
    ) values (
      order_channel,
      'Харилцагч ' || i,
      '99' || lpad((100000 + i * 137)::text, 6, '0'),
      'Улаанбаатар, ' || (1 + (i % 12)) || '-р хороо',
      5000,
      case when i % 5 = 0 then 10000 else 0 end,
      order_status,
      case when order_status = 'delivered' then 'paid' else 'unpaid' end,
      ordered,
      null
    )
    returning id into new_order_id;

    line_count := 1 + (i % 3);

    for j in 1..line_count loop
      select
        v.id,
        v.sale_price,
        v.cost_price,
        p.name as product_name,
        coalesce(
          (select string_agg(value, ' / ' order by key) from jsonb_each_text(v.attributes)),
          ''
        ) as variant_label
      into picked
      from public.product_variants v
      join public.products p on p.id = v.product_id
      order by md5(v.id::text || i::text || j::text)
      limit 1;

      line_qty := 1 + ((i + j) % 3);

      insert into public.order_items (
        order_id, variant_id, qty, unit_price, unit_cost,
        product_name_snapshot, variant_label_snapshot
      ) values (
        new_order_id, picked.id, line_qty, picked.sale_price, picked.cost_price,
        picked.product_name, nullif(picked.variant_label, '')
      );

      if order_status in ('confirmed', 'delivered') then
        insert into public.stock_movements (variant_id, qty, reason, unit_cost, reference_id, note, created_at)
        values (picked.id, -line_qty, 'sale', picked.cost_price, new_order_id, 'Борлуулалт', ordered);
      end if;
    end loop;
  end loop;
end;
$$;

-- Operating expenses over the same window.
insert into public.expenses (category, amount, expense_date, description)
select * from (values
  ('Зар сурталчилгаа', 350000::numeric, (current_date - 55), 'Facebook зар'),
  ('Түрээс',           800000::numeric, (current_date - 50), 'Дэлгүүрийн түрээс'),
  ('Тээвэр',           180000::numeric, (current_date - 42), 'Ачаа тээвэр'),
  ('Зар сурталчилгаа', 420000::numeric, (current_date - 33), 'Instagram зар'),
  ('Цалин',           1200000::numeric, (current_date - 30), 'Сарын цалин'),
  ('Бусад',            120000::numeric, (current_date - 21), 'Сав баглаа боодол'),
  ('Түрээс',           800000::numeric, (current_date - 15), 'Дэлгүүрийн түрээс'),
  ('Зар сурталчилгаа', 260000::numeric, (current_date - 5),  'Booster зар')
) as seed_expenses(category, amount, expense_date, description)
where not exists (select 1 from public.expenses);

-- One poster template placeholder for S5.
insert into public.poster_templates (name, background_path, layout, is_default, is_active)
select
  'Үндсэн загвар',
  null,
  '{
     "canvas": { "width": 1080, "height": 1350 },
     "product": { "x": 140, "y": 260, "w": 800, "h": 800 },
     "title": { "x": 80, "y": 1090, "w": 920, "size": 56, "weight": 700, "color": "#111", "align": "center", "maxLines": 2 },
     "price": { "x": 80, "y": 1240, "w": 920, "size": 72, "weight": 800, "color": "#111", "align": "center" },
     "logo": { "x": 80, "y": 80, "w": 180 }
   }'::jsonb,
  true,
  true
where not exists (select 1 from public.poster_templates);
