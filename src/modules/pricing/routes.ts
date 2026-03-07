import { Elysia } from 'elysia';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { listings, markets, products, shippingRates } from '../../db/schema.js';
import { HttpError } from '../../lib/errors.js';
import { calculatePricing } from './calculator.js';

export const pricingRoutes = new Elysia({ prefix: '/pricing' })
  .get('/market/:marketId', async ({ params }) => {
    const [market] = await db.select().from(markets).where(eq(markets.id, params.marketId));
    if (!market) {
      throw new HttpError(404, 'Market not found');
    }

    const marketListings = await db.select().from(listings).where(eq(listings.marketId, params.marketId));
    const productIds = marketListings.map((item) => item.productId);
    const marketShippingRates = await db.select().from(shippingRates).where(eq(shippingRates.marketId, params.marketId));

    if (!productIds.length) {
      return [];
    }

    const relatedProducts = await db.select().from(products).where(inArray(products.id, productIds));
    const productMap = new Map(relatedProducts.map((product) => [product.id, product]));

    return marketListings
      .map((listing) => {
        const product = productMap.get(listing.productId);
        if (!product) {
          return null;
        }
        return calculatePricing({ product, market, listing, shippingRates: marketShippingRates });
      })
      .filter(Boolean);
  });

