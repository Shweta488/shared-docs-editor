import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Client } from '@libsql/client';
import { login, makeContext, shareInDb, type TestApp } from './helpers.js';

let app: TestApp;
let db: Client;
let alice: string; // owner
let bob: string; // editor
let carol: string; // viewer
let docId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  ({ app, db } = await makeContext());
  [alice, bob, carol] = await Promise.all(
    ['alice', 'bob', 'carol'].map((n) => login(app, `${n}@example.com`)),
  );
  const res = await request(app).post('/api/documents').set(auth(alice)).send({ title: 'Team plan' });
  docId = res.body.document.id;
  await shareInDb(db, docId, 'user-bob', 'editor');
});

describe('create and list', () => {
  it('creates with a default title when none is given', async () => {
    const res = await request(app).post('/api/documents').set(auth(alice)).send({});
    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({ title: 'Untitled document', role: 'owner', ownerName: 'Alice' });
  });

  it('rejects an empty or too-long title with 400', async () => {
    for (const title of ['   ', 'x'.repeat(201)]) {
      const res = await request(app).post('/api/documents').set(auth(alice)).send({ title });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('lists owned documents with shareCount, and shared ones with owner and role', async () => {
    const mine = await request(app).get('/api/documents').set(auth(alice));
    expect(mine.body.owned).toEqual([expect.objectContaining({ id: docId, shareCount: 1 })]);
    expect(mine.body.shared).toEqual([]);

    const bobs = await request(app).get('/api/documents').set(auth(bob));
    expect(bobs.body.owned).toEqual([]);
    expect(bobs.body.shared).toEqual([
      expect.objectContaining({ id: docId, ownerName: 'Alice', role: 'editor' }),
    ]);

    const carols = await request(app).get('/api/documents').set(auth(carol));
    expect(carols.body).toEqual({ owned: [], shared: [] });
  });
});

describe('access matrix', () => {
  beforeEach(async () => {
    await shareInDb(db, docId, 'user-carol', 'viewer');
  });

  it('GET: owner, editor, and viewer can read, each with their own role', async () => {
    for (const [token, role] of [
      [alice, 'owner'],
      [bob, 'editor'],
      [carol, 'viewer'],
    ] as const) {
      const res = await request(app).get(`/api/documents/${docId}`).set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.document.role).toBe(role);
    }
  });

  it('PATCH: owner and editor can save, viewer gets 403', async () => {
    expect((await request(app).patch(`/api/documents/${docId}`).set(auth(alice)).send({ title: 'A' })).status).toBe(200);
    expect((await request(app).patch(`/api/documents/${docId}`).set(auth(bob)).send({ content: '<p>B</p>' })).status).toBe(200);
    const viewer = await request(app).patch(`/api/documents/${docId}`).set(auth(carol)).send({ title: 'C' });
    expect(viewer.status).toBe(403);
    expect(viewer.body.error.code).toBe('FORBIDDEN');
  });

  it('DELETE: editor and viewer get 403', async () => {
    expect((await request(app).delete(`/api/documents/${docId}`).set(auth(bob))).status).toBe(403);
    expect((await request(app).delete(`/api/documents/${docId}`).set(auth(carol))).status).toBe(403);
  });
});

describe('strangers and missing documents get 404 on every route', () => {
  it.each([
    ['get', undefined],
    ['patch', { title: 'hijack' }],
    ['delete', undefined],
  ] as const)('%s', async (method, body) => {
    // Carol has no share in this block.
    const stranger = await request(app)[method](`/api/documents/${docId}`).set(auth(carol)).send(body);
    expect(stranger.status).toBe(404);
    expect(stranger.body.error.code).toBe('NOT_FOUND');

    const missing = await request(app)[method]('/api/documents/does-not-exist').set(auth(alice)).send(body);
    expect(missing.status).toBe(404);
  });

  it('a stranger sending an invalid body still gets 404, not 400', async () => {
    const res = await request(app).patch(`/api/documents/${docId}`).set(auth(carol)).send({});
    expect(res.status).toBe(404);
  });
});

describe('save', () => {
  it('saves title and content, and they come back on reopen', async () => {
    const patch = await request(app)
      .patch(`/api/documents/${docId}`)
      .set(auth(alice))
      .send({ title: 'Renamed', content: '<h1>Hi</h1><p><strong>bold</strong></p>' });
    expect(patch.status).toBe(200);
    expect(patch.body.title).toBe('Renamed');

    const reopened = await request(app).get(`/api/documents/${docId}`).set(auth(alice));
    expect(reopened.body.document).toMatchObject({
      title: 'Renamed',
      content: '<h1>Hi</h1><p><strong>bold</strong></p>',
    });
  });

  it('rejects an empty update with 400', async () => {
    const res = await request(app).patch(`/api/documents/${docId}`).set(auth(alice)).send({});
    expect(res.status).toBe(400);
  });

  it('rejects content over 1 MB with 413 CONTENT_TOO_LARGE', async () => {
    const content = `<p>${'x'.repeat(1_000_001)}</p>`;
    const res = await request(app).patch(`/api/documents/${docId}`).set(auth(alice)).send({ content });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('CONTENT_TOO_LARGE');
  });

  it('sanitizes stored HTML: scripts and attributes removed, b/i/h4 mapped', async () => {
    await request(app)
      .patch(`/api/documents/${docId}`)
      .set(auth(alice))
      .send({
        content:
          '<p onclick="steal()" style="color:red">hi<script>alert(1)</script></p><b>b</b><i>i</i><h4>h</h4><a href="x">link</a>',
      });
    const res = await request(app).get(`/api/documents/${docId}`).set(auth(alice));
    expect(res.body.document.content).toBe('<p>hi</p><strong>b</strong><em>i</em><h3>h</h3>link');
  });
});

describe('delete', () => {
  it('owner deletes; the document and its shares are gone', async () => {
    const res = await request(app).delete(`/api/documents/${docId}`).set(auth(alice));
    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(alice))).status).toBe(404);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(bob))).status).toBe(404);
    const shares = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM shares WHERE document_id = ?', args: [docId] });
    expect(Number(shares.rows[0]!.n)).toBe(0);
  });
});
