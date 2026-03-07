import { Elysia, t } from 'elysia';
import { desc, eq, ilike } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { products } from '../../db/schema.js';
import { HttpError } from '../../lib/errors.js';
import { createId } from '../../lib/id.js';

const productBody = t.Object({
  sku: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  size: t.String({ minLength: 1 }),
  costRmb: t.Numeric({ minimum: 0 }),
  amortizedCostRmb: t.Optional(t.Numeric({ minimum: 0 })),
  weightGrams: t.Integer({ minimum: 0 }),
});

export const productRoutes = new Elysia({ prefix: '/products' })
  .get('/', async ({ query }) => {
    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : '';
    return keyword
      ? db.select().from(products).where(ilike(products.sku, `%${keyword}%`)).orderBy(desc(products.updatedAt))
      : db.select().from(products).orderBy(desc(products.updatedAt));
  })
  .post('/', async ({ body, set }) => {
    const now = new Date();
    const [created] = await db.insert(products).values({
      id: createId('prd'),
      sku: body.sku,
      name: body.name,
      size: body.size,
      costRmb: body.costRmb,
      amortizedCostRmb: body.amortizedCostRmb ?? 0,
      weightGrams: body.weightGrams,
      createdAt: now,
      updatedAt: now,
    }).returning();
    set.status = 201;
    return created;
  }, { body: productBody })
  .patch('/:id', async ({ params, body }) => {
    const [updated] = await db.update(products).set({
      sku: body.sku,
      name: body.name,
      size: body.size,
      costRmb: body.costRmb,
      amortizedCostRmb: body.amortizedCostRmb ?? 0,
      weightGrams: body.weightGrams,
      updatedAt: new Date(),
    }).where(eq(products.id, params.id)).returning();

    if (!updated) {
      throw new HttpError(404, 'Product not found');
    }

    return updated;
  }, { body: productBody })
  .delete('/:id', async ({ params, set }) => {
    const [deleted] = await db.delete(products).where(eq(products.id, params.id)).returning({ id: products.id });
    if (!deleted) {
      throw new HttpError(404, 'Product not found');
    }
    set.status = 204;
  });

