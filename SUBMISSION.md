# Submission: Shared Docs Editor

- **Live app:** https://shared-docs-editor.vercel.app
- **Repo:** https://github.com/Shweta488/shared-docs-editor
- **Walkthrough video:** https://www.loom.com/share/389591aac9af4fb1adf42cf006bb0450

## Test accounts

No passwords. Pick an account on the login screen.

| Account | Email | Suggested role in review |
|---|---|---|
| Alice | alice@example.com | Owner: creates and shares |
| Bob | bob@example.com | Editor on Alice's document |
| Carol | carol@example.com | Viewer on Alice's document |

Review flow: Alice creates a document and shares it with Bob as Editor and Carol as Viewer. Bob edits; Carol sees it read-only. Alice removes Carol; Carol's link then shows "not found".

## What's included

**Drive folder**

- Source code (repository snapshot)
- `README.md`: setup, run, test accounts, live URL, supported file types
- `SUBMISSION.md`: this file
- `docs/ARCHITECTURE.md`: architecture note (what I prioritized and why)
- `docs/AI_WORKFLOW.md`: AI workflow note
- `VIDEO_URL.txt`: walkthrough video link
- `docs/screenshots/`: login, dashboard, editor, share dialog, viewer

**Repository** (everything above, plus)

- `client/`: React + TipTap frontend
- `server/`: Express API, services, and tests (`server/test/`)
- `shared/`: request and response types used by both sides
- `api/`: Vercel function entry
- `docs/LLD.md`, `docs/UX.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/TESTING.md`: design and plan written before code
- `RULES.md`, `CLAUDE.md`: working rules for me and the AI assistant
- `.github/workflows/ci.yml`: typecheck and tests on every PR
- `.env.example`

## What works end to end

- Sign in as a seeded user; session survives refresh; sign out.
- Create, rename, edit, and delete documents. Autosave with a visible status (Saving, All changes saved, Couldn't save with Retry), unsaved-changes warning, and Cmd/Ctrl+S.
- Bold, italic, underline, H1 to H3, bulleted and numbered lists. Formatting survives refresh.
- Import `.txt`, `.md`, `.docx` (up to 4 MB) as a new editable document. Clear errors for other types, oversize, empty, or damaged files.
- Sharing: owner adds people as Viewer or Editor, changes roles, removes access. Dashboard separates My documents (with "Shared with N") from Shared with me (owner and role).
- Viewers get a read-only page and title. Editors can edit but not share or delete.
- Access enforced on the server on every document and share route: no access is 404, wrong role is 403. Stored HTML is sanitized with an allow-list.
- Persistence in Turso: documents, formatting, and shares survive refresh and redeploys.
- 68 automated API tests (permissions, validation, import, sanitizer, auth, env checks) run in CI on every PR.

## Incomplete or known limits

- **Last write wins.** Each save overwrites the whole document body, so two people editing at once can overwrite each other.
- **No real auth.** Seeded accounts with signed tokens; anyone can sign in as any test user.
- **Autosave has no unit test.** It is covered by the manual checklist only.
- **JS bundle is 672 kB** (213 kB gzipped) because the TipTap editor is not lazy-loaded.
- **`GET /api/users` exposes a user directory** to any signed-in user, to fill the share dropdown. A real app would look up one user by email.
- **Vercel preview URLs are protected**; the production URL is public.
- Import keeps text but not tables, links, or code formatting; images are dropped.

## Next, with 2 to 4 more hours

1. **Optimistic locking:** send the document's `updatedAt` with each save; the server returns 409 on a conflicting save and the editor offers to reload.
2. **Lazy-load the editor page** to cut the initial bundle.
3. **Unit test for `useAutosave`** with fake timers (debounce, single in-flight save, retry).
4. **Share by email lookup** instead of listing every user.
5. **Version history:** keep a snapshot per save and let the owner restore one.

## Time spent

| Phase | Time (PT) |
|---|---|
| Setup and design: rules, HLD, LLD, UX, plan, reviews | 2:03 to 3:30 |
| Build S0 to S5: skeleton and deploy, auth, documents, editor, sharing, import | 3:30 to 5:20 |
| Docs, screenshots, and video | 5:20 to end |
