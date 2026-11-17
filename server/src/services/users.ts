import type { Client } from '@libsql/client';
import type { User } from '../../../shared/types.js';

function toUser(row: Record<string, unknown>): User {
  return { id: String(row.id), email: String(row.email), name: String(row.name) };
}

export async function findUserById(db: Client, id: string): Promise<User | null> {
  const result = await db.execute({ sql: 'SELECT id, email, name FROM users WHERE id = ?', args: [id] });
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function findUserByEmail(db: Client, email: string): Promise<User | null> {
  const result = await db.execute({
    sql: 'SELECT id, email, name FROM users WHERE email = ?',
    args: [email],
  });
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function listUsers(db: Client): Promise<User[]> {
  const result = await db.execute('SELECT id, email, name FROM users ORDER BY name');
  return result.rows.map(toUser);
}
