import { Router } from 'express';
import type { Client } from '@libsql/client';
import multer from 'multer';
import { z } from 'zod';
import type {
  DocumentResponse,
  DocumentsListResponse,
  UpdateDocumentResponse,
} from '../../../shared/types.js';
import { AppError } from '../errors.js';
import { requireRole } from '../services/access.js';
import { convertImport, MAX_IMPORT_BYTES } from '../services/import.js';
import {
  createDocument,
  DEFAULT_TITLE,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from '../services/documents.js';

const MAX_CONTENT_BYTES = 1_000_000;

// Memory storage: files are converted and discarded, never written to disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } });

const titleSchema = z.string().trim().min(1, 'Title can’t be empty').max(200, 'Title is too long');

// .max() counts characters; the limit is about stored size, so count bytes.
// The params code tells the error middleware to answer 413 instead of 400.
const contentSchema = z.string().refine((html) => Buffer.byteLength(html) <= MAX_CONTENT_BYTES, {
  message: 'This document is too large to save (limit 1 MB).',
  params: { code: 'CONTENT_TOO_LARGE' },
});

const idParams = z.object({ id: z.string().min(1) });
const createBody = z.object({ title: titleSchema.optional() });
const updateBody = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((b) => b.title !== undefined || b.content !== undefined, 'Send a title or content to update');

export function documentRoutes(db: Client): Router {
  const router = Router();

  router.get('/documents', async (_req, res) => {
    const body: DocumentsListResponse = await listDocuments(db, res.locals.user.id);
    res.json(body);
  });

  router.post('/documents', async (req, res) => {
    const { title } = createBody.parse(req.body ?? {});
    const userId = res.locals.user.id;
    const id = await createDocument(db, userId, title ?? DEFAULT_TITLE);
    const body: DocumentResponse = { document: await getDocument(db, id, 'owner') };
    res.status(201).json(body);
  });

  router.post('/documents/import', upload.single('file'), async (req, res) => {
    if (!req.file) throw new AppError('VALIDATION_ERROR', 'Choose a file to import.');
    // Multer decodes filenames as Latin-1; browsers send UTF-8.
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const { title, html } = await convertImport(name, req.file.buffer);
    const id = await createDocument(db, res.locals.user.id, title, html);
    const body: DocumentResponse = { document: await getDocument(db, id, 'owner') };
    res.status(201).json(body);
  });

  router.get('/documents/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const role = await requireRole(db, res.locals.user.id, id, ['owner', 'editor', 'viewer']);
    const body: DocumentResponse = { document: await getDocument(db, id, role) };
    res.json(body);
  });

  router.patch('/documents/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    // Access first, so a stranger always gets 404 whatever body they send.
    await requireRole(db, res.locals.user.id, id, ['owner', 'editor']);
    const changes = updateBody.parse(req.body);
    const body: UpdateDocumentResponse = await updateDocument(db, id, changes);
    res.json(body);
  });

  router.delete('/documents/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    await requireRole(db, res.locals.user.id, id, ['owner']);
    await deleteDocument(db, id);
    res.status(204).end();
  });

  return router;
}
