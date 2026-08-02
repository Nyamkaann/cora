import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "warehouse", "sales"]);
export const financeTypeEnum = pgEnum("finance_type", ["income", "expense"]);
export const salesChannelEnum = pgEnum("sales_channel", ["in_store", "social"]);
export const productImageStatusEnum = pgEnum("product_image_status", ["processing", "ready", "failed"]);
export const socialPlatformEnum = pgEnum("social_platform", ["facebook", "instagram"]);
export const socialPostStatusEnum = pgEnum("social_post_status", ["posted", "failed", "skipped"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("sales"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
}, (table) => [
  uniqueIndex("categories_name_idx").on(table.name),
]);

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
}, (table) => [
  uniqueIndex("brands_name_idx").on(table.name),
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
  unit: varchar("unit", { length: 50 }),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellPrice: numeric("sell_price", { precision: 12, scale: 2 }).notNull().default("0"),
  stockQty: integer("stock_qty").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("products_sku_idx").on(table.sku),
]);

export const financeTransactions = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  type: financeTypeEnum("type").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  occurredAt: date("occurred_at").notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesLog = pgTable("sales_log", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull(),
  channel: salesChannelEnum("channel").notNull().default("in_store"),
  soldAt: date("sold_at").notNull(),
  soldBy: integer("sold_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sourceImagePath: text("source_image_path").notNull(),
  cutoutImagePath: text("cutout_image_path"),
  igSquarePath: text("ig_square_path"),
  igPortraitPath: text("ig_portrait_path"),
  facebookPath: text("facebook_path"),
  status: productImageStatusEnum("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  productImageId: integer("product_image_id").notNull().references(() => productImages.id, { onDelete: "cascade" }),
  platform: socialPlatformEnum("platform").notNull(),
  status: socialPostStatusEnum("status").notNull(),
  externalPostId: text("external_post_id"),
  errorMessage: text("error_message"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  sales: many(salesLog),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one, many }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  posts: many(socialPosts),
}));

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
  productImage: one(productImages, { fields: [socialPosts.productImageId], references: [productImages.id] }),
}));

export const salesLogRelations = relations(salesLog, ({ one }) => ({
  product: one(products, { fields: [salesLog.productId], references: [products.id] }),
  soldByUser: one(users, { fields: [salesLog.soldBy], references: [users.id] }),
}));

export const financeTransactionsRelations = relations(financeTransactions, ({ one }) => ({
  createdByUser: one(users, { fields: [financeTransactions.createdBy], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type NewFinanceTransaction = typeof financeTransactions.$inferInsert;
export type SalesLogEntry = typeof salesLog.$inferSelect;
export type NewSalesLogEntry = typeof salesLog.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type SocialPost = typeof socialPosts.$inferSelect;
export type NewSocialPost = typeof socialPosts.$inferInsert;
