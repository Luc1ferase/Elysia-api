import { boolean, doublePrecision, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const products = pgTable('pricing_products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  size: text('size').notNull(),
  costRmb: doublePrecision('cost_rmb').notNull(),
  amortizedCostRmb: doublePrecision('amortized_cost_rmb').notNull().default(0),
  weightGrams: integer('weight_grams').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const markets = pgTable('pricing_markets', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  exchangeRate: doublePrecision('exchange_rate').notNull(),
  commissionRate: doublePrecision('commission_rate').notNull(),
  transactionFeeRate: doublePrecision('transaction_fee_rate').notNull(),
  platformShippingRate: doublePrecision('platform_shipping_rate').notNull(),
  influencerRate: doublePrecision('influencer_rate').notNull().default(0),
  taxRate: doublePrecision('tax_rate').default(0),
  fixedAdjustment: doublePrecision('fixed_adjustment').notNull().default(0),
  promotionFeeCap: doublePrecision('promotion_fee_cap').notNull().default(100),
  shippingStrategy: text('shipping_strategy').notNull().default('rounded_weight_lookup'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shippingRates = pgTable('pricing_shipping_rates', {
  id: text('id').primaryKey(),
  marketId: text('market_id').notNull().references(() => markets.id, { onDelete: 'cascade' }),
  minWeightGrams: integer('min_weight_grams').notNull().default(0),
  maxWeightGrams: integer('max_weight_grams').notNull(),
  feeLocal: doublePrecision('fee_local').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueBand: unique('shipping_rates_market_weight_unique').on(table.marketId, table.minWeightGrams, table.maxWeightGrams),
}));

export const listings = pgTable('pricing_listings', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  marketId: text('market_id').notNull().references(() => markets.id, { onDelete: 'cascade' }),
  localPrice: doublePrecision('local_price').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueListing: unique('listings_product_market_unique').on(table.productId, table.marketId),
}));

export type Product = typeof products.$inferSelect;
export type Market = typeof markets.$inferSelect;
export type ShippingRate = typeof shippingRates.$inferSelect;
export type Listing = typeof listings.$inferSelect;
