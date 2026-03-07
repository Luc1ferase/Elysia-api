import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import { env } from './config/env.js';
import { pool } from './db/client.js';
import { bootstrapDatabase } from './db/bootstrap.js';
import { listingRoutes } from './modules/listings/routes.js';
import { marketRoutes } from './modules/markets/routes.js';
import { pricingRoutes } from './modules/pricing/routes.js';
import { productRoutes } from './modules/products/routes.js';
import { workspaceRoutes } from './modules/workspace/routes.js';
import { HttpError } from './lib/errors.js';

await bootstrapDatabase();

const app = new Elysia({ adapter: node() })
  .use(cors({ origin: env.corsOrigin }))
  .use(swagger({ documentation: { info: { title: 'Pricing API', version: '0.1.0' } } }))
  .onError(({ error, set }) => {
    if (error instanceof HttpError) {
      set.status = error.status;
      return { message: error.message };
    }

    if ('code' in error && error.code === '23505') {
      set.status = 409;
      return { message: 'Duplicate record' };
    }

    console.error(error);
    set.status = 500;
    return { message: 'Internal server error' };
  })
  .get('/health', async () => {
    await pool.query('select 1');
    return { status: 'ok', timestamp: new Date().toISOString() };
  })
  .use(productRoutes)
  .use(marketRoutes)
  .use(listingRoutes)
  .use(pricingRoutes)
  .use(workspaceRoutes)
  .listen({ hostname: env.host, port: env.port });

console.log(`Pricing API running at http://${env.host}:${env.port}`);
