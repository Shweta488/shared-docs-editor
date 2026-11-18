import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { DocumentResponse } from '../../../shared/types';
import { api, ApiError } from '../api/client';

const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS = ['.txt', '.md', '.docx'];

// Checked here too so the user gets an answer before a slow upload.
// The server checks again; these are only a convenience.
function localError(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'That file type isn’t supported. Use .txt, .md, or .docx.';
  }
  if (file.size > MAX_BYTES) return 'That file is over 4 MB.';
  return null;
}

export function ImportButton() {
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = ''; // Lets the same file be picked again.
    if (!file) return;
    const problem = localError(file);
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api<DocumentResponse>('POST', '/documents/import', form);
      navigate(`/docs/${res.document.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t import that file. Please try again.');
      setBusy(false);
    }
  }

  // A fragment, so the hint and error sit in the dashboard's action row and wrap
  // onto their own full-width lines below both buttons.
  return (
    <>
      <button className="button" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? 'Importing...' : 'Import file'}
      </button>
      <input
        ref={input}
        type="file"
        accept=".txt,.md,.docx"
        hidden
        aria-label="Import file"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <p className="muted small action-note">
        Import .txt, .md, or .docx (max 4 MB). Tables, links, and images come in as plain text.
      </p>
      {error && (
        <p className="error small action-note" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
