import { Elysia } from 'elysia';
import { db, pool } from '../../db/client.js';
import { listings, markets, products, shippingRates, type Listing, type Market, type Product, type ShippingRate } from '../../db/schema.js';

interface SnapshotPayload {
  products: Product[];
  markets: Market[];
  shippingRates: ShippingRate[];
  listings: Listing[];
}

const BATCH_SIZE = 50;

function buildBatchInsert(table: string, columns: string[], rows: unknown[][]) {
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  for (const row of rows) {
    const rowPlaceholders = row.map(() => `$${paramIndex++}`);
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
    values.push(...row);
  }
  return { text: `insert into ${table} (${columns.join(', ')}) values ${placeholders.join(', ')}`, values };
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function replaceWorkspaceSnapshot(snapshot: SnapshotPayload) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const delListings = await client.query('delete from pricing_listings');
    const delRates = await client.query('delete from pricing_shipping_rates');
    const delProducts = await client.query('delete from pricing_products');
    const delMarkets = await client.query('delete from pricing_markets');
    console.log(`Deleted: ${delListings.rowCount} listings, ${delRates.rowCount} rates, ${delProducts.rowCount} products, ${delMarkets.rowCount} markets`);

    for (const batch of chunk(snapshot.markets, BATCH_SIZE)) {
      const { text, values } = buildBatchInsert(
        'pricing_markets',
        ['id', 'code', 'name', 'currency', 'exchange_rate', 'commission_rate', 'transaction_fee_rate', 'platform_shipping_rate', 'influencer_rate', 'tax_rate', 'fixed_adjustment', 'promotion_fee_cap', 'shipping_strategy', 'notes', 'created_at', 'updated_at'],
        batch.map((m) => [m.id, m.code, m.name, m.currency, m.exchangeRate, m.commissionRate, m.transactionFeeRate, m.platformShippingRate, m.influencerRate, m.taxRate ?? 0, m.fixedAdjustment, m.promotionFeeCap, m.shippingStrategy, m.notes, new Date(m.createdAt), new Date(m.updatedAt)]),
      );
      await client.query(text, values);
    }

    for (const batch of chunk(snapshot.products, BATCH_SIZE)) {
      const { text, values } = buildBatchInsert(
        'pricing_products',
        ['id', 'sku', 'name', 'size', 'cost_rmb', 'amortized_cost_rmb', 'weight_grams', 'created_at', 'updated_at'],
        batch.map((p) => [p.id, p.sku, p.name, p.size, p.costRmb, p.amortizedCostRmb, p.weightGrams, new Date(p.createdAt), new Date(p.updatedAt)]),
      );
      await client.query(text, values);
    }

    for (const batch of chunk(snapshot.shippingRates, BATCH_SIZE)) {
      const { text, values } = buildBatchInsert(
        'pricing_shipping_rates',
        ['id', 'market_id', 'min_weight_grams', 'max_weight_grams', 'fee_local', 'created_at', 'updated_at'],
        batch.map((r) => [r.id, r.marketId, r.minWeightGrams, r.maxWeightGrams, r.feeLocal, new Date(r.createdAt), new Date(r.updatedAt)]),
      );
      await client.query(text, values);
    }

    for (const batch of chunk(snapshot.listings, BATCH_SIZE)) {
      const { text, values } = buildBatchInsert(
        'pricing_listings',
        ['id', 'product_id', 'market_id', 'market_sku', 'local_price', 'is_active', 'created_at', 'updated_at'],
        batch.map((l) => [l.id, l.productId, l.marketId, (l as Listing & { marketSku?: string }).marketSku ?? '', l.localPrice, l.isActive, new Date(l.createdAt), new Date(l.updatedAt)]),
      );
      await client.query(text, values);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    console.error('Insert error:', error);
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
