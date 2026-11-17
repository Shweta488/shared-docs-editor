# Low-level design (LLD)

Implements `docs/ARCHITECTURE.md`. Short by design: enough to build from, not more.

## 1. Folder structure

One `package.json` at the root, two TypeScript projects. The client may import `shared/` but never `server/`.

```
client/src/
  main.tsx, App.tsx           routes: /login, /, /docs/:id
  api/client.ts               fetch wrapper (token, error parsing)
  auth/AuthContext.tsx        current user + token
  pages/                      LoginPage, DashboardPage, EditorPage
  components/                 Toolbar, ShareDialog, ImportButton, SaveStatus
  hooks/useAutosave.ts
server/src/
  app.ts                      createApp(db): builds the Express app (used by local, tests, Vercel)
  index.ts                    local entry: listen on PORT
  env.ts                      reads and checks env vars
  db/client.ts, db/schema.ts, db/seed.ts
  middleware/auth.ts, middleware/errors.ts
  routes/auth.ts, routes/documents.ts, routes/shares.ts
  services/access.ts          the one access-check function
  services/documents.ts, services/shares.ts, services/import.ts, services/sanitize.ts
  auth/token.ts
server/test/                  Vitest + Supertest
shared/types.ts               API request and response types
api/                          Vercel entry (exact shape decided in S0)
.github/workflows/ci.yml
```

## 2. Database schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS shares (
  document_id TEXT NOT NULL REFERENCES documents(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
```

- IDs are `crypto.randomUUID()`. Timestamps are ISO strings.
- Delete removes the document's shares and the document in one `db.batch` transaction. We don't rely on `ON DELETE CASCADE`, because SQLite only enforces foreign keys when a pragma is on.
- `initDb()` runs the schema and seeds Alice, Bob, and Carol (`alice@example.com`, and so on) with `INSERT OR IGNORE`. It is idempotent and runs once per process (memoized promise).

## 3. Access check (`services/access.ts`)

```ts
type Role = 'owner' | 'editor' | 'viewer';
getRole(db, userId, docId): Promise<Role | null>
requireRole(db, userId, docId, allowed: Role[]): Promise<Role>
```

`getRole` is one parameterized query:

```sql
SELECT CASE WHEN d.owner_id = ? THEN 'owner' ELSE s.role END AS role
FROM documents d
LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
WHERE d.id = ?
```

`requireRole` throws `NOT_FOUND` (404) when the role is null, and `FORBIDDEN` (403) when the user can see the document but their role is not in `allowed` (for example, a viewer saving). Every document and share route calls `requireRole` first.

## 4. Request pipeline and errors

`express.json({ limit: '2mb' })` → `requireAuth` (all routes except login) → route: zod `parse` → `requireRole` → service call → JSON response. Express 5 forwards async errors to the error middleware.

All errors use one shape: `{ "error": { "code": "NOT_FOUND", "message": "Document not found" } }`

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | zod failure (message lists the field), empty import |
| `UNAUTHENTICATED` | 401 | missing, bad, or expired token; unknown login email |
| `FORBIDDEN` | 403 | has access, wrong role |
| `NOT_FOUND` | 404 | no document, or no access to it |
| `CONTENT_TOO_LARGE` | 413 | document content over 1 MB, or JSON body over the 2 MB parser limit |
| `FILE_TOO_LARGE` | 413 | upload over 4 MB |
| `UNSUPPORTED_FILE` | 415 | extension not `.txt`, `.md`, `.docx` |
| `INTERNAL` | 500 | anything else (logged; generic message to the client) |

## 5. API contracts

All routes are under `/api` and need `Authorization: Bearer <token>`, except login.

| Route | Request | Success | Errors |
|---|---|---|---|
| `POST /auth/login` | `{ email }` | 200 `{ token, user }` | 400, 401 |
| `GET /auth/me` | | 200 `{ user }` | 401 |
| `GET /users` | | 200 `{ users: User[] }` | 401 |
| `GET /documents` | | 200 `{ owned: OwnedDocSummary[], shared: SharedDocSummary[] }`, newest first | 401 |
| `POST /documents` | `{ title? }` (1 to 200 chars, default "Untitled document") | 201 `{ document }` | 400 |
| `POST /documents/import` | multipart, field `file` | 201 `{ document }` | 400, 413, 415 |
| `GET /documents/:id` | | 200 `{ document }` incl. `role`, `ownerName` | 404 |
| `PATCH /documents/:id` | `{ title?, content? }`, at least one; content max 1 MB | 200 `{ id, title, updatedAt }` | 400, 403, 404, 413 |
| `DELETE /documents/:id` | | 204 | 403, 404 |
| `GET /documents/:id/shares` | | 200 `{ owner: User, shares: { user, role }[] }` | 404 |
| `PUT /documents/:id/shares` | `{ userId, role }` | 200 `{ share }` (upsert) | 400 (unknown user, or the owner), 403, 404 |
| `DELETE /documents/:id/shares/:userId` | | 204 | 403, 404 |

The 1 MB content limit lives in the zod schema (a `refine` on `Buffer.byteLength`, since `.max()` counts characters, not bytes). The error middleware maps a failure on that rule to 413 `CONTENT_TOO_LARGE` instead of 400.

`DocSummary = { id, title, updatedAt }`. `OwnedDocSummary` adds `shareCount` (from a `COUNT` subquery on `shares`, so still one query). `SharedDocSummary` adds `ownerName` and `role`. `document = { id, title, content, ownerId, ownerName, role, createdAt, updatedAt }`. Types live in `shared/types.ts`.

## 6. Auth token (`auth/token.ts`)

- Format: `base64url(JSON { sub: userId, exp })` + `.` + `base64url(HMAC-SHA256(payload, AUTH_SECRET))`. No library needed.
- Expires after 7 days. Verified with `crypto.timingSafeEqual`. The user must still exist.
- The client keeps it in `localStorage` and sends it as a Bearer header. That's simple on Vercel and avoids CSRF. The XSS risk is reduced by sanitized content and React escaping.

## 7. File import (`services/import.ts`)

- `multer` memory storage, one file, `fileSize` limit 4 MB.
- File type is checked by extension, not MIME, because browsers report `.md` inconsistently.
- `.txt`: HTML-escape, split on blank lines into `<p>`, single newlines become `<br>`.
- `.md`: `marked`. `.docx`: `mammoth.convertToHtml`.
- The result goes through `sanitize()`. If no text is left, return a 400 with "This file has no readable text".
- The title is the filename without its extension, cut to 200 chars.
- **Known limit:** `.md` (and `.docx`) tables, links, and code blocks come in as plain text, because they are outside the allowed formats. Stated in the UI and README.

**Sanitizer** (`sanitize-html`): allowed tags `p, br, strong, em, u, h1, h2, h3, ul, ol, li`, with no attributes. `b → strong`, `i → em`, and `h4`/`h5`/`h6 → h3`. Anything else is stripped. TipTap is configured with only these formats, so the editor and the sanitizer agree.

## 8. Frontend

- **Pages:** `/login` (pick a seeded user), `/` dashboard (My documents, Shared with me, New, Import), `/docs/:id` editor.
- **State:** no global store. `AuthContext` holds the user and token. Each page fetches its own data into local state.
- **API client:** `api<T>(method, path, body?)` adds the token and throws `ApiError { status, code, message }` from the error shape. On 401 it clears the token and goes to `/login`.
- **Editor:** TipTap StarterKit with `blockquote`, `code`, `codeBlock`, `strike`, `horizontalRule`, and `link` explicitly disabled, so markdown shortcuts (like typing `>` or three backticks) can't create content the sanitizer would silently strip. Headings limited to levels 1 to 3. Add the Underline extension only if the installed StarterKit version doesn't already include it.
- **Viewer mode:** editor read-only, title input read-only, no toolbar, and a "View only" label.
- **Share dialog:** the owner picks a user from a dropdown (from `GET /users`, minus the owner and people already shared with), picks Viewer or Editor, and the dialog sends `PUT /shares { userId, role }`. No free-text email entry.
- **Autosave (`useAutosave`):**
  - Every change marks the document dirty and restarts an 800 ms debounce.
  - Only one save is in flight at a time. Edits made during a save trigger exactly one more save with the latest content.
  - Status shows Saving, Saved, or "Couldn't save" with a Retry button. A failed save keeps the content dirty.
  - `beforeunload` warns while there are unsaved changes or a save is in flight.
  - Title saves on blur or Enter, using the same PATCH.

## 9. Env vars, scripts, deploy

| Var | Where | Default |
|---|---|---|
| `AUTH_SECRET` | all | dev-only fallback locally; required in production |
| `TURSO_DATABASE_URL` | all | `file:local.db` locally; required in production |
| `TURSO_AUTH_TOKEN` | production | required in production |
| `PORT` | local | `3001` |

In production, `env.ts` fails fast at startup if any of the first three is missing. It never falls back to `file:local.db` on Vercel, where that file would be wiped silently.

- **Scripts:**
  - `dev`: Vite and `tsx watch` together, with Vite proxying `/api` to 3001.
  - `typecheck`: `tsc -p` on the server and client projects.
  - `test`: `vitest run`.
  - `build`: `vite build`.
- **Vercel:**
  - Vite output is served as static files.
  - `/api/*` goes to one function that wraps `createApp`.
  - Every other path is rewritten to `index.html` so client routes work on refresh.
  - Env vars are set in the Vercel dashboard. The exact function entry and config are fixed in S0.
- **CI (`ci.yml`):** on `pull_request`, run `npm ci`, `npm run typecheck`, `npm test` on Node 22.
- **Node version:** `package.json` sets `"engines": { "node": ">=20" }`.
