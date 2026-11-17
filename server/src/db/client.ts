import type { Client } from '@libsql/client';

// Remote URLs use the HTTP-only client, which has no native binary. That avoids
// platform-specific install problems on Vercel. Local files and :memory: need the full client.
export async function createDb(url: string, authToken?: string): Promise<Client> {
  const isLocal = url.startsWith('file:') || url === ':memory:';
  const { createClient } = isLocal
    ? await import('@libsql/client')
    : await import('@libsql/client/web');
  return createClient({ url, authToken });
}
