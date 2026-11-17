import { useEffect, useState } from 'react';
import type { HealthResponse } from '../../shared/types';

// S0 shell: proves the static site and the API are both reachable.
export function App() {
  const [status, setStatus] = useState('Checking API...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : Promise.reject()))
      .then(() => setStatus('API and database are up.'))
      .catch(() => setStatus('API is not reachable.'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>Docs</h1>
      <p>{status}</p>
    </main>
  );
}
