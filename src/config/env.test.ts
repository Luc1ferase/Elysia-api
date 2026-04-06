import assert from 'node:assert/strict';

const trackedEnvKeys = [
  'DATABASE_URL',
  'DATABASE_SSL_MODE',
  'DATABASE_CA_CERT_PATH',
  'HOST',
  'PORT',
  'CORS_ORIGIN',
] as const;

async function withEnv(
  overrides: Partial<Record<(typeof trackedEnvKeys)[number], string | undefined>>,
  run: () => Promise<void>,
) {
  const previous = new Map<string, string | undefined>();
  for (const key of trackedEnvKeys) {
    previous.set(key, process.env[key]);
  }

  try {
    for (const key of trackedEnvKeys) {
      const value = overrides[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function importEnvModule() {
  const nonce = `${Date.now()}-${Math.random()}`;
  return import(`./env.ts?case=${nonce}`);
}

await withEnv(
  {
    DATABASE_URL: undefined,
    DATABASE_SSL_MODE: 'require',
  },
  async () => {
    await assert.rejects(
      () => importEnvModule(),
      /DATABASE_URL/,
    );
  },
);

await withEnv(
  {
    DATABASE_URL: 'postgres://user:password@host:5432/app',
    DATABASE_SSL_MODE: 'require',
  },
  async () => {
    const { env } = await importEnvModule();
    assert.equal(env.databaseUrl, 'postgres://user:password@host:5432/app');
    assert.equal(env.databaseSslMode, 'require');
  },
);

console.log('env tests passed');
