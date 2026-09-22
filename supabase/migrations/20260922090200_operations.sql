-- Operations: stock ledger, orders, order items, expenses and poster templates.

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  -- positive = stock in, negative = stock out. Never update stock directly.
  qty int not null,
  reason text not null check (reason in ('stock_in', 'sale', 'return', 'adjustment', 'damage')),
  unit_cost numeric(14, 2),
  reference_id uuid,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  channel text not null default 'facebook'
    check (channel in ('facebook', 'instagram', 'offline', 'other')),
  customer_name text,
  customer_phone text,
  delivery_address text,
  delivery_fee numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'delivered', 'cancelled', 'returned')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid')),
  ordered_at timestamptz not null default now(),
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  qty int not null check (qty > 0),
  unit_price numeric(14, 2) not null,
  -- Snapshot of variant.cost_price at save time. Past profit must never move.
  unit_cost numeric(14, 2) not null,
  product_name_snapshot text not null,
  variant_label_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric(14, 2) not null,
  expense_date date not null default current_date,
  description text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.poster_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  background_path text,
  layout jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.stock_movements
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.order_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.poster_templates
  for each row execute function public.set_updated_at();

-- Order numbers look like CORA-260922-001, counted per local day.
create or replace function public.set_order_no()
returns trigger
language plpgsql
as $$
declare
  day_part text;
  next_no int;
begin
  if new.order_no is not null and new.order_no <> '' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('orders.order_no'));

  day_part := to_char(
    (coalesce(new.ordered_at, now()) at time zone 'Asia/Ulaanbaatar'),
    'YYMMDD'
  );

  select coalesce(max(substring(order_no from 13 for 3)::int), 0) + 1
    into next_no
    from public.orders
   where order_no like 'CORA-' || day_part || '-%';

  new.order_no := 'CORA-' || day_part || '-' || lpad(next_no::text, 3, '0');
  return new;
end;
$$;

create trigger set_order_no
  before insert on public.orders
  for each row execute function public.set_order_no();
