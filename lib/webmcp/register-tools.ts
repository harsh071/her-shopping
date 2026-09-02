import { CAPABILITIES } from '@/lib/capabilities/registry';
import { ValidationError } from '@/lib/capabilities/schema';
import type { HerShoppingStore } from '@/lib/state/store';

/**
 * WebMCP adapter.
 *
 * Registration is imperative and happens in the top-level document — the only
 * shape current site-tools implementations discover. Each tool is a thin shell
 * over the shared capability registry: it re-validates its input, calls the same
 * action a human control would, and returns a verification payload carrying the
 * new state version.
 */
export function registerWebMcpTools(store: HerShoppingStore): () => void {
  if (typeof document === 'undefined') return () => {};

  const context = document.modelContext;
  if (!context || typeof context.registerTool !== 'function') {
    store.setCapabilities({
      webmcpAvailable: false,
      registeredTools: [],
      registrationError: null,
    });
    return () => {};
  }

  return registerAll(store, context);
}

/**
 * Some agent browsers install `document.modelContext` slightly after the page
 * scripts run, so registration is retried briefly before the page settles into
 * its human-only fallback.
 */
export function registerWebMcpToolsWhenReady(
  store: HerShoppingStore,
  { attempts = 25, intervalMs = 400 } = {},
): () => void {
  if (typeof document === 'undefined') return () => {};

  let dispose: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = attempts;

  const attempt = () => {
    const context = document.modelContext;
    if (context && typeof context.registerTool === 'function') {
      dispose = registerAll(store, context);
      return;
    }
    store.setCapabilities({ webmcpAvailable: false, registeredTools: [] });
    remaining -= 1;
    if (remaining > 0) timer = setTimeout(attempt, intervalMs);
  };

  attempt();

  return () => {
    if (timer) clearTimeout(timer);
    remaining = 0;
    dispose?.();
  };
}

type ModelContext = NonNullable<Document['modelContext']>;

function registerAll(
  store: HerShoppingStore,
  context: ModelContext,
): () => void {
  const lifecycle = new AbortController();
  const registered: string[] = [];

  for (const capability of CAPABILITIES) {
    try {
      const result = context.registerTool(
        {
          name: capability.name,
          title: capability.title,
          description: capability.description,
          inputSchema: capability.inputSchema as Record<string, unknown>,
          annotations: {
            readOnlyHint: capability.readOnly,
            untrustedContentHint: false,
          },
          execute: (input: unknown) => {
            try {
              const actionResult = capability.run(store, input, 'agent');
              store.setCapabilities({ lastValidationError: null });
              return actionResult;
            } catch (error) {
              const message =
                error instanceof ValidationError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : 'The tool call failed.';
              store.setCapabilities({
                lastValidationError: `${capability.name}: ${message}`,
              });
              // Returned rather than thrown so the agent gets a structured,
              // actionable failure instead of an opaque transport error.
              return {
                ok: false,
                actionId: `invalid_${capability.name}`,
                summary: message,
                changedEntityIds: [],
                warnings: [],
                stateVersion: store.getState().stateVersion,
              };
            }
          },
        },
        { signal: lifecycle.signal },
      );

      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch((error: unknown) => {
          store.setCapabilities({
            registrationError: `${capability.name}: ${error instanceof Error ? error.message : String(error)}`,
          });
        });
      }
      registered.push(capability.name);
    } catch (error) {
      store.setCapabilities({
        registrationError: `${capability.name}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  store.setCapabilities({
    webmcpAvailable: true,
    registeredTools: registered,
    registrationError:
      registered.length === CAPABILITIES.length
        ? null
        : 'Some tools failed to register.',
  });

  return () => {
    lifecycle.abort();
    store.setCapabilities({ webmcpAvailable: false, registeredTools: [] });
  };
}
