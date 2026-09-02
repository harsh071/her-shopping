'use client';

import { RotateCcw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import { CAPABILITIES } from '@/lib/capabilities/registry';
import { selectionLabel } from '@/lib/state/selectors';
import type { HerShoppingState } from '@/lib/state/types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="diagnostic-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * Implementation proof for judging and a fast recovery hatch during a demo.
 * Deliberately kept out of the consumer surface until it is asked for.
 */
export function DiagnosticsPanel({
  open,
  state,
  onClose,
}: {
  open: boolean;
  state: HerShoppingState;
  onClose: () => void;
}) {
  if (!open) return null;
  const capabilities = state.capabilities;

  return (
    <aside className="diagnostics" aria-label="Developer diagnostics">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Diagnostics
          </p>
          <p className="font-serif text-lg text-white">Agent surface</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close diagnostics"
        >
          <X />
        </Button>
      </div>

      <div className="space-y-1 px-4 py-3">
        <Row
          label="WebMCP API detected"
          value={capabilities.webmcpAvailable ? 'yes' : 'no'}
        />
        <Row
          label="Tools registered"
          value={`${capabilities.registeredTools.length} / ${CAPABILITIES.length}`}
        />
        <Row label="State version" value={String(state.stateVersion)} />
        <Row label="Layout mode" value={state.layout.mode} />
        <Row
          label="Grouping / sort"
          value={`${state.layout.productGrouping} / ${state.layout.productSort}`}
        />
        <Row label="Selected entity" value={selectionLabel(state)} />
        <Row
          label="Last action"
          value={
            state.lastAction
              ? `${state.lastAction.name} → ${state.lastAction.ok ? 'ok' : 'refused'}`
              : '—'
          }
        />
        <Row label="Undo depth" value={String(state.history.length)} />
        <Row label="Realtime voice" value={capabilities.voiceStatus} />
        <Row label="Checkout stage" value={state.checkout.stage} />
      </div>

      {capabilities.registrationError ? (
        <p className="diagnostic-error">
          Registration: {capabilities.registrationError}
        </p>
      ) : null}
      {capabilities.lastValidationError ? (
        <p className="diagnostic-error">
          Validation: {capabilities.lastValidationError}
        </p>
      ) : null}
      {capabilities.voiceError ? (
        <p className="diagnostic-error">Voice: {capabilities.voiceError}</p>
      ) : null}

      <details className="diagnostic-tools">
        <summary>Registered tools</summary>
        <ul>
          {CAPABILITIES.map((capability) => (
            <li key={capability.name}>
              <code>{capability.name}</code>
              <span>
                {capabilities.registeredTools.includes(capability.name)
                  ? 'live'
                  : 'not registered'}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="border-t border-white/10 p-3">
        <Button
          variant="outline"
          className="h-9 w-full rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          onClick={() => humanActions.reset()}
        >
          <RotateCcw /> Reset to seed
        </Button>
      </div>
    </aside>
  );
}
