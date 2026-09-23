# Cora — админ самбар

Facebook page-ээр бараа зардаг Cora брэндийн дотоод удирдлагын систем.
Бараа бүртгэх → өртөг, зарах үнэ оруулах → захиалга бүртгэх → **ашгаа харах** →
постер автоматаар үүсгэж татаж авах.

MVP-д **public storefront байхгүй** — зөвхөн нэвтэрсэн админ хандана.

## Технологи

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · shadcn/ui ·
Supabase (Postgres + Auth + Storage + RLS) · Zod · react-hook-form · recharts ·
decimal.js · sharp + satori + resvg · pnpm · Vercel

## Шаардлага

- Node.js 20+
- pnpm 10+
- Supabase төсөл

## 1. Суулгах

```bash
pnpm install
cp .env.example .env.local
```

`.env.local`-д Supabase Dashboard → Project Settings → API хэсгээс:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # ⚠️ нууц, хэзээ ч client-д гаргахгүй
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 2. Supabase бэлтгэх

**Storage → New bucket** (хоёулаа **Public**):

- `product-images`
- `posters`

**Authentication → Users → Add user**: өөрийн и-мэйл + нууц үг. Энэ хаягаар нэвтэрнэ.
(Бүртгүүлэх хуудас байхгүй — хэрэглэгчийг зөвхөн dashboard-аас нэмнэ.)

**Схемийг push хийх:**

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <ТӨСЛИЙН_REF>
pnpm exec supabase db push
pnpm db:types                      # types/database.ts үүснэ
```

Туршилтын өгөгдөл оруулах (заавал биш):

```bash
pnpm exec supabase db push --include-seed
```

## 3. Ажиллуулах

```bash
pnpm dev          # http://localhost:3000 → /admin руу чиглүүлнэ
pnpm typecheck    # TypeScript
pnpm lint         # ESLint
pnpm test         # мөнгө, өртөг, захиалга, ашгийн тооцооллын unit test
pnpm build        # production build
```

## 4. Vercel дээр deploy хийх

1. GitHub repo үүсгээд push хийнэ.
2. Vercel → **Add New → Project** → repo-гоо сонгоно (framework автоматаар Next.js).
3. Environment Variables хэсэгт 4 хувьсагчийг **Production, Preview, Development**
   гурвуулд нь оруулна:

   | Нэр | Утга |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase төслийн URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**нууц**) |
   | `NEXT_PUBLIC_SITE_URL` | deploy хийсний дараах жинхэнэ домэйн |

4. Deploy хийнэ. Домэйн гармагц `NEXT_PUBLIC_SITE_URL`-ийг жинхэнэ хаягаар
   солиод дахин deploy хийнэ.
5. Supabase → Authentication → URL Configuration → Site URL, Redirect URLs-д
   тухайн домэйнийг нэмнэ.

Region нь `vercel.json`-д **Singapore (sin1)** гэж тогтоосон.

## Бүтэц

```
app/(auth)/login      нэвтрэх
app/admin             хяналтын самбар, бараа, нөөц, захиалга, зардал, тайлан, постер
app/api/auth/callback Supabase auth callback
app/api/poster        постер рендер (runtime = nodejs)
components/admin      админы дахин ашиглагддаг UI
lib/money.ts          мөнгөний тооцоолол (decimal.js) — формат зөвхөн эндээс
lib/analytics         ашгийн деривац, хугацааны муж
lib/poster            постерийн layout + рендер
server/actions        бүх mutation (Server Action)
server/queries        server-only унших логик
supabase/migrations   схемийн өөрчлөлт бүр энд
```

## Дүрэм

- Mutation бүр **Server Action**. API route зөвхөн auth callback болон постер рендерт.
- Мөнгө хэзээ ч float биш: DB-д `numeric(14,2)`, тооцоолол `decimal.js`, формат `lib/money.ts`.
- Нөөцийг шууд UPDATE хийхгүй — `stock_movements` ledger-т мөр нэмнэ.
- Захиалга хадгалахад `order_items.unit_cost`-д тухайн мөчийн өртгийг snapshot хийнэ.
- Схемийн өөрчлөлт зөвхөн migration файлаар. SQL Editor дээр гараар засахгүй.
- Бүх хүснэгт RLS-тэй: authenticated бүгдийг хийнэ, anon эрхгүй.

Хойшлуулсан ажлууд: [`docs/backlog.md`](docs/backlog.md)
