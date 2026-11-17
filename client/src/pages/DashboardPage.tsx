import { useAuth } from '../auth/AuthContext';

// Placeholder until S2 adds the document lists.
export function DashboardPage() {
  const { user, logout } = useAuth();
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
        <p>Signed in as {user?.name}.</p>
      </main>
    </>
  );
}
