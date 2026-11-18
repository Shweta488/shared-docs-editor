import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { login, makeApp } from './helpers.js';

// HTML in the exact shape TipTap's getHTML() produces for every toolbar format.
// If the sanitizer ever drops one of these, formatting would vanish silently on save.
const editorHtml = [
  '<h1>Heading one</h1>',
  '<h2>Heading two</h2>',
  '<h3>Heading three</h3>',
  '<p><strong>bold</strong> <em>italic</em> <u>underline</u> <strong><em><u>all three</u></em></strong></p>',
  '<ul><li><p>bullet one</p></li><li><p>bullet two</p></li></ul>',
  '<ol><li><p>first</p></li><li><p>second</p></li></ol>',
  '<p></p>',
].join('');

describe('editor round trip', () => {
  it('every allowed format saves and loads back unchanged', async () => {
    const app = await makeApp();
    const token = await login(app, 'alice@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post('/api/documents').set(auth).send({});
    const id = created.body.document.id as string;

    expect((await request(app).patch(`/api/documents/${id}`).set(auth).send({ content: editorHtml })).status).toBe(200);
    const reopened = await request(app).get(`/api/documents/${id}`).set(auth);
    expect(reopened.body.document.content).toBe(editorHtml);
  });

  it('a hard line break survives (sanitizer writes it as <br />, which TipTap reads back)', async () => {
    const app = await makeApp();
    const token = await login(app, 'alice@example.com');
    const auth = { Authorization: `Bearer ${token}` };
    const id = (await request(app).post('/api/documents').set(auth).send({})).body.document.id as string;

    await request(app).patch(`/api/documents/${id}`).set(auth).send({ content: '<p>line one<br>line two</p>' });
    const reopened = await request(app).get(`/api/documents/${id}`).set(auth);
    expect(reopened.body.document.content).toMatch(/^<p>line one<br ?\/?>line two<\/p>$/);
  });
});
