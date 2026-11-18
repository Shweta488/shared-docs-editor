# Implementation plan

Each story is one branch and one PR, built under `RULES.md`. Stories are ordered by requirement priority. Design details are in `docs/LLD.md` and `docs/UX.md`.

## Before S0 (owner, about 5 min)

- Create the GitHub repo and push `main`.
- Create the Turso database and token. Create the Vercel project from the repo and set `AUTH_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` for both **Production and Preview**. Otherwise PR previews fail the env check.

## Timeline

| Time (PT) | Story |
|---|---|
| 3:30 to 3:50 | S0 Skeleton, CI, live deploy |
| 3:50 to 4:05 | S1 Auth |
| 4:05 to 4:30 | S2 Documents API and dashboard |
| 4:30 to 4:50 | S3 Editor and autosave |
| 4:50 to 5:05 | S4 Sharing |
| 5:05 to 5:20 | S5 Import, with import check on the preview URL |
| 5:20 to 5:40 | S6 Docs, screenshots, SUBMISSION.md |
| 5:40 to 5:55 | Record video, final live check, submit |

Features land at about 5:20, a little after the 5:15 target. If S0 to S2 run late, apply the cut line at 4:40, not at 5:15. This plan is the story plan; before coding a story, only differences from it are flagged.

## Stories

### S0. Skeleton, CI, deploy (`chore/s0-skeleton`, 20 min)
- **Goal:** an empty app running live on Vercel against Turso, so hosting risk shows up first.
- **In:** Vite + React shell, Express `createApp`, `env.ts`, libSQL client, schema and seed, error middleware, `GET /api/health` (runs `SELECT 1`), Vercel entry and rewrites, CI workflow, `.gitignore`, `.env.example`. **Out:** any feature.
- **Files:** `package.json`, `tsconfig*.json`, `vite.config.ts`, `vercel.json`, `api/*`, `client/index.html`, `client/src/{main,App}.tsx`, `server/src/{app,index,env}.ts`, `server/src/db/*`, `server/src/middleware/errors.ts`, `.github/workflows/ci.yml`.
- **Done when:** live URL shows the shell; live `/api/health` returns 200 with the DB reachable; refresh on a client route works; CI is green on the PR; S0 tests in `TESTING.md` pass.

### S1. Auth (`feat/s1-auth`, 15 min)
- **Goal:** sign in as a seeded user; every other API route needs a valid token.
- **In:** token sign and verify, `requireAuth`, `/auth/login`, `/auth/me`, `/users`, API client, `AuthContext`, Login page, redirect to login when signed out. **Out:** passwords, sign up.
- **Files:** `server/src/auth/token.ts`, `server/src/middleware/auth.ts`, `server/src/routes/auth.ts`, `client/src/api/client.ts`, `client/src/auth/AuthContext.tsx`, `client/src/pages/LoginPage.tsx`, `shared/types.ts`.
- **Done when:** each seeded user can sign in and out; a bad or missing token gets 401 and the UI goes to login; S1 tests in `TESTING.md` pass.

### S2. Documents API and dashboard (`feat/s2-documents`, 25 min)
- **Goal:** create, list, open, rename, save, and delete documents, with access enforced.
- **In:** `requireRole`, sanitizer, document service and routes (the list already returns `shareCount` for owned documents), dashboard with both sections, empty and loading states, delete confirm. **Out:** editor UI, share UI.
- **Files:** `server/src/services/{access,documents,sanitize}.ts`, `server/src/routes/documents.ts`, `client/src/pages/DashboardPage.tsx`.
- **Done when:** the API matches the LLD contracts; strangers get 404, viewers get 403 on save; the dashboard lists owned and shared documents; S2 tests in `TESTING.md` pass.

### S3. Editor and autosave (`feat/s3-editor`, 20 min)
- **Goal:** a usable rich-text editor that never loses edits.
- **In:** TipTap with the allowed formats only, toolbar, title rename, `useAutosave`, save status, unsaved warning, view-only mode, not-found state. **Out:** share dialog.
- **Files:** `client/src/pages/EditorPage.tsx`, `client/src/components/{Toolbar,SaveStatus}.tsx`, `client/src/hooks/useAutosave.ts`.
- **Done when:** formatting survives a refresh; fast typing ends in "All changes saved"; viewers can't edit content or title; S3 tests in `TESTING.md` pass. **Preview check:** sign in as Alice, open a document, use every toolbar format, rename it, refresh, and confirm everything is still there with "All changes saved" shown.

### S4. Sharing (`feat/s4-sharing`, 15 min)
- **Goal:** owners grant, change, and remove access.
- **In:** share service and routes, share dialog (owner only), "Shared with N" label on the dashboard (the API already returns `shareCount` from S2). **Out:** email invites, link sharing.
- **Files:** `server/src/services/shares.ts`, `server/src/routes/shares.ts`, `client/src/components/ShareDialog.tsx`, dashboard row update.
- **Done when:** the full Alice, Bob, Carol flow in `TESTING.md` passes locally; S4 tests in `TESTING.md` pass.

### S5. Import (`feat/s5-import`, 15 min)
- **Goal:** turn a `.txt`, `.md`, or `.docx` file into a new editable document.
- **In:** multer upload, converters, import button with limits copy and errors. **Out:** attachments, images.
- **Files:** `server/src/services/import.ts`, import route in `server/src/routes/documents.ts`, `client/src/components/ImportButton.tsx`, `server/test/fixtures/*`.
- **Done when:** all three types import with formatting; bad files show the UX copy; S5 tests in `TESTING.md` pass. **Before merging:** import one file of each type on the PR's Vercel preview URL.

### S6. Submission docs (`docs/s6-submission`, 20 min)
- **Goal:** everything a reviewer needs.
- **In:** `README.md`, `SUBMISSION.md`, `VIDEO_URL.txt`, `docs/screenshots/`, final `ARCHITECTURE.md` and `AI_WORKFLOW.md`. Playwright smoke only if time is left.
- **Done when:** a fresh clone runs with the README alone; the live checklist in `TESTING.md` passes.

## Cut line (drop in this order if behind)

1. Playwright smoke test.
2. Skeleton loading rows (use plain "Loading...").
3. ~~Read-only "People" view for non-owners~~ (removed in S4 review: it exposed other users' emails).
4. Delete document (F7, not required by the brief).
5. `.docx` import (keep `.txt` and `.md`).

**Never cut:** server-side access checks, the sanitizer, permission tests, the live deploy, README, SUBMISSION.md, and the video.

## Risks

| Risk | Mitigation |
|---|---|
| Vercel + Express setup eats time | S0 deploys first, before any feature |
| Multipart uploads fail on Vercel | Import check on the S5 preview URL before merging |
| Approval gates slow each story | This plan is the story plan; only differences are flagged; review while CI runs |
| Timebox overrun | Cut line above; decide at 4:40 |
