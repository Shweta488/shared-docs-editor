import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createToken } from '../src/auth/token.js';
import { login, makeApp, TEST_SECRET, type TestApp } from './helpers.js';

let app: TestApp;

beforeEach(async () => {
  app = await makeApp();
});

describe('POST /api/auth/login', () => {
  it('returns a token and the user for a seeded email (case and spaces ignored)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '  Alice@Example.com ' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({ id: 'user-alice', email: 'alice@example.com', name: 'Alice' });
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'mallory@example.com' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a missing email with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('protected routes', () => {
  it('GET /api/auth/me returns the signed-in user', async () => {
    const token = await login(app, 'bob@example.com');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Bob');
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a tampered token with 401', async () => {
    const token = await login(app, 'bob@example.com');
    // Swap in Alice's payload but keep Bob's signature.
    const alicePayload = createToken('user-alice', 'some-other-secret').split('.')[0];
    const tampered = `${alicePayload}.${token.split('.')[1]}`;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired token with 401', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const expired = createToken('user-alice', TEST_SECRET, eightDaysAgo);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = createToken('user-alice', 'attacker-secret');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it.each(['garbage', 'a.b.c', '.', 'not-base64!.sig', ''])('rejects a malformed token %j', async (bad) => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a valid token for a user who no longer exists', async () => {
    const ghost = createToken('user-deleted', TEST_SECRET);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ghost}`);
    expect(res.status).toBe(401);
  });

  it('rejects a valid token sent without the Bearer prefix', async () => {
    const token = await login(app, 'alice@example.com');
    const res = await request(app).get('/api/auth/me').set('Authorization', token);
    expect(res.status).toBe(401);
  });

  it('GET /api/users lists the seeded users', async () => {
    const token = await login(app, 'alice@example.com');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { name: string }) => u.name)).toEqual(['Alice', 'Bob', 'Carol']);
  });
});
