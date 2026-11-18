import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type {
  DocumentResponse,
  DocumentsListResponse,
  OwnedDocSummary,
} from '../../../shared/types';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { timeAgo } from '../lib/time';

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
}

function SkeletonRows() {
  return (
    <ul className="doc-list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="doc-row skeleton" />
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [docs, setDocs] = useState<DocumentsListResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocs(await api<DocumentsListResponse>('GET', '/documents'));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDoc() {
    setCreating(true);
    setActionError(null);
    try {
      await api<DocumentResponse>('POST', '/documents', {});
      await load();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function deleteDoc(doc: OwnedDocSummary) {
    const ok = window.confirm(
      `Delete "${doc.title}"? This can’t be undone, and anyone you shared it with loses access.`,
    );
    if (!ok) return;
    setActionError(null);
    try {
      await api<void>('DELETE', `/documents/${doc.id}`);
      setDocs((d) => d && { ...d, owned: d.owned.filter((x) => x.id !== doc.id) });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <>
      <header className="topbar">
        <strong>Docs</strong>
        <span className="spacer" />
        <span className="muted">{user?.name}</span>
        <button className="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <main className="page">
        <div className="actions">
          <button className="button primary" onClick={createDoc} disabled={creating}>
            {creating ? 'Creating...' : 'New document'}
          </button>
        </div>
        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}

        {loadError ? (
          <p className="error" role="alert">
            {loadError}{' '}
            <button className="button" onClick={load}>
              Retry
            </button>
          </p>
        ) : (
          <>
            <section aria-labelledby="mine-heading">
              <h2 id="mine-heading">My documents</h2>
              {!docs ? (
                <SkeletonRows />
              ) : docs.owned.length === 0 ? (
                <p className="muted">No documents yet. Create one or import a file.</p>
              ) : (
                <ul className="doc-list">
                  {docs.owned.map((doc) => (
                    <li key={doc.id} className="doc-row">
                      <Link to={`/docs/${doc.id}`} className="doc-link">
                        <span className="doc-title">{doc.title}</span>
                        <span className="muted doc-meta">
                          Edited {timeAgo(doc.updatedAt)}
                          {doc.shareCount > 0 && ` · Shared with ${doc.shareCount}`}
                        </span>
                      </Link>
                      <button
                        className="button subtle"
                        onClick={() => deleteDoc(doc)}
                        aria-label={`Delete ${doc.title}`}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="shared-heading">
              <h2 id="shared-heading">Shared with me</h2>
              {!docs ? (
                <SkeletonRows />
              ) : docs.shared.length === 0 ? (
                <p className="muted">Nothing shared with you yet.</p>
              ) : (
                <ul className="doc-list">
                  {docs.shared.map((doc) => (
                    <li key={doc.id} className="doc-row">
                      <Link to={`/docs/${doc.id}`} className="doc-link">
                        <span className="doc-title">{doc.title}</span>
                        <span className="muted doc-meta">
                          Owner: {doc.ownerName} · Edited {timeAgo(doc.updatedAt)}
                        </span>
                      </Link>
                      <span className={`badge ${doc.role}`}>{doc.role === 'editor' ? 'Editor' : 'Viewer'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
