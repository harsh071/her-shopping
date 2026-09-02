'use client';

import { Undo2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import type { ActivityEntry, Actor } from '@/lib/state/types';

const ACTOR_LABEL: Record<Actor, string> = {
  human: 'You',
  agent: 'Site agent',
  voice: 'Voice',
  system: 'Store',
};

/**
 * Only observable actions and their outcomes are shown here — never private
 * agent reasoning.
 */
export function ActivityLedger({
  open,
  activity,
  canUndo,
  onClose,
}: {
  open: boolean;
  activity: ActivityEntry[];
  canUndo: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className="drawer-scrim"
        onClick={onClose}
        aria-label="Close the agent ledger"
      />
      <aside className="drawer bg-white" aria-label="Agent ledger">
        <div className="flex items-center justify-between border-b border-ink/10 p-5">
          <div>
            <p className="eyebrow">Observable actions</p>
            <h2 className="font-serif text-2xl">Agent ledger</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3">
          <p className="text-xs text-ink/50">
            Every mutation, whoever made it.
          </p>
          <Button
            variant="outline"
            className="h-8 rounded-full border-ink/15 bg-transparent text-xs"
            disabled={!canUndo}
            onClick={() => humanActions.undo()}
          >
            <Undo2 /> Undo last
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 border-l border-ink/10 pl-6">
            {activity.map((entry, index) => (
              <div key={entry.id} className="relative">
                <span
                  className={`absolute -left-[29px] top-1.5 size-2 rounded-full ${
                    !entry.ok
                      ? 'bg-destructive'
                      : index === 0
                        ? 'bg-coral'
                        : 'bg-clay'
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{entry.title}</p>
                  <span className="ledger-tag">{ACTOR_LABEL[entry.actor]}</span>
                  <span className="ledger-tag is-quiet">{entry.action}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink/50">
                  {entry.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
