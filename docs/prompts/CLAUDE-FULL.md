# CLAUDE.md — Cora Commerce Platform

> Энэ файл нь төслийн **үндсэн хууль**. Claude Code session бүрт автоматаар уншигдана.
> Энд бичсэн зүйлийг зөрчихгүй. Эргэлзвэл ажлаа зогсоод асуу.

---

## 1. Төслийн мөн чанар

**Cora** — Facebook page-ээр бараа зардаг брэнд. Энэ repo нь 3 бүтээгдэхүүнийг нэг codebase дотор агуулна:

1. **Storefront** (`/`) — олон нийтэд нээлттэй веб дэлгүүр
2. **Admin dashboard** (`/admin`) — бараа бүртгэх, өртөг/зарах үнэ оруулах, нөөц хянах, **ашиг орлого тооцоолох**
3. **Social automation** — poster автоматаар үүсгээд Facebook Page + Instagram руу нийтлэх

Брэнд: **Cora**. Logo болон brand asset нь `/public/brand/` дотор.

---

## 2. Tech stack — хатуу, өөрчлөхгүй

| Давхарга | Технологи |
|---|---|
| Framework | **Next.js 15+ App Router**, React 19, Server Components default |
| Хэл | **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess: true`) |
| UI | **Tailwind CSS v4** + **shadcn/ui** + `lucide-react` |
| Backend | **Supabase** — Postgres, Auth, Storage, RLS, Edge Functions |
| Hosting | **Vercel** |
| Package manager | **pnpm** |
| Validation | **Zod** (бүх server action, бүх API route, бүх env var) |
| Form | `react-hook-form` + `@hookform/resolvers/zod` |
| Огноо | `date-fns` (`Asia/Ulaanbaatar` timezone) |
| Зураг боловсруулалт | `sharp` + `satori` + `@resvg/resvg-js` |
| Test | `vitest` (unit), `playwright` (e2e) |

### Хориотой
`prisma`, `redux`, `moment.js`, `styled-components`, `emotion`, `axios` (`fetch` ашигла), `any` type, `@ts-ignore`, `console.log` production code дотор.

---

## 3. Кодын дүрэм

1. **Server Component default.** `"use client"` зөвхөн state/effect/browser API хэрэгтэй leaf component дээр. Хуудас бүхэлд нь client болгохгүй.
2. **Mutation бүр Server Action-оор.** `app/api/*` route зөвхөн: webhook хүлээж авах, cron, OAuth callback, гуравдагч талын redirect. Өөр зүйлд route handler бичихгүй.
3. **Мөнгө хэзээ ч `float` биш.**
   - DB: `numeric(14,2)`
   - TypeScript: `string` (decimal) эсвэл бүхэл тоо (`₮`-ийн мөнгөн дүн). Тооцоолол `decimal.js`-ээр.
   - Валют: **MNT (₮)**. Форматлалт төвлөрсөн `lib/money.ts`-ээр л хийгдэнэ.
4. **RLS бүх хүснэгт дээр заавал асаалттай.** RLS policy-гүй хүснэгт үүсгэхийг хориглоно. `service_role` key зөвхөн server module дотор, `NEXT_PUBLIC_` prefix-тэй хэзээ ч биш.
5. **Schema өөрчлөлт зөвхөн migration файлаар** — `supabase/migrations/<timestamp>_<name>.sql`. Supabase SQL Editor дээр гараар өөрчлөхгүй. Migration бүр `-- up` сэтгэлгээтэй, буцаах боломжтой байхаар бич.
6. **Type-ууд DB-ээс үүсгэнэ:** `pnpm db:types` → `types/database.ts`. Гараар DB type бичихгүй.
7. **Secret.** `.env.local` commit хийхгүй. `.env.example`-г үргэлж шинэчилнэ. Env var бүр `lib/env.ts` дотор Zod-оор шалгагдаж, тэндээс л import хийгдэнэ.
8. **Алдаа.** Server Action `{ ok: true, data } | { ok: false, error: { code, message } }` буцаана. Exception шидэхгүй. Хэрэглэгчид харагдах алдааны мессеж монголоор.
9. **Хэл.** UI текст **монголоор**, код/comment/commit/variable нэр **англиар**. UI текст бүр `messages/mn.json`-оос ирнэ — component дотор hardcode хийхгүй.
10. **cost_price (өртөг) хэзээ ч public-д гарахгүй.** Storefront-ийн ямар ч query, ямар ч API response дотор өртгийн мэдээлэл байж болохгүй. Энэ нь RLS түвшинд хамгаалагдсан байх ёстой, зөвхөн код түвшинд биш.

---

## 4. Хавтасны бүтэц

```
app/
  (shop)/                 # public storefront
  admin/                  # protected admin dashboard
  api/
    webhooks/meta/        # Meta webhook receiver
    cron/publish/         # scheduled post worker
    auth/callback/        # Supabase auth callback
    oauth/canva/          # Canva OAuth callback
components/
  ui/                     # shadcn primitives — гараар бүү зас
  shop/
  admin/
lib/
  supabase/               # server.ts, client.ts, admin.ts
  money.ts                # мөнгөний тооцоолол — ганц эх сурвалж
  env.ts                  # Zod-оор шалгагдсан env
  poster/                 # PosterRenderer interface + adapters
  social/                 # Meta/Canva client
  analytics/              # ашиг орлогын тооцооллын функцууд
server/
  actions/                # Server Actions, домэйнээр хуваасан
  queries/                # унших query-нүүд
supabase/
  migrations/
  functions/              # Edge Functions
types/
  database.ts             # generated — гараар бүү зас
messages/
  mn.json
```

---

## 5. Домэйн загварын дүрэм

- **Product → ProductVariant (1:N).** Бараа бүр хамгийн багадаа 1 variant-тай. **Нөөц, өртөг, зарах үнэ бүгд variant түвшинд** байна, product түвшинд биш.
- Variant нь `attributes jsonb` талбартай: `{"Size": "M"}` эсвэл `{"Volume": "300ml"}`. Product нь `option_types text[]` (жишээ: `['Size']`) талбараар ямар option ашиглахаа зарлана.
- **Sale бүртгэхэд `unit_cost`-ыг snapshot хийнэ.** Дараа нь өртөг өөрчлөгдсөн ч өнгөрсөн борлуулалтын ашиг өөрчлөгдөхгүй.
- **Ашгийн томьёо:**
  `gross_profit = Σ(qty × (unit_price − unit_cost)) − discount`
  `net_profit = gross_profit − expenses(тухайн хугацааны)`
- Нөөц шууд `UPDATE` хийхгүй — `stock_movements` (ledger) хүснэгтээр бүртгэж, `current_stock`-ыг тэндээс гаргана. Бүх өөрчлөлт мөрдөгдөх боломжтой байна.
- Устгах = **soft delete** (`deleted_at`). Барааг хэзээ ч физикээр устгахгүй, түүх алдагдана.

---

## 6. Гадаад интеграцийн дүрэм

### Meta (Facebook Page + Instagram)
- Зураг **public HTTPS URL**-тэй байх ёстой (Supabase Storage public bucket). Meta binary хүлээж авдаггүй.
- IG хязгаар: **24 цагт 100 post**. Нийтлэхийн өмнө `/{ig-user-id}/content_publishing_limit`-ийг шалгана.
- FB Page дээр зураг **товлох**: `/photos`-д `published=false`-оор upload → `photo_id` → `/feed`-д `attached_media` + `scheduled_publish_time`.
- Access token-ыг **шифрлээд** DB-д хадгална (`pgsodium` эсвэл app-level AES-GCM). Plaintext-ээр хэзээ ч.
- Long-lived Page token ~60 хоног хүчинтэй. Дуусах огноог хадгалж, 7 хоногийн өмнө сэрэмжлүүлэг өгнө.
- Meta рүү явуулсан бүх дуудлага `social_api_log`-д бичигдэнэ (request, response, status).

### Canva
- `PosterRenderer` interface-ийн ард л байна. Бизнес логик Canva-г шууд дуудахгүй.
- **Autofill API нь Canva Enterprise шаарддаг.** Enterprise байхгүй үед код унахгүй, `LocalPosterRenderer` руу fallback хийнэ.
- Export API нь async job — polling хийхдээ exponential backoff, дээд тал нь 60 секунд.

---

## 7. Аюулгүй байдал

- Admin route бүр `middleware.ts` + `requireAdmin()` guard-аар хамгаалагдана. Client-side redirect хангалтгүй.
- Server Action бүрийн эхний мөр: session шалгах, дараа нь Zod parse. Дараалал өөрчлөхгүй.
- Storage bucket: `product-images` (public read), `posters` (public read), `brand-assets` (public read), `receipts` (private).
- File upload: MIME type + magic byte шалгах, дээд хэмжээ 10MB, зөвхөн `image/png`, `image/jpeg`, `image/webp`.
- Rate limit: public form (захиалга, холбоо барих) дээр IP-аар.

---

## 8. Definition of Done — feature бүр дараахыг хангана

- [ ] `pnpm typecheck` цэвэр (0 алдаа)
- [ ] `pnpm lint` цэвэр
- [ ] `pnpm build` амжилттай
- [ ] Шинэ хүснэгт бүр RLS policy-той
- [ ] Мөнгө/ашгийн логикт unit test бичсэн
- [ ] Loading болон error state UI-д бодогдсон
- [ ] Mobile (375px) дээр эвдэрч задраагүй
- [ ] `messages/mn.json`-д шинэ текст нэмэгдсэн, hardcode үлдээгүй

---

## 9. Claude-ийн ажиллах хэв маяг

- **Эхлээд төлөвлө, дараа нь бич.** 3-аас олон файл хөндөх ажил бол эхлээд төлөвлөгөө танилцуул.
- **Байгаа файлыг уншаад зас.** Дахин бичихгүй, шинэ хувилбар үүсгэхгүй.
- **Асуулт байвал зогс.** Схемийн шийдвэр, гуравдагч талын эрх, мөнгө/ашгийн томьёо тодорхойгүй бол таамаглахгүй — асуу.
- **Түр зуурын шийдэл хийхгүй.** `TODO`, mock data, "дараа нь засна" гэж үлдээхгүй. Хийж чадахгүй бол тэгж хэл.
- **Commit жижиг, утга бүхий.** Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- **Файл үүсгэхээс өмнө байгаа эсэхийг шалга.** Давхардуулахгүй.
