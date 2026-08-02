# Cora — Beauty Product Admin Dashboard

Internal-only management dashboard for a beauty product business: finance
(income/expense) tracking, inventory, and a manual sales log. No public
storefront, cart, or checkout — this is a staff tool.

This repo implements all four phases from the original spec: **Phase 1**
(database schema, authentication, core dashboard modules, English/Mongolian
i18n), **Phase 2** (one-time Excel import), **Phase 3** (product image
automation — background removal + branded template + FB/IG-sized exports),
and **Phase 4** (posting those images to a Facebook Page and Instagram
Business account via the Meta Graph API).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS
- PostgreSQL + Drizzle ORM
- NextAuth (Auth.js v5) — Credentials provider, JWT sessions
- next-intl — English / Mongolian, default Mongolian
- recharts (finance chart), zod (validation), bcryptjs (password hashing)
- `xlsx` (SheetJS) for Excel import parsing — installed from SheetJS's own
  CDN tarball (`https://cdn.sheetjs.com/...`), not the `xlsx` npm registry
  package, because the npm-published build has unpatched high-severity
  advisories (prototype pollution / ReDoS) that SheetJS only fixed in builds
  distributed from their own CDN.
- `@imgly/background-removal-node` for local background removal (see
  [Product image automation](#product-image-automation-phase-3) below) and
  `sharp` for template compositing. `package.json` pins `"overrides": {
  "sharp": "^0.35.3" }` — `@imgly/background-removal-node` bundles its own
  pinned, vulnerable `sharp@0.32.x`, which without the override gets
  installed as a second native `libvips` binary alongside our own (observed
  as an actual macOS crash-risk warning during testing, not just a
  theoretical advisory); the override forces one shared, patched copy.
  `@imgly`'s own nested `lodash`/`zod` still trip `npm audit` with no fix
  available upstream — accepted as low real-world risk here since this tool
  only ever processes images uploaded by trusted internal admins, not
  arbitrary public input.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine) — Postgres is hosted there, not locally

## Setup

1. Create a Supabase project (skip if you already have one): supabase.com →
   New project → pick a name/region/database password. Wait for
   provisioning (~2 minutes), then go to **Project Settings → Database →
   Connection string** and copy the **Session pooler** URI (port `5432`) or
   the direct connection URI — either works for this app. Make sure it ends
   with `?sslmode=require` (add it if missing).

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the env file and fill in secrets:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | --- | --- |
   | `DATABASE_URL` | Supabase Postgres connection string from step 1. Must include `?sslmode=require`. |
   | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Same project, from **Settings → API**. Powers the Marketing module's image storage (see [Product image automation](#product-image-automation-phase-3)). Service role key is server-only, never sent to the browser. |
   | `AUTH_SECRET` | Random secret for NextAuth session signing. Generate with `openssl rand -base64 32`. |
   | `NEXTAUTH_URL` | Base URL of the app (`http://localhost:3000` in dev). |
   | `META_APP_ID` / `META_APP_SECRET` | Meta Developer app credentials — needed to obtain a Page access token, not called directly by this app. Optional. |
   | `META_PAGE_ACCESS_TOKEN` / `META_PAGE_ID` / `META_IG_BUSINESS_ID` | Required for the Marketing module's "Post" button to actually post. Left unset, image generation still works and posting is cleanly skipped. |

4. Push the schema, seed an admin user, and create the Storage bucket:

   ```bash
   npm run db:push
   npm run db:seed
   npm run storage:setup
   ```

   Seeded login: `admin@cora.mn` / `ChangeMe123!` — change the password by
   creating a new user from the Employees screen once you've signed in, or by
   updating the row directly (no self-service password reset yet).

   Re-run the Excel import (`/import`) afterward if you need the product
   catalog back — Supabase starts empty, nothing is migrated automatically
   from a prior local database.

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected
   to `/mn/login` by default. Use the MN/EN toggle in the top bar to switch
   languages.

`src/db/index.ts` enables SSL automatically for any non-localhost
`DATABASE_URL` (Supabase requires it; there's no cert to verify for a local
Postgres, hence the exception).

## Roles

| Role | Access |
| --- | --- |
| `admin` | Everything: Finance, Inventory, Sales log, Employees, Import, Marketing |
| `warehouse` (нярав) | Inventory (full CRUD), Sales log (read-only) |
| `sales` (борлуулагч) | Sales log (create entries), Inventory (read-only) |

Role checks are enforced in `src/proxy.ts` (route-level redirects) and again
inside each server action via `src/lib/auth-guard.ts` (defense in depth).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also runs the TypeScript check) |
| `npm run db:push` | Push the Drizzle schema to Postgres (no migration files) |
| `npm run db:generate` | Generate SQL migration files from schema changes |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
| `npm run db:seed` | Seed the initial admin user |
| `npm run storage:setup` | Create the public `product-images` Supabase Storage bucket (idempotent) |

## Project layout

```
src/
  db/            Drizzle schema, client, seed script
  auth.ts        NextAuth config (Credentials provider)
  proxy.ts       Route protection + i18n routing (Next 16 renamed "middleware" to "proxy")
  i18n/          next-intl routing/navigation/request config
  messages/      en.json / mn.json translation strings
  lib/
    actions/     Server actions (mutations) per module
    auth-guard.ts  requireUser() / requireRole() helpers
    validation.ts  zod schemas shared by forms and actions
    format.ts      currency/date formatting per locale
    images/        Background removal + template compositing (Phase 3)
    meta.ts        Meta Graph API client (Phase 4)
    supabase-admin.ts  Service-role Supabase client (Storage uploads only)
  components/    UI primitives + per-module form/table components
  app/[locale]/
    (auth)/login
    (dashboard)/ finance, inventory, sales, users, import, marketing
  db/setup-storage.ts  One-off script: creates the public Storage bucket
```

## Excel import (Phase 2)

Admin-only screen at `/import` for a one-time import of existing product data
from an `.xlsx`/`.xls` file:

1. **Upload** — `parseWorkbookAction` (`src/lib/actions/import.ts`) reads the
   workbook server-side and returns every sheet's headers + rows as JSON.
2. **Map** — pick a sheet, then map its columns to product fields (name, SKU,
   category, brand, unit, cost price, sell price, stock). A keyword-based
   heuristic pre-fills a best guess (matching common Mongolian/English header
   names like "Бүтээгдэхүүний нэр" or "Brand") — always double-check the live
   preview table before confirming, since the guess isn't authoritative.
3. **Import** — `importProductsAction` validates each row with zod, skips
   rows that are invalid, duplicated within the file, or already present in
   inventory (matched by name or SKU, case-insensitive), auto-creates missing
   categories/brands, and reports exactly what happened per row.

This was tested end-to-end against the real `Бүтээгдэгхүүн 2025.11.21.xlsx`
file: importing the `орлого` sheet the first time created 206 products (23
duplicate rows within the sheet itself were correctly skipped); re-importing
the same sheet afterward correctly skipped all 229 rows as already existing.

## Product image automation (Phase 3)

Admin-only screen at `/marketing`: pick a product, upload a photo of it (any
background), and the app automatically:

1. **Removes the background** — `src/lib/images/background-removal.ts`, via
   `@imgly/background-removal-node`. Chosen over shelling out to Python
   `rembg` or calling a remove.bg/Photoroom API because its ONNX models ship
   *inside* the npm package (verified by inspecting the installed tarball) —
   so it runs fully offline, with no per-image cost and no external rate
   limit, which was the spec's own stated preference for background removal.
   Swap the body of `removeImageBackground()` for an API call later if
   quality ever falls short.
2. **Builds the branded template** — `src/lib/images/template.ts`, via
   `sharp`: a soft pastel background, the `cora-logo.png` mark (copied from
   the project root into `public/brand/`), the cutout product image
   centered, and the product name + price rendered as an SVG overlay
   (sharp has no native text renderer; compositing a generated SVG buffer is
   its standard path for text). Produces all three target sizes at once:
   1080×1080 (Instagram square), 1080×1350 (Instagram portrait), 1200×630
   (Facebook).
3. **Saves everything** to a public **Supabase Storage** bucket
   (`src/lib/images/storage.ts`, bucket name `product-images`, created by
   `npm run storage:setup`) and records a `product_images` row.

   Images are **not** written to local disk. Vercel (and most serverless
   hosts) give every function invocation a fresh, isolated filesystem — a
   file saved during one request is simply gone by the next, so the app
   would generate an image successfully and then 404 trying to show or post
   it moments later. Supabase Storage gives each image a stable public URL
   any function instance (or Meta's own servers, for Instagram) can fetch
   regardless of which one handled the request.

Real phone photos routinely exceed Next's default 1MB Server Action body
limit, so `next.config.ts` raises `experimental.serverActions.bodySizeLimit`
to `15mb` (applies to the Excel import upload too).

## Posting to Facebook & Instagram (Phase 4)

Once a generation is `ready`, an explicit **"Post to Facebook & Instagram"**
button appears next to it (`src/components/marketing/PostButton.tsx`,
`src/lib/actions/marketing.ts#postProductImage`).

**This is the one deliberate deviation from the original spec**, agreed with
the user during planning: the spec asked for posting to happen automatically
the instant images are generated, with no admin confirmation. Since this is a
real, irreversible action against a real company Facebook Page and Instagram
account, posting instead requires this one explicit click after the admin has
reviewed the three generated images — everything upstream (background
removal, template generation, all three export sizes) still happens with no
extra steps, exactly as specified.

Posting only does anything once `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, and
`META_IG_BUSINESS_ID` are set (see the env var table above) — a real Meta
Developer app + Facebook Page + Instagram Business account is a precondition
the spec explicitly assumes, not something this app can create for you.
Without them, the button still records the attempt as cleanly `skipped` with
a message explaining why, rather than pretending to succeed.

`src/lib/meta.ts` wraps the two Graph API calls (`v21.0`):

- **Facebook** (`postPhotoToFacebookPage`) — direct multipart binary upload
  to `/{page-id}/photos`. Works from any environment, including local dev,
  since we push the bytes to Meta rather than Meta fetching from us.
- **Instagram** (`postImageToInstagram`) — the two-step Content Publishing
  flow (create a media container with an `image_url`, then publish it).
  Meta's servers fetch the image themselves from that URL, which is why it
  has to be the Supabase Storage public URL (always real and reachable, even
  from local dev) rather than an address on our own app.

No live post was made against a real Facebook Page or Instagram account
while building this — there are no real Meta credentials configured in this
environment, and the agent building this did not fabricate a test of live,
irreversible publishing to a real account. Once you configure real
credentials, test the "Post" button yourself on a low-stakes product first.
