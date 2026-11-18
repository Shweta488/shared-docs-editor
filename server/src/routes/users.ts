import { Router } from 'express';
import type { Client } from '@libsql/client';
import type { UsersResponse } from '../../../shared/types.js';
import { listUsers } from '../services/users.js';

export function userRoutes(db: Client): Router {
  const router = Router();

  router.get('/users', async (_req, res) => {
    const body: UsersResponse = { users: await listUsers(db) };
    res.json(body);
  });

  return router;
}
