import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

/**
 * Debounced autosave with at most one request in flight, so saves never land
 * out of order. Edits made during a save trigger exactly one more save with
 * the latest content. A failed save keeps the content dirty until Retry.
 */
export function useAutosave(save: (content: string) => Promise<void>, delayMs = 800) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const saveRef = useRef(save);
  const latest = useRef<string | null>(null);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  saveRef.current = save;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inFlight.current || !dirty.current || latest.current === null) return;

    dirty.current = false;
    inFlight.current = true;
    setStatus('saving');
    try {
      await saveRef.current(latest.current);
    } catch {
      dirty.current = true;
      inFlight.current = false;
      setStatus('error');
      return;
    }
    inFlight.current = false;
    if (dirty.current) void flush();
    else setStatus('saved');
  }, []);

  const markDirty = useCallback(
    (content: string) => {
      latest.current = content;
      dirty.current = true;
      if (!inFlight.current) setStatus('unsaved');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush],
  );

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Leaving the page inside the app: send pending edits instead of dropping them.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (dirty.current && latest.current !== null) void saveRef.current(latest.current).catch(() => {});
    },
    [],
  );

  // flush saves pending edits now (Cmd/Ctrl+S); retry is the same thing after an error.
  return { status, markDirty, flush, retry: flush };
}
