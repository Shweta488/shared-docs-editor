import type { Client } from '@libsql/client';
import { schemaStatements } from './schema.js';

// Fixed IDs so demo users are the same in every environment.
export const seedUsers = [
  { id: 'user-alice', email: 'alice@example.com', name: 'Alice' },
  { id: 'user-bob', email: 'bob@example.com', name: 'Bob' },
  { id: 'user-carol', email: 'carol@example.com', name: 'Carol' },
];

export async function initDb(db: Client): Promise<void> {
  await db.batch(
    [
      ...schemaStatements,
      ...seedUsers.map((u) => ({
        sql: 'INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)',
        args: [u.id, u.email, u.name],
      })),
    ],
    'write',
  );
}
