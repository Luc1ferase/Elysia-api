import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';

function resolveSslConfig() {
  if (env.databaseSslMode === 'require') {
    return true;
  }

  if (env.databaseSslMode === 'no-verify') {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  ssl: resolveSslConfig(),
});

export const db = drizzle(pool);
