import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/client.js';

export const TEST_SECRET = 'test-secret';

/** A fresh app on its own in-memory database. */
export async function makeApp() {
  return createApp({ db: await createDb(':memory:'), authSecret: TEST_SECRET });
}

export type TestApp = Awaited<ReturnType<typeof makeApp>>;

/** Signs in a seeded user and returns their bearer token. */
export async function login(app: TestApp, email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  return res.body.token as string;
}
