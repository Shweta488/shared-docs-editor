import type { Client } from '@libsql/client';
import type { ShareEntry, ShareRole, SharesResponse } from '../../../shared/types.js';
import { AppError } from '../errors.js';
import { findUserById } from './users.js';

// Callers must check access with requireRole first.

export async function listShares(db: Client, docId: string): Promise<SharesResponse> {
  const [ownerResult, sharesResult] = await db.batch(
    [
      {
        sql: `SELECT u.id, u.email, u.name FROM documents d JOIN users u ON u.id = d.owner_id WHERE d.id = ?`,
        args: [docId],
      },
      {
        sql: `SELECT u.id, u.email, u.name, s.role
              FROM shares s JOIN users u ON u.id = s.user_id
              WHERE s.document_id = ?
              ORDER BY s.created_at`,
        args: [docId],
      },
    ],
    'read',
  );
  const owner = ownerResult!.rows[0];
  if (!owner) throw new AppError('NOT_FOUND', 'Document not found');
  return {
    owner: { id: String(owner.id), email: String(owner.email), name: String(owner.name) },
    shares: sharesResult!.rows.map((r) => ({
      user: { id: String(r.id), email: String(r.email), name: String(r.name) },
      role: r.role as ShareRole,
    })),
  };
}

/** Adds access, or changes the role if the person already has access. */
export async function upsertShare(
  db: Client,
  docId: string,
  ownerId: string,
  userId: string,
  role: ShareRole,
): Promise<ShareEntry> {
  if (userId === ownerId) {
    throw new AppError('VALIDATION_ERROR', 'The owner already has full access.');
  }
  const user = await findUserById(db, userId);
  if (!user) throw new AppError('VALIDATION_ERROR', 'That user doesn’t exist.');

  await db.execute({
    sql: `INSERT INTO shares (document_id, user_id, role, created_at) VALUES (?, ?, ?, ?)
          ON CONFLICT (document_id, user_id) DO UPDATE SET role = excluded.role`,
    args: [docId, userId, role, new Date().toISOString()],
  });
  return { user, role };
}

export async function removeShare(db: Client, docId: string, userId: string): Promise<void> {
  const result = await db.execute({
    sql: 'DELETE FROM shares WHERE document_id = ? AND user_id = ?',
    args: [docId, userId],
  });
  if (result.rowsAffected === 0) {
    throw new AppError('NOT_FOUND', 'That person doesn’t have access to this document.');
  }
}
