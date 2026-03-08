import 'dotenv/config';

function readNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${name}: ${value}`);
  }

  return parsed;
}

function readText(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

const defaultDatabaseUrl = 'postgres://elysia:Fezr8tg-_qfvqGHy!P38@pgm-bp112i5yr59280w7po.pg.rds.aliyuncs.com:5432/elysia';
const databaseUrl = process.env.DATABASE_URL?.trim() || defaultDatabaseUrl;

export const env = {
  databaseUrl,
  databaseSslMode: readText('DATABASE_SSL_MODE', 'disable'),
  host: readText('HOST', '0.0.0.0'),
  port: readNumber('PORT', 3000),
  corsOrigin: readText('CORS_ORIGIN', '*'),
};
