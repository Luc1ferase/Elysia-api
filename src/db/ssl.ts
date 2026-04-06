import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConnectionOptions } from 'tls';

export type DatabaseSslMode = 'disable' | 'require' | 'no-verify';

interface ResolveSslConfigOptions {
  sslMode: DatabaseSslMode;
  caCertPath?: string;
  projectRoot?: string;
}

const defaultProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function resolveCaCandidate(candidate: string, projectRoot: string) {
  return isAbsolute(candidate) ? candidate : resolve(projectRoot, candidate);
}

function findCaCertPath(projectRoot: string, caCertPath?: string) {
  if (caCertPath) {
    const resolvedPath = resolveCaCandidate(caCertPath, projectRoot);
    if (!existsSync(resolvedPath)) {
      throw new Error(`DATABASE_CA_CERT_PATH does not exist: ${resolvedPath}`);
    }
    return resolvedPath;
  }

  const defaultCandidates = [
    join(projectRoot, 'certs', 'aiven-ca.pem'),
    join(projectRoot, 'ca.pem'),
    join(projectRoot, '..', 'ca.pem'),
  ];

  return defaultCandidates.find((candidate) => existsSync(candidate));
}

export function resolveSslConfig({
  sslMode,
  caCertPath,
  projectRoot = defaultProjectRoot,
}: ResolveSslConfigOptions): ConnectionOptions | boolean | undefined {
  if (sslMode === 'disable') {
    return undefined;
  }

  if (sslMode === 'no-verify') {
    return { rejectUnauthorized: false };
  }

  const resolvedCaPath = findCaCertPath(projectRoot, caCertPath);
  if (!resolvedCaPath) {
    return true;
  }

  return {
    ca: readFileSync(resolvedCaPath, 'utf8'),
    rejectUnauthorized: true,
  };
}
