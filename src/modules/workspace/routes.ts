import { Elysia } from 'elysia';
import { db, pool } from '../../db/client.js';
import { listings, markets, products, shippingRates, type Listing, type Market, type Product, type ShippingRate } from '../../db/schema.js';

interface SnapshotPayload {
  products: Product[];
  markets: Market[];
  shippingRates: ShippingRate[];
  listings: Listing[];
}

async function replaceWorkspaceSnapshot(snapshot: SnapshotPayload) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const product of snapshot.products) {
      await client.query(`
        insert into pricing_products (id, sku, name, size, cost_rmb, amortized_cost_rmb, weight_grams, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (id) do update set
          sku = excluded.sku,
          name = excluded.name,
          size = excluded.size,
          cost_rmb = excluded.cost_rmb,
          amortized_cost_rmb = excluded.amortized_cost_rmb,
          weight_grams = excluded.weight_grams,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `, [
        product.id,
        product.sku,
        product.name,
        product.size,
        product.costRmb,
        product.amortizedCostRmb,
        product.weightGrams,
        new Date(product.createdAt),
        new Date(product.updatedAt),
      ]);
    }

    for (const market of snapshot.markets) {
      await client.query(`
        insert into pricing_markets (
          id, code, name, currency, exchange_rate, commission_rate, transaction_fee_rate,
          platform_shipping_rate, influencer_rate, tax_rate, fixed_adjustment,
          promotion_fee_cap, shipping_strategy, notes, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        on conflict (id) do update set
          code = excluded.code,
          name = excluded.name,
          currency = excluded.currency,
          exchange_rate = excluded.exchange_rate,
          commission_rate = excluded.commission_rate,
          transaction_fee_rate = excluded.transaction_fee_rate,
          platform_shipping_rate = excluded.platform_shipping_rate,
          influencer_rate = excluded.influencer_rate,
          tax_rate = excluded.tax_rate,
          fixed_adjustment = excluded.fixed_adjustment,
          promotion_fee_cap = excluded.promotion_fee_cap,
          shipping_strategy = excluded.shipping_strategy,
          notes = excluded.notes,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `, [
        market.id,
        market.code,
        market.name,
        market.currency,
        market.exchangeRate,
        market.commissionRate,
        market.transactionFeeRate,
        market.platformShippingRate,
        market.influencerRate,
        market.taxRate ?? 0,
        market.fixedAdjustment,
        market.promotionFeeCap,
        market.shippingStrategy,
        market.notes,
        new Date(market.createdAt),
        new Date(market.updatedAt),
      ]);
    }

    for (const rate of snapshot.shippingRates) {
      await client.query(`
        insert into pricing_shipping_rates (id, market_id, min_weight_grams, max_weight_grams, fee_local, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update set
          market_id = excluded.market_id,
          min_weight_grams = excluded.min_weight_grams,
          max_weight_grams = excluded.max_weight_grams,
          fee_local = excluded.fee_local,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `, [
        rate.id,
        rate.marketId,
        rate.minWeightGrams,
        rate.maxWeightGrams,
        rate.feeLocal,
        new Date(rate.createdAt),
        new Date(rate.updatedAt),
      ]);
    }

    for (const listing of snapshot.listings) {
      await client.query(`
        insert into pricing_listings (id, product_id, market_id, local_price, is_active, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update set
          product_id = excluded.product_id,
          market_id = excluded.market_id,
          local_price = excluded.local_price,
          is_active = excluded.is_active,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `, [
        listing.id,
        listing.productId,
        listing.marketId,
        listing.localPrice,
        listing.isActive,
        new Date(listing.createdAt),
        new Date(listing.updatedAt),
      ]);
    }

    if (snapshot.listings.length) {
      await client.query('delete from pricing_listings where id <> all($1::text[])', [snapshot.listings.map((item) => item.id)]);
    } else {
      await client.query('delete from pricing_listings');
    }

    if (snapshot.shippingRates.length) {
      await client.query('delete from pricing_shipping_rates where id <> all($1::text[])', [snapshot.shippingRates.map((item) => item.id)]);
    } else {
      await client.query('delete from pricing_shipping_rates');
    }

    if (snapshot.products.length) {
      await client.query('delete from pricing_products where id <> all($1::text[])', [snapshot.products.map((item) => item.id)]);
    } else {
      await client.query('delete from pricing_products');
    }

    if (snapshot.markets.length) {
      await client.query('delete from pricing_markets where id <> all($1::text[])', [snapshot.markets.map((item) => item.id)]);
    } else {
      await client.query('delete from pricing_markets');
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export const workspaceRoutes = new Elysia({ prefix: '/workspace' })
  .get('/snapshot', async () => ({
    products: await db.select().from(products),
    markets: await db.select().from(markets),
    shippingRates: await db.select().from(shippingRates),
    listings: await db.select().from(listings),
  }))
  .put('/snapshot', async ({ body }) => {
    const snapshot = body as SnapshotPayload;
    await replaceWorkspaceSnapshot(snapshot);
    return snapshot;
  });

