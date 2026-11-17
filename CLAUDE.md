# CLAUDE.md

For every task, first read `RULES.md`, `docs/ASSIGNMENT.md`, and `docs/ARCHITECTURE.md`.
Follow the architecture and approval gates in those files and in `docs/LLD.md`,
`docs/UX.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/TESTING.md` when present.

Most important rules (full list in `RULES.md`):

- Work step by step. Stop after each step and wait for explicit approval.
- No application code until the implementation plan is approved.
- Never commit without "approved to commit". Never push without a separate "approved to push".
- Never commit directly to `main`. One branch and one PR per story.
- Enforce access on the server for every document route.
- Keep UI code separate from server code. Keep routes thin. Access logic lives in one function.
- Sanitize stored HTML with an allow-list. Parameterized SQL only.
- Never commit `.env`, secrets, `node_modules`, `dist`, `*.db`, `.vercel`.
- Before asking to commit: typecheck, tests, and build pass.
- Docs and UI copy: plain tone, no em dashes.
- Keep `docs/AI_WORKFLOW.md` updated as work happens.
