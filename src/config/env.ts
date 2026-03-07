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

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const env = {
  databaseUrl,
  databaseSslMode: readText('DATABASE_SSL_MODE', 'disable'),
  host: readText('HOST', '0.0.0.0'),
  port: readNumber('PORT', 3000),
  corsOrigin: readText('CORS_ORIGIN', '*'),
};
