import express from 'express';
import type { Client } from '@libsql/client';
import type { HealthResponse } from '../../shared/types.js';
import { initDb } from './db/seed.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

export interface AppDeps {
  db: Client;
}

// One app for local dev, tests, and Vercel. Callers create the DB client,
// so tests can pass an in-memory database.
export function createApp({ db }: AppDeps) {
  const app = express();
  const ready = initDb(db);

  app.use(express.json({ limit: '2mb' }));
  // Wait for schema and seed before the first request touches the DB.
  app.use(async (_req, _res, next) => {
    await ready;
    next();
  });

  app.get('/api/health', async (_req, res) => {
    await db.execute('SELECT 1');
    const body: HealthResponse = { ok: true };
    res.json(body);
  });

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
