-- Indexes on foreign keys and the columns the admin screens filter by.

create index products_brand_id_idx on public.products (brand_id);
create index products_category_id_idx on public.products (category_id);
create index products_slug_idx on public.products (slug);
create index products_status_idx on public.products (status);
create index products_deleted_at_idx on public.products (deleted_at);

create index product_images_product_id_idx on public.product_images (product_id);

create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_sku_idx on public.product_variants (sku);
create index product_variants_attributes_gin_idx on public.product_variants using gin (attributes);

create index stock_movements_variant_id_idx on public.stock_movements (variant_id);
create index stock_movements_created_at_idx on public.stock_movements (created_at desc);
create index stock_movements_reference_id_idx on public.stock_movements (reference_id);
create index stock_movements_created_by_idx on public.stock_movements (created_by);

create index orders_ordered_at_idx on public.orders (ordered_at desc);
create index orders_status_idx on public.orders (status);
create index orders_channel_idx on public.orders (channel);
create index orders_created_by_idx on public.orders (created_by);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create index expenses_expense_date_idx on public.expenses (expense_date desc);
create index expenses_created_by_idx on public.expenses (created_by);
