# AI workflow note

## Tools used

- **Claude (chat):** first planning pass and HLD draft.
- **Claude Code in VS Code:** rules, LLD, UX, plan, and all implementation, under explicit approval gates (`RULES.md`): nothing committed without "approved to commit", nothing pushed without a separate "approved to push", one branch and PR per story.
- **A second Claude session as reviewer:** independent reviews of the HLD, LLD, and UX mockups before any code.

## Where AI sped me up

- Turning my HLD into a full LLD (API contracts, schema, error format, autosave design) and a UX spec in minutes, which I then reviewed and corrected.
- Writing the boilerplate I would otherwise type by hand: Express routes, zod schemas, the API client, TipTap toolbar, share dialog, CSS.
- Writing tests fast: 68 API tests, including the full owner, editor, viewer, and stranger matrix on every route.
- Debugging a production-only crash from a Vercel runtime log in one pass (log entry 10).

## What I changed or rejected

- **Rejected building first.** Claude's first move was to build the whole app before any design review. I had it deleted and reset to design-first with approval gates (entry 1).
- **Rejected a read-only "People" list for viewers and editors,** because it exposed other users' emails. Made the list owner-only on the server, not just hidden in the UI (entry 13).
- **Rejected Neon as a fallback database** after the second reviewer pointed out it isn't a drop-in for libSQL (entry 3).
- **Required fixes the reviewer found in the LLD:** the editor allowed formats the sanitizer would strip, and the database could silently fall back to a local file on Vercel (entry 4).
- **Changed UI details after hands-on review:** title field affordance, save status placement, Cmd/Ctrl+S, toolbar groups, share dialog layout, import hint copy.
- **Added process rules as I learned:** every story starts from a freshly pulled `main`; every story is tested on its Vercel preview before merge (entries 7 and 10).

## How I verified correctness, UX, and reliability

- **Tests and CI:** typecheck, tests, and build had to pass before every commit request; GitHub Actions ran typecheck and tests on every PR.
- **Asking for the riskiest part.** When I asked Claude Code what was riskiest in S1, it flagged an untested production-secret check. We added tests for it before committing (entry 8).
- **Preview checks before merge.** Each story's main flow on the Vercel preview, plus the runtime logs. This caught the `sanitize-html` crash that every local check missed (entry 10), and led to a test that reproduces Vercel's limit locally.
- **Hands-on UX review.** I clicked through every story in the browser (sign in, refresh, tampered token, sharing flow, import) and sent back layout and copy changes before approving commits.
- **Reading diffs.** Each commit request listed what changed, why, and how it was checked; I approved or changed it.

## Appendix: running log

What each step produced, what I changed or rejected and why, and how it was verified.

| # | Tool | What it produced | What I changed or rejected, and why | How it was verified |
|---|---|---|---|---|
| 1 | Claude (chat) | Planning and HLD draft (`docs/ARCHITECTURE.md`) | Claude jumped straight to building the full app before any design review. I rejected that, had it deleted, and reset to a design-first process with approval gates. | Read the HLD against the brief myself before moving on. |
| 2 | Claude Code (VS Code) | Rules files: `RULES.md`, `CLAUDE.md`, PR template | Used under explicit approval gates for rules, LLD, UX, plan, and implementation. | Reviewed each file before approving. |
| 3 | Claude (second session) | Independent review of the HLD | It caught that Neon was a bad fallback (Postgres, not a drop-in for libSQL), so I dropped the runtime fallback and set up Turso before S0. It also suggested portfolio upgrades I accepted: TypeScript on the server, zod validation, and GitHub Actions CI. | Compared its points against the brief and the first session's review, then applied the changes I agreed with. |
| 4 | Claude (second session) | Independent review of the LLD | It caught two bugs in the design: the editor allowed formats (blockquote, code, strike, links) that the sanitizer strips, which would have silently dropped formatting; and the DB config could silently fall back to a local file on Vercel. I required StarterKit extensions to be disabled explicitly and env checks to fail fast in production. | Checked each point against the LLD and updated it. |
| 5 | Claude (second session) | Visual mockups of the UX doc's screens | Reviewed the screens as mockups before building. Added a "Shared with N" label on owned documents so owners can see what they've shared at a glance. | Compared mockups to the brief's sharing requirement (visible owned vs shared distinction). |
| 6 | Claude Code (VS Code) | S0 skeleton: Express + Vite app, libSQL client, env checks, health route, CI, Vercel config | Claude proposed the HTTP-only libSQL client for Turso so Vercel never needs a native binary. I changed the process so `IMPLEMENTATION_PLAN.md` is the story plan, with only differences flagged. | Typecheck, 2 API tests, and build pass locally; local `/api/health` returns 200. Live check after deploy. |
| 7 | Claude Code (VS Code) | S1 auth: HMAC token, `requireAuth`, login/me/users routes, zod validation, API client, login page | I added a rule that every story starts from a freshly pulled `main` with the previous story verified there. | 8 new API tests (valid, unknown, missing, tampered, expired token; users list); typecheck and build pass; login checked through the Vite proxy. I clicked through sign in, refresh, sign out, and a tampered token in localStorage. |
| 8 | Claude Code (VS Code) | Answer to "what's the riskiest part of S1?" | It flagged an untested production-secret check: if the production flag were not detected, the app would sign tokens with the dev fallback secret, which is public in the repo. I had it make `loadEnv()` testable and add env and token edge-case tests before committing. | 4 env tests (production throws on missing secret or DB URL; local defaults) and 4 more token tests (different secret, malformed, deleted user, no Bearer prefix). |
| 9 | Claude Code (VS Code) | S2: `requireRole` access check, sanitizer, document API, dashboard | Access is checked before the body is validated, so a stranger gets 404 even with a bad body (covered by a test). | 15 new API tests: full owner/editor/viewer/stranger matrix on GET, PATCH, DELETE; validation 400s; 1 MB limit 413; sanitizer output; delete removes shares. Typecheck and build pass; create and list checked against the local file DB. |
| 10 | Claude Code (VS Code) | Root cause of a 500 on the S2 Vercel preview | All local checks passed but login failed on Vercel. From the runtime log, Claude found `sanitize-html` 2.18 (CommonJS) `require()`s `htmlparser2` 12 (ESM-only); local Node allows that, Vercel's runtime does not. Fix: pin `sanitize-html` to exactly 2.17.0 (CommonJS `htmlparser2` 8). I required the preview login to work before merging. | Reproduced locally with `node --no-experimental-require-module`. New test loads every runtime dependency that way; confirmed it fails on 2.18.2 and passes on 2.17.0. This bug is why `RULES.md` now requires testing every story on its Vercel preview (sign in, main flow, runtime logs) before merge. |
| 11 | Claude Code (VS Code) | S3: TipTap editor limited to allowed formats, toolbar, title rename, `useAutosave`, view-only mode | When the dependency load test failed on `@tiptap/pm` (a client-only package with no root export), Claude narrowed the test to packages the server actually imports, found by scanning `server/src` and `api/`, rather than keeping a hand-written list. | 2 round-trip tests (TipTap-shaped HTML for every format saves and loads unchanged; line breaks survive). Re-confirmed the load test still fails on sanitize-html 2.18.2. |
| 12 | Claude Code (VS Code) | S4: share routes (list, add or change role, remove), share dialog for owners, read-only "People" view for others | Claude used the native `<dialog>` element for focus trapping, Esc, and focus return instead of writing that by hand. Access is checked before the body on every share route, so a stranger can't probe or grant themselves access. | 10 new API tests: add, list, role change in place, removal leads to 404, owner and unknown user rejected, editor and viewer get 403, strangers get 404 on GET, PUT, DELETE. |
| 13 | Claude Code (VS Code) | S4 review changes | I rejected the read-only "People" view during review because it exposed other users' emails to viewers and editors. The access list is now owner-only on the server (`GET /shares` returns 403 for editor and viewer), not just hidden in the UI. Editors and viewers instead see "Title · Editor/View only · Owner: Alice" in the top bar. The share dialog says "Everyone already has access." instead of an empty dropdown. | The test that expected editors and viewers to read the list now expects 403. HLD, LLD, UX, and TESTING updated to match. |
| 14 | Claude Code (VS Code) | S5: import of `.txt`, `.md`, `.docx` into a new document (multer in memory, `marked`, `mammoth`, same sanitizer), Import button with limits copy | Claude built the `.docx` test fixture in code with `jszip` instead of committing a binary, and fixed multer's Latin-1 decoding of filenames so non-ASCII names make correct titles. The dependency load test picked up the three new server packages on its own. | 10 new API tests (each type, 415, 413, empty, damaged `.docx`, no file, no token, UTF-8 title, list). Real multipart uploads of all three types through the Vite proxy. Vercel preview import check required before merge. |
| 15 | Claude Code (VS Code) | S6: README, SUBMISSION.md, final ARCHITECTURE pass, this note's summary sections | I set the structure and content of each doc (accounts, review flow, limits, next steps, time per phase). Claude narrowed a `.docx` claim in the README to what the tests actually cover, and used placeholders where I hadn't given a URL yet. | Every relative link checked by script; no em dashes; typecheck, tests, and build still pass. |
