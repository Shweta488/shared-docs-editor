# UX

Plain, calm, document-first. One accent color, system fonts, no decoration that costs build time.

## 1. Screens

**Login (`/login`)**
Heading "Sign in to Docs". Three buttons: "Continue as Alice", "Continue as Bob", "Continue as Carol". Note below: "Demo accounts. No password needed."

**Dashboard (`/`)**
- Header: app name, signed-in user's name, "Sign out".
- Actions: "New document" (primary) and "Import file", with the limits line under it (see section 4).
- Section **My documents**: rows with title, "Edited 5 min ago", and "Shared with N" when the document is shared. Each row has a Delete action.
- Section **Shared with me**: rows with title, "Owner: Alice", and a role badge, **Viewer** or **Editor**.
- Clicking a row opens the editor.

**Editor (`/docs/:id`)**
- Top bar: "← All documents", title input, then:
  - Owner: save status, and a "Share" button on the right.
  - Editor and viewer: one group after the title, "Title · Editor · Owner: Alice" or "Title · View only · Owner: Alice". Editors also see the save status. No Share button.
- Toolbar: Bold, Italic, Underline, H1, H2, H3, Bulleted list, Numbered list. Active formats look pressed.
- Page: a centered column (max about 750 px) with the content.

**Share dialog (owner only)**
- Opened from the editor's Share button. Lists the owner first, then each person and their role.
- Controls:
  - Add someone: a dropdown of users who don't have access yet, a Viewer or Editor dropdown, and an "Add" button. If everyone already has access, the add row is replaced by "Everyone already has access."
  - Each existing person has a role dropdown and a "Remove" button.

## 2. Main flows

| Flow | Steps |
|---|---|
| Create | Dashboard → "New document" → editor opens with "Untitled document" and the title selected |
| Edit | Type or format → status shows "Saving..." → "All changes saved". Rename: edit the title, then Enter or click away |
| Import | "Import file" → pick a file → the new document opens in the editor. Bad file: error under the button, no navigation |
| Share | Editor → "Share" → pick a person and a role → "Add" → they appear in the list right away |
| Open as editor | Shared with me → row → full editor, no Share controls |
| Open as viewer | Shared with me → row → read-only page and title, no toolbar, "View only" badge in the top bar |
| Delete | Delete on a row → confirm "Delete "Title"? This can't be undone, and anyone you shared it with loses access." → row disappears |

## 3. States

| State | What the user sees |
|---|---|
| Loading | Skeleton rows on the dashboard; "Loading document..." in the editor |
| Empty (mine) | "No documents yet. Create one or import a file." |
| Empty (shared) | "Nothing shared with you yet." |
| Saving / saved | "Saving..." then "All changes saved" |
| Unsaved | "Unsaved changes" (also a browser warning if leaving the page) |
| Save error | "Couldn't save. Retry" (Retry is a button; your text stays in the editor) |
| View only | "View only" badge, no toolbar, page and title can't be edited |
| No access / not found | "This document doesn't exist, or you don't have access to it." with "Back to all documents" |
| Session expired | Sent to login with "Please sign in again." |
| Other errors | Short message from the server, shown inline near the action that failed |

## 4. File import copy

Under the Import button: **"Import a .txt, .md, or .docx file, up to 4 MB. Tables, links, images, and code blocks come in as plain text or are left out."**

Errors:
- Wrong type: "That file type isn't supported. Use .txt, .md, or .docx."
- Too big: "That file is over 4 MB."
- Empty: "This file has no readable text."

## 5. Keyboard shortcuts

Shown in tooltips on toolbar buttons (Ctrl on Windows, Cmd on Mac).

| Action | Shortcut |
|---|---|
| Bold / Italic / Underline | Cmd+B / Cmd+I / Cmd+U |
| Heading 1 / 2 / 3 | Cmd+Alt+1 / 2 / 3 |
| Bulleted / numbered list | Cmd+Shift+8 / Cmd+Shift+7 |
| Markdown style | `# ` heading, `- ` bullet, `1. ` numbered list |
| Close dialog | Esc |

## 6. Accessibility

- Every toolbar button has an `aria-label` and `aria-pressed`. Every input has a label.
- The save status is in an `aria-live="polite"` region, so screen readers hear "All changes saved".
- The share dialog traps focus, closes on Esc, and returns focus to the button that opened it.
- Visible focus ring on everything clickable. Roles are shown as text, not just color.

## 7. Responsive

- Phones (under 640 px): one column, actions stack, and the toolbar scrolls sideways instead of wrapping.
- The share dialog goes full width on phones.
- The editor page keeps a 16 px side margin.
