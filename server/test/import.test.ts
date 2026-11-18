import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeDocx } from './fixtures/docx.js';
import { login, makeApp, type TestApp } from './helpers.js';

let app: TestApp;
let token: string;

beforeEach(async () => {
  app = await makeApp();
  token = await login(app, 'alice@example.com');
});

const upload = (content: string | Buffer, filename: string) =>
  request(app)
    .post('/api/documents/import')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.isBuffer(content) ? content : Buffer.from(content), filename);

describe('POST /api/documents/import', () => {
  it('.txt: blank lines make paragraphs, newlines make breaks, HTML is escaped', async () => {
    const res = await upload('Hello there\n\nSecond <b>para</b>\nnext line\r\n', 'Meeting notes.txt');
    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({ title: 'Meeting notes', role: 'owner', ownerName: 'Alice' });
    expect(res.body.document.content).toBe('<p>Hello there</p><p>Second &lt;b&gt;para&lt;/b&gt;<br />next line</p>');
  });

  it('.md: keeps headings, bold, italic, lists; strips script; tables become plain text', async () => {
    const md = [
      '# Plan',
      '**bold** and *italic*',
      '- one\n- two',
      '1. first\n2. second',
      '<script>alert(1)</script>',
      '[a link](https://example.com)',
      '| a | b |\n|---|---|\n| 1 | 2 |',
    ].join('\n\n');
    const html: string = (await upload(md, 'plan.md')).body.document.content;
    expect(html).toContain('<h1>Plan</h1>');
    expect(html).toContain('<strong>bold</strong> and <em>italic</em>');
    expect(html).toMatch(/<ul>\s*<li>one<\/li>/);
    expect(html).toMatch(/<ol>\s*<li>first<\/li>/);
    expect(html).not.toMatch(/script|alert|<a |<table/);
    expect(html).toContain('a link');
    expect(html).toMatch(/1[\s\S]*2/);
  });

  it('.docx: keeps headings, bold, and italic', async () => {
    const docx = await makeDocx([
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Quarterly report</w:t></w:r></w:p>',
      '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r><w:r><w:t xml:space="preserve"> and </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>italic</w:t></w:r></w:p>',
    ]);
    const res = await upload(docx, 'Report.docx');
    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('Report');
    expect(res.body.document.content).toBe('<h1>Quarterly report</h1><p><strong>Bold</strong> and <em>italic</em></p>');
  });

  it('the imported document shows up under My documents', async () => {
    const id = (await upload('hi', 'a.txt')).body.document.id;
    const list = await request(app).get('/api/documents').set('Authorization', `Bearer ${token}`);
    expect(list.body.owned.map((d: { id: string }) => d.id)).toContain(id);
  });

  it('uses UTF-8 filenames for the title', async () => {
    expect((await upload('hi', 'Café notes.md')).body.document.title).toBe('Café notes');
  });

  it('rejects unsupported types with 415, checked by extension (case-insensitive)', async () => {
    const res = await upload('%PDF-1.4', 'scan.pdf');
    expect(res.status).toBe(415);
    expect(res.body.error).toEqual({
      code: 'UNSUPPORTED_FILE',
      message: 'That file type isn’t supported. Use .txt, .md, or .docx.',
    });
    expect((await upload('hello', 'NOTES.TXT')).status).toBe(201);
  });

  it('rejects files over 4 MB with 413 FILE_TOO_LARGE', async () => {
    const res = await upload(Buffer.alloc(4 * 1024 * 1024 + 1, 'a'), 'big.txt');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects empty or whitespace-only files with 400', async () => {
    for (const [content, name] of [
      ['', 'empty.txt'],
      ['  \n\n  ', 'blank.md'],
      ['<script>x</script>', 'only-script.md'],
    ]) {
      const res = await upload(content!, name!);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('This file has no readable text.');
    }
  });

  it('rejects a damaged .docx with 400', async () => {
    const res = await upload('not really a zip', 'broken.docx');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Couldn’t read this .docx/);
  });

  it('rejects a request with no file (400) or no token (401)', async () => {
    const noFile = await request(app).post('/api/documents/import').set('Authorization', `Bearer ${token}`);
    expect(noFile.status).toBe(400);
    const noToken = await request(app).post('/api/documents/import').attach('file', Buffer.from('hi'), 'a.txt');
    expect(noToken.status).toBe(401);
  });
});
