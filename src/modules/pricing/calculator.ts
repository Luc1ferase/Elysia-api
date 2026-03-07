import type { Listing, Market, Product, ShippingRate } from '../../db/schema.js';

export interface PricingBreakdown {
  productId: string;
  marketId: string;
  listingId: string;
  sku: string;
  name: string;
  size: string;
  weightGrams: number;
  localPrice: number;
  costLocal: number;
  shippingFee: number;
  commissionFee: number;
  transactionFee: number;
  promotionFee: number;
  influencerFee: number;
  taxFee: number;
  fixedAdjustment: number;
  profitLocal: number;
  profitRmb: number;
  grossMargin: number;
}

function roundUpWeight(weightGrams: number, step = 10) {
  return Math.ceil(weightGrams / step) * step;
}

export function resolveShippingFee(market: Market, product: Product, rates: ShippingRate[]) {
  if (!rates.length) {
    return 0;
  }

  const lookupWeight = market.shippingStrategy === 'exact_weight_lookup'
    ? product.weightGrams
    : roundUpWeight(product.weightGrams);

  const orderedRates = [...rates].sort((left, right) => left.maxWeightGrams - right.maxWeightGrams);
  const matched = orderedRates.find((rate) => lookupWeight >= rate.minWeightGrams && lookupWeight <= rate.maxWeightGrams);
  return matched?.feeLocal ?? orderedRates.at(-1)?.feeLocal ?? 0;
}

function keepFourDigits(value: number) {
  return Number(value.toFixed(4));
}

export function calculatePricing(input: {
  product: Product;
  market: Market;
  listing: Listing;
  shippingRates: ShippingRate[];
}): PricingBreakdown {
  const { product, market, listing, shippingRates } = input;
  const costLocal = (product.costRmb + product.amortizedCostRmb) / market.exchangeRate;
  const shippingFee = resolveShippingFee(market, product, shippingRates);
  const commissionFee = listing.localPrice * market.commissionRate;
  const transactionFee = listing.localPrice * market.transactionFeeRate;
  const promotionFee = Math.min(listing.localPrice * market.platformShippingRate, market.promotionFeeCap);
  const influencerFee = listing.localPrice * market.influencerRate;
  const taxFee = listing.localPrice * (market.taxRate ?? 0);
  const fixedAdjustment = market.fixedAdjustment;

  const profitLocal = listing.localPrice
    - costLocal
    - shippingFee
    - commissionFee
    - transactionFee
    - promotionFee
    - influencerFee
    - taxFee
    - fixedAdjustment;

  const profitRmb = profitLocal * market.exchangeRate;
  const grossMargin = listing.localPrice === 0 ? 0 : profitLocal / listing.localPrice;

  return {
    productId: product.id,
    marketId: market.id,
    listingId: listing.id,
    sku: product.sku,
    name: product.name,
    size: product.size,
    weightGrams: product.weightGrams,
    localPrice: keepFourDigits(listing.localPrice),
    costLocal: keepFourDigits(costLocal),
    shippingFee: keepFourDigits(shippingFee),
    commissionFee: keepFourDigits(commissionFee),
    transactionFee: keepFourDigits(transactionFee),
    promotionFee: keepFourDigits(promotionFee),
    influencerFee: keepFourDigits(influencerFee),
    taxFee: keepFourDigits(taxFee),
    fixedAdjustment: keepFourDigits(fixedAdjustment),
    profitLocal: keepFourDigits(profitLocal),
    profitRmb: keepFourDigits(profitRmb),
    grossMargin: keepFourDigits(grossMargin),
  };
}

