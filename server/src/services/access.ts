import type { Client } from '@libsql/client';
import type { Role } from '../../../shared/types.js';
import { AppError } from '../errors.js';

// The one place that decides who can do what with a document.
// Routes call requireRole; nothing else re-implements these rules.

export async function getRole(db: Client, userId: string, docId: string): Promise<Role | null> {
  const result = await db.execute({
    sql: `SELECT CASE WHEN d.owner_id = ? THEN 'owner' ELSE s.role END AS role
          FROM documents d
          LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
          WHERE d.id = ?`,
    args: [userId, userId, docId],
  });
  const role = result.rows[0]?.role;
  return role === 'owner' || role === 'editor' || role === 'viewer' ? role : null;
}

/**
 * No access at all is 404, so people can't tell a document exists.
 * Access with the wrong role is 403, since the user can already see the document.
 */
export async function requireRole(
  db: Client,
  userId: string,
  docId: string,
  allowed: readonly Role[],
): Promise<Role> {
  const role = await getRole(db, userId, docId);
  if (!role) throw new AppError('NOT_FOUND', 'Document not found');
  if (!allowed.includes(role)) {
    throw new AppError('FORBIDDEN', 'You don’t have permission to do that with this document.');
  }
  return role;
}
