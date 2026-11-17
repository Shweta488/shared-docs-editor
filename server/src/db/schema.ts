// Idempotent, so it is safe to run on every cold start.
export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS shares (
    document_id TEXT NOT NULL REFERENCES documents(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (document_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id)`,
];
