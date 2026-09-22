# Cora Commerce — Эхлэх заавар

Энэ багцад 4 файл байна. Дараалал нь чухал.

| Файл | Юу вэ | Хаана тавих |
|---|---|---|
| `00-ЭХЛЭХ-ЗААВАР.md` | Энэ файл — ерөнхий газрын зураг | хаана ч |
| `CLAUDE.md` | Төслийн үндсэн хууль. Claude Code үүнийг **автоматаар** уншина | repo-ийн **root** дотор |
| `01-PROMPTS-YE-SHAT.md` | Phase 0–9 хүртэлх copy-paste prompt-ууд | хаана ч, харж байгаад хуулна |
| `02-GAR-AJILLAGAA.md` | Claude-аар хийж болохгүй, чи өөрөө хийх алхмууд (Meta app, IG нэр солих, Canva) | хаана ч |

---

## Хамгийн эхэнд хийх 3 зүйл

```bash
mkdir cora && cd cora
git init
# CLAUDE.md-г энэ фолдер руу хуулж тавь
claude
```

Дараа нь `01-PROMPTS-YE-SHAT.md` дээрх **Phase 0**-ийн prompt-ийг бүхэлд нь хуулж Claude Code-д өг.

---

## Гол шийдвэрүүд — чиний асуултуудын хариу

### 1. Canva integration хийж болох уу?

**Болно, гэхдээ хоёр өөр зам байна. Хоёул prompt-д орсон.**

| | **Plan A — Server-side render (default)** | **Plan B — Canva Connect API** |
|---|---|---|
| Ажиллах зарчим | Canva дээр 1 удаа poster зохиогоод PNG/SVG болгон export хийнэ. Түүнийг background болгож, барааны transparent зураг + текстийг server дээр давхарлана (`sharp` + `satori`) | Canva Brand Template дээр autofill field үүсгээд, API-аар зураг/текст дүүргээд export хийнэ |
| Үнэ | **Үнэгүй** | **Canva Enterprise эрх шаардана** (Autofill API) |
| Хурд | ~200–500ms, 100% автомат | 5–30 сек (async job), quota-тай |
| Design засах | Template солих бүрд дахин export | Canva дотроос шууд засна, код хөндөхгүй |
| Эрсдэл | Design нь код дотор хатуу суусан | Enterprise-гүй бол ажиллахгүй |

**Санал:** Plan A-г үндсэн болгож эхэл. Код дотор `PosterRenderer` interface үүсгэчихвэл дараа нь Canva Enterprise авах үед Plan B-г adapter болгон залгаад орхино. Prompt Phase 7 яг үүнийг хийдэг.

> ⚠️ Анхаар: Canva **Export API** (`design:content:read`) нь Enterprise шаарддаггүй. Тиймээс "Canva дээр гараар зассан design-аа API-аар татаж авах" хэсэг Pro plan дээр ажиллана. Зөвхөн **бүрэн автомат autofill** нь Enterprise.

---

### 2. Facebook/Instagram руу автоматаар post хийж болох уу?

Болно. Гэхдээ энэ 3 зүйлийг мэдэж байх хэрэгтэй:

1. **Зураг public HTTPS URL дээр байх ёстой.** Supabase Storage-ийн public bucket үүнд тохирно. Meta зургийг binary-аар хүлээж авдаггүй, URL-ээр татдаг.
2. **Instagram:** 24 цагт **100 post** хязгаартай. `POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish` гэсэн 2 алхамтай.
3. **Facebook Page зураг товлох (schedule):** `/photos` endpoint шууд нийтэлдэг, товлодоггүй. Товлохын тулд `published=false`-оор зураг upload хийж `photo_id` авна → `/feed` рүү `attached_media` + `scheduled_publish_time`-тай post үүсгэнэ. Phase 8 prompt-д энэ заль орсон.

**App Review:** өөрийн эзэмшдэг Page/IG дээр Development mode-д ажиллана. Олон нийтэд гаргах шаардлагагүй тул App Review дамжих шаардлага бага. Гэхдээ Business verification хийлгэсэн байвал тогтвортой.

---

### 3. Size / volume хувилбар (M, L, XL / 100ml, 300ml)

Үүнийг **variant system** болгон ерөнхийлж хийнэ — өөр өөр хүснэгт биш.

```
products (Cora Hoodie)
  └── product_variants
        ├── {Size: M}     → SKU, cost_price, sale_price, stock
        ├── {Size: L}     → ...
        └── {Size: XL}    → ...

products (Cora Serum)
  └── product_variants
        ├── {Volume: 100ml} → ...
        └── {Volume: 300ml} → ...
```

Нэг л схемээр хоёуланг нь барина. Бараа бүрт ямар option (Size/Volume/Color) ашиглахыг сонгож өгдөг. Дэлгэрэнгүйг Phase 1 prompt-д.

---

## Ажиллах горим (заавал уншаарай)

- **Нэг Phase = нэг session.** Phase дуусмагц `/clear` хийж дараагийнхаа эхэл. Ингэхгүй бол context дүүрч чанар унана.
- **Phase бүрийн эцэст commit хий.** Prompt бүрт commit заавар орсон.
- **Plan mode ашигла.** Том Phase (1, 7, 8)-ийг эхлүүлэхдээ Claude Code дотор `Shift+Tab` дараад plan mode руу ороод prompt-оо өг. Төлөвлөгөөг уншаад зөвшөөрөөд явуулна.
- **Claude Code-д "яагаад" гэж асуу.** Схем эсвэл API сонголт ойлгомжгүй бол `тайлбарла, засах хэрэггүй` гэж бич.
