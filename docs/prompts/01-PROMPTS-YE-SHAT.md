# Cora Commerce — Үе шаттай prompt-ууд (Phase 0 → 9)

**Ашиглах заавар**

- Phase бүрийн `─── PROMPT ───` мөрнөөс доош байгаа блокыг **бүхэлд нь** хуулж Claude Code-д өг.
- Нэг Phase дуусмагц `/clear` хийж дараагийнхаа эхэл.
- ⭐ тэмдэгтэй Phase-ийг **plan mode**-оор эхлүүл (`Shift+Tab` → Plan mode).
- `<...>` хаалтанд байгаа зүйлийг өөрийн утгаар солино.

**Ерөнхий дараалал**

```
Phase 0  Суурь + tooling                    ~30 мин
Phase 1  Database schema + RLS       ⭐      ~1.5 цаг
Phase 2  Auth + admin shell                 ~1 цаг
Phase 3  Бараа + variant CRUD               ~2 цаг
Phase 4  Нөөц, борлуулалт, зардал           ~2 цаг
Phase 5  Ашиг орлогын analytics             ~1.5 цаг
Phase 6  Public storefront                  ~2 цаг
Phase 7  Poster generation engine    ⭐      ~2 цаг
Phase 8  Meta (FB/IG) automation     ⭐      ~3 цаг
Phase 9  Hardening + deploy                 ~1.5 цаг
```

---

## Phase 0 — Суурь тавих

─── PROMPT ───

```
Cora Commerce төслийн суурийг тавь. CLAUDE.md-г уншиж, тэнд заасан stack-ээс хазайхгүй.

ХИЙХ ЗҮЙЛС:

1. Next.js 15 App Router төсөл үүсгэ (TypeScript, Tailwind v4, ESLint, App Router, src дир ашиглахгүй, import alias "@/*"). pnpm ашигла.

2. tsconfig.json-д дараахыг заавал асаа:
   strict, noUncheckedIndexedAccess, noImplicitOverride, exactOptionalPropertyTypes,
   forceConsistentCasingInFileNames

3. shadcn/ui-г эхлүүл. Дараах component-уудыг нэм:
   button, input, label, select, table, dialog, dropdown-menu, form, card,
   badge, tabs, toast (sonner), skeleton, separator, sheet, calendar, popover, alert

4. Дараах dependency-г суулга:
   @supabase/supabase-js, @supabase/ssr, zod, react-hook-form,
   @hookform/resolvers, date-fns, date-fns-tz, decimal.js, lucide-react,
   nuqs, next-safe-action
   dev: vitest, @vitejs/plugin-react, @playwright/test, prettier,
        prettier-plugin-tailwindcss, supabase

5. CLAUDE.md-д заасан хавтасны бүтцийг бүрэн үүсгэ (хоосон хавтас бүрд .gitkeep).

6. lib/env.ts — Zod-оор бүх env var-ыг шалгадаг модуль бич. Server-only болон
   public-ийг тусад нь. Ирээдүйд хэрэгтэй бүх var-ыг одооноос тодорхойл:
     NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
     SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL,
     META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN,
     CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CRON_SECRET, ENCRYPTION_KEY
   Meta/Canva-тай холбоотойг optional болго (Phase 8 хүртэл байхгүй).
   .env.example-г мөн үүсгэ.

7. lib/money.ts — мөнгөний ганц эх сурвалж. decimal.js ашиглана:
     - parseMoney(input: string | number): Decimal
     - formatMNT(value): string  // "₮ 125,000" хэлбэр, ru-RU биш mn-MN locale
     - add/sub/mul/percentage helper-ууд
     - toDbNumeric(value): string
   Бүх функцэд vitest unit test бич (0, сөрөг, тэрбум, бутархай тохиолдол).

8. lib/supabase/ дотор 3 файл:
     server.ts  — createServerClient (cookies-тэй, @supabase/ssr)
     client.ts  — createBrowserClient
     admin.ts   — service_role client. Файлын эхэнд "import 'server-only'"

9. messages/mn.json үүсгээд, lib/i18n.ts дотор энгийн t(key) helper бич
   (одоохондоо гадаад i18n library хэрэггүй).

10. package.json script:
      dev, build, start, lint, typecheck, test, test:e2e, format,
      db:types  → supabase gen types typescript --local > types/database.ts
      db:reset  → supabase db reset

11. .gitignore-д .env*.local, .vercel, supabase/.temp нэм.

12. GitHub Actions workflow (.github/workflows/ci.yml): pnpm install →
    typecheck → lint → test → build. Push болон PR дээр ажиллана.

13. README.md — төслийн тайлбар, суулгах алхам, script-уудын тайлбар. Монголоор.

ДУУСГАХ:
- pnpm typecheck, pnpm lint, pnpm build гурвууланг ажиллуулж цэвэр болгосныг батал.
- git commit хий: "chore: scaffold Next.js 15 + Supabase + Tailwind foundation"

САНАМЖ: Supabase project аль хэдийн үүссэн байгаа. Одоохондоо credential
асуухгүй — .env.example л бэлдэ. Холболтыг Phase 1-д хийнэ.
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 1 ⭐ — Database schema + RLS

> **Plan mode-оор эхлүүл.** Энэ бол хамгийн чухал Phase. Схем буруу бол дараагийн бүх зүйл буруу болно.

─── PROMPT ───

```
Cora Commerce-ийн бүрэн database schema-г Supabase migration хэлбэрээр зохио.
Эхлээд ТӨЛӨВЛӨГӨӨ танилцуул, миний зөвшөөрлийг аваад дараа нь бич.

БИЗНЕСИЙН ЗАГВАР:
Cora бол Facebook page-ээр бараа зардаг брэнд. Бараагаа өртөг (анхны дүн)
болон зарах үнээр нь бүртгээд, борлуулалт бүрээс гарах ашгийг тооцоолох
шаардлагатай. Бараа нь brand, category, product name-ээр ангилагдана.
Бараа бүр size (M/L/XL) эсвэл багтаамж (100ml/300ml) гэх мэт ХУВИЛБАРТАЙ
байж болно.

ЗААВАЛ БАЙХ ХҮСНЭГТҮҮД:

── Хэрэглэгч ба эрх ──
profiles          — auth.users-тэй 1:1. role: 'owner' | 'admin' | 'staff' | 'viewer'
audit_log         — хэн, хэзээ, юуг өөрчилсөн (table_name, record_id, action, diff jsonb)

── Каталог ──
brands            — name, slug, logo_url, description. (Cora үндсэн брэнд,
                    гэхдээ олон брэнд дэмждэг байх)
categories        — name, slug, parent_id (өөртөө self-reference, мод бүтэц), sort_order
products          — brand_id, category_id, name, slug, description,
                    option_types text[]  ← ЖИШЭЭ: '{Size}' эсвэл '{Volume}' эсвэл '{}'
                    status: 'draft'|'active'|'archived',
                    is_featured, tags text[], deleted_at
product_images    — product_id, storage_path, alt_text, sort_order,
                    is_primary,
                    is_transparent boolean  ← poster-т ашиглах PNG-г тэмдэглэнэ
product_variants  — product_id,
                    sku (unique),
                    attributes jsonb   ← {"Size":"M"} эсвэл {"Volume":"300ml"}.
                                          option_types-гүй бараанд {} байна
                    cost_price numeric(14,2)   ← анхны дүн, ХЭЗЭЭ Ч public биш
                    sale_price numeric(14,2)   ← зарах дүн
                    compare_at_price numeric(14,2) null  ← хямдралын өмнөх үнэ
                    barcode, weight_grams, is_active, sort_order, deleted_at
                    UNIQUE(product_id, attributes)

── Нөөц (ledger зарчмаар) ──
stock_movements   — variant_id,
                    qty integer (эерэг = орлого, сөрөг = зарлага),
                    reason: 'purchase'|'sale'|'return'|'adjustment'|'damage'|'transfer',
                    unit_cost numeric(14,2) null,
                    reference_type text, reference_id uuid,  ← polymorphic холбоос
                    note, created_by, created_at
                  ⚠️ Нөөцийг ХЭЗЭЭ Ч шууд UPDATE хийхгүй. Зөвхөн энэ ledger-т
                    мөр нэмнэ. Одоогийн нөөцийг SUM(qty)-ээр гаргана.

── Худалдан авалт (өртөг бүртгэх) ──
purchases         — supplier_name, purchase_date, invoice_no, currency,
                    exchange_rate numeric, shipping_cost, customs_cost,
                    other_cost, note, status
purchase_items    — purchase_id, variant_id, qty, unit_cost, landed_unit_cost
                  ← landed_unit_cost = unit_cost + (нийт нэмэлт зардлын хувь ногдол)

── Борлуулалт ──
orders            — order_no (унших боломжтой дугаар, жишээ CORA-260922-001),
                    channel: 'facebook'|'instagram'|'web'|'offline'|'other',
                    customer_name, customer_phone, customer_note,
                    delivery_address, delivery_fee,
                    discount_amount, discount_reason,
                    status: 'pending'|'confirmed'|'packed'|'shipped'|'delivered'|'cancelled'|'returned',
                    payment_status: 'unpaid'|'partial'|'paid'|'refunded',
                    payment_method, ordered_at, note
order_items       — order_id, variant_id,
                    qty,
                    unit_price numeric(14,2),   ← зарсан үнэ (snapshot)
                    unit_cost  numeric(14,2),   ← зарах үеийн өртөг (snapshot!)
                    line_discount,
                    product_name_snapshot, variant_label_snapshot
                  ⚠️ unit_cost-ыг snapshot хийх нь чухал. Дараа өртөг өөрчлөгдсөн ч
                    өнгөрсөн борлуулалтын ашиг тогтвортой байна.

── Зардал ──
expense_categories — name, slug (зар сурталчилгаа, түрээс, цалин, тээвэр гэх мэт)
expenses           — category_id, amount, expense_date, description,
                     receipt_path, is_recurring, created_by

── Social automation ──
social_accounts    — platform: 'facebook'|'instagram',
                     external_id (page id / ig user id),
                     name, username,
                     access_token_encrypted bytea,
                     token_expires_at,
                     is_active, last_synced_at
poster_templates   — name,
                     renderer: 'local'|'canva',
                     background_path,          ← local renderer-ийн PNG/SVG
                     canva_brand_template_id,  ← canva renderer
                     layout jsonb,             ← талбар бүрийн x/y/өргөн/өндөр/font
                     is_default, is_active
scheduled_posts    — product_id, variant_id null,
                     template_id,
                     caption text,
                     hashtags text[],
                     poster_path,              ← үүсгэсэн зургийн storage path
                     platforms text[],         ← {facebook,instagram}
                     scheduled_at timestamptz,
                     status: 'draft'|'queued'|'rendering'|'ready'|'publishing'|'published'|'failed'|'cancelled',
                     attempts int default 0,
                     last_error text,
                     published_at
post_results       — scheduled_post_id, platform, external_post_id,
                     permalink, published_at, error jsonb
social_api_log     — platform, endpoint, method, request jsonb,
                     response jsonb, status_code, duration_ms, created_at

ЗААВАЛ БАЙХ VIEW / FUNCTION:

v_variant_stock          — variant_id, current_stock (stock_movements-ийн SUM)
v_product_summary        — бараа бүрийн нийт нөөц, үнийн муж (min/max sale_price),
                           variant тоо
v_order_profit           — order_id, revenue, cost, gross_profit, margin_pct
fn_profit_report(from,to)— хугацааны ашгийн тайлан буцаадаг function:
                           revenue, cogs, gross_profit, expenses, net_profit,
                           order_count, unit_count
v_low_stock              — тохируулсан босгоос доош орсон variant-ууд
v_top_products(from,to)  — хамгийн их ашиг авчирсан бараа

TRIGGER:
- updated_at автоматаар шинэчлэгдэх trigger бүх хүснэгтэд
- order_items оруулах/устгах үед stock_movements автоматаар бичигдэх trigger
  (reason='sale', reference_type='order')
- purchase_items оруулах үед stock_movements бичигдэх trigger (reason='purchase')
- audit_log-д бичих trigger: products, product_variants, orders дээр
- order_no автоматаар үүсгэх функц (CORA-YYMMDD-NNN формат)

RLS — ЭНЭ НЬ ХЭЛЭЛЦЭХГҮЙ ШААРДЛАГА:
- Бүх хүснэгт дээр RLS ASAA.
- Public (anon) зөвхөн дараахыг УНШИНА:
    brands, categories,
    products (status='active' AND deleted_at IS NULL),
    product_images,
    product_variants — ГЭХДЭЭ cost_price БАЙХГҮЙ.
  ⚠️ cost_price-ыг RLS-ээр нуух боломжгүй (column түвшин), тиймээс
  public-д зориулж v_public_variants view үүсгээд зөвхөн түүнд grant өг.
  product_variants хүснэгтэд anon-д ямар ч эрх өгөхгүй.
- Бусад бүх хүснэгт: зөвхөн authenticated + profiles.role IN ('owner','admin','staff')
- audit_log, social_api_log: зөвхөн 'owner','admin' унших. INSERT бүгдэд.
- Role шалгах helper function үүсгэ: auth_role(), is_staff(), is_admin()
  (SECURITY DEFINER, search_path тогтмол)

INDEX:
- Гадаад түлхүүр бүр дээр
- products(slug), products(status, deleted_at)
- product_variants(product_id), product_variants(sku)
- stock_movements(variant_id, created_at)
- orders(ordered_at), orders(status)
- order_items(order_id), order_items(variant_id)
- scheduled_posts(status, scheduled_at)
- attributes jsonb дээр GIN index

SEED ӨГӨГДӨЛ (supabase/seed.sql):
- Cora брэнд
- 4-5 category
- 6 бараа: 2 нь Size variant-тай (M/L/XL), 2 нь Volume variant-тай (100ml/300ml/500ml),
  2 нь variant-гүй
- Тэдгээрт realistic МНТ үнэ (өртөг 25,000–80,000; зарах 45,000–150,000)
- 3 purchase, 15 order (сүүлийн 60 хоногт тархсан), 8 expense
  → analytics-ийг зөв туршихад хангалттай өгөгдөл

ФАЙЛЫН ЗОХИОН БАЙГУУЛАЛТ:
Нэг том migration биш, логикоор хуваа:
  0001_extensions_and_helpers.sql
  0002_profiles_and_audit.sql
  0003_catalog.sql
  0004_inventory_and_purchases.sql
  0005_orders.sql
  0006_expenses.sql
  0007_social.sql
  0008_views_and_functions.sql
  0009_rls_policies.sql

ДУУСГАХ:
1. supabase link хийх командыг надад хэл (project ref-ээ би өгнө).
2. Локал дээр supabase db reset ажиллуулж migration бүгд алдаагүй орсныг батал.
3. pnpm db:types ажиллуулж types/database.ts үүсгэ.
4. ERD-г Mermaid диаграмаар docs/schema.md дотор бич.
5. git commit: "feat(db): full schema with RLS, ledger inventory and profit views"

ЭХЛЭХЭЭС ӨМНӨ: Хэрэв дээрх шаардлагад зөрчил эсвэл тодорхойгүй зүйл байвал
код бичихээсээ өмнө надаас асуу.
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 2 — Auth + Admin shell

─── PROMPT ───

```
Supabase Auth болон admin dashboard-ийн бүрхүүлийг хий.

1. AUTH
   - Email + password нэвтрэлт (magic link биш — админ цөөхөн хүн).
   - app/(auth)/login/page.tsx — монгол UI, Zod validation, алдааны мессеж монголоор.
   - app/api/auth/callback/route.ts — Supabase code exchange.
   - Бүртгүүлэх хуудас НЭЭЛТТЭЙ байхгүй. Хэрэглэгчийг зөвхөн owner
     admin/users хуудаснаас урина (Supabase admin API-аар invite).
   - auth.users үүсэх үед profiles автоматаар үүсэх trigger аль хэдийн байгаа
     эсэхийг шалга, байхгүй бол migration нэм.

2. ХАМГААЛАЛТ
   - middleware.ts — /admin/* доор session шалгана, байхгүй бол /login руу.
   - lib/auth.ts:
       getSession()          — cache-тай
       requireUser()         — session байхгүй бол redirect
       requireRole(roles[])  — эрх хүрэхгүй бол 403 хуудас
   - Server Action бүрийн эхний мөр requireRole(...) байх ёстой.
     Үүнийг заавал мөрдөхөөр next-safe-action-ийн authActionClient үүсгэ.

3. ADMIN SHELL
   - app/admin/layout.tsx — зүүн sidebar + дээд header.
   - Sidebar цэс (монголоор, lucide icon-той):
       Хяналтын самбар   /admin
       Бараа             /admin/products
       Нөөц              /admin/inventory
       Худалдан авалт    /admin/purchases
       Захиалга          /admin/orders
       Зардал            /admin/expenses
       Ашиг орлого       /admin/analytics
       Постууд           /admin/posts
       Тохиргоо          /admin/settings
   - Mobile дээр sidebar нь Sheet болж хумигдана.
   - Header: одоогийн хэрэглэгчийн нэр, role badge, гарах товч, тема сэлгэгч.
   - Role-ээр цэс нуугдана: 'viewer' зөвхөн харна, 'staff' зардал/тохиргоо харахгүй.

4. ЕРӨНХИЙ COMPONENT-УУД (дараагийн Phase-үүд эдгээрийг ашиглана)
   - components/admin/page-header.tsx — гарчиг + тайлбар + үйлдлийн товч
   - components/admin/data-table.tsx — @tanstack/react-table дээр суурилсан.
     Хайлт, sort, pagination, багана нуух. URL state-ыг nuqs-ээр удирдана.
   - components/admin/empty-state.tsx
   - components/admin/confirm-dialog.tsx
   - components/admin/money-input.tsx — МНТ оруулах input, мянгатын таслалтай,
     гаралт нь string decimal. lib/money.ts ашиглана.
   - components/admin/stat-card.tsx — тоо + өөрчлөлтийн хувь + trend сум

5. Бүх хуудсанд loading.tsx (skeleton) болон error.tsx бич.

6. /admin нүүр хуудсанд түр зуурын placeholder тавь (Phase 5-д бөглөнө).

ДУУСГАХ: typecheck + lint + build цэвэр. Commit:
"feat(auth): supabase auth, role guards and admin shell"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 3 — Бараа + Variant CRUD

─── PROMPT ───

```
Барааны бүрэн удирдлагыг хий. Энэ бол админы хамгийн их ашиглах хэсэг тул
UX-д анхаар.

1. БАРААНЫ ЖАГСААЛТ  /admin/products
   - data-table: зураг, нэр, брэнд, ангилал, variant тоо, үнийн муж,
     нийт нөөц, төлөв, үйлдэл.
   - Шүүлтүүр: брэнд, ангилал, төлөв, "нөөц дууссан", хайлт (нэр/SKU).
   - Bulk үйлдэл: төлөв солих, архивлах.
   - Шүүлтүүрийн state URL дотор (nuqs) — хуваалцах боломжтой байх.

2. БАРАА ҮҮСГЭХ / ЗАСАХ  /admin/products/new, /admin/products/[id]
   Нэг form, tab-аар хуваа:

   Tab «Үндсэн»
     - Нэр, slug (нэрнээс автоматаар, гараар засаж болно, кирилл→латин
       транслитерац хийнэ), брэнд, ангилал, тайлбар (textarea), tag, төлөв.

   Tab «Хувилбар» ← ХАМГИЙН ЧУХАЛ ХЭСЭГ
     - Эхлээд «Option төрөл» сонгоно: Байхгүй / Size / Volume / Color / Захиалгат.
     - Size сонговол утгууд: XS,S,M,L,XL,XXL-ээс чагтлаад сонгоно.
     - Volume сонговол утга нэмэх талбар (жишээ: 100ml, 300ml, 500ml).
     - Захиалгат сонговол option-ий нэр болон утгуудыг өөрөө бичнэ.
     - Сонгосон утгуудаас variant мөрүүд АВТОМАТААР үүснэ (matrix).
     - Variant мөр бүрд: SKU (автомат санал болгоно: CORA-{product}-{option}),
       өртөг (cost_price), зарах үнэ (sale_price), хямдралын өмнөх үнэ,
       эхний нөөц, идэвхтэй эсэх.
     - «Бүх мөрд адилхан үнэ хэрэглэх» товч (нэг мөр бөглөөд бусад руу хуулах).
     - Мөр бүрийн хажууд ашгийн хувь шууд харагдана:
       (sale_price − cost_price) / sale_price × 100, өнгөөр (улаан <20%, шар 20-40%, ногоон >40%)
     - Option-гүй бараанд ганц default variant үүснэ (attributes = {}).

   Tab «Зураг»
     - Олон зураг чирч оруулах (drag-drop), дараалал өөрчлөх.
     - Зураг бүрд «Үндсэн зураг» болон «Ил тод дэвсгэртэй (poster-т ашиглах)»
       гэсэн 2 чагт.
     - Upload нь Supabase Storage-ийн product-images bucket руу.
       Зам: {product_id}/{uuid}.{ext}
     - Upload хийхээс өмнө browser дээр 2000px-ээс их бол багасгана.
     - PNG байвал alpha channel байгаа эсэхийг шалгаад, байвал
       is_transparent-ийг автоматаар чагтална.

3. SERVER ACTIONS  (server/actions/products.ts)
   createProduct, updateProduct, archiveProduct, restoreProduct,
   duplicateProduct, upsertVariants, deleteVariant, reorderImages,
   setPrimaryImage, deleteImage
   - Бүгд next-safe-action-ийн authActionClient дээр, Zod schema-тай.
   - Variant-ийн үнэ өөрчлөгдвөл audit_log-д бичигдэнэ.
   - Борлуулалт бүхий variant-ийг устгах ГЭВЭЛ зогсоож, "идэвхгүй болгоно уу?"
     гэж санал болгоно.

4. VALIDATION ДҮРЭМ
   - sale_price ≥ 0, cost_price ≥ 0
   - sale_price < cost_price бол хориглохгүй ГЭХДЭЭ тод анхааруулга харуулна
     («Энэ хувилбарыг алдагдалтай зарж байна»)
   - SKU давхардвал алдаа
   - Нэг product дотор attributes давхардвал алдаа

5. BARCODE / SKU generator helper бич (lib/sku.ts) + unit test.

ДУУСГАХ: 6 бараа гараар үүсгэж туршаад ажиллаж байгааг батал.
Commit: "feat(products): product and variant management with image upload"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 4 — Нөөц, худалдан авалт, борлуулалт, зардал

─── PROMPT ───

```
Бизнесийн гүйлгээний 4 модулийг хий. Ашгийн тооцооллын үнэн зөв байдал
энэ Phase-ээс шалтгаална — snapshot дүрмийг чанд мөрд.

1. ХУДАЛДАН АВАЛТ  /admin/purchases
   - Жагсаалт + үүсгэх form.
   - Мөр нэмэх: variant хайж сонгох (combobox, SKU/нэрээр), тоо, нэгжийн өртөг.
   - Нэмэлт зардал: тээвэр, гааль, бусад. Эдгээр нь мөрүүд рүү
     ҮНИЙН ДҮНГИЙН ХАРЬЦААГААР хуваарилагдана → landed_unit_cost.
     Энэ тооцооллыг lib/costing.ts дотор функц болгож бич + unit test.
   - Purchase баталгаажсан үед:
       • stock_movements-д reason='purchase' мөрүүд орно
       • тухайн variant-ийн cost_price-ыг ЖИГНЭСЭН ДУНДАЖ-аар шинэчилнэ:
         new_cost = (хуучин_нөөц × хуучин_өртөг + шинэ_тоо × landed_cost)
                    / (хуучин_нөөц + шинэ_тоо)
         Энэ функцийг тусад нь бич + unit test.
   - Хэрэв valuta нь MNT биш бол exchange_rate-аар хөрвүүлнэ.

2. НӨӨЦ  /admin/inventory
   - v_variant_stock дээр суурилсан хүснэгт: бараа, variant, SKU,
     одоогийн нөөц, өртөг, нөөцийн үнэ (нөөц × өртөг), сүүлийн хөдөлгөөн.
   - «Нөөц тохируулах» dialog: шалтгаан сонгоод (тоолго, гэмтэл, алдаа засах)
     тоо оруулна → stock_movements-д adjustment мөр орно.
   - Variant дээр дарвал бүх хөдөлгөөний түүх (timeline).
   - Бага нөөцийн сэрэмжлүүлэг: settings дээр босго тохируулж болно,
     босгоос доош орсныг улаанаар + dashboard дээр badge.
   - Экспорт: CSV.

3. ЗАХИАЛГА / БОРЛУУЛАЛТ  /admin/orders
   - Жагсаалт: order_no, огноо, суваг, харилцагч, дүн, ашиг, төлөв, төлбөр.
   - Шүүлтүүр: огнооны муж, суваг, төлөв, төлбөрийн төлөв.
   - Захиалга үүсгэх form:
       • Суваг сонгох (Facebook / Instagram / Веб / Биечлэн)
       • Харилцагчийн нэр, утас, хаяг, тэмдэглэл
       • Бараа нэмэх: variant хайх → тоо → үнэ (variant-ийн sale_price-аас
         автоматаар ирнэ, гараар засаж болно)
       • Мөр бүрд хөнгөлөлт, нийт хөнгөлөлт, хүргэлтийн төлбөр
       • Баруун талд ШУУД ТООЦООЛОЛ харагдана:
           Нийт борлуулалт / Нийт өртөг / Бохир ашиг / Ашгийн хувь
   ⚠️ ХАДГАЛАХ ҮЕД order_items.unit_cost-д тухайн МӨЧИЙН variant.cost_price-ыг
      snapshot хийнэ. Дараа өртөг өөрчлөгдсөн ч энэ дүн хөдлөхгүй.
   - Төлөв солих: pending → confirmed → packed → shipped → delivered.
     confirmed болох үед stock_movements-д reason='sale' сөрөг мөр орно.
     cancelled/returned болбол буцаах мөр орно (reason='return').
   - Нөөц хүрэхгүй бол confirmed болгохыг зогсоож анхааруулна.
   - Захиалгын дэлгэрэнгүй хуудас: бүх мөр, ашиг, түүх (status timeline).

4. ЗАРДАЛ  /admin/expenses
   - Ангилал удирдах (CRUD).
   - Зардал бүртгэх: ангилал, дүн, огноо, тайлбар, баримтын зураг upload
     (receipts bucket, private).
   - Давтагдах зардал тэмдэглэх (түрээс, цалин) — сар бүр сануулга.
   - Сар/ангиллаар бүлэглэсэн харагдац.

5. SERVER ACTIONS бүгд:
   - Гүйлгээ шаардсан үйлдлийг Postgres function дотор хийж, атомик болго
     (жишээ: захиалга баталгаажуулах = нөөц шалгах + хасах + төлөв солих).
     Хэсэгчилсэн бичилт болж болохгүй.
   - Бүх мөнгөний тооцоолол lib/money.ts-ээр.

6. UNIT TEST заавал:
   - landed cost хуваарилалт
   - жигнэсэн дундаж өртөг
   - захиалгын ашгийн тооцоолол (хөнгөлөлт, хүргэлттэй)
   - буцаалтын нөөцийн хөдөлгөөн

ДУУСГАХ: seed өгөгдөл дээр тоонууд зөв гарч байгааг шалга.
Commit: "feat(operations): purchases, inventory ledger, orders and expenses"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 5 — Ашиг орлогын dashboard

> Энэ Phase-ийг эхлүүлэхийн өмнө Claude Code-д `dataviz` skill-ийг уншуулбал график илүү сайхан болно.

─── PROMPT ───

```
Ашиг орлогын хяналтын самбар болон тайланг хий.
График зурахаас ӨМНӨ dataviz skill-ийг уншаад дүрмийг нь мөрд.
Chart library: recharts.

1. /admin — ҮНДСЭН САМБАР
   Дээд талд огнооны муж сонгогч: Өнөөдөр / 7 хоног / 30 хоног / Энэ сар /
   Өнгөрсөн сар / Захиалгат. Сонголт URL-д хадгалагдана.

   4 stat card (өмнөх ижил урттай хугацаатай харьцуулсан % өөрчлөлттэй):
     • Нийт борлуулалт (₮)
     • Бохир ашиг (₮) + ашгийн хувь
     • Цэвэр ашиг (₮)   ← бохир ашиг − зардал
     • Захиалгын тоо + дундаж захиалгын дүн

   Графикууд:
     • Борлуулалт vs Ашиг — өдрөөр (давхар шугам)
     • Суваг тус бүрийн борлуулалт (FB/IG/Веб/Биечлэн) — баганан
     • Хамгийн ашигтай 10 бараа — хэвтээ баганан
     • Зардлын бүтэц ангиллаар — donut
     • Нөөцийн үнийн дүн + бага нөөцтэй бараануудын жагсаалт

2. /admin/analytics — ДЭЛГЭРЭНГҮЙ ТАЙЛАН
   Tab-аар:
     «Ашгийн тайлан» — fn_profit_report ашиглана:
        Борлуулалтын орлого
        − Борлуулсан барааны өртөг (COGS)
        = Бохир ашиг            (хувь)
        − Үйл ажиллагааны зардал (ангиллаар задалсан)
        = Цэвэр ашиг            (хувь)
        Сар бүрээр багана болгон харьцуулсан хүснэгт.

     «Бараагаар» — бараа/variant тус бүрийн зарагдсан тоо, орлого,
        өртөг, ашиг, ашгийн хувь. Sort хийж болно.

     «Хугацаагаар» — өдөр/долоо хоног/сараар нэгтгэсэн.

     «Харилцагчаар» — утсаар нь бүлэглэсэн давтан худалдан авалт.

3. ЭКСПОРТ
   - Тайлан бүрийг CSV болон XLSX-ээр татах.
   - XLSX-д тоонууд тоо хэлбэрээр (текст биш), мөнгөний формат хэрэглэсэн байна.

4. ТООЦООЛЛЫН ДҮРЭМ (lib/analytics/ дотор цэвэр функц болгон бич)
   - COGS = Σ(order_items.qty × order_items.unit_cost) — snapshot-оос,
     одоогийн cost_price-аас БИШ.
   - Зөвхөн status IN ('confirmed','packed','shipped','delivered') захиалга
     тооцоонд орно. cancelled орохгүй. returned нь сөргөөр орно.
   - Зардлыг expense_date-ээр хугацаанд оноож тооцно.
   - Мөнгө бүхэлдээ decimal.js-ээр, float ашиглахгүй.
   - Функц бүрд unit test: хоосон хугацаа, буцаалттай, хөнгөлөлттэй,
     0 борлуулалттай (тэгд хуваах) тохиолдол.

5. ГҮЙЦЭТГЭЛ
   - Тайланг Postgres дээр нэгтгэ (SQL), JS дээр биш.
   - Хүнд query-г unstable_cache-ээр 60 секунд кэшлэ, mutation дээр
     revalidateTag хий.

ДУУСГАХ: Seed өгөгдлийн ашгийн дүнг гараар тооцоод UI-тай тулгаж шалга.
Commit: "feat(analytics): profit dashboard and detailed reports"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 6 — Public storefront

─── PROMPT ───

```
Олон нийтэд нээлттэй веб дэлгүүрийг хий. Cora брэндийн харагдац чухал.

⚠️ ХАМГИЙН ЧУХАЛ: Storefront-ийн ЯМАР Ч query, ЯМАР Ч response дотор
cost_price байж БОЛОХГҮЙ. Зөвхөн v_public_variants view-ээр өгөгдөл ав.
Хэрэв тэр view байхгүй бол эхлээд migration-оор үүсгэ.

1. ХУУДСУУД
   /                      — нүүр: hero, онцлох бараа, ангилал, брэндийн түүх
   /products              — бүх бараа, шүүлтүүр (ангилал, үнийн муж, size/volume),
                            эрэмбэ (шинэ, үнэ өсөх/буурах)
   /products/[slug]       — барааны дэлгэрэнгүй: зургийн галерей,
                            variant сонгогч (size/volume товчнууд),
                            сонгосон variant-ийн үнэ болон нөөцийн төлөв,
                            «Facebook-ээр захиалах» товч (Messenger рүү
                            барааны нэр агуулсан m.me холбоосоор)
   /categories/[slug]     — ангиллын хуудас
   /about, /contact       — статик

2. VARIANT СОНГОГЧ
   - option_types-аас хамаарч Size бол товчнууд, Volume бол товчнууд,
     олон option бол бүлэг бүрээр.
   - Нөөцгүй хувилбар саарал, дарагдахгүй.
   - Сонголт солигдох бүрд үнэ болон зураг шинэчлэгдэнэ (client component,
     гэхдээ өгөгдөл server-ээс ирсэн байна).

3. SEO / META
   - generateMetadata хуудас бүрд.
   - Open Graph зураг: барааны үндсэн зураг. Facebook дээр хуваалцахад
     зөв харагдах ёстой (og:image 1200×630).
   - JSON-LD: Product schema (name, image, offers, price, availability).
   - sitemap.ts, robots.ts.
   - next/image + Supabase Storage remotePatterns тохируулга.

4. ГҮЙЦЭТГЭЛ
   - Барааны жагсаалт ISR: revalidate 300 сек + admin дээр өөрчлөгдвөл
     revalidateTag.
   - Lighthouse: Performance ≥ 90, Accessibility ≥ 95 зорилт.
   - Бүх зураг тодорхой width/height-тай, layout shift байхгүй.

5. ДИЗАЙН
   - Cora-ийн brand color-оос Tailwind theme үүсгэ (CSS variable-аар,
     light/dark хоёуланд).
   - Logo /public/brand/ доор. Хэрэв байхгүй бол надаас асуу — санамсаргүй
     lorem logo үүсгэхгүй.
   - Mobile-first. 375px дээр төгс байх.
   - Fonts: next/font ашиглана, кирилл дэмждэг фонт сонго (Inter эсвэл
     Manrope кирилл subset-тэй).

6. ХҮРТЭЭМЖ
   - Бүх интерактив элемент keyboard-оор ажиллана.
   - Зураг бүрд alt.
   - Өнгөний контраст WCAG AA.

ДУУСГАХ: Commit "feat(shop): public storefront with variant selection and SEO"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 7 ⭐ — Poster generation engine

> **Plan mode-оор эхлүүл.** Энэ Phase нь чиний асуусан "Canva дээр 1 poster зохиогоод зургаа солиод post-лох" асуудлын хариу.

─── PROMPT ───

```
Poster автоматаар үүсгэх систем бүтээ. Хоёр renderer-ийг нэг interface-ийн
ард тавина — эхлээд төлөвлөгөө танилцуул.

СУУРЬ САНАА:
Барааны ил тод дэвсгэртэй (transparent PNG) зургийг брэндийн загварын
дэвсгэр дээр давхарлаж, үнэ/нэр/логог нэмээд нийтлэхэд бэлэн зураг
үүсгэнэ. Нэг template олон бараанд дахин ашиглагдана.

1. INTERFACE  (lib/poster/types.ts)

   export interface PosterInput {
     productName: string
     brandName: string
     variantLabel?: string        // "M" эсвэл "300ml"
     price: string                // форматлагдсан "₮ 89,000"
     compareAtPrice?: string
     badge?: string               // "ШИНЭ" | "-20%"
     productImageUrl: string      // transparent PNG-ийн public URL
     templateId: string
   }

   export interface PosterOutput {
     buffer: Buffer
     mimeType: 'image/png' | 'image/jpeg'
     width: number
     height: number
   }

   export interface PosterRenderer {
     readonly kind: 'local' | 'canva'
     isAvailable(): Promise<boolean>
     render(input: PosterInput): Promise<PosterOutput>
   }

2. PLAN A — LocalPosterRenderer  (lib/poster/local-renderer.ts)  ← ҮНДСЭН

   - Дэвсгэр: poster_templates.background_path дээрх PNG/SVG
     (Canva дээр гараар зохиогоод export хийсэн зураг).
   - Давхарлах: sharp-ийн composite() ашиглана.
   - Текст: satori-гээр JSX → SVG, дараа нь @resvg/resvg-js-ээр PNG,
     тэрийг sharp-аар давхарлана. (sharp дангаараа текст зурж чадахгүй.)
   - Барааны зураг: URL-ээс татаад, template-ийн layout.product хэсгийн
     хүрээнд "contain" горимоор багтаана, харьцаа хадгална.
   - layout jsonb-ийн бүтэц:
       {
         "canvas": { "width": 1080, "height": 1350 },
         "product": { "x": 140, "y": 260, "w": 800, "h": 800, "fit": "contain" },
         "title":   { "x": 80, "y": 1090, "w": 920, "size": 56, "weight": 700,
                      "color": "#111", "align": "center", "maxLines": 2 },
         "price":   { "x": 80, "y": 1180, "w": 920, "size": 72, "weight": 800,
                      "color": "#111", "align": "center" },
         "badge":   { "x": 840, "y": 120, "size": 32, "bg": "#E11D48", "color": "#fff" },
         "logo":    { "x": 80, "y": 80, "w": 180 }
       }
   - Фонт: кирилл дэмждэг TTF-ийг public/fonts/ доор тавьж satori-д өгнө.
     Кирилл үсэг хайрцаг болж харагдаж болохгүй — үүнийг заавал шалга.
   - Урт нэр: 2 мөр болгож таслана, багтахгүй бол «…».
   - IG-д зориулж 3 хэмжээ гаргана: 1080×1080 (feed), 1080×1350 (portrait),
     1080×1920 (story). Template дотор аль хэмжээ гэдгийг заана.

3. PLAN B — CanvaPosterRenderer  (lib/poster/canva-renderer.ts)

   ⚠️ ЧУХАЛ БОДИТ БАЙДАЛ: Canva-ийн Autofill API нь Canva Enterprise
   гишүүнчлэл шаарддаг. Enterprise байхгүй бол энэ renderer ажиллахгүй.
   Тиймээс isAvailable() нь худал буцаах үед систем чимээгүйхэн
   LocalPosterRenderer руу шилжинэ. Алдаа шидэж хэрэглэгчийг зогсоохгүй.

   Хэрэгжүүлэх:
   - OAuth 2.0 + PKCE flow. Scope:
       design:content:read, design:content:write, design:meta:read,
       asset:read, asset:write, brandtemplate:meta:read, brandtemplate:content:read
     Callback: app/api/oauth/canva/callback/route.ts
     Token-ыг шифрлээд DB-д хадгална, refresh хийдэг helper бич.
   - Урсгал:
       a) Барааны зургийг Canva руу upload:
          POST /rest/v1/asset-uploads  (binary body +
          Asset-Upload-Metadata header дотор base64url нэр)
          → async job, polling хийж asset_id ав
       b) POST /rest/v1/autofills
          { brand_template_id, data: {
              product_image: { type: "image", asset_id },
              product_name:  { type: "text",  text: "..." },
              price:         { type: "text",  text: "..." } } }
          → job id
       c) GET /rest/v1/autofills/{jobId} polling (exponential backoff,
          дээд тал нь 60 сек) → design id
       d) POST /rest/v1/exports { design_id, format: { type: "png" } }
          → job → download URL → буфер татаж авах
   - Алдаа бүрийг social_api_log-д бич.
   - Rate limit болон 429-д backoff.

4. RENDERER СОНГОГЧ  (lib/poster/index.ts)
   getRenderer(template) →
     template.renderer === 'canva' && canvaRenderer.isAvailable()
       ? canvaRenderer : localRenderer
   Fallback болсон бол scheduled_posts.last_error-д тэмдэглээд үргэлжлүүл.

5. TEMPLATE UI  /admin/settings/templates
   - Template жагсаалт, үүсгэх, засах.
   - Дэвсгэр зураг upload.
   - Layout-ийг ВИЗУАЛЬ засварлагчаар тохируулна: дэвсгэр дээр чирж
     болох хайрцгууд (product, title, price, badge, logo), хэмжээ өөрчлөх,
     фонтын хэмжээ/өнгө сонгох. Үр дүн нь layout jsonb.
   - «Урьдчилан харах» товч: сонгосон бараагаар жинхэнэ poster үүсгэж
     шууд харуулна (хадгалахгүй).
   - Default template тэмдэглэх.

6. ҮҮСГЭХ ҮЙЛДЭЛ
   - server/actions/poster.ts → generatePoster(productId, variantId?, templateId?)
   - Үүссэн зургийг posters bucket руу хадгална:
     {product_id}/{template_id}/{variant_id|all}-{hash}.png
   - Ижил input дээр дахин үүсгэхгүйн тулд input-ийн hash-аар кэшлэ.
   - Барааны хуудсан дээр «Poster үүсгэх» товч → үр дүн preview → хадгалах.
   - Bulk: сонгосон олон бараанд нэг дор poster үүсгэх (дараалалд орно).

7. TEST
   - Мэдэгдэж байгаа input дээр local renderer-ээс гарсан зургийн хэмжээ,
     формат, alpha-г шалгах тест.
   - Кирилл текст зөв зурагдсаныг (pixel биш, satori-ийн font resolve
     алдаагүй болсныг) шалгах тест.
   - Canva renderer-ийг mock-оор тест (жинхэнэ API дуудахгүй).

ЭХЛЭХЭЭС ӨМНӨ: sharp болон @resvg/resvg-js нь Vercel-ийн serverless
орчинд ажиллах эсэхийг шалгаад, шаардлагатай бол тухайн route-д
runtime = 'nodejs' зааж өг. Edge runtime дээр ажиллахгүй.

Commit: "feat(poster): local + canva poster rendering with template editor"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 8 ⭐ — Meta (Facebook + Instagram) automation

> **Plan mode-оор эхлүүл.** Энэ Phase эхлэхээс өмнө `02-GAR-AJILLAGAA.md`-ийн Meta хэсгийг гүйцэтгэсэн байх ёстой.

─── PROMPT ───

```
Facebook Page болон Instagram руу автоматаар нийтлэх системийг бүтээ.
Эхлээд төлөвлөгөө танилцуул.

УРЬДЧИЛСАН НӨХЦӨЛ (би аль хэдийн хийсэн):
- Meta app үүсгэсэн, App ID/Secret .env.local дотор
- Cora Facebook Page байгаа
- Instagram Business account тэр Page-тэй холбогдсон

1. OAUTH ХОЛБОЛТ  /admin/settings/social
   - «Facebook холбох» товч → Meta OAuth dialog.
     Scope: pages_show_list, pages_read_engagement, pages_manage_posts,
            business_management,
            instagram_basic, instagram_content_publish
   - Callback: app/api/oauth/meta/callback/route.ts
   - short-lived → long-lived user token → GET /me/accounts →
     Page-үүдийн жагсаалт → хэрэглэгч Cora Page-ийг сонгоно →
     Page access token авч ШИФРЛЭЭД social_accounts-д хадгална.
   - GET /{page-id}?fields=instagram_business_account → IG user id-г
     автоматаар олж мөн хадгална.
   - Token дуусах огноог хадгалж, 7 хоногийн өмнө admin дээр анхааруулга.
   - «Холболт шалгах» товч: GET /{page-id}?fields=name,fan_count дуудаж
     амжилттай эсэхийг харуулна.
   - Token-ыг lib/crypto.ts-ийн AES-256-GCM-ээр шифрлэ (ENCRYPTION_KEY env).
     Хэзээ ч plaintext-ээр хадгалахгүй, log-д бичихгүй.

2. META CLIENT  (lib/social/meta.ts)
   Graph API v24.0 ашиглана (2025-10-08-нд гарсан, одоогийн хамгийн сүүлийнх).
   Хувилбарыг нэг тогтмолд төвлөрүүл: lib/social/meta.ts дотор
   const GRAPH_VERSION = 'v24.0'. URL дотор hardcode хийхгүй.
   Бүх дуудлага social_api_log-д бичигдэнэ.

   ── Facebook Page: зураг ШУУД нийтлэх ──
   POST /{page-id}/photos
     { url: <public image url>, message: <caption>, access_token }

   ── Facebook Page: зураг ТОВЛОХ ──
   ⚠️ /photos endpoint товлохыг дэмждэггүй. Тиймээс 2 алхам:
   a) POST /{page-id}/photos { url, published: false } → photo_id
   b) POST /{page-id}/feed
        { message, attached_media: [{ media_fbid: photo_id }],
          published: false,
          scheduled_publish_time: <unix seconds> }
   scheduled_publish_time нь одооноос 10 минутаас 6 сарын хооронд байх ёстой.

   ── Instagram: нийтлэх (2 алхам) ──
   a) POST /{ig-user-id}/media { image_url, caption } → creation_id
   b) POST /{ig-user-id}/media_publish { creation_id }
   Алхам a ба b-ийн хооронд container боловсорч байх ёстой —
   GET /{creation_id}?fields=status_code-ийг FINISHED болтол polling хий
   (2 сек интервал, дээд тал нь 60 сек). IN_PROGRESS үед b-г дуудвал
   амжилтгүй болно.
   ⚠️ IG нь ирээдүйд товлохыг API-аар дэмждэггүй. Тиймээс IG post-ыг
   бидний cron таг цагт нь нийтэлнэ.
   ⚠️ image_url заавал PUBLIC HTTPS байх ёстой. Supabase Storage-ийн
   public bucket ашиглана. Signed URL хэрэглэхгүй (Meta cache хийдэг).

   ── Хязгаар шалгах ──
   Нийтлэхийн өмнө GET /{ig-user-id}/content_publishing_limit
   дуудаж 100/24цаг-т хүрсэн эсэхийг шалгана. Хүрсэн бол post-ыг
   дараалалд үлдээж хойшлуулна.

3. POST ЗОХИОХ UI  /admin/posts
   - Календарь харагдац (сар/долоо хоног) + жагсаалт харагдац.
   - «Шинэ пост» dialog:
       • Бараа сонгох (хайлттай)
       • Variant сонгох (заавал биш — сонгоогүй бол үнийн муж харуулна)
       • Template сонгох → poster автоматаар preview болно
       • Caption: AI-аар санал болгох товч (барааны нэр, тайлбар, үнээс
         монгол caption үүсгэнэ). Гараар засаж болно.
       • Hashtag: брэнд + ангиллаас автоматаар санал, гараар нэмнэ.
       • Платформ сонгох: Facebook ☑ Instagram ☑
       • Огноо/цаг сонгох, эсвэл «Одоо нийтлэх»
       • Урьдчилан харах: FB болон IG-ийн жинхэнэ харагдацаар
   - scheduled_posts-д draft → queued төлөвтэй хадгална.

4. НИЙТЛЭХ WORKER
   - app/api/cron/publish/route.ts
     • Authorization: Bearer ${CRON_SECRET} шалгана, буруу бол 401.
     • runtime = 'nodejs', maxDuration = 300
     • status='queued' AND scheduled_at <= now() байгаа постуудыг ав
       (FOR UPDATE SKIP LOCKED-оор түгжиж, давхар ажиллахаас сэргийлнэ).
     • Poster байхгүй бол эхлээд үүсгэнэ (Phase 7-ийн renderer).
     • Платформ бүрд нийтлээд post_results-д бичнэ.
     • Амжилтгүй бол attempts++ болгож, exponential backoff-оор дахин
       оролдоно. 3 удаа унасны дараа status='failed', алдааг хадгална.
     • Хэсэгчилсэн амжилт (FB болсон, IG уначихсан) тохиолдлыг зөв
       шийд: дахин оролдохдоо аль хэдийн нийтлэгдсэн платформ руу
       ДАВХАР нийтлэхгүй.
   - vercel.json дотор cron: 5 минут тутамд.
   - «Одоо нийтлэх» үед cron хүлээхгүй, Server Action-оос шууд дуудна.

5. WEBHOOK  app/api/webhooks/meta/route.ts
   - GET: hub.challenge verification (META_WEBHOOK_VERIFY_TOKEN-оор).
   - POST: X-Hub-Signature-256 гарын үсгийг APP_SECRET-ээр шалгана.
     Буруу бол 401. Шалгахгүйгээр өгөгдөл боловсруулахгүй.
   - Feed comment/message event-ийг хүлээж аваад DB-д хадгална
     (одоохондоо зөвхөн бүртгэнэ, хариулахгүй).

6. АЛДАА ЗАСВАРЛАХ UI
   - /admin/posts дээр failed постуудыг улаанаар, алдааны мессежтэй.
   - «Дахин оролдох» товч.
   - /admin/settings/social дээр сүүлийн 50 API дуудлагын log
     (зөвхөn owner/admin харна, token хэсэглэн нуусан байна).

7. ЗААВАЛ ТЕСТ
   - Meta client-ийг mock server дээр тест (msw ашиглаж болно).
   - Товлолтын unix timestamp хөрвүүлэлт Asia/Ulaanbaatar-аас UTC руу
     зөв болсныг тест. ЭНЭ АЛДАА ХАМГИЙН ОЛОН ГАРДАГ.
   - Rate limit хүрсэн үеийн зан төлөвийг тест.
   - Хэсэгчилсэн амжилтын дараах дахин оролдлого давхардуулахгүй байгааг тест.

ЭХЛЭХЭЭС ӨМНӨ: Хэрэв Meta credential .env.local-д байхгүй бол надаас
асуу, дутуу утгаар цаашаа явахгүй.

Commit: "feat(social): meta oauth, scheduled publishing and webhook handling"
```

─── PROMPT ТӨГСӨВ ───

---

## Phase 9 — Хатууруулах, тест, deploy

─── PROMPT ───

```
Production-д гаргахад бэлтгэ.

1. АЮУЛГҮЙ БАЙДЛЫН ШАЛГАЛТ
   - Бүх хүснэгтэд RLS асаалттай эсэхийг шалгах SQL script бич,
     үр дүнг тайлагна.
   - Storefront-ийн бүх query-г шалгаж cost_price алдагдаагүйг батал.
     Үүнийг e2e тестээр барь: public API response дотор "cost" гэсэн
     үг байвал тест унана.
   - service_role key client bundle дотор ороогүйг шалга
     (build-ийн дараа .next доторх JS файлуудаас хай).
   - Server Action бүр requireRole-оор эхэлж байгааг шалгах lint дүрэм
     эсвэл script бич.
   - Security headers: CSP, X-Frame-Options, Referrer-Policy,
     Permissions-Policy (next.config.ts).
   - Public form дээр rate limit (Upstash Redis эсвэл Vercel KV).

2. ТЕСТ
   - Unit: lib/money, lib/costing, lib/analytics, lib/sku — coverage ≥ 80%.
   - E2E (Playwright), доод тал нь эдгээр урсгал:
       нэвтрэх → бараа үүсгэх (variant-тай) → нөөц нэмэх →
       захиалга үүсгэх → ашиг зөв харагдах →
       poster үүсгэх → пост товлох
   - CI дээр e2e ажиллана (Supabase local контейнер дээр).

3. АЖИГЛАЛТ
   - Sentry суулгах (client + server + edge).
   - /api/health — DB, Storage, Meta token хүчинтэй эсэхийг буцаана.
   - Cron унасан үед owner-т и-мэйл/мэдэгдэл.

4. ГҮЙЦЭТГЭЛ
   - next build-ийн bundle analyzer ажиллуулж 200KB-аас том
     client chunk байвал засах.
   - N+1 query хайж засах.
   - Storage зурагт хувиргалт (Supabase image transform) хэрэглэх.

5. DEPLOY
   - Vercel-д холбох алхмуудыг README-д бич.
   - Env var-уудын жагсаалтыг Vercel-д оруулах маягаар бэлд.
   - Preview deploy-д тусдаа Supabase branch ашиглах тохиргоо.
   - vercel.json: cron, region (Singapore — Монголд хамгийн ойр).
   - Migration-ийг deploy үед автоматаар ажиллуулах GitHub Action.

6. БАРИМТ БИЧИГ (docs/ доор, монголоор)
   - operations.md — өдөр тутам ажиллуулах заавар (бараа нэмэх,
     захиалга бүртгэх, пост товлох)
   - runbook.md — түгээмэл асуудал: Meta token дууссан, cron унасан,
     poster үүсэхгүй байна, нөөц зөрүүтэй
   - schema.md — ERD (аль хэдийн байгаа, шинэчил)

ДУУСГАХ: Бүх тест ногоон, build цэвэр.
Commit: "chore: production hardening, tests and deployment setup"
```

─── PROMPT ТӨГСӨВ ───

---

## Нэмэлт: Claude Chrome extension-д өгөх prompt-ууд

Эдгээрийг **Claude extension** (Chrome дээрх) дээр ашиглана — код биш, вэб дээрх тохиргооны ажил.

### A. Instagram нэрийг Cora болгож солих

```
Instagram хуудас нээгээд Cora брэндтэй холбоотой account-ийн username-ийг
солиход надад алхам алхмаар туслаач.

1. Эхлээд одоогийн профайлын тохиргоо руу оруулж, одоогийн username болон
   display name юу байгааг надад хэл.
2. «cora» суурьтай ямар username сул байгааг шалгаж 3-5 хувилбар санал болго
   (жишээ: cora.mn, coramongolia, cora_official). Шалгахдаа тухайн
   хаягийг нээж үзээд эзэнтэй эсэхийг батал.
3. Би нэгийг сонгосны дараа л username-ийг сольж эхэл. Миний зөвшөөрөлгүй
   ямар ч өөрчлөлт хийхгүй.
4. Мөн Display name-ийг "Cora" болго.
5. Солисны дараа профайл зөв харагдаж байгааг шалгаад, шинэ хаягийг
   надад бич.

САНАМЖ: username солих нь тодорхой хугацаанд хязгаартай бөгөөд хуучин
хаяг чөлөөлөгдөж өөр хүн авч болзошгүй. Солихын өмнө үүнийг сануул.
```

### B. Meta app + Business Suite тохиргоо

```
developers.facebook.com дээр Cora төсөлд зориулсан Meta app үүсгэхэд
алхам алхмаар тусал. Дараах зүйлийг гүйцэтгэнэ:

1. Шинэ app үүсгэх (Business төрөл).
2. "Facebook Login for Business" болон "Instagram" product-уудыг нэмэх.
3. Valid OAuth Redirect URI-д дараахыг нэмэх:
     http://localhost:3000/api/oauth/meta/callback
     https://<миний-домэйн>/api/oauth/meta/callback
4. App ID болон App Secret-ийг олж надад харуул (би хуулж авна).
5. App-д дараах permission-уудыг хүсэлт гаргах хэсгийг олж үзүүл:
     pages_show_list, pages_read_engagement, pages_manage_posts,
     business_management, instagram_basic, instagram_content_publish
6. business.facebook.com дээр Cora Page болон Instagram account
   хоорондын холболт зөв эсэхийг шалгах.
7. Instagram account нь Business (Creator биш) төрөлтэй эсэхийг батал —
   Content Publishing API нь Business account шаарддаг.

Алхам бүрийн дараа надад юу болсныг хэлж байгаарай. Secret утгыг
дэлгэц дээр үлдээхгүй, надад хэлсний дараа хуудсыг хаа.
```

### C. Canva Enterprise хэрэгтэй эсэхийг шалгах

```
canva.com дээрх миний account-ийн төлөвлөгөөг шалгаж, дараах асуултад
хариул:

1. Одоогийн plan юу вэ (Free / Pro / Teams / Enterprise)?
2. Brand Template үүсгэх боломж байна уу?
3. canva.dev дээрх Developer portal-д app үүсгэж болох уу?

Хэрэв Enterprise биш бол Autofill API ашиглах боломжгүй. Тэр тохиолдолд
надад дараахыг хийж өгөөч:
- Cora-д зориулсан 1080×1350 хэмжээтэй хоосон poster template үүсгэх
  хуудас руу орж, PNG-ээр export хийх алхмыг зааж өг.
- Export хийхдээ дэвсгэрийг ил тод (transparent) болгох сонголт
  байгаа эсэхийг шалга.
```

---

## Асуудал гарвал ашиглах prompt-ууд

**Схем засах:**
```
<хүснэгтийн нэр>-д <талбар> нэмэх шаардлагатай боллоо. Шинэ migration
файл үүсгээд нэм. Байгаа migration-ийг ЗАСАХГҮЙ. Дараа нь RLS policy,
type, түүнийг ашигладаг бүх код, тестийг шинэчил.
```

**Ашгийн тоо буруу байвал:**
```
<огноо>-ны ашгийн дүн буруу байна. Гараар тооцоход <X> гарах ёстой
атлаа UI дээр <Y> харагдаж байна. Тооцооллын гинжин хэлхээг
order_items-ээс эхлээд дагаж шалгаад, аль алхамд зөрж байгааг ол.
Засахаасаа өмнө шалтгааныг надад тайлбарла.
```

**Meta API алдаа:**
```
Meta руу нийтлэхэд дараах алдаа гарлаа:
<алдааны бүтэн текст>
social_api_log дахь тухайн дуудлагын request/response-ийг уншаад
шалтгааныг ол. Meta-ийн error code-ийн баримтыг шалга. Засвар санал болго.
```
