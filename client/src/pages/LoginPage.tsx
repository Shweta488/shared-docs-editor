import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

// Seeded demo accounts. Listed here because the user list needs a signed-in user.
const DEMO_ACCOUNTS = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function signIn(email: string) {
    setPending(email);
    setError(null);
    try {
      await login(email);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t sign in. Please try again.');
      setPending(null);
    }
  }

  return (
    <main className="login">
      <h1>Sign in to Docs</h1>
      {params.get('expired') && <p className="notice">Please sign in again.</p>}
      <div className="login-buttons">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            className="button primary"
            disabled={pending !== null}
            onClick={() => signIn(account.email)}
          >
            {pending === account.email ? 'Signing in...' : `Continue as ${account.name}`}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">Demo accounts. No password needed.</p>
    </main>
  );
}
