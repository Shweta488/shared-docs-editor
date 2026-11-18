import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { login, makeApp, type TestApp } from './helpers.js';

let app: TestApp;
let alice: string; // owner
let bob: string;
let carol: string;
let docId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const share = (token: string, userId: string, role: string) =>
  request(app).put(`/api/documents/${docId}/shares`).set(auth(token)).send({ userId, role });

beforeEach(async () => {
  app = await makeApp();
  [alice, bob, carol] = await Promise.all(['alice', 'bob', 'carol'].map((n) => login(app, `${n}@example.com`)));
  docId = (await request(app).post('/api/documents').set(auth(alice)).send({ title: 'Team plan' })).body.document.id;
});

describe('owner manages access', () => {
  it('adds people, lists them, and shows the count on the dashboard', async () => {
    const added = await share(alice, 'user-bob', 'editor');
    expect(added.status).toBe(200);
    expect(added.body.share).toEqual({ user: expect.objectContaining({ name: 'Bob' }), role: 'editor' });
    await share(alice, 'user-carol', 'viewer');

    const list = await request(app).get(`/api/documents/${docId}/shares`).set(auth(alice));
    expect(list.body.owner.name).toBe('Alice');
    expect(list.body.shares.map((s: { user: { name: string }; role: string }) => [s.user.name, s.role])).toEqual([
      ['Bob', 'editor'],
      ['Carol', 'viewer'],
    ]);

    const dashboard = await request(app).get('/api/documents').set(auth(alice));
    expect(dashboard.body.owned[0].shareCount).toBe(2);
  });

  it('changing a role updates it in place (no duplicate row) and takes effect', async () => {
    await share(alice, 'user-carol', 'viewer');
    expect((await request(app).patch(`/api/documents/${docId}`).set(auth(carol)).send({ title: 'x' })).status).toBe(403);

    await share(alice, 'user-carol', 'editor');
    const list = await request(app).get(`/api/documents/${docId}/shares`).set(auth(alice));
    expect(list.body.shares).toHaveLength(1);
    expect((await request(app).patch(`/api/documents/${docId}`).set(auth(carol)).send({ title: 'x' })).status).toBe(200);
  });

  it('removing access makes the document 404 for that person', async () => {
    await share(alice, 'user-bob', 'editor');
    const removed = await request(app).delete(`/api/documents/${docId}/shares/user-bob`).set(auth(alice));
    expect(removed.status).toBe(204);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(bob))).status).toBe(404);
    expect((await request(app).get('/api/documents').set(auth(bob))).body.shared).toEqual([]);
  });

  it('removing someone who has no access is 404', async () => {
    const res = await request(app).delete(`/api/documents/${docId}/shares/user-carol`).set(auth(alice));
    expect(res.status).toBe(404);
  });
});

describe('validation', () => {
  it('rejects sharing with the owner', async () => {
    const res = await share(alice, 'user-alice', 'editor');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/owner/);
  });

  it('rejects an unknown user', async () => {
    expect((await share(alice, 'user-mallory', 'viewer')).status).toBe(400);
  });

  it('rejects a bad role or missing user', async () => {
    expect((await share(alice, 'user-bob', 'owner')).status).toBe(400);
    expect((await share(alice, '', 'viewer')).status).toBe(400);
  });
});

describe('only the owner changes access', () => {
  beforeEach(async () => {
    await share(alice, 'user-bob', 'editor');
    await share(alice, 'user-carol', 'viewer');
  });

  it('editor and viewer get 403 listing who has access (it exposes emails)', async () => {
    for (const token of [bob, carol]) {
      const res = await request(app).get(`/api/documents/${docId}/shares`).set(auth(token));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('editor and viewer get 403 when adding, changing, or removing', async () => {
    for (const token of [bob, carol]) {
      expect((await share(token, 'user-carol', 'editor')).status).toBe(403);
      expect((await request(app).delete(`/api/documents/${docId}/shares/user-bob`).set(auth(token))).status).toBe(403);
    }
  });
});

describe('strangers get 404 on every share route', () => {
  it('GET, PUT, and DELETE', async () => {
    // Carol has no access here.
    expect((await request(app).get(`/api/documents/${docId}/shares`).set(auth(carol))).status).toBe(404);
    expect((await share(carol, 'user-carol', 'editor')).status).toBe(404);
    expect((await request(app).delete(`/api/documents/${docId}/shares/user-bob`).set(auth(carol))).status).toBe(404);
    // A stranger can't grant themselves access with a bad body either.
    expect((await request(app).put(`/api/documents/${docId}/shares`).set(auth(carol)).send({})).status).toBe(404);
  });
});
