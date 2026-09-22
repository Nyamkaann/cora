# Backlog — MVP-ээс хойшлуулсан зүйлс

## S1 (суурь)-ээс гарсан
- `types/database.ts` одоогоор placeholder. Supabase project link хийсний дараа
  `pnpm db:types` ажиллуулж, `lib/supabase/*`-д `<Database>` generic-ийг нэмэх.
- shadcn-ийн `form` component энэ registry хувилбарт байхгүй тул формуудыг
  react-hook-form дээр шууд бичсэн. Хэрэгцээ гарвал дараа нэмэх.
- Migration-ийг локал дээр ажиллуулж шалгаагүй (Docker/Postgres байхгүй).
  Эхний `supabase db push` дээр алдаа гарвал засах.
- RLS бодлого MVP-д энгийн: authenticated бүгдийг хийнэ. Олон хэрэглэгч,
  эрхийн түвшин (role) гарвал нарийвчлах.
- Дэлгэцийн харанхуй горим, animation, micro-interaction.

## Дараагийн шатанд (01-PROMPTS-YE-SHAT.md)
- Public storefront (Phase 6)
- Meta OAuth + автомат нийтлэл (Phase 8)
- Canva adapter, bulk poster (Phase 7)
- Худалдан авалтын модуль, landed cost (Phase 4)
- Тест, хамгаалалт, ажиглалт (Phase 9)
