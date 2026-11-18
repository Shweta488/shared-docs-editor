# RULES.md

Rules for this repo. They apply to humans and AI assistants equally. If a rule here conflicts with a habit or a default, the rule wins.

## 1. Approval workflow

- Nothing is committed without the owner's explicit **"approved to commit"**.
- Nothing is pushed without a second, separate **"approved to push"**.
- Approval to commit is never approval to push. Each approval covers one commit or one push only.
- Before asking for approval, show:
  1. What changed (files and a short diff summary)
  2. Why it changed
  3. How it was checked (commands run and results)
  4. The proposed commit message
- Planning docs (LLD, UX, plan) each need their own approval ("LLD approved", etc.) before the next step starts.
- No application code is written until the implementation plan is approved.
- When the owner says a story is merged, or says to start the next story, do these before writing any code:
  1. `git checkout main`
  2. `git pull`
  3. Confirm the previous story's commits are on `main` (`git log --oneline -5`). If not, stop and tell the owner.
  4. Create the new story's branch from `main`, using the branch name in `docs/IMPLEMENTATION_PLAN.md`.
- Never start a story on an old branch or on a stale `main`.

## 2. Branches and pull requests

- One branch and one pull request per story in `docs/IMPLEMENTATION_PLAN.md`.
- Never commit directly to `main`.
- The owner opens and merges PRs on GitHub.
- For this project, `docs/IMPLEMENTATION_PLAN.md` is the story plan. There is no separate per-story plan approval. Before coding a story, flag anything that would differ from the plan.
- Per story, in this order:
  1. Flag any differences from the plan.
  2. Pull latest `main`.
  3. Create the story branch (name from the plan).
  4. Implement.
  5. Run checks (see section 7).
  6. Ask for commit approval, then separately for push approval.

## 3. Commits

- One logical change per commit.
- Conventional Commits, imperative mood, subject under 72 characters.
  Example: `feat(sharing): add viewer and editor roles`
- Allowed scopes: `setup`, `db`, `auth`, `docs-api`, `sharing`, `import`, `ui`, `deploy`, `test`, `docs`.

## 4. Architecture boundaries

- UI code never imports server code. Shared types live in a neutral shared folder.
- Routes stay thin: authenticate, validate input, check access, call one function, map errors to responses.
- All access-control logic lives in one server function. Routes call it; they never re-implement it.
- Every request body and param is validated with a zod schema in the route before any work is done.

## 5. Security

- Access is enforced on the server for every document route. Hiding a button in the UI is not access control.
- Return **404, not 403**, when a user has no access to a document, so they cannot tell it exists.
- Sanitize all stored HTML with an allow-list that matches the editor's formats. This covers editor saves and imported files.
- Never commit `.env` or secrets. Use `.env.example` with placeholder values.
- No SQL built by string concatenation. Always use parameterized queries.

## 6. Code style

- TypeScript strict mode on the frontend and the server. The server runs with `tsx`.
- Small files with one job each.
- Comments explain why, not what.
- Plain, readable code over clever code.

## 7. Definition of done (before asking to commit)

- Typecheck passes.
- Tests pass.
- Build passes.
- All three run locally, and the results are shown in the approval request.
- GitHub Actions runs typecheck and tests on every PR. A PR is not merged while CI is red.

## 8. Docs and UI copy

- Plain, human tone. Short sentences.
- No em dashes.

## 9. Never commit

`.env`, real keys or tokens, `node_modules`, `dist`, `*.db`, `.vercel`.
