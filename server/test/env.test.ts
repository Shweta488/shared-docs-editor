import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';

const prodVars = {
  AUTH_SECRET: 'real-secret',
  TURSO_DATABASE_URL: 'libsql://example.turso.io',
  TURSO_AUTH_TOKEN: 'token',
};

describe('loadEnv', () => {
  it('on Vercel, throws when AUTH_SECRET is missing instead of using the dev secret', () => {
    expect(() => loadEnv({ VERCEL: '1', ...prodVars, AUTH_SECRET: undefined })).toThrow(/AUTH_SECRET/);
  });

  it('with NODE_ENV=production, throws when TURSO_DATABASE_URL is missing', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', ...prodVars, TURSO_DATABASE_URL: undefined })).toThrow(
      /TURSO_DATABASE_URL/,
    );
  });

  it('in production with every var set, uses them', () => {
    const env = loadEnv({ VERCEL: '1', ...prodVars });
    expect(env.authSecret).toBe('real-secret');
    expect(env.databaseUrl).toBe('libsql://example.turso.io');
  });

  it('locally, falls back to the dev defaults', () => {
    const env = loadEnv({});
    expect(env.databaseUrl).toBe('file:local.db');
    expect(env.databaseAuthToken).toBeUndefined();
    expect(env.authSecret).toMatch(/dev-only/);
    expect(env.port).toBe(3001);
  });
});
