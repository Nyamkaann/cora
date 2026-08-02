"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products, categories, brands } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { importProductRowSchema } from "@/lib/validation";

const MAX_ROWS_PER_SHEET = 2000;
const MAX_IMPORT_ROWS = 5000;

export type ParsedSheet = {
  name: string;
  headers: string[];
  rows: Record<string, string | number>[];
  truncated: boolean;
};

export type ParseWorkbookState =
  | { error: string }
  | { sheets: ParsedSheet[]; fileName: string; token: string }
  | undefined;

function sanitizeCell(value: unknown): string | number {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return value;
  if (value == null) return "";
  return String(value);
}

export async function parseWorkbookAction(
  _prev: ParseWorkbookState,
  formData: FormData
): Promise<ParseWorkbookState> {
  await requireRole("admin");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "no_file" };
  }
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return { error: "invalid_file_type" };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    return { error: "parse_failed" };
  }

  if (workbook.SheetNames.length === 0) {
    return { error: "empty_workbook" };
  }

  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const truncated = rawRows.length > MAX_ROWS_PER_SHEET;
    const limitedRows = rawRows.slice(0, MAX_ROWS_PER_SHEET);

    const headerSet = new Set<string>();
    for (const row of limitedRows) {
      for (const key of Object.keys(row)) headerSet.add(key);
    }

    const rows = limitedRows.map((row) => {
      const clean: Record<string, string | number> = {};
      for (const key of headerSet) {
        clean[key] = sanitizeCell(row[key]);
      }
      return clean;
    });

    return { name, headers: Array.from(headerSet), rows, truncated };
  });

  return { sheets, fileName: file.name, token: crypto.randomUUID() };
}

type ImportTargetField =
  | "name"
  | "sku"
  | "categoryName"
  | "brandName"
  | "unit"
  | "costPrice"
  | "sellPrice"
  | "stockQty";

export type ImportRowInput = Partial<Record<ImportTargetField, string | number>> & {
  rowNumber: number;
};

export type ImportSkip = { rowNumber: number; name: string; reason: "invalid" | "duplicate_in_file" | "duplicate_in_db" };
export type ImportReport = { imported: number; skipped: ImportSkip[]; totalRows: number };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getOrCreateCategoryId(tx: Tx, cache: Map<string, number>, name: string): Promise<number> {
  const key = name.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await tx.query.categories.findFirst({
    where: (t, { ilike }) => ilike(t.name, name.trim()),
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const [created] = await tx.insert(categories).values({ name: name.trim() }).returning({ id: categories.id });
  cache.set(key, created.id);
  return created.id;
}

async function getOrCreateBrandId(tx: Tx, cache: Map<string, number>, name: string): Promise<number> {
  const key = name.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await tx.query.brands.findFirst({
    where: (t, { ilike }) => ilike(t.name, name.trim()),
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const [created] = await tx.insert(brands).values({ name: name.trim() }).returning({ id: brands.id });
  cache.set(key, created.id);
  return created.id;
}

export async function importProductsAction(rows: ImportRowInput[]): Promise<ImportReport | { error: string }> {
  await requireRole("admin");

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "no_rows" };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: "too_many_rows" };
  }

  const existingProducts = await db.query.products.findMany({
    columns: { name: true, sku: true },
  });
  const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));
  const existingSkus = new Set(
    existingProducts.filter((p) => p.sku).map((p) => p.sku!.toLowerCase())
  );

  const fileSeenNames = new Set<string>();
  const fileSeenSkus = new Set<string>();
  const skipped: ImportSkip[] = [];
  const toInsert: {
    name: string;
    sku: string | null;
    categoryName: string | null;
    brandName: string | null;
    unit: string | null;
    costPrice: number;
    sellPrice: number;
    stockQty: number;
  }[] = [];

  for (const row of rows) {
    const parsed = importProductRowSchema.safeParse({
      name: row.name,
      sku: row.sku,
      categoryName: row.categoryName,
      brandName: row.brandName,
      unit: row.unit,
      costPrice: row.costPrice,
      sellPrice: row.sellPrice,
      stockQty: row.stockQty,
    });

    if (!parsed.success) {
      skipped.push({ rowNumber: row.rowNumber, name: String(row.name ?? ""), reason: "invalid" });
      continue;
    }

    const { name, sku } = parsed.data;
    const nameKey = name.toLowerCase();
    const skuKey = sku ? sku.toLowerCase() : null;

    const dupInFile = fileSeenNames.has(nameKey) || (skuKey ? fileSeenSkus.has(skuKey) : false);
    if (dupInFile) {
      skipped.push({ rowNumber: row.rowNumber, name, reason: "duplicate_in_file" });
      continue;
    }

    const dupInDb = existingNames.has(nameKey) || (skuKey ? existingSkus.has(skuKey) : false);
    if (dupInDb) {
      skipped.push({ rowNumber: row.rowNumber, name, reason: "duplicate_in_db" });
      continue;
    }

    fileSeenNames.add(nameKey);
    if (skuKey) fileSeenSkus.add(skuKey);

    toInsert.push({
      name,
      sku: sku || null,
      categoryName: parsed.data.categoryName || null,
      brandName: parsed.data.brandName || null,
      unit: parsed.data.unit || null,
      costPrice: parsed.data.costPrice,
      sellPrice: parsed.data.sellPrice,
      stockQty: parsed.data.stockQty,
    });
  }

  if (toInsert.length > 0) {
    await db.transaction(async (tx) => {
      const categoryCache = new Map<string, number>();
      const brandCache = new Map<string, number>();

      for (const item of toInsert) {
        const categoryId = item.categoryName
          ? await getOrCreateCategoryId(tx, categoryCache, item.categoryName)
          : null;
        const brandId = item.brandName
          ? await getOrCreateBrandId(tx, brandCache, item.brandName)
          : null;

        await tx.insert(products).values({
          name: item.name,
          sku: item.sku,
          categoryId,
          brandId,
          unit: item.unit,
          costPrice: String(item.costPrice),
          sellPrice: String(item.sellPrice),
          stockQty: item.stockQty,
          lowStockThreshold: 5,
        });
      }
    });

    revalidatePath("/[locale]/(dashboard)/inventory", "page");
  }

  return { imported: toInsert.length, skipped, totalRows: rows.length };
}
