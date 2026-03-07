import { Elysia, t } from 'elysia';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { markets, shippingRates } from '../../db/schema.js';
import { HttpError } from '../../lib/errors.js';
import { createId } from '../../lib/id.js';

const marketBody = t.Object({
  code: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  currency: t.String({ minLength: 1 }),
  exchangeRate: t.Numeric({ exclusiveMinimum: 0 }),
  commissionRate: t.Numeric({ minimum: 0 }),
  transactionFeeRate: t.Numeric({ minimum: 0 }),
  platformShippingRate: t.Numeric({ minimum: 0 }),
  influencerRate: t.Optional(t.Numeric({ minimum: 0 })),
  taxRate: t.Optional(t.Numeric({ minimum: 0 })),
  fixedAdjustment: t.Optional(t.Numeric()),
  promotionFeeCap: t.Optional(t.Numeric({ minimum: 0 })),
  shippingStrategy: t.Optional(t.Union([t.Literal('rounded_weight_lookup'), t.Literal('exact_weight_lookup')])),
  notes: t.Optional(t.String()),
});

const shippingRateBody = t.Object({
  marketId: t.String({ minLength: 1 }),
  minWeightGrams: t.Optional(t.Integer({ minimum: 0 })),
  maxWeightGrams: t.Integer({ minimum: 0 }),
  feeLocal: t.Numeric({ minimum: 0 }),
});

export const marketRoutes = new Elysia()
  .group('/markets', (app) => app
    .get('/', () => db.select().from(markets).orderBy(asc(markets.code)))
    .post('/', async ({ body, set }) => {
      const now = new Date();
      const [created] = await db.insert(markets).values({
        id: createId('mkt'),
        code: body.code,
        name: body.name,
        currency: body.currency,
        exchangeRate: body.exchangeRate,
        commissionRate: body.commissionRate,
        transactionFeeRate: body.transactionFeeRate,
        platformShippingRate: body.platformShippingRate,
        influencerRate: body.influencerRate ?? 0,
        taxRate: body.taxRate ?? 0,
        fixedAdjustment: body.fixedAdjustment ?? 0,
        promotionFeeCap: body.promotionFeeCap ?? 100,
        shippingStrategy: body.shippingStrategy ?? 'rounded_weight_lookup',
        notes: body.notes ?? '',
        createdAt: now,
        updatedAt: now,
      }).returning();
      set.status = 201;
      return created;
    }, { body: marketBody })
    .patch('/:id', async ({ params, body }) => {
      const [updated] = await db.update(markets).set({
        code: body.code,
        name: body.name,
        currency: body.currency,
        exchangeRate: body.exchangeRate,
        commissionRate: body.commissionRate,
        transactionFeeRate: body.transactionFeeRate,
        platformShippingRate: body.platformShippingRate,
        influencerRate: body.influencerRate ?? 0,
        taxRate: body.taxRate ?? 0,
        fixedAdjustment: body.fixedAdjustment ?? 0,
        promotionFeeCap: body.promotionFeeCap ?? 100,
        shippingStrategy: body.shippingStrategy ?? 'rounded_weight_lookup',
        notes: body.notes ?? '',
        updatedAt: new Date(),
      }).where(eq(markets.id, params.id)).returning();

      if (!updated) {
        throw new HttpError(404, 'Market not found');
      }

      return updated;
    }, { body: marketBody })
    .delete('/:id', async ({ params, set }) => {
      const [deleted] = await db.delete(markets).where(eq(markets.id, params.id)).returning({ id: markets.id });
      if (!deleted) {
        throw new HttpError(404, 'Market not found');
      }
      set.status = 204;
    }))
  .group('/shipping-rates', (app) => app
    .get('/', ({ query }) => {
      if (typeof query.marketId === 'string' && query.marketId.trim()) {
        return db.select().from(shippingRates).where(eq(shippingRates.marketId, query.marketId)).orderBy(asc(shippingRates.maxWeightGrams));
      }
      return db.select().from(shippingRates).orderBy(desc(shippingRates.updatedAt));
    })
    .post('/', async ({ body, set }) => {
      const now = new Date();
      const [created] = await db.insert(shippingRates).values({
        id: createId('shr'),
        marketId: body.marketId,
        minWeightGrams: body.minWeightGrams ?? 0,
        maxWeightGrams: body.maxWeightGrams,
        feeLocal: body.feeLocal,
        createdAt: now,
        updatedAt: now,
      }).returning();
      set.status = 201;
      return created;
    }, { body: shippingRateBody })
    .patch('/:id', async ({ params, body }) => {
      const [updated] = await db.update(shippingRates).set({
        marketId: body.marketId,
        minWeightGrams: body.minWeightGrams ?? 0,
        maxWeightGrams: body.maxWeightGrams,
        feeLocal: body.feeLocal,
        updatedAt: new Date(),
      }).where(eq(shippingRates.id, params.id)).returning();

      if (!updated) {
        throw new HttpError(404, 'Shipping rate not found');
      }

      return updated;
    }, { body: shippingRateBody })
    .delete('/:id', async ({ params, set }) => {
      const [deleted] = await db.delete(shippingRates).where(eq(shippingRates.id, params.id)).returning({ id: shippingRates.id });
      if (!deleted) {
        throw new HttpError(404, 'Shipping rate not found');
      }
      set.status = 204;
    }));

