# AI workflow log

A running log of how AI was used: tool, what it produced, what I changed or rejected and why, and how it was verified.

| # | Tool | What it produced | What I changed or rejected, and why | How it was verified |
|---|---|---|---|---|
| 1 | Claude (chat) | Planning and HLD draft (`docs/ARCHITECTURE.md`) | Claude jumped straight to building the full app before any design review. I rejected that, had it deleted, and reset to a design-first process with approval gates. | Read the HLD against the brief myself before moving on. |
| 2 | Claude Code (VS Code) | Rules files: `RULES.md`, `CLAUDE.md`, PR template | Used under explicit approval gates for rules, LLD, UX, plan, and implementation. | Reviewed each file before approving. |
| 3 | Claude (second session) | Independent review of the HLD | It caught that Neon was a bad fallback (Postgres, not a drop-in for libSQL), so I dropped the runtime fallback and set up Turso before S0. It also suggested portfolio upgrades I accepted: TypeScript on the server, zod validation, and GitHub Actions CI. | Compared its points against the brief and the first session's review, then applied the changes I agreed with. |
| 4 | Claude (second session) | Independent review of the LLD | It caught two bugs in the design: the editor allowed formats (blockquote, code, strike, links) that the sanitizer strips, which would have silently dropped formatting; and the DB config could silently fall back to a local file on Vercel. I required StarterKit extensions to be disabled explicitly and env checks to fail fast in production. | Checked each point against the LLD and updated it. |
| 5 | Claude (second session) | Visual mockups of the UX doc's screens | Reviewed the screens as mockups before building. Added a "Shared with N" label on owned documents so owners can see what they've shared at a glance. | Compared mockups to the brief's sharing requirement (visible owned vs shared distinction). |
| 6 | Claude Code (VS Code) | S0 skeleton: Express + Vite app, libSQL client, env checks, health route, CI, Vercel config | Claude proposed the HTTP-only libSQL client for Turso so Vercel never needs a native binary. I changed the process so `IMPLEMENTATION_PLAN.md` is the story plan, with only differences flagged. | Typecheck, 2 API tests, and build pass locally; local `/api/health` returns 200. Live check after deploy. |
