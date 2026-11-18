import request from 'supertest';
import type { Client } from '@libsql/client';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/client.js';

export const TEST_SECRET = 'test-secret';

/** A fresh app and its own in-memory database. */
export async function makeContext() {
  const db = await createDb(':memory:');
  const app = createApp({ db, authSecret: TEST_SECRET });
  return { app, db };
}

export async function makeApp() {
  return (await makeContext()).app;
}

export type TestApp = ReturnType<typeof createApp>;

/** Signs in a seeded user and returns their bearer token. */
export async function login(app: TestApp, email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  return res.body.token as string;
}

/** Shares a document directly in the DB, so S2 tests don't depend on the S4 share routes. */
export async function shareInDb(db: Client, docId: string, userId: string, role: 'viewer' | 'editor') {
  await db.execute({
    sql: 'INSERT INTO shares (document_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
    args: [docId, userId, role, new Date().toISOString()],
  });
}
