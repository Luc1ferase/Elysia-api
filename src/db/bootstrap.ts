import { pool } from './client.js';

export async function bootstrapDatabase() {
  await pool.query(`
    create table if not exists pricing_products (
      id text primary key,
      sku text not null unique,
      name text not null,
      size text not null,
      cost_rmb double precision not null,
      amortized_cost_rmb double precision not null default 0,
      weight_grams integer not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists pricing_markets (
      id text primary key,
      code text not null unique,
      name text not null,
      currency text not null,
      exchange_rate double precision not null,
      commission_rate double precision not null,
      transaction_fee_rate double precision not null,
      platform_shipping_rate double precision not null,
      influencer_rate double precision not null default 0,
      tax_rate double precision default 0,
      fixed_adjustment double precision not null default 0,
      promotion_fee_cap double precision not null default 100,
      shipping_strategy text not null default 'rounded_weight_lookup',
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists pricing_shipping_rates (
      id text primary key,
      market_id text not null references pricing_markets(id) on delete cascade,
      min_weight_grams integer not null default 0,
      max_weight_grams integer not null,
      fee_local double precision not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint shipping_rates_market_weight_unique unique (market_id, min_weight_grams, max_weight_grams)
    );

    create table if not exists pricing_listings (
      id text primary key,
      product_id text not null references pricing_products(id) on delete cascade,
      market_id text not null references pricing_markets(id) on delete cascade,
      market_sku text not null default '',
      local_price double precision not null,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint listings_product_market_unique unique (product_id, market_id)
    );

    alter table pricing_listings add column if not exists market_sku text;

    update pricing_listings as listing
    set market_sku = case
      when coalesce(listing.market_sku, '') <> '' then listing.market_sku
      when listing.id ~ '^db_lst_[a-z]+_[0-9]+$' then upper(split_part(listing.id, '_', 3)) || '-' || split_part(listing.id, '_', 4)
      else product.sku
    end
    from pricing_products as product
    where product.id = listing.product_id
      and coalesce(listing.market_sku, '') = '';

    alter table pricing_listings alter column market_sku set default '';
    alter table pricing_listings alter column market_sku set not null;
  `);
}
