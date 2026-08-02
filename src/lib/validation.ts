import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().trim().min(1).nullable().optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  brandId: z.coerce.number().int().positive().nullable().optional(),
  unit: z.string().trim().nullable().optional(),
  costPrice: z.coerce.number().nonnegative(),
  sellPrice: z.coerce.number().nonnegative(),
  stockQty: z.coerce.number().int().nonnegative(),
  lowStockThreshold: z.coerce.number().int().nonnegative(),
});

export const categorySchema = z.object({
  name: z.string().min(1),
});

export const brandSchema = z.object({
  name: z.string().min(1),
});

export const financeTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  note: z.string().trim().nullable().optional(),
  occurredAt: z.string().min(1),
});

export const salesLogSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  channel: z.enum(["in_store", "social"]),
  soldAt: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "warehouse", "sales"]),
  password: z.string().min(8),
});

function blankToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const optionalNonNegativeNumber = z.preprocess(
  blankToUndefined,
  z.coerce.number().nonnegative().optional().default(0)
);

const optionalNonNegativeInt = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().nonnegative().optional().default(0)
);

const optionalTrimmedString = z.preprocess(blankToUndefined, z.coerce.string().trim().optional());

export const importProductRowSchema = z.object({
  // Not .optional()/coerced: a missing/undefined cell must fail validation
  // (skipped as an invalid row), not silently become the literal string
  // "undefined" via z.coerce.string()'s String(undefined) behavior.
  name: z
    .preprocess(blankToUndefined, z.union([z.string(), z.number()]).transform(String))
    .pipe(z.string().trim().min(1)),
  sku: optionalTrimmedString,
  categoryName: optionalTrimmedString,
  brandName: optionalTrimmedString,
  unit: optionalTrimmedString,
  costPrice: optionalNonNegativeNumber,
  sellPrice: optionalNonNegativeNumber,
  stockQty: optionalNonNegativeInt,
});

export type ImportProductRow = z.infer<typeof importProductRowSchema>;
