import { createInitialState } from '@/lib/state/initial';
import { assertInvariants, checkInvariants } from '@/lib/state/invariants';
import { reduce, type StoreAction } from '@/lib/state/reducer';
import type {
  ActionResult,
  ActivityEntry,
  Actor,
  CapabilityState,
  HerShoppingState,
  ReversibleSnapshot,
} from '@/lib/state/types';

const MAX_HISTORY = 20;
const MAX_ACTIVITY = 40;

export type DispatchOptions = {
  /** Reject the action when the caller is working from a stale page state. */
  expectedStateVersion?: number;
};

function reversible(
  state: HerShoppingState,
  undoToken: string,
  label: string,
): ReversibleSnapshot {
  return {
    undoToken,
    label,
    mission: state.mission,
    layout: state.layout,
    selection: state.selection,
    cart: state.cart,
    checkout: state.checkout,
  };
}

/**
 * The one place application state changes.
 *
 * It lives outside React so the WebMCP adapter and the realtime voice adapter
 * can call the exact same code as a mouse click, with no stale closures and no
 * second copy of the truth.
 */
export class HerShoppingStore {
  private state: HerShoppingState;
  private listeners = new Set<() => void>();
  private sequence = 0;

  constructor(initial: HerShoppingState = createInitialState()) {
    this.state = initial;
  }

  getState = (): HerShoppingState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private nextId(prefix: string) {
    this.sequence += 1;
    return `${prefix}_${this.sequence}`;
  }

  private failure(
    name: string,
    error: string,
    warnings: string[] = [],
  ): ActionResult {
    const actionId = this.nextId('act');
    this.state = {
      ...this.state,
      lastAction: { name, ok: false, summary: error },
      activity: [
        {
          id: actionId,
          at: Date.now(),
          actor: 'system' as const,
          action: name,
          title: 'Action refused',
          detail: error,
          ok: false,
          undoToken: null,
        },
        ...this.state.activity,
      ].slice(0, MAX_ACTIVITY),
    };
    this.emit();
    return {
      ok: false,
      actionId,
      summary: error,
      changedEntityIds: [],
      warnings,
      stateVersion: this.state.stateVersion,
    };
  }

  dispatch = (
    action: StoreAction,
    options: DispatchOptions = {},
  ): ActionResult => {
    const name = action.type;
    if (
      typeof options.expectedStateVersion === 'number' &&
      options.expectedStateVersion !== this.state.stateVersion
    ) {
      return this.failure(
        name,
        `Stale request: the page is at state version ${this.state.stateVersion}, not ${options.expectedStateVersion}.`,
      );
    }

    let outcome;
    try {
      outcome = reduce(this.state, action);
    } catch (error) {
      return this.failure(
        name,
        error instanceof Error ? error.message : 'The action failed.',
      );
    }
    if (!outcome.ok) return this.failure(name, outcome.error, outcome.warnings);

    const problems = checkInvariants(outcome.state);
    if (problems.length > 0) {
      // Nothing is committed: a rejected action leaves state exactly as it was.
      return this.failure(
        name,
        `Layout invariant violated. ${problems.join(' ')}`,
      );
    }

    const actionId = this.nextId('act');
    const undoToken = outcome.undoable ? this.nextId('undo') : undefined;
    const entry: ActivityEntry = {
      id: actionId,
      at: Date.now(),
      actor: action.actor,
      action: name,
      title: outcome.title,
      detail: outcome.detail,
      ok: true,
      undoToken: undoToken ?? null,
    };

    const nextVersion = this.state.stateVersion + 1;
    this.state = {
      ...outcome.state,
      stateVersion: nextVersion,
      focus: outcome.focus
        ? { target: outcome.focus, version: nextVersion }
        : null,
      history: outcome.undoable
        ? [
            ...this.state.history,
            reversible(this.state, undoToken!, outcome.title),
          ].slice(-MAX_HISTORY)
        : this.state.history,
      activity: outcome.undoable
        ? [entry, ...this.state.activity].slice(0, MAX_ACTIVITY)
        : this.state.activity,
      lastAction: { name, ok: true, summary: outcome.summary },
      capabilities: this.state.capabilities,
    };
    this.emit();

    return {
      ok: true,
      actionId,
      summary: outcome.summary,
      data: outcome.data,
      changedEntityIds: outcome.changedEntityIds,
      warnings: outcome.warnings,
      undoToken,
      stateVersion: this.state.stateVersion,
    };
  };

  undo = (actor: Actor = 'human'): ActionResult => {
    const previous = this.state.history.at(-1);
    if (!previous)
      return this.failure('undo_last_action', 'There is nothing left to undo.');

    const { undoToken, label, ...restored } = previous;
    const actionId = this.nextId('act');
    const next: HerShoppingState = {
      ...this.state,
      ...restored,
      stateVersion: this.state.stateVersion + 1,
      focus: null,
      history: this.state.history.slice(0, -1),
      activity: [
        {
          id: actionId,
          at: Date.now(),
          actor,
          action: 'undo_last_action',
          title: `Undid "${label}"`,
          detail: 'The previous visible arrangement was restored.',
          ok: true,
          undoToken: null,
        },
        ...this.state.activity,
      ].slice(0, MAX_ACTIVITY),
      lastAction: {
        name: 'undo_last_action',
        ok: true,
        summary: `Undid "${label}".`,
      },
    };
    assertInvariants(next);
    this.state = next;
    this.emit();

    return {
      ok: true,
      actionId,
      summary: `Undid "${label}". ${this.state.history.length} reversible steps remain.`,
      changedEntityIds: ['layout', 'cart', 'mission'],
      warnings: [],
      stateVersion: this.state.stateVersion,
      data: {
        restoredTo: undoToken,
        remainingUndoSteps: this.state.history.length,
      },
    };
  };

  reset = (actor: Actor = 'human'): ActionResult => {
    const actionId = this.nextId('act');
    const seed = createInitialState();
    const undoToken = this.nextId('undo');
    const resetVersion = this.state.stateVersion + 1;
    this.state = {
      ...seed,
      stateVersion: resetVersion,
      focus: { target: 'hero', version: resetVersion },
      history: [
        ...this.state.history,
        reversible(this.state, undoToken, 'Before reset'),
      ].slice(-MAX_HISTORY),
      capabilities: this.state.capabilities,
      lastAction: {
        name: 'reset_experience',
        ok: true,
        summary: 'The store returned to its seed.',
      },
      activity: [
        {
          id: actionId,
          at: Date.now(),
          actor,
          action: 'reset_experience',
          title: 'Reset the experience',
          detail:
            'Mission, layout, selection, comparison, cart, and checkout returned to the seed.',
          ok: true,
          undoToken,
        },
      ],
    };
    this.emit();

    return {
      ok: true,
      actionId,
      summary: 'The store was reset to its seeded Browse View.',
      changedEntityIds: ['mission', 'layout', 'cart', 'checkout'],
      warnings: [],
      undoToken,
      stateVersion: this.state.stateVersion,
    };
  };

  /**
   * Capability status is diagnostics, not shared document state, so it never
   * bumps the state version an agent verifies against.
   */
  setCapabilities = (patch: Partial<CapabilityState>): void => {
    this.state = {
      ...this.state,
      capabilities: { ...this.state.capabilities, ...patch },
    };
    this.emit();
  };

  /** Test hook: replace state wholesale. Not used by the application. */
  replaceState = (state: HerShoppingState): void => {
    this.state = state;
    this.emit();
  };
}

export const store = new HerShoppingStore();
