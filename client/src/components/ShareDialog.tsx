import { useEffect, useRef, useState } from 'react';
import type {
  PutShareResponse,
  ShareRole,
  SharesResponse,
  User,
  UsersResponse,
} from '../../../shared/types';
import { api, ApiError } from '../api/client';

interface Props {
  docId: string;
  onClose: () => void;
}

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');

// Owner only. Native <dialog> with showModal(): traps focus, closes on Esc, and
// the browser returns focus to the button that opened it.
export function ShareDialog({ docId, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<SharesResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<ShareRole>('viewer');

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    api<SharesResponse>('GET', `/documents/${docId}/shares`).then(setData, (err) => setError(message(err)));
    api<UsersResponse>('GET', '/users').then((r) => setUsers(r.users), (err) => setError(message(err)));
  }, [docId]);

  // People who could still be added: not the owner, not already shared.
  const candidates = data
    ? users.filter((u) => u.id !== data.owner.id && !data.shares.some((s) => s.user.id === u.id))
    : [];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  const putShare = (userId: string, role: ShareRole) =>
    run(async () => {
      const { share } = await api<PutShareResponse>('PUT', `/documents/${docId}/shares`, { userId, role });
      setData((d) => {
        if (!d) return d;
        const exists = d.shares.some((s) => s.user.id === userId);
        const shares = exists ? d.shares.map((s) => (s.user.id === userId ? share : s)) : [...d.shares, share];
        return { ...d, shares };
      });
      setNewUserId('');
    });

  const removeShare = (userId: string) =>
    run(async () => {
      await api<void>('DELETE', `/documents/${docId}/shares/${userId}`);
      setData((d) => d && { ...d, shares: d.shares.filter((s) => s.user.id !== userId) });
    });

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="share-title" onClose={onClose}>
      <div className="dialog-header">
        <h2 id="share-title">Share</h2>
        <button className="button subtle" onClick={() => ref.current?.close()} aria-label="Close">
          ✕
        </button>
      </div>

      {data && users.length > 0 && candidates.length === 0 && (
        <p className="muted">Everyone already has access.</p>
      )}
      {data && candidates.length > 0 && (
        <form
          className="share-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (newUserId) void putShare(newUserId, newRole);
          }}
        >
          <label className="visually-hidden" htmlFor="share-user">
            Person
          </label>
          <select id="share-user" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} disabled={busy}>
            <option value="">Choose a person</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="share-role">
            Role
          </label>
          <select id="share-role" value={newRole} onChange={(e) => setNewRole(e.target.value as ShareRole)} disabled={busy}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button className="button primary" type="submit" disabled={busy || !newUserId}>
            Add
          </button>
        </form>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!data ? (
        !error && <p className="muted">Loading...</p>
      ) : (
        <ul className="share-list">
          <li>
            <span>
              <strong>{data.owner.name}</strong> <span className="muted">{data.owner.email}</span>
            </span>
            <span className="muted">Owner</span>
          </li>
          {data.shares.map((s) => (
            <li key={s.user.id}>
              <span>
                <strong>{s.user.name}</strong> <span className="muted">{s.user.email}</span>
              </span>
              <span className="share-controls">
                  <select
                    aria-label={`Role for ${s.user.name}`}
                    value={s.role}
                    disabled={busy}
                    onChange={(e) => void putShare(s.user.id, e.target.value as ShareRole)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    className="button subtle"
                    disabled={busy}
                    onClick={() => void removeShare(s.user.id)}
                    aria-label={`Remove ${s.user.name}`}
                  >
                    Remove
                  </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
