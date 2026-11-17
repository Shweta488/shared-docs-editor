# Assignment brief (Ajaia AI-Native Full Stack Developer)

Source: assessment portal, started Tue 2026-11-17 2:03 PM PT. Portal timer: 240 minutes (ends about 6:03 PM PT). Autosave submits whatever is in the portal when time runs out.

## Objective

Test how a realistic product-engineering problem is handled with ambiguous scope, multiple surfaces, and tight delivery constraints: prioritization, what gets built, how tradeoffs are communicated, and how AI tools are used without outsourcing judgment.

## Scenario

Build a lightweight collaborative document editor inspired by Google Docs. Not a full recreation: ship the strongest working version possible within the timebox, showing product judgment, full stack capability, and clear prioritization (document creation, editing, file handling, sharing, usability).

## Tasks

### 1. Document creation and editing
- Create a new document
- Rename a document
- Edit document content in a browser
- Save and reopen documents
- Basic rich text: bold, italic, underline, headings or text size variation, bulleted or numbered lists
- Does not need to match Google Docs, but should feel usable and coherent

### 2. File upload
Upload at least one file into the product workflow, product-relevant. Examples:
- Upload .txt, .md, or .docx and turn it into a new editable document
- Upload an attachment associated with a document
- Import content from a file into an existing draft

If supported file types are limited, state it clearly in the UI and README.

### 3. Sharing
Simple sharing model so one user can share a document with another. Not enterprise-grade, but clear intent and working logic. Minimum:
- A document owner
- A way to grant another user access
- A visible distinction between owned and shared documents

Users may be simulated with seeded accounts, mocked auth, or a lightweight login flow.

### 4. Persistence
- Documents remain available after refresh
- Formatting or structure preserved reasonably
- Shared access behavior can be demonstrated

Any practical storage: SQLite, Postgres, Supabase, or a well-documented local file store.

### 5. Product and engineering quality
- Clear setup and run instructions
- A working deployment reviewers can access
- Basic validation and error handling
- At least one meaningful automated test
- A short architecture note explaining what was prioritized and why

## AI-native workflow note
- Which AI tools were used
- Where AI materially sped up the work
- What AI-generated output was changed or rejected
- How correctness, UX quality, and implementation reliability were verified

Evaluated on practical AI usage, not volume.

## Walkthrough video (3-5 min, unlisted Loom/YouTube)
- Main user flow
- What works end to end
- What was intentionally deprioritized
- Key implementation decisions
- How AI supported the workflow

## Deliverables (one Google Drive folder)
- Source code
- README.md with local setup and run instructions
- Short architecture note (Markdown or PDF)
- AI workflow note (Markdown or PDF)
- SUBMISSION.md listing exactly what is included
- Live product URL
- Text file with the walkthrough video URL
- Screenshots or short demo GIF if setup requires extra steps

## Submission format
- One Google Drive folder link with all materials
- Live deployment link
- Credentials, seeded users, or test accounts needed to review sharing
- Clear local run instructions
- If anything is partial: what works, what is incomplete, what would come next with another 2-4 hours

## Constraints
- Keep it intentionally scoped; don't build every Google Docs feature
- Depth in a few important areas over shallow coverage everywhere
- Any language, framework, editor library, tooling; AI tools allowed
- Reviewers must not have to pay for any dependency or service

## Evaluation
- Turning an open-ended prompt into a coherent product slice
- Full stack execution: frontend, backend, persistence, access logic
- Quality of the editing experience within chosen scope
- Practical file upload and sharing behavior
- Infrastructure and deployment judgment; a testable build
- Code clarity, maintainability, delivery discipline
- Prioritization and tradeoff awareness under time pressure
- Written and verbal communication
- Mature use of AI tools without sacrificing engineering standards

## Optional stretch (only if core is done)
One of: real-time collaboration indicators, comments or suggestion mode, version history, export to PDF or Markdown, role-based sharing beyond basic access.

## Portal fields
- Video submission link (required)
- Submission text (Markdown, max 1000 lines)
