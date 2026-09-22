# Гар ажиллагаа — Claude-аар хийж болохгүй алхмууд

Эдгээрийг өөрөө (эсвэл Claude Chrome extension-ийн тусламжтай) хийнэ. Ямар Phase-ээс өмнө хийх ёстойг тэмдэглэв.

---

## 1. Supabase project холбох — *Phase 1-ээс өмнө*

Project аль хэдийн үүссэн гэсэн. Дараахыг цуглуул:

| Хаанаас | Утга | Env var |
|---|---|---|
| Settings → General | Reference ID | `supabase link --project-ref <ref>` |
| Settings → API | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Settings → API | `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Settings → API | `service_role` key ⚠️ | `SUPABASE_SERVICE_ROLE_KEY` |
| Settings → Database | Postgres password | migration push хийхэд |

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <ref>
```

Шифрлэлтийн түлхүүр үүсгэ (Phase 8-д Meta token шифрлэхэд):

```bash
openssl rand -base64 32   # → ENCRYPTION_KEY
openssl rand -hex 32      # → CRON_SECRET
```

⚠️ `service_role` key бол бүх RLS-ийг тойрдог мастер түлхүүр. Client код руу хэзээ ч, screenshot дээр хэзээ ч, chat дотор хэзээ ч бүү тавь.

### Storage bucket-ууд (Supabase Dashboard → Storage)

| Bucket | Нээлттэй эсэх | Хэрэглээ |
|---|---|---|
| `product-images` | public | барааны зураг |
| `posters` | **public** — Meta зургийг public URL-ээр татдаг | үүсгэсэн poster |
| `brand-assets` | public | logo, template дэвсгэр |
| `receipts` | **private** | зардлын баримт |

---

## 2. Instagram нэр солих — *хэзээ ч болно, Phase 8-ээс өмнө*

Одоогийн IG нь Cora-гаас өөр нэртэй байгаа гэсэн.

**Алхам:** Instagram app → Профайл → Профайл засах → Хэрэглэгчийн нэр

**Мэдэж байх зүйлс:**
- Username солих нь богино хугацаанд хэдэн удаа гэсэн хязгаартай. Олон удаа сольж туршиж болохгүй — нэг л сонголтоо гаргаад сол.
- Хуучин username чөлөөлөгдөж, өөр хүн авч болзошгүй. Cora-гийн хуучин хаягаар ирж байсан хэрэглэгч алдагдах эрсдэлтэй — Page дээр зарлал тавь.
- Display name (харагдах нэр) болон username хоёр өөр. Хоёуланг нь `Cora` болго.
- Username солиход өмнөх пост, дагагч, мессеж бүгд хэвээр үлдэнэ.

**Мөн заавал шалгах:** IG account нь **Business** төрөлтэй байх ёстой (Creator биш). Content Publishing API нь Creator account дээр ажиллахгүй.

Профайл → Тохиргоо → Account type → **Business** руу шилжүүл, дараа нь Cora Facebook Page-тэй холбо.

---

## 3. Meta app үүсгэх — *Phase 8-ээс өмнө заавал*

### 3.1 App үүсгэх
1. https://developers.facebook.com/apps → **Create App**
2. Use case: **Other** → Type: **Business**
3. Business portfolio: Cora-гийн Business Manager-ийг сонго

### 3.2 Product нэмэх
- **Facebook Login for Business**
- **Instagram** (Instagram API with Facebook Login)

### 3.3 Redirect URI
Facebook Login for Business → Settings → Valid OAuth Redirect URIs:
```
http://localhost:3000/api/oauth/meta/callback
https://<production-domain>/api/oauth/meta/callback
```

### 3.4 Credential
App Settings → Basic → **App ID**, **App Secret**

```env
META_APP_ID=...
META_APP_SECRET=...
META_WEBHOOK_VERIFY_TOKEN=<өөрөө санамсаргүй мөр үүсгэ>
```

### 3.5 Шаардлагатай permission
| Permission | Юунд |
|---|---|
| `pages_show_list` | Page-үүдийн жагсаалт авах |
| `pages_read_engagement` | Page мэдээлэл унших |
| `pages_manage_posts` | FB Page дээр пост нийтлэх |
| `business_management` | Business asset хандах |
| `instagram_basic` | IG account мэдээлэл |
| `instagram_content_publish` | **IG дээр пост нийтлэх** |

### 3.6 Development mode
Өөрийн эзэмшдэг Page/IG дээр **Development mode**-д ажиллана — App Review шаардлагагүй. Гэхдээ:
- App-ийн Roles → Administrators дотор өөрийгөө нэмсэн байх
- Page-ийн админ эрхтэй байх
- Business verification хийсэн бол token илүү тогтвортой

Олон хүн ашиглах болбол App Review дамжуулна.

### 3.7 Token хугацаа
Page access token ~60 хоног. Дуусахаас өмнө дахин OAuth хийж шинэчилнэ. Систем 7 хоногийн өмнө сануулна (Phase 8-д хэрэгжүүлсэн).

---

## 4. Canva — *Phase 7-ээс өмнө шийд*

### Шийдвэрийн мод

```
Canva Enterprise эрхтэй юу?
├── ТИЙМ → Plan B ажиллана.
│          1. canva.dev → Developer portal → app үүсгэ
│          2. Redirect URL: https://<домэйн>/api/oauth/canva/callback
│          3. Canva дээр Brand Template үүсгэ
│          4. "Data autofill" app-аар талбар нэмэ:
│             product_image (image), product_name (text), price (text)
│          5. Brand template ID-г хуулж admin → templates дотор оруул
│
└── ҮГҮЙ (Free/Pro/Teams) → Plan A ашиглана. ЭНЭ Л ХАНГАЛТТАЙ.
           1. Canva дээр 1080×1350 хэмжээтэй poster загвар зохио
           2. Барааны зураг орох ГАЗРЫГ ХООСОН орхи
           3. Нэр/үнэ орох газрыг мөн хоосон орхи
           4. PNG-ээр export (Pro бол transparent background сонгож болно)
           5. Тэр PNG-г admin → Тохиргоо → Template дотор upload хийнэ
           6. Визуал засварлагч дээр зураг/нэр/үнэ орох хайрцгуудыг
              чирж байрлуул
           7. Дараа нь бараа болгонд автоматаар poster үүснэ
```

**Зөвлөмж:** Plan A-гаар эхэл. Enterprise нь жижиг бизнест үнэтэй бөгөөд Plan A-аас хурдан, найдвартай, кэшлэгддэг. Дизайн солих хэрэгтэй болбол Canva дээр засаад дахин export хийж upload хийхэд 2 минут.

### Барааны зурганд тавих шаардлага
Poster сайхан болохын тулд барааны зураг **ил тод дэвсгэртэй PNG** байх ёстой.

- Canva-ийн Background Remover (Pro), эсвэл remove.bg
- 1500×1500-аас багагүй, alpha channel-тай
- Admin дээр зураг upload хийхэд «Ил тод дэвсгэртэй» чагтыг тавина

---

## 5. Vercel — *Phase 9*

1. GitHub repo-г Vercel-д холбо
2. Region: **Singapore (sin1)** — Монголд хамгийн ойр
3. Env var бүгдийг Production + Preview дээр оруул
4. `NEXT_PUBLIC_SITE_URL`-ийг жинхэнэ домэйнээр солих
5. Домэйн холбосны дараа Meta app-ийн Redirect URI-г шинэчлэх
6. Cron ажиллаж байгааг Vercel → Cron Jobs таб дээр шалгах

---

## 6. Гүйцэтгэлийн жагсаалт

Phase бүр эхлэхийн өмнө:

- [ ] Phase 1 — Supabase холбогдсон, env бөглөгдсөн
- [ ] Phase 7 — Canva plan шийдэгдсэн, poster дэвсгэр PNG бэлэн, барааны transparent зураг бэлэн
- [ ] Phase 8 — Meta app үүссэн, IG нь Business болсон, IG нэр Cora болсон, Page-тэй холбогдсон, App ID/Secret env-д орсон
- [ ] Phase 9 — Vercel project үүссэн, домэйн бэлэн
