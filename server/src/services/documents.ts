import { randomUUID } from 'node:crypto';
import type { Client, Row } from '@libsql/client';
import type {
  DocumentDetail,
  DocumentsListResponse,
  Role,
  ShareRole,
  UpdateDocumentResponse,
} from '../../../shared/types.js';
import { AppError } from '../errors.js';
import { sanitize } from './sanitize.js';

// Callers must check access with requireRole first. These functions trust their inputs.

export const DEFAULT_TITLE = 'Untitled document';

export async function createDocument(
  db: Client,
  ownerId: string,
  title: string,
  content = '',
): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, title, sanitize(content), ownerId, now, now],
  });
  return id;
}

export async function listDocuments(db: Client, userId: string): Promise<DocumentsListResponse> {
  const [owned, shared] = await db.batch(
    [
      {
        sql: `SELECT d.id, d.title, d.updated_at,
                (SELECT COUNT(*) FROM shares s WHERE s.document_id = d.id) AS share_count
              FROM documents d
              WHERE d.owner_id = ?
              ORDER BY d.updated_at DESC`,
        args: [userId],
      },
      {
        sql: `SELECT d.id, d.title, d.updated_at, s.role, u.name AS owner_name
              FROM shares s
              JOIN documents d ON d.id = s.document_id
              JOIN users u ON u.id = d.owner_id
              WHERE s.user_id = ?
              ORDER BY d.updated_at DESC`,
        args: [userId],
      },
    ],
    'read',
  );
  return {
    owned: owned!.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      updatedAt: String(r.updated_at),
      shareCount: Number(r.share_count),
    })),
    shared: shared!.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      updatedAt: String(r.updated_at),
      ownerName: String(r.owner_name),
      role: r.role as ShareRole,
    })),
  };
}

function toDetail(r: Row, role: Role): DocumentDetail {
  return {
    id: String(r.id),
    title: String(r.title),
    content: String(r.content),
    ownerId: String(r.owner_id),
    ownerName: String(r.owner_name),
    role,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function getDocument(db: Client, id: string, role: Role): Promise<DocumentDetail> {
  const result = await db.execute({
    sql: `SELECT d.id, d.title, d.content, d.owner_id, d.created_at, d.updated_at, u.name AS owner_name
          FROM documents d JOIN users u ON u.id = d.owner_id
          WHERE d.id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  if (!row) throw new AppError('NOT_FOUND', 'Document not found');
  return toDetail(row, role);
}

export async function updateDocument(
  db: Client,
  id: string,
  changes: { title?: string; content?: string },
): Promise<UpdateDocumentResponse> {
  const now = new Date().toISOString();
  // COALESCE keeps the current value for any field not sent.
  const result = await db.execute({
    sql: `UPDATE documents
          SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = ?
          WHERE id = ?
          RETURNING id, title, updated_at`,
    args: [
      changes.title ?? null,
      changes.content === undefined ? null : sanitize(changes.content),
      now,
      id,
    ],
  });
  const row = result.rows[0];
  if (!row) throw new AppError('NOT_FOUND', 'Document not found');
  return { id: String(row.id), title: String(row.title), updatedAt: String(row.updated_at) };
}

// Shares go first, in the same transaction. We don't rely on ON DELETE CASCADE
// because SQLite only enforces foreign keys when a pragma is on.
export async function deleteDocument(db: Client, id: string): Promise<void> {
  await db.batch(
    [
      { sql: 'DELETE FROM shares WHERE document_id = ?', args: [id] },
      { sql: 'DELETE FROM documents WHERE id = ?', args: [id] },
    ],
    'write',
  );
}
