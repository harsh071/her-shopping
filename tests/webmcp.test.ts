import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CAPABILITIES, CAPABILITY_NAMES } from '@/lib/capabilities/registry';
import { createInitialState } from '@/lib/state/initial';
import { DEMO_MISSION_TEXT } from '@/lib/state/mission';
import { HerShoppingStore } from '@/lib/state/store';
import {
  registerWebMcpTools,
  registerWebMcpToolsWhenReady,
} from '@/lib/webmcp/register-tools';

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown) => unknown;
  annotations?: { readOnlyHint?: boolean };
};

let store: HerShoppingStore;
let registered: RegisteredTool[];
let registerTool: ReturnType<typeof vi.fn>;

function installModelContext() {
  registered = [];
  registerTool = vi.fn((tool: RegisteredTool) => {
    registered.push(tool);
  });
  vi.stubGlobal('document', { modelContext: { registerTool } });
}

beforeEach(() => {
  store = new HerShoppingStore(createInitialState());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebMCP registration', () => {
  test('registers every capability exactly once at the top level', () => {
    installModelContext();
    registerWebMcpTools(store);

    expect(registerTool).toHaveBeenCalledTimes(CAPABILITIES.length);
    expect(registered.map((tool) => tool.name)).toEqual(CAPABILITY_NAMES);
    expect(new Set(registered.map((tool) => tool.name)).size).toBe(
      CAPABILITIES.length,
    );
    expect(store.getState().capabilities.webmcpAvailable).toBe(true);
    expect(store.getState().capabilities.registeredTools).toEqual(
      CAPABILITY_NAMES,
    );
    expect(store.getState().capabilities.registrationError).toBeNull();
  });

  test('publishes closed schemas and honest read-only hints', () => {
    installModelContext();
    registerWebMcpTools(store);

    for (const tool of registered) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(typeof tool.description).toBe('string');
    }
    const readOnly = registered
      .filter((tool) => tool.annotations?.readOnlyHint)
      .map((tool) => tool.name);
    expect(readOnly).toEqual([
      'get_page_context',
      'search_products',
      'get_cart',
    ]);
  });

  test('degrades to the human interface when the API is absent', () => {
    vi.stubGlobal('document', {});
    const dispose = registerWebMcpTools(store);

    expect(store.getState().capabilities.webmcpAvailable).toBe(false);
    expect(store.getState().capabilities.registeredTools).toEqual([]);
    expect(() => dispose()).not.toThrow();
  });

  test('cleanup aborts registration and clears the indicator', () => {
    installModelContext();
    const dispose = registerWebMcpTools(store);
    const signal = registerTool.mock.calls[0][1].signal as AbortSignal;

    expect(signal.aborted).toBe(false);
    dispose();
    expect(signal.aborted).toBe(true);
    expect(store.getState().capabilities.webmcpAvailable).toBe(false);
  });
});

describe('WebMCP execution', () => {
  function tool(name: string) {
    return registered.find((item) => item.name === name)!;
  }

  beforeEach(() => {
    installModelContext();
    registerWebMcpTools(store);
  });

  test('an external agent can inspect, restructure, compare, and add to the cart', () => {
    expect(
      (
        tool('set_mission').execute({ mission: DEMO_MISSION_TEXT }) as {
          ok: boolean;
        }
      ).ok,
    ).toBe(true);
    expect(store.getState().layout.mode).toBe('mission');

    const context = tool('get_page_context').execute({}) as {
      data: {
        visibleGroups: Array<{ id: string; productIds: string[] }>;
        mode: string;
      };
    };
    expect(context.data.mode).toBe('mission');
    const essential = context.data.visibleGroups.find(
      (group) => group.id === 'group:essential',
    )!;
    expect(essential.productIds.length).toBeGreaterThan(0);

    tool('create_comparison').execute({
      productIds: essential.productIds.slice(0, 2),
    });
    expect(store.getState().layout.mode).toBe('compare');

    tool('add_to_cart').execute({
      items: [{ productId: essential.productIds[0], quantity: 1 }],
    });
    expect(store.getState().cart.lines).toHaveLength(1);
  });

  test('invalid input returns a structured failure instead of throwing', () => {
    const result = tool('add_to_cart').execute({
      items: [{ productId: 'nope', quantity: 1 }],
    }) as {
      ok: boolean;
      summary: string;
      stateVersion: number;
    };

    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/productId/);
    expect(result.stateVersion).toBe(store.getState().stateVersion);
    expect(store.getState().capabilities.lastValidationError).toMatch(
      /add_to_cart/,
    );
    expect(store.getState().cart.lines).toEqual([]);
  });

  test('the agent and the UI always report the same state version', () => {
    tool('set_mission').execute({ mission: DEMO_MISSION_TEXT });
    const reported = (
      tool('get_page_context').execute({}) as { data: { stateVersion: number } }
    ).data;

    expect(reported.stateVersion).toBe(store.getState().stateVersion);
  });

  test('a tool cannot place an order on its own', () => {
    tool('add_to_cart').execute({
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
    tool('preview_checkout').execute({});
    tool('place_demo_order').execute({});

    expect(store.getState().checkout.stage).toBe('awaiting-confirmation');
    expect(store.getState().checkout.order).toBeNull();
  });
});

describe('late API injection', () => {
  test('registers when the browser installs modelContext after mount', async () => {
    vi.useFakeTimers();
    const late: { modelContext?: { registerTool: ReturnType<typeof vi.fn> } } =
      {};
    vi.stubGlobal('document', late);

    const dispose = registerWebMcpToolsWhenReady(store, {
      attempts: 5,
      intervalMs: 100,
    });
    expect(store.getState().capabilities.webmcpAvailable).toBe(false);

    const registerTool = vi.fn();
    late.modelContext = { registerTool };
    await vi.advanceTimersByTimeAsync(100);

    expect(store.getState().capabilities.webmcpAvailable).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(CAPABILITIES.length);

    dispose();
    vi.useRealTimers();
  });

  test('gives up quietly and leaves the store usable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', {});

    registerWebMcpToolsWhenReady(store, { attempts: 3, intervalMs: 100 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(store.getState().capabilities.webmcpAvailable).toBe(false);
    expect(store.getState().capabilities.registrationError).toBeNull();
    vi.useRealTimers();
  });
});
