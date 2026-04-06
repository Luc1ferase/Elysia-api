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

function readRequiredText(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readDatabaseSslMode(): 'disable' | 'require' | 'no-verify' {
  const value = readText('DATABASE_SSL_MODE', 'require');
  if (value === 'disable' || value === 'require' || value === 'no-verify') {
    return value;
  }

  throw new Error(`Invalid DATABASE_SSL_MODE: ${value}`);
}

const databaseUrl = readRequiredText('DATABASE_URL');
const databaseCaCertPath = process.env.DATABASE_CA_CERT_PATH?.trim() || undefined;

export const env = {
  databaseUrl,
  databaseSslMode: readDatabaseSslMode(),
  databaseCaCertPath,
  host: readText('HOST', '0.0.0.0'),
  port: readNumber('PORT', 9800),
  corsOrigin: readText('CORS_ORIGIN', '*'),
};
