import { Router } from 'express';
import type { Client } from '@libsql/client';
import { z } from 'zod';
import type { PutShareResponse, SharesResponse } from '../../../shared/types.js';
import { requireRole } from '../services/access.js';
import { listShares, removeShare, upsertShare } from '../services/shares.js';

const idParams = z.object({ id: z.string().min(1) });
const removeParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });
const putBody = z.object({
  userId: z.string().min(1, 'Pick a person to share with'),
  role: z.enum(['viewer', 'editor'], { message: 'Role must be viewer or editor' }),
});

// Access is checked before the body in every route, so a stranger always gets 404.
export function shareRoutes(db: Client): Router {
  const router = Router();

  router.get('/documents/:id/shares', async (req, res) => {
    const { id } = idParams.parse(req.params);
    // Owner only: the list includes other people's emails.
    await requireRole(db, res.locals.user.id, id, ['owner']);
    const body: SharesResponse = await listShares(db, id);
    res.json(body);
  });

  router.put('/documents/:id/shares', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const ownerId = res.locals.user.id;
    await requireRole(db, ownerId, id, ['owner']);
    const { userId, role } = putBody.parse(req.body);
    const body: PutShareResponse = { share: await upsertShare(db, id, ownerId, userId, role) };
    res.json(body);
  });

  router.delete('/documents/:id/shares/:userId', async (req, res) => {
    const { id, userId } = removeParams.parse(req.params);
    await requireRole(db, res.locals.user.id, id, ['owner']);
    await removeShare(db, id, userId);
    res.status(204).end();
  });

  return router;
}
