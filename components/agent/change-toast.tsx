'use client';

import { Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { humanActions } from '@/lib/actions/ui-actions';
import type { ActivityEntry } from '@/lib/state/types';

/**
 * Makes the transformation legible. Whenever the page reorganises itself, this
 * names what moved and offers a one-press way back.
 */
export function ChangeToast({ entry }: { entry: ActivityEntry | undefined }) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    const timer = window.setTimeout(() => setDismissedId(entry.id), 7000);
    return () => window.clearTimeout(timer);
  }, [entry]);

  if (!entry || entry.id === dismissedId || entry.actor === 'system')
    return null;

  return (
    <output className="change-toast">
      <span
        className={`toast-dot ${entry.actor === 'human' ? 'is-human' : ''}`}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.title}</p>
        <p className="truncate text-xs text-ink/50">{entry.detail}</p>
      </div>
      {entry.undoToken ? (
        <button
          type="button"
          className="toast-action"
          onClick={() => humanActions.undo()}
        >
          <Undo2 className="size-3.5" /> Undo
        </button>
      ) : null}
      <button
        type="button"
        className="toast-close"
        onClick={() => setDismissedId(entry.id)}
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </output>
  );
}
