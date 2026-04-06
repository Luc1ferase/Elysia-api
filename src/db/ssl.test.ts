import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSslConfig } from './ssl.ts';

async function withTempProject(run: (workspaceRoot: string, projectRoot: string) => Promise<void>) {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'elysia-api-ssl-'));
  const projectRoot = join(workspaceRoot, 'Elysia-api');
  await mkdir(projectRoot);

  try {
    await run(workspaceRoot, projectRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

await withTempProject(async (workspaceRoot, projectRoot) => {
  const certsDir = join(projectRoot, 'certs');
  await mkdir(certsDir);
  await writeFile(join(certsDir, 'aiven-ca.pem'), 'PROJECT CA');
  await writeFile(join(workspaceRoot, 'ca.pem'), 'WORKSPACE CA');

  const ssl = resolveSslConfig({
    sslMode: 'require',
    projectRoot,
  });

  assert.deepEqual(ssl, {
    ca: 'PROJECT CA',
    rejectUnauthorized: true,
  });
});

await withTempProject(async (_workspaceRoot, projectRoot) => {
  const certsDir = join(projectRoot, 'certs');
  await mkdir(certsDir);
  await writeFile(join(certsDir, 'custom.pem'), 'CUSTOM CA');

  const ssl = resolveSslConfig({
    sslMode: 'require',
    projectRoot,
    caCertPath: 'certs/custom.pem',
  });

  assert.deepEqual(ssl, {
    ca: 'CUSTOM CA',
    rejectUnauthorized: true,
  });
});

console.log('ssl tests passed');
