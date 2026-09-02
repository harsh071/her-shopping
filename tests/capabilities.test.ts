import { beforeEach, describe, expect, test } from 'vitest';

import {
  CAPABILITIES,
  CAPABILITIES_BY_NAME,
  CAPABILITY_NAMES,
  auditCapabilities,
} from '@/lib/capabilities/registry';
import { ValidationError, validateInput } from '@/lib/capabilities/schema';
import { PRODUCT_IDS } from '@/lib/catalog/products';
import { createInitialState } from '@/lib/state/initial';
import { DEMO_MISSION_TEXT } from '@/lib/state/mission';
import { HerShoppingStore } from '@/lib/state/store';

let store: HerShoppingStore;

beforeEach(() => {
  store = new HerShoppingStore(createInitialState());
});

const run = (name: string, input: unknown = {}) =>
  CAPABILITIES_BY_NAME[name].run(store, input, 'agent');

describe('tool contract', () => {
  test('every published schema is closed and bounded', () => {
    expect(auditCapabilities()).toEqual([]);
  });

  test('tool names are unique and stable', () => {
    expect(new Set(CAPABILITY_NAMES).size).toBe(CAPABILITY_NAMES.length);
    expect(CAPABILITY_NAMES).toContain('get_page_context');
    expect(CAPABILITY_NAMES).toContain('place_demo_order');
  });

  test('only genuinely read-only tools claim readOnlyHint', () => {
    for (const capability of CAPABILITIES) {
      expect(capability.readOnly).toBe(capability.safety === 'read');
    }
    expect(
      CAPABILITIES.filter((capability) => capability.readOnly).map(
        (c) => c.name,
      ),
    ).toEqual(['get_page_context', 'search_products', 'get_cart']);
  });

  test('every description states what changes', () => {
    for (const capability of CAPABILITIES) {
      expect(capability.description.length).toBeGreaterThan(40);
    }
  });
});

describe('input validation', () => {
  test('rejects unknown properties', () => {
    expect(() =>
      validateInput(CAPABILITIES_BY_NAME.set_mission.inputSchema, {
        mission: 'camping in Iceland for five days',
        sneaky: true,
      }),
    ).toThrow(ValidationError);
  });

  test('rejects an unknown product id before anything mutates', () => {
    expect(() =>
      run('add_to_cart', {
        items: [{ productId: '../../etc/passwd', quantity: 1 }],
      }),
    ).toThrow(ValidationError);
    expect(store.getState().cart.lines).toEqual([]);
  });

  test('rejects out-of-range quantities', () => {
    expect(() =>
      run('add_to_cart', {
        items: [{ productId: 'fjord-camp-mug', quantity: 99 }],
      }),
    ).toThrow(ValidationError);
    expect(() =>
      run('add_to_cart', {
        items: [{ productId: 'fjord-camp-mug', quantity: 1.5 }],
      }),
    ).toThrow(ValidationError);
  });

  test('rejects an unknown section id', () => {
    expect(() =>
      run('set_section_visibility', {
        sectionIds: ['#main > .promo'],
        visible: false,
      }),
    ).toThrow(ValidationError);
  });

  test('rejects an unknown enum value', () => {
    expect(() => run('organize_products', { groupBy: 'vibes' })).toThrow(
      ValidationError,
    );
  });

  test('rejects a comparison outside two to four products', () => {
    expect(() =>
      run('create_comparison', { productIds: ['basalt-two-tent'] }),
    ).toThrow(ValidationError);
    expect(() =>
      run('create_comparison', {
        productIds: [
          'basalt-two-tent',
          'windward-bivy',
          'aurora-down-quilt',
          'tundra-sleep-pad',
          'fjord-camp-mug',
        ],
      }),
    ).toThrow(ValidationError);
  });

  test('rejects duplicate ids', () => {
    expect(() =>
      run('create_comparison', {
        productIds: ['basalt-two-tent', 'basalt-two-tent'],
      }),
    ).toThrow(ValidationError);
  });

  test('applies declared defaults', () => {
    const parsed = validateInput<{ limit: number }>(
      CAPABILITIES_BY_NAME.search_products.inputSchema,
      {},
    );
    expect(parsed.limit).toBe(8);
  });
});

describe('tool behaviour', () => {
  test('read tools never change the state version', () => {
    const before = store.getState().stateVersion;
    run('get_page_context');
    run('get_cart');
    run('search_products', { query: 'tent' });
    expect(store.getState().stateVersion).toBe(before);
  });

  test('search returns usable ids ranked for the mission', () => {
    run('set_mission', { mission: DEMO_MISSION_TEXT });
    const result = run('search_products', {
      purpose: 'warmth',
      maxDeliveryDays: 3,
      limit: 3,
    });
    const results = (
      result.data as { results: Array<{ id: string; missionScore: number }> }
    ).results;

    expect(results.length).toBe(3);
    expect(results[0].missionScore).toBeGreaterThanOrEqual(
      results[2].missionScore,
    );
    for (const item of results) expect(PRODUCT_IDS).toContain(item.id);
  });

  test('the golden path runs end to end through tools only', () => {
    expect(run('set_mission', { mission: DEMO_MISSION_TEXT }).ok).toBe(true);
    expect(run('apply_mission_view', {}).ok).toBe(true);
    expect(
      run('set_section_visibility', {
        sectionIds: ['group:optional'],
        visible: false,
      }).ok,
    ).toBe(true);
    expect(
      run('move_section', {
        sectionId: 'group:useful',
        relation: 'before',
        anchorSectionId: 'group:essential',
      }).ok,
    ).toBe(true);
    expect(
      run('create_comparison', {
        productIds: ['thermal-ridge-jacket', 'highland-fleece-mid'],
        referenceProductId: 'thermal-ridge-jacket',
      }).ok,
    ).toBe(true);
    expect(run('exit_comparison', {}).ok).toBe(true);
    expect(
      run('add_to_cart', {
        items: [
          {
            productId: 'basalt-two-tent',
            quantity: 1,
            reason: 'Handles crosswind',
          },
          { productId: 'aurora-down-quilt', quantity: 1 },
        ],
      }).ok,
    ).toBe(true);

    const cart = run('get_cart').data as {
      itemCount: number;
      subtotalCents: number;
    };
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotalCents).toBe(28900 + 18400);

    const preview = run('preview_checkout');
    expect(preview.ok).toBe(true);
    expect(store.getState().checkout.stage).toBe('review');
  });

  test('place_demo_order only raises the confirmation gate', () => {
    run('set_mission', { mission: DEMO_MISSION_TEXT });
    run('add_to_cart', {
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
    run('preview_checkout');

    const result = run('place_demo_order', {
      token: store.getState().checkout.token!,
    });
    const data = result.data as {
      orderPlaced: boolean;
      awaitingHumanConfirmation: boolean;
    };

    expect(data.orderPlaced).toBe(false);
    expect(data.awaitingHumanConfirmation).toBe(true);
    expect(store.getState().checkout.stage).toBe('awaiting-confirmation');
    expect(store.getState().checkout.order).toBeNull();

    // Only the visible human control clears the gate.
    const token = store.getState().checkout.token!;
    store.dispatch({ type: 'confirm_demo_order', actor: 'human', token });
    expect(store.getState().checkout.order).not.toBeNull();

    const after = run('place_demo_order', {});
    expect((after.data as { orderPlaced: boolean }).orderPlaced).toBe(true);
  });

  test('reset needs explicit confirmation', () => {
    run('set_mission', { mission: DEMO_MISSION_TEXT });

    const refused = run('reset_experience', { confirmed: false });
    expect(refused.ok).toBe(false);
    expect(store.getState().mission).not.toBeNull();

    expect(run('reset_experience', { confirmed: true }).ok).toBe(true);
    expect(store.getState().mission).toBeNull();
  });

  test('undo through a tool reverses a human change', () => {
    store.dispatch({
      type: 'set_mission',
      actor: 'human',
      missionText: DEMO_MISSION_TEXT,
    });
    expect(store.getState().layout.mode).toBe('mission');

    expect(run('undo_last_action').ok).toBe(true);
    expect(store.getState().layout.mode).toBe('browse');
  });

  test('every write tool reports the new state version', () => {
    const result = run('set_mission', { mission: DEMO_MISSION_TEXT });
    expect(result.stateVersion).toBe(store.getState().stateVersion);
  });
});
