import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { resolveSslConfig } from './ssl.js';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  ssl: resolveSslConfig({
    sslMode: env.databaseSslMode,
    caCertPath: env.databaseCaCertPath,
  }),
});

export const db = drizzle(pool);
