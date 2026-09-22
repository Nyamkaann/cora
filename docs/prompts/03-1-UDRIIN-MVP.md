# Cora — 1 өдрийн MVP

**Зорилго:** өдрийн эцэст бодит барааныхаа мэдээллийг оруулж, захиалга бүртгэж, **ашгаа тоогоор харах**. Poster автоматаар үүсээд PNG татагдана.

**Хассан:** public storefront, Meta OAuth, автомат нийтлэл, худалдан авалтын модуль. Эдгээрийг дараа `01-PROMPTS-YE-SHAT.md`-ийн Phase 6, 8-аар нэмнэ.

---

## Өдрийн хуваарь

| Цаг | Session | Юу гарах вэ |
|---|---|---|
| 08:30–09:00 | **Бэлтгэл** | Supabase credential, bucket, logo |
| 09:00–10:30 | **S1** Суурь + схем + auth | Нэвтэрч ордог хоосон admin |
| 10:30–12:30 | **S2** Бараа + variant | Бараагаа M/L/XL, 100ml/300ml-ээр оруулна |
| 12:30–13:00 | Цайны завсарлага | |
| 13:00–15:00 | **S3** Захиалга + нөөц + зардал | Борлуулалтаа бүртгэнэ |
| 15:00–16:30 | **S4** Ашгийн самбар | **Гол үр дүн — ашгаа харна** |
| 16:30–17:30 | **S5** Poster generator | Зураг үүсгээд татаж авна |
| 17:30–18:00 | **Deploy** | Vercel дээр амьд болно |

**Хатуу дүрэм:** цагийн хуваарьт орохгүй бол S5-ыг эхлээд хая, дараа нь S3-ын зардлын хэсгийг хая. **S4-ийг хэзээ ч хаяхгүй** — тэр бол төслийн гол зорилго.

---

## Бэлтгэл (30 мин, код бичихээс өмнө)

### 1. Supabase
Dashboard → Settings-ээс цуглуул:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # ⚠️ нууц
```

Storage → New bucket (2 ширхэг, хоёулаа **Public**):
- `product-images`
- `posters`

### 2. Өөрийн admin хэрэглэгч
Supabase → Authentication → Users → **Add user** → и-мэйл + нууц үг. Энэ хаягаар нэвтэрнэ.

### 3. Файлууд
```bash
mkdir cora && cd cora && git init
# CLAUDE-MVP.md-г энэ фолдер руу CLAUDE.md нэрээр хуулна
```

### 4. Барааны зураг
3-5 бараагаа **ил тод дэвсгэртэй PNG** болго (remove.bg эсвэл Canva Background Remover). S5-д хэрэгтэй. Одоо хийчихвэл дараа гацахгүй.

---

## S1 — Суурь + схем + auth *(1.5 цаг)*

─── PROMPT ───

```
Cora MVP-ийн суурийг тавь. CLAUDE.md-г уншиж дүрмийг нь мөрд.
Энэ бол 1 өдрийн MVP — хамрах хүрээг өөрөө өргөтгөхгүй, нэмэлт feature
бодохгүй. Хурд чухал.

── A. SCAFFOLD ──
1. Next.js 15 App Router (TypeScript, Tailwind v4, ESLint, App Router,
   src ашиглахгүй, alias "@/*"). pnpm.
2. tsconfig: strict, noUncheckedIndexedAccess.
3. shadcn/ui init + нэм: button input label select table dialog form card
   badge tabs sonner skeleton separator sheet dropdown-menu popover
   calendar command alert textarea checkbox
4. Суулга: @supabase/supabase-js @supabase/ssr zod react-hook-form
   @hookform/resolvers date-fns date-fns-tz decimal.js lucide-react
   nuqs @tanstack/react-table recharts
   dev: vitest supabase
5. lib/env.ts — Zod-оор env шалгах (URL, ANON_KEY, SERVICE_ROLE_KEY,
   NEXT_PUBLIC_SITE_URL). .env.example мөн үүсгэ.
6. lib/money.ts — decimal.js дээр:
     parseMoney, formatMNT ("₮ 125,000"), add, sub, mul, div,
     percentage(part, whole), marginPct(cost, price), toDbNumeric
   vitest test бич: 0, сөрөг, тэрбум, бутархай, тэгд хуваах.
7. lib/supabase/{server,client,admin}.ts (@supabase/ssr ашиглана,
   admin.ts эхэнд import 'server-only').
8. package.json: dev build start lint typecheck test
   db:types → supabase gen types typescript --linked > types/database.ts

── B. DATABASE (supabase/migrations/) ──
Дараах 11 хүснэгт. Бүгд uuid pk, created_at, updated_at (trigger-тэй).

profiles          id(=auth.users.id), email, full_name,
                  role text default 'admin'

brands            name, slug, logo_url
categories        name, slug, sort_order            ← мод бүтэц ХЭРЭГГҮЙ, хавтгай

products          brand_id, category_id, name, slug, description,
                  option_types text[] default '{}',   ← '{Size}' | '{Volume}' | '{}'
                  status text default 'active',       ← 'active'|'archived'
                  is_featured bool, deleted_at

product_images    product_id, storage_path, sort_order,
                  is_primary bool, is_transparent bool

product_variants  product_id,
                  sku text unique,
                  attributes jsonb default '{}',      ← {"Size":"M"}
                  cost_price numeric(14,2) not null,
                  sale_price numeric(14,2) not null,
                  is_active bool default true,
                  sort_order int, deleted_at,
                  UNIQUE(product_id, attributes)

stock_movements   variant_id, qty int not null,       ← +орлого / −зарлага
                  reason text,                        ← 'stock_in'|'sale'|'return'|'adjustment'|'damage'
                  unit_cost numeric(14,2),
                  reference_id uuid, note, created_by

orders            order_no text unique,               ← CORA-260922-001
                  channel text,                       ← 'facebook'|'instagram'|'offline'|'other'
                  customer_name, customer_phone, delivery_address,
                  delivery_fee numeric(14,2) default 0,
                  discount_amount numeric(14,2) default 0,
                  status text default 'pending',      ← 'pending'|'confirmed'|'delivered'|'cancelled'|'returned'
                  payment_status text default 'unpaid',
                  ordered_at timestamptz default now(), note

order_items       order_id, variant_id, qty int,
                  unit_price numeric(14,2) not null,
                  unit_cost  numeric(14,2) not null,   ← SNAPSHOT
                  product_name_snapshot text,
                  variant_label_snapshot text

expenses          category text,                       ← энгийн text, тусдаа хүснэгт ХЭРЭГГҮЙ
                  amount numeric(14,2), expense_date date,
                  description, created_by

poster_templates  name, background_path, layout jsonb,
                  is_default bool, is_active bool

VIEW / FUNCTION:
  v_variant_stock     variant_id, current_stock (stock_movements SUM)
  v_order_profit      order_id, revenue, cost, gross_profit, margin_pct
  fn_profit_report(p_from date, p_to date) returns table(
      revenue, cogs, gross_profit, expenses, net_profit,
      order_count, unit_count )
  v_top_products      бараа тус бүрийн зарагдсан тоо, орлого, ашиг

TRIGGER:
  - updated_at автомат шинэчлэл бүх хүснэгтэд
  - auth.users insert → profiles автоматаар үүсэх
  - order_no автомат үүсгэх (CORA-YYMMDD-NNN)

RLS — ЗААВАЛ:
  Бүх хүснэгтэд RLS ASAA.
  MVP-д бодлого энгийн: authenticated хэрэглэгч бүх үйлдэл хийнэ,
  anon ямар ч эрхгүй. (Public storefront MVP-д байхгүй тул
  нарийн бодлого хэрэггүй.)

INDEX: бүх FK дээр, products(slug), product_variants(product_id),
  stock_movements(variant_id), orders(ordered_at, status),
  order_items(order_id), attributes дээр GIN.

SEED (supabase/seed.sql):
  Cora брэнд, 4 ангилал,
  6 бараа: 2 нь Size (M/L/XL), 2 нь Volume (100ml/300ml/500ml), 2 нь variant-гүй
  Бодит МНТ үнэ: өртөг 25,000–80,000 / зарах 45,000–150,000
  Эхний нөөц stock_movements-ээр
  Сүүлийн 60 хоногт тархсан 18 захиалга, 8 зардал
  → S4-ийн график хоосон харагдахгүй байхад хангалттай

── C. AUTH + ADMIN SHELL ──
1. app/(auth)/login — email+password, монгол UI, Zod. Бүртгүүлэх хуудас
   БАЙХГҮЙ (хэрэглэгчийг Supabase dashboard-аас нэмнэ).
2. app/api/auth/callback/route.ts
3. middleware.ts — /admin/* хамгаална.
4. lib/auth.ts: getSession(), requireUser()
5. app/admin/layout.tsx — зүүн sidebar + header. Mobile дээр Sheet.
   Цэс: Хяналтын самбар / Бараа / Нөөц / Захиалга / Зардал / Ашиг орлого / Постер
6. Ерөнхий component:
   - components/admin/page-header.tsx
   - components/admin/data-table.tsx (@tanstack/react-table, хайлт+sort+pagination)
   - components/admin/money-input.tsx (мянгатын таслал, гаралт string decimal)
   - components/admin/stat-card.tsx
   - components/admin/empty-state.tsx
7. /admin нүүрт түр placeholder (S4-д бөглөнө).

── ДУУСГАХ ──
- supabase link хийх командыг надад хэл, project ref-ээ би өгнө.
- Миграцийг push хийж, pnpm db:types ажиллуул.
- pnpm typecheck && pnpm build цэвэр.
- git commit: "feat: mvp foundation, schema, auth and admin shell"

ГАЦВАЛ: 2 удаа оролдоод болохгүй бол зогсоод надаас асуу.
```

─── ТӨГСӨВ ─── `/clear` хийгээд S2 руу.

---

## S2 — Бараа + variant *(2 цаг)*

─── PROMPT ───

```
Барааны удирдлагыг хий. Энэ бол админы хамгийн их ашиглах дэлгэц —
хурдан оруулж чаддаг байх нь чухал. Гоо сайхныг хойш тавь.

1. /admin/products — ЖАГСААЛТ
   data-table: үндсэн зураг, нэр, брэнд, ангилал, variant тоо,
   үнийн муж, нийт нөөц, ашгийн дундаж %, төлөв.
   Шүүлтүүр: брэнд, ангилал, төлөв, "нөөц дууссан", текст хайлт.

2. /admin/products/new болон /admin/products/[id] — ФОРМ
   Нэг хуудсанд 3 хэсэг (tab биш, дараалсан section — хурдан байх):

   ── Үндсэн ──
   Нэр · slug (нэрнээс автомат, кирилл→латин транслитерац) · брэнд ·
   ангилал · тайлбар · төлөв

   ── Хувилбар (ХАМГИЙН ЧУХАЛ) ──
   Эхлээд option сонгоно: [Байхгүй] [Size] [Volume] [Захиалгат]
     • Size  → XS S M L XL XXL чагтлах
     • Volume → утга бичиж нэмэх (100ml, 300ml, 500ml)
     • Захиалгат → option-ий нэр + утгууд өөрөө
     • Байхгүй → ганц default variant (attributes = {})
   Сонголтоос variant мөрүүд АВТОМАТААР үүснэ.
   Мөр бүрд: SKU (автомат санал CORA-{slug}-{утга}) · өртөг · зарах үнэ ·
             эхний нөөц · идэвхтэй
   Мөрийн баруун талд ашгийн % шууд харагдана:
     (sale − cost) / sale × 100
     улаан <20% · шар 20–40% · ногоон >40%
   «Эхний мөрийн үнийг бүгдэд хуулах» товч.

   ── Зураг ──
   Олон зураг сонгож upload (drag-drop). Дараалал өөрчлөх.
   Зураг бүрд 2 чагт: «Үндсэн» · «Ил тод дэвсгэртэй (poster-т)»
   Supabase Storage product-images руу: {product_id}/{uuid}.{ext}
   Upload-ын өмнө 2000px-ээс их бол browser дээр багасга.
   PNG-д alpha байвал is_transparent-ийг автоматаар чагтал.

3. SERVER ACTIONS (server/actions/products.ts)
   createProduct · updateProduct · archiveProduct · duplicateProduct
   upsertVariants · deleteVariant
   reorderImages · setPrimaryImage · deleteImage
   Бүгд эхлээд requireUser(), дараа нь Zod parse.
   Буцаалт: { ok: true, data } | { ok: false, error: { message } }

4. VALIDATION
   - sale_price < cost_price бол хориглохгүй, харин тод анхааруулга
   - SKU давхардвал алдаа
   - Нэг product дотор attributes давхардвал алдаа
   - Борлуулалттай variant устгахыг зогсоож «идэвхгүй болгох» санал болго

5. Эхний нөөц оруулбал stock_movements-д reason='stock_in' мөр орно
   (unit_cost = тухайн variant-ийн cost_price).

ДУУСГАХ: seed-ийн 6 бараа зөв харагдаж, шинээр 1 бараа үүсгээд
variant-тай нь хадгалж чадаж байгааг батал.
typecheck + build цэвэр. Commit: "feat(products): product and variant management"

САНАМЖ: bulk import, CSV, barcode scanner, олон агуулах — эдгээрийг
БҮҮ хий. Санаа байвал docs/backlog.md-д бич.
```

─── ТӨГСӨВ ─── `/clear`

> **Энд бодит барааныхаа мэдээллийг оруулж эхэл.** Цайны завсарлагаагаар хийж болно — S3 ажиллахад бодит өгөгдөл байвал илүү сайн.

---

## S3 — Захиалга + нөөц + зардал *(2 цаг)*

─── PROMPT ───

```
Борлуулалт, нөөц, зардлын бүртгэлийг хий. Ашгийн тооцооллын үнэн зөв
байдал энэ session-ээс шалтгаална — snapshot дүрмийг чанд мөрд.

1. /admin/orders — ЗАХИАЛГА
   Жагсаалт: order_no · огноо · суваг · харилцагч · нийт дүн · ашиг ·
             төлөв · төлбөр
   Шүүлтүүр: огнооны муж · суваг · төлөв

   Захиалга үүсгэх form:
     • Суваг: Facebook / Instagram / Биечлэн / Бусад
     • Харилцагч: нэр, утас, хаяг, тэмдэглэл
     • Бараа нэмэх: variant хайх combobox (нэр эсвэл SKU-гаар,
       одоогийн нөөцийг хажууд нь харуулна) → тоо → үнэ
       (variant-ийн sale_price автоматаар ирнэ, гараар засаж болно)
     • Нийт хөнгөлөлт, хүргэлтийн төлбөр
     • Баруун талд ШУУД ТООЦООЛОЛ (client дээр биш, server action-аар
       дахин баталгаажуулна):
         Нийт борлуулалт / Нийт өртөг / Бохир ашиг / Ашгийн %

   ⚠️ ХАДГАЛАХ ҮЕД order_items.unit_cost-д ТУХАЙН МӨЧИЙН
      variant.cost_price-ыг snapshot хий. Мөн product_name_snapshot,
      variant_label_snapshot-ыг бөглө.

   Төлөв: pending → confirmed → delivered (cancelled / returned)
     • confirmed болох үед stock_movements-д reason='sale' сөрөг мөр
     • cancelled/returned болбол reason='return' эерэг мөр (буцаалт)
     • нөөц хүрэхгүй бол confirmed болгохыг зогсоож анхааруул
   Энэ шилжилтийг Postgres function дотор атомикоор хий — хэсэгчилсэн
   бичилт болж болохгүй.

   Захиалгын дэлгэрэнгүй хуудас: мөрүүд, ашиг, төлвийн түүх.

2. /admin/inventory — НӨӨЦ
   v_variant_stock дээр: бараа · variant · SKU · нөөц · өртөг ·
   нөөцийн үнэ (нөөц × өртөг) · сүүлийн хөдөлгөөн
   «Нөөц нэмэх» dialog: тоо + нэгжийн өртөг → stock_in мөр.
     Өртөг өөр байвал variant.cost_price-ыг ЖИГНЭСЭН ДУНДАЖ-аар шинэчил:
       new = (хуучин_нөөц × хуучин_өртөг + шинэ_тоо × шинэ_өртөг)
             / (хуучин_нөөц + шинэ_тоо)
     Энэ функцийг lib/costing.ts дотор бич + vitest test.
   «Тохируулах» dialog: шалтгаан (тоолго / гэмтэл / алдаа засах) + тоо
   Variant дээр дарвал хөдөлгөөний бүтэн түүх.
   Бага нөөц (< 5) улаанаар. CSV экспорт.

3. /admin/expenses — ЗАРДАЛ
   Энгийн жагсаалт + нэмэх form: ангилал (сонгох/бичих: зар сурталчилгаа,
   түрээс, цалин, тээвэр, бусад) · дүн · огноо · тайлбар
   Сараар бүлэглэсэн харагдац.

4. UNIT TEST (заавал, зөвхөн эдгээр):
   - жигнэсэн дундаж өртөг
   - захиалгын ашиг (хөнгөлөлт + хүргэлттэй)
   - буцаалтын нөөцийн хөдөлгөөн

ДУУСГАХ: seed дээрх захиалгуудын ашиг гараар тооцсонтой таарч байгааг
шалга. typecheck + build цэвэр.
Commit: "feat(operations): orders, inventory ledger and expenses"

БҮҮ ХИЙ: төлбөрийн gateway, хүргэлтийн интеграц, и-мэйл мэдэгдэл,
харилцагчийн CRM. Backlog-д бич.
```

─── ТӨГСӨВ ─── `/clear`

---

## S4 — Ашгийн самбар *(1.5 цаг)* — **төслийн гол зорилго**

─── PROMPT ───

```
Ашиг орлогын хяналтын самбарыг хий. Энэ бол төслийн гол зорилго —
чанартай хий.
График зурахаас ӨМНӨ dataviz skill-ийг уншаад дүрмийг мөрд.
Library: recharts.

1. /admin — ҮНДСЭН САМБАР
   Дээд талд огнооны муж: Өнөөдөр · 7 хоног · 30 хоног · Энэ сар ·
   Өнгөрсөн сар · Захиалгат. Сонголт URL-д (nuqs).

   4 stat card, өмнөх ижил урттай хугацаатай харьцуулсан % өөрчлөлттэй:
     • Нийт борлуулалт (₮)
     • Бохир ашиг (₮) + ашгийн %
     • Цэвэр ашиг (₮)      ← бохир ашиг − зардал
     • Захиалгын тоо + дундаж захиалгын дүн

   Графикууд:
     • Борлуулалт vs Бохир ашиг — өдрөөр, давхар шугам
     • Суваг тус бүрийн борлуулалт — баганан
     • Хамгийн ашигтай 10 бараа — хэвтээ баганан
     • Зардал ангиллаар — donut
     • Бага нөөцтэй барааны жагсаалт (жижиг хүснэгт)

2. /admin/analytics — ТАЙЛАН (3 tab)

   «Ашгийн тайлан» — fn_profit_report:
       Борлуулалтын орлого
     − Борлуулсан барааны өртөг (COGS)
     = Бохир ашиг                  (%)
     − Үйл ажиллагааны зардал      (ангиллаар задалсан)
     = Цэвэр ашиг                  (%)
     Сар бүрээр багана болгон харьцуулсан хүснэгт.

   «Бараагаар» — бараа/variant бүрийн зарагдсан тоо, орлого, өртөг,
     ашиг, ашгийн %. Sort хийж болно.

   «Хугацаагаар» — өдөр / долоо хоног / сараар нэгтгэсэн.

   Тайлан бүрийг CSV-ээр татах.

3. ТООЦООЛЛЫН ДҮРЭМ (lib/analytics/ дотор цэвэр функц)
   - COGS = Σ(order_items.qty × order_items.unit_cost)  ← snapshot-оос,
     одоогийн cost_price-аас БИШ
   - Зөвхөн status IN ('confirmed','delivered') тооцоонд орно.
     cancelled орохгүй. returned сөргөөр орно.
   - Зардлыг expense_date-ээр хугацаанд оноож тооцно
   - Бүх тооцоолол decimal.js — float хэзээ ч
   - Тэгд хуваахаас хамгаал (0 борлуулалттай хугацаа)

4. UNIT TEST (заавал):
   хоосон хугацаа · буцаалттай · хөнгөлөлттэй · 0 борлуулалттай

5. ГҮЙЦЭТГЭЛ: нэгтгэлийг Postgres дээр SQL-ээр хий, JS дээр биш.

ДУУСГАХ: seed өгөгдлийн нэг сарын ашгийг гараар тооцоод UI-тай тулга.
Зөрвөл засаад шалтгааныг надад хэл.
Commit: "feat(analytics): profit dashboard and reports"
```

─── ТӨГСӨВ ─── `/clear`

---

## S5 — Poster generator *(1 цаг)* — *цаг хүрэхгүй бол энэ хаягдана*

─── PROMPT ───

```
Poster автоматаар үүсгэх энгийн систем хий.
MVP-д Facebook/Instagram OAuth БАЙХГҮЙ — зөвхөн PNG үүсгээд ТАТАЖ АВНА.
Хэрэглэгч гараар Meta Business Suite руу оруулна.

ЗАРЧИМ: Canva дээр 1 удаа зохиосон дэвсгэр PNG дээр барааны ил тод
зураг + нэр + үнэ давхарлана.

1. RENDERER — lib/poster/render.ts
   - Дэвсгэр: poster_templates.background_path дээрх PNG (Supabase Storage)
   - Давхарлах: sharp.composite()
   - Текст: satori-гаар JSX → SVG → @resvg/resvg-js → PNG → sharp-аар давхарлана
     (sharp дангаараа текст зурж чадахгүй)
   - Барааны зураг: URL-ээс татаад layout.product хүрээнд "contain"
     горимоор, харьцаа хадгална
   - layout jsonb:
     {
       "canvas": { "width": 1080, "height": 1350 },
       "product": { "x": 140, "y": 260, "w": 800, "h": 800 },
       "title":   { "x": 80, "y": 1090, "w": 920, "size": 56, "weight": 700,
                    "color": "#111", "align": "center", "maxLines": 2 },
       "price":   { "x": 80, "y": 1180, "w": 920, "size": 72, "weight": 800,
                    "color": "#111", "align": "center" },
       "logo":    { "x": 80, "y": 80, "w": 180 }
     }

   ⚠️ КИРИЛЛ ФОНТ: public/fonts/ доор кирилл дэмждэг TTF тавьж satori-д
   өг. Кирилл үсэг хайрцаг (□□□) болж харагдвал буруу — заавал нүдээр шалга.
   Inter эсвэл Noto Sans-ийн Cyrillic subset ашигла.

2. ТЕМПЛЕЙТ — /admin/posters
   - Дэвсгэр зураг upload (posters bucket)
   - Layout-ийг ВИЗУАЛЬ тохируулна: дэвсгэр дээр чирж болох хайрцгууд
     (product, title, price, logo), хэмжээ өөрчлөх, фонтын хэмжээ/өнгө
   - «Урьдчилан харах»: бараа сонгоод жинхэнэ poster шууд харуулна
   - Default template тэмдэглэх

3. ҮҮСГЭХ
   - app/api/poster/route.ts (runtime = 'nodejs', edge БИШ)
     { productId, variantId?, templateId? } → PNG буфер буцаана
   - Барааны хуудас болон жагсаалт дээр «Poster үүсгэх» товч
     → preview dialog → «Татах» товч (PNG)
   - Үүссэн зургийг posters bucket-д мөн хадгална (кэш):
     {product_id}/{template_id}/{variant_id|all}.png
   - Bulk: сонгосон олон бараанд нэг дор үүсгээд ZIP-ээр татах

4. Хэмжээ: 1080×1350 (IG portrait) үндсэн. Template дотор canvas
   хэмжээг өөрчилж болно.

5. Урт нэрийг 2 мөр болгож таслана, багтахгүй бол «…».

ДУУСГАХ: sharp болон @resvg/resvg-js Vercel serverless дээр ажиллах
эсэхийг шалгаад, шаардлагатай тохиргоог next.config.ts-д нэм.
Кирилл текст зөв гарч байгааг НҮДЭЭР шалгуулж надад зураг үзүүл.
Commit: "feat(poster): template editor and poster generation"

БҮҮ ХИЙ: Canva API, Meta OAuth, товлолт, автомат нийтлэл.
Эдгээр дараагийн шатанд.
```

─── ТӨГСӨВ ─── `/clear`

---

## Deploy *(30 мин)*

─── PROMPT ───

```
Vercel дээр гаргахад бэлтгэ. Хурдан, хамгийн бага хэмжээгээр.

1. next.config.ts — Supabase Storage-ийн remotePatterns, sharp-ийн
   serverExternalPackages тохиргоо
2. Security headers: X-Frame-Options, Referrer-Policy, X-Content-Type-Options
3. service_role key client bundle дотор ороогүйг шалга:
   pnpm build хийгээд .next/static доторх JS файлуудаас хай, тайлагна
4. .env.example бүрэн эсэхийг шалга
5. README.md — суулгах, ажиллуулах, deploy хийх заавар (монголоор)
6. docs/backlog.md — өнөөдөр хойшлуулсан бүх зүйлийн жагсаалт
7. GitHub repo үүсгээд push хийх командыг надад хэл
8. Vercel-д оруулах env var-уудын жагсаалтыг бэлд.
   Region: Singapore (sin1)

typecheck + lint + build цэвэр.
Commit: "chore: deployment configuration"
```

─── ТӨГСӨВ ───

Vercel дээр: GitHub repo холбох → env var оруулах → Deploy → `NEXT_PUBLIC_SITE_URL`-ийг жинхэнэ домэйнээр солих → дахин deploy.

---

## Маргааш үргэлжлүүлэх

`01-PROMPTS-YE-SHAT.md`-ээс:

| Дараалал | Phase | Хугацаа |
|---|---|---|
| 1 | **Phase 8** — Meta OAuth + автомат нийтлэл | ~1 өдөр |
| 2 | **Phase 7** — Canva adapter, bulk poster | ~0.5 өдөр |
| 3 | **Phase 6** — public storefront | ~1 өдөр |
| 4 | **Phase 9** — тест, хамгаалалт, ажиглалт | ~0.5 өдөр |
| 5 | **Phase 4**-ийн худалдан авалтын модуль (landed cost) | ~0.5 өдөр |

Эхлэхийн өмнө `CLAUDE.md`-ийг **бүтэн хувилбараар** сольж тавина.

---

## Өдрийн турш гацвал

| Асуудал | Хийх зүйл |
|---|---|
| Migration алдаа өгч байна | `supabase db reset` → дахин push. Гараар SQL бүү зас |
| Ашгийн тоо буруу | `order_items.unit_cost` snapshot хийгдсэн эсэхийг эхлээд шалга |
| Кирилл үсэг □□□ болж байна | satori-д өгсөн фонт Cyrillic subset-тэй эсэхийг шалга |
| sharp Vercel дээр унаж байна | route-д `runtime = 'nodejs'` заасан эсэхийг шалга, edge биш |
| Session удааширсан | `/clear` хийж дараагийн S руу. Хуучин context бүү чир |
| Цаг хүрэхгүй байна | S5 хая → S3-ын зардлын хэсэг хая → S2-ын зургийн хэсэг хая. **S4 хэзээ ч бүү хая** |
