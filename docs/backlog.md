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

## S2 (бараа)-оос гарсан
- Bulk import / CSV оруулах-гаргах, barcode scanner, олон агуулах — MVP-д хийхгүй.
- Зургийн дарааллыг чирч солих (drag-to-reorder). Одоо сум товчоор зөөнө.
- SKU-г slug өөрчлөгдөхөд автоматаар дахин санал болгох. Одоо мөр үүсэх үед нэг удаа л санал болгоно.
- `next/image`-д Supabase Storage host бүртгээгүй тул зургийг `<img>`-ээр үзүүлж байна
  (deploy-ийн үед `next.config.ts`-д remotePatterns нэмнэ).
- CLAUDE.md-ийн 8-р дүрэм (`cost_price` client-д очихгүй): жагсаалтын хуудас зөвхөн
  server дээр бодсон ашгийн %-ийг дамжуулдаг. Харин барааны засварын форм дээр
  өртөг нь оруулах талбар тул зайлшгүй client-д очдог — админаас өөр хэн ч
  энэ хуудсанд ханддаггүй.

## Дараагийн шатанд (01-PROMPTS-YE-SHAT.md)
- Public storefront (Phase 6)
- Meta OAuth + автомат нийтлэл (Phase 8)
- Canva adapter, bulk poster (Phase 7)
- Худалдан авалтын модуль, landed cost (Phase 4)
- Тест, хамгаалалт, ажиглалт (Phase 9)
