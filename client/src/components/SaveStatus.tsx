import type { SaveStatus as Status } from '../hooks/useAutosave';
import { modKey } from '../lib/platform';

const labels: Record<Exclude<Status, 'error'>, string> = {
  saved: 'All changes saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving...',
};

export function SaveStatus({ status, onRetry }: { status: Status; onRetry: () => void }) {
  return (
    <span className="save-status" aria-live="polite" title={`Saves automatically. Press ${modKey}+S to save now.`}>
      {status === 'error' ? (
        <span className="error">
          Couldn’t save.{' '}
          <button className="link-button" onClick={onRetry}>
            Retry
          </button>
        </span>
      ) : (
        <span className="muted">{labels[status]}</span>
      )}
    </span>
  );
}
