import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { login, makeApp } from './helpers.js';

describe('health and errors', () => {
  it('GET /api/health returns ok with the DB reachable', async () => {
    const res = await request(await makeApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown /api route returns the JSON error shape', async () => {
    const app = await makeApp();
    const token = await login(app, 'alice@example.com');
    const res = await request(app).get('/api/nope').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
