import { Router } from 'express';
import type { Client } from '@libsql/client';
import { z } from 'zod';
import type { LoginResponse, MeResponse } from '../../../shared/types.js';
import { createToken } from '../auth/token.js';
import { AppError } from '../errors.js';
import { findUserByEmail } from '../services/users.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
});

export function publicAuthRoutes(db: Client, secret: string): Router {
  const router = Router();

  router.post('/auth/login', async (req, res) => {
    const { email } = loginSchema.parse(req.body);
    const user = await findUserByEmail(db, email);
    if (!user) throw new AppError('UNAUTHENTICATED', 'No demo account with that email.');
    const body: LoginResponse = { token: createToken(user.id, secret), user };
    res.json(body);
  });

  return router;
}

export function authRoutes(): Router {
  const router = Router();

  router.get('/auth/me', (_req, res) => {
    const body: MeResponse = { user: res.locals.user };
    res.json(body);
  });

  return router;
}
