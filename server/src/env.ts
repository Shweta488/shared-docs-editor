// Reads env vars once. In production a missing value stops the app at startup,
// so a misconfigured deploy fails loudly instead of writing to a throwaway file DB.

export interface Env {
  authSecret: string;
  databaseUrl: string;
  databaseAuthToken: string | undefined;
  port: number;
}

const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export function loadEnv(): Env {
  if (isProduction) {
    return {
      authSecret: required('AUTH_SECRET'),
      databaseUrl: required('TURSO_DATABASE_URL'),
      databaseAuthToken: required('TURSO_AUTH_TOKEN'),
      port: Number(process.env.PORT ?? 3001),
    };
  }
  return {
    authSecret: process.env.AUTH_SECRET || 'dev-only-secret-do-not-use-in-production',
    databaseUrl: process.env.TURSO_DATABASE_URL || 'file:local.db',
    databaseAuthToken: process.env.TURSO_AUTH_TOKEN || undefined,
    port: Number(process.env.PORT ?? 3001),
  };
}
