# Testing

Permission logic is the highest-risk area, so most tests are there.

## Test levels

| Level | Tool | Runs |
|---|---|---|
| API tests | Vitest + Supertest against `createApp`, libSQL `:memory:`, fresh DB per test file | `npm test`, locally and in CI |
| Typecheck | `tsc -p` on the server and client projects | `npm run typecheck`, locally and in CI |
| CI | GitHub Actions on every PR (Node 22) | Don't merge while CI is red |
| UI smoke (optional) | Playwright: sign in, create, type, refresh, text still there | Only if time is left in S6 |
| Manual | Checklist below | Before submitting, local and live |

Autosave is covered by the manual checklist; a unit test for `useAutosave` is a next step.

## Tests per story

| Story | Tests added |
|---|---|
| S0 | `/api/health` returns 200; unknown `/api` route returns the JSON error shape |
| S1 | Login with seeded email → token; unknown email → 401; missing, tampered, and expired token → 401; `/users` lists seeded users |
| S2 | Create, list, get, rename, save, delete. Access matrix per route: owner, editor, viewer, stranger (stranger 404, viewer save 403, editor delete 403). Validation 400s. Content over 1 MB → 413. Sanitizer: `<script>`, attributes, and `h4` handled as in the LLD |
| S3 | Round trip: HTML with every allowed format saves and loads unchanged |
| S4 | Owner adds, changes role, removes. Editor and viewer can't share (403). Stranger 404. Share with owner or unknown user → 400. After removal the user gets 404. Owner's list shows `shareCount`. Delete removes shares |
| S5 | `.txt`, `.md`, `.docx` fixture → document with expected HTML. Bad extension → 415. Over 4 MB → 413. Empty file → 400. `<script>` in `.md` is stripped |

## Manual checklist (final pass, local and live)

**Core**
- [ ] Sign in as each of Alice, Bob, Carol; sign out works.
- [ ] Create a document; rename it; apply every toolbar format; refresh; everything is still there.
- [ ] Fast typing then immediate refresh: no lost text (or the browser warns first).
- [ ] Import one `.txt`, one `.md`, one `.docx`; each opens as a new document. A `.pdf` shows the unsupported message.
- [ ] Delete a document after confirming; it's gone from the dashboard.

**Sharing flow**
1. [ ] Alice creates "Team plan" and adds some formatted text.
2. [ ] Alice shares it with Bob as **Editor** and Carol as **Viewer**. Her dashboard shows "Shared with 2".
3. [ ] Bob sees it under **Shared with me** with "Owner: Alice" and **Editor**. He edits it; it saves. Bob (editor) sees no Share button and no Delete for Alice's document.
4. [ ] Alice refreshes and sees Bob's change.
5. [ ] Carol sees it with **Viewer**. Page and title are read-only, no toolbar, "View only" badge.
6. [ ] Alice changes Carol to Editor; Carol refreshes and can edit.
7. [ ] Alice removes Carol; Carol opening the same URL sees "This document doesn't exist, or you don't have access to it."
8. [ ] Alice deletes the document; Bob's link now shows the same not-found message.

**Live site only**
- [ ] Live URL loads; `/api/health` returns 200.
- [ ] Refresh on `/docs/:id` loads the page (no Vercel 404).
- [ ] Data survives a redeploy (it's in Turso, not a local file).
- [ ] Import works on the live site (multipart risk).
