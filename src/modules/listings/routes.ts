import { Elysia, t } from 'elysia';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { listings } from '../../db/schema.js';
import { HttpError } from '../../lib/errors.js';
import { createId } from '../../lib/id.js';

const listingBody = t.Object({
  productId: t.String({ minLength: 1 }),
  marketId: t.String({ minLength: 1 }),
  marketSku: t.Optional(t.String()),
  localPrice: t.Numeric({ minimum: 0 }),
  isActive: t.Optional(t.Boolean()),
});

export const listingRoutes = new Elysia({ prefix: '/listings' })
  .get('/', ({ query }) => {
    if (typeof query.marketId === 'string' && query.marketId.trim()) {
      return db.select().from(listings).where(eq(listings.marketId, query.marketId)).orderBy(desc(listings.updatedAt));
    }

    return db.select().from(listings).orderBy(desc(listings.updatedAt));
  })
  .post('/', async ({ body, set }) => {
    const now = new Date();
    const [created] = await db.insert(listings).values({
      id: createId('lst'),
      productId: body.productId,
      marketId: body.marketId,
      marketSku: body.marketSku ?? '',
      localPrice: body.localPrice,
      isActive: body.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }).returning();
    set.status = 201;
    return created;
  }, { body: listingBody })
  .patch('/:id', async ({ params, body }) => {
    const [updated] = await db.update(listings).set({
      productId: body.productId,
      marketId: body.marketId,
      marketSku: body.marketSku ?? '',
      localPrice: body.localPrice,
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
    }).where(eq(listings.id, params.id)).returning();

    if (!updated) {
      throw new HttpError(404, 'Listing not found');
    }

    return updated;
  }, { body: listingBody })
  .delete('/:id', async ({ params, set }) => {
    const [deleted] = await db.delete(listings).where(eq(listings.id, params.id)).returning({ id: listings.id });
    if (!deleted) {
      throw new HttpError(404, 'Listing not found');
    }
    set.status = 204;
  });

