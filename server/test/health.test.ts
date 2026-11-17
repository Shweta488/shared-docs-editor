import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/client.js';

async function makeApp() {
  return createApp({ db: await createDb(':memory:') });
}

describe('health and errors', () => {
  it('GET /api/health returns ok with the DB reachable', async () => {
    const res = await request(await makeApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown /api route returns the JSON error shape', async () => {
    const res = await request(await makeApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
