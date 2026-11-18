import type { RequestHandler } from 'express';
import type { Client } from '@libsql/client';
import type { User } from '../../../shared/types.js';
import { verifyToken } from '../auth/token.js';
import { AppError } from '../errors.js';
import { findUserById } from '../services/users.js';

declare global {
  namespace Express {
    interface Locals {
      user: User;
    }
  }
}

// Puts the signed-in user on res.locals.user, or rejects with 401.
// The user must still exist, so a token for a deleted user stops working.
export function requireAuth(db: Client, secret: string): RequestHandler {
  return async (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    const userId = token ? verifyToken(token, secret) : null;
    const user = userId ? await findUserById(db, userId) : null;
    if (!user) throw new AppError('UNAUTHENTICATED', 'Please sign in again.');
    res.locals.user = user;
    next();
  };
}
