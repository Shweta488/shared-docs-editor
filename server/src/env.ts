// Reads env vars once at startup. In production a missing value throws, so a
// misconfigured deploy fails loudly instead of signing tokens with the public dev
// secret or writing to a throwaway file DB.

export interface Env {
  authSecret: string;
  databaseUrl: string;
  databaseAuthToken: string | undefined;
  port: number;
}

type Source = Record<string, string | undefined>;

function required(source: Source, name: string): string {
  const value = source[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

// `source` is a parameter so tests can check production rules without touching process.env.
export function loadEnv(source: Source = process.env): Env {
  const isProduction = source.VERCEL === '1' || source.NODE_ENV === 'production';
  const port = Number(source.PORT ?? 3001);

  if (isProduction) {
    return {
      authSecret: required(source, 'AUTH_SECRET'),
      databaseUrl: required(source, 'TURSO_DATABASE_URL'),
      databaseAuthToken: required(source, 'TURSO_AUTH_TOKEN'),
      port,
    };
  }
  return {
    authSecret: source.AUTH_SECRET || 'dev-only-secret-do-not-use-in-production',
    databaseUrl: source.TURSO_DATABASE_URL || 'file:local.db',
    databaseAuthToken: source.TURSO_AUTH_TOKEN || undefined,
    port,
  };
}
