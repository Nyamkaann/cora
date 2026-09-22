# CLAUDE.md — Cora MVP (1 өдрийн хувилбар)

> Repo-ийн root-д `CLAUDE.md` нэрээр тавина.
> Энэ бол 1 өдрийн MVP-ийн дүрэм. Дараа өргөжүүлэхэд бүтэн хувилбараар солино.

---

## Төсөл

**Cora** — Facebook page-ээр бараа зардаг брэнд. Энэ MVP нь **зөвхөн admin dashboard**:
бараа бүртгэх → өртөг/зарах үнэ оруулах → захиалга бүртгэх → **ашгаа харах** → poster автоматаар үүсгэж татаж авах.

**MVP-д БАЙХГҮЙ (дараа нэмнэ):** public storefront, Facebook/Instagram OAuth, автомат нийтлэл, худалдан авалтын модуль, audit log, олон хэл.

---

## Stack — хатуу

Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui · Supabase (Postgres + Auth + Storage + RLS) · Vercel · pnpm · Zod · react-hook-form · recharts · decimal.js · sharp + satori

**Хориотой:** prisma, redux, axios, moment, `any`, `@ts-ignore`

---

## Дүрэм — зөрчихгүй

1. **Server Component default.** `"use client"` зөвхөн form/interaktiv leaf дээр.
2. **Mutation бүр Server Action.** API route зөвхөн auth callback болон poster render-д.
3. **Мөнгө float биш.** DB `numeric(14,2)`. Тооцоолол `decimal.js`. Формат зөвхөн `lib/money.ts`-ээр. Валют MNT (₮).
4. **RLS бүх хүснэгт дээр асаалттай.** MVP-д бодлого энгийн: зөвхөн authenticated хэрэглэгч бүх зүйлд хандана. Public хандалт байхгүй.
5. **Schema өөрчлөлт зөвхөн migration файлаар.** Supabase SQL Editor дээр гараар биш.
6. **`service_role` key зөвхөн server module.** `import 'server-only'` заавал.
7. **UI текст монголоор** (hardcode хийж болно — MVP-д i18n байхгүй). Код, comment, commit англиар.
8. **`cost_price` (өртөг) хэзээ ч client component-д props-оор дамжихгүй** — зөвхөн server дээр тооцоолж, үр дүнг дамжуул.

---

## Домэйн

- **Product → ProductVariant (1:N).** Нөөц, өртөг, зарах үнэ бүгд **variant** түвшинд.
- Variant: `attributes jsonb` = `{"Size":"M"}` эсвэл `{"Volume":"300ml"}` эсвэл `{}`.
  Product: `option_types text[]` = `{Size}` / `{Volume}` / `{}`.
- **Нөөцийг шууд UPDATE хийхгүй.** `stock_movements` ledger-т мөр нэмнэ, одоогийн нөөц = `SUM(qty)`.
- **Захиалга хадгалахад `order_items.unit_cost`-д тухайн мөчийн `cost_price`-ыг snapshot хийнэ.** Дараа өртөг өөрчлөгдсөн ч өнгөрсөн ашиг хөдлөхгүй.
- Ашиг:
  `бохир ашиг = Σ(qty × (unit_price − unit_cost)) − хөнгөлөлт`
  `цэвэр ашиг = бохир ашиг − тухайн хугацааны зардал`
- Устгах = `deleted_at` (soft delete).

---

## Цагийн дүрэм — MVP-д хамгийн чухал

- **Хамрах хүрээг өөрөө өргөтгөхгүй.** Prompt-д заагаагүй feature нэмэхгүй. Санаа байвал `docs/backlog.md`-д бич, хэрэгжүүлэхгүй.
- **Refactor хийхгүй.** Ажиллаж байгаа кодыг "сайжруулахаар" бүү хөнд.
- **Test:** зөвхөн `lib/money.ts` болон ашгийн тооцооллын функцэд unit test. Өөр хаана ч test бичихгүй.
- **Гацвал зогс.** 2 удаа оролдоод болохгүй бол шалтгааныг хэлж надаас асуу, гуравдахь хувилбар өөрөө бүү туршиж бай.
- **Гоо сайхныг хойш тавь.** Ажиллах нь чухал. Animation, micro-interaction, dark mode нарийвчлал MVP-д хэрэггүй.

---

## Definition of Done (session бүрийн эцэст)

- [ ] `pnpm typecheck` цэвэр
- [ ] `pnpm build` амжилттай
- [ ] Шинэ хүснэгт бүр RLS-тэй
- [ ] Mobile 375px дээр эвдэрч задраагүй
- [ ] `git commit` хийсэн
