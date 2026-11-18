import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { DocumentDetail, DocumentResponse, UpdateDocumentResponse } from '../../../shared/types';
import { api, ApiError } from '../api/client';
import { SaveStatus } from '../components/SaveStatus';
import { Toolbar } from '../components/Toolbar';
import { useAutosave } from '../hooks/useAutosave';

// Only the formats the server's sanitizer keeps. Disabling the rest also turns off
// their markdown shortcuts (">", "```", "---"), so nothing the user types gets
// silently stripped on save. Underline is part of StarterKit 3.
const extensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    strike: false,
    horizontalRule: false,
    link: false,
    heading: { levels: [1, 2, 3] },
  }),
];

type LoadState = { kind: 'loading' } | { kind: 'not-found' } | { kind: 'error'; message: string } | { kind: 'ready'; doc: DocumentDetail };

export function EditorPage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    api<DocumentResponse>('GET', `/documents/${id}`)
      .then((res) => !cancelled && setState({ kind: 'ready', doc: res.document }))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ kind: 'not-found' });
        else setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Couldn’t load this document.' });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.kind === 'loading') return <p className="page muted">Loading document...</p>;
  if (state.kind === 'not-found' || state.kind === 'error') {
    return (
      <main className="page">
        <p role="alert">
          {state.kind === 'not-found'
            ? 'This document doesn’t exist, or you don’t have access to it.'
            : state.message}
        </p>
        <Link to="/">Back to all documents</Link>
      </main>
    );
  }
  // Keyed by id so moving between documents starts with a fresh editor and autosave.
  return <DocumentEditor key={state.doc.id} doc={state.doc} />;
}

function DocumentEditor({ doc }: { doc: DocumentDetail }) {
  const canEdit = doc.role !== 'viewer';
  const location = useLocation();
  const isNew = (location.state as { isNew?: boolean } | null)?.isNew === true;

  const autosave = useAutosave(async (content) => {
    await api<UpdateDocumentResponse>('PATCH', `/documents/${doc.id}`, { content });
  });

  // Cmd/Ctrl+S saves now instead of opening the browser's "Save page" dialog.
  // Blurring a focused input first commits a title being edited.
  const { flush } = autosave;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      if (!canEdit) return;
      if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
      void flush();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, flush]);

  const editor = useEditor({
    extensions,
    content: doc.content,
    editable: canEdit,
    onUpdate: ({ editor: e }) => autosave.markDirty(e.getHTML()),
  });

  return (
    <>
      <header className="topbar editor-topbar">
        <Link to="/" className="back-link">
          ← All documents
        </Link>
        <TitleInput doc={doc} canEdit={canEdit} selectOnMount={isNew} />
        {canEdit ? (
          <SaveStatus status={autosave.status} onRetry={autosave.retry} />
        ) : (
          <span className="badge">View only</span>
        )}
        <span className="spacer" />
      </header>
      {canEdit && editor && <Toolbar editor={editor} />}
      <main className="editor-page">
        <EditorContent editor={editor} className="editor-content" aria-label="Document content" />
      </main>
    </>
  );
}

function TitleInput({ doc, canEdit, selectOnMount }: { doc: DocumentDetail; canEdit: boolean; selectOnMount: boolean }) {
  const [title, setTitle] = useState(doc.title);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(doc.title);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectOnMount && canEdit) input.current?.select();
  }, [selectOnMount, canEdit]);

  async function commit() {
    const next = title.trim();
    if (!next) {
      setTitle(saved.current); // An empty title isn't allowed; put the old one back.
      return;
    }
    if (next === saved.current) return;
    try {
      await api<UpdateDocumentResponse>('PATCH', `/documents/${doc.id}`, { title: next });
      saved.current = next;
      setTitle(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t rename. Try again.');
    }
  }

  return (
    <span className="title-wrap">
      <input
        ref={input}
        className="title-input"
        aria-label="Document title"
        placeholder="Untitled document"
        value={title}
        maxLength={200}
        readOnly={!canEdit}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      {error && (
        <span className="error title-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
