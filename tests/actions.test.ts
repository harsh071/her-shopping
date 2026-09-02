import { beforeEach, describe, expect, test } from 'vitest';

import { createInitialState } from '@/lib/state/initial';
import { checkInvariants } from '@/lib/state/invariants';
import { DEMO_MISSION_TEXT } from '@/lib/state/mission';
import {
  cartItemCount,
  cartSubtotalCents,
  checkoutWarnings,
} from '@/lib/state/reducer';
import { cartSummary, pageContext, visibleGroups } from '@/lib/state/selectors';
import { HerShoppingStore } from '@/lib/state/store';

let store: HerShoppingStore;

beforeEach(() => {
  store = new HerShoppingStore(createInitialState());
});

function applyGoldenMission() {
  return store.dispatch({
    type: 'set_mission',
    actor: 'human',
    missionText: DEMO_MISSION_TEXT,
  });
}

describe('mission view', () => {
  test('transforms Browse View into Mission View and hides the promotional sections', () => {
    const result = applyGoldenMission();

    expect(result.ok).toBe(true);
    const state = store.getState();
    expect(state.layout.mode).toBe('mission');
    expect(state.layout.productGrouping).toBe('priority');
    expect(state.layout.productSort).toBe('mission-fit');
    expect(state.layout.hiddenSections).toContain('featured');
    expect(state.layout.hiddenSections).toContain('editorial');
    expect(state.layout.hiddenSections).not.toContain('catalog');
  });

  test('produces the same three groups every time', () => {
    applyGoldenMission();
    const first = visibleGroups(store.getState()).map((group) => group.id);

    const second = new HerShoppingStore(createInitialState());
    second.dispatch({
      type: 'set_mission',
      actor: 'agent',
      missionText: DEMO_MISSION_TEXT,
    });

    expect(first).toEqual([
      'group:essential',
      'group:useful',
      'group:optional',
    ]);
    expect(visibleGroups(second.getState()).map((group) => group.id)).toEqual(
      first,
    );
  });

  test('a human action and an agent action produce identical state', () => {
    const byHuman = new HerShoppingStore(createInitialState());
    byHuman.dispatch({
      type: 'set_mission',
      actor: 'human',
      missionText: DEMO_MISSION_TEXT,
    });

    const byAgent = new HerShoppingStore(createInitialState());
    byAgent.dispatch({
      type: 'set_mission',
      actor: 'agent',
      missionText: DEMO_MISSION_TEXT,
    });

    expect(byAgent.getState().layout).toEqual(byHuman.getState().layout);
    expect(byAgent.getState().mission).toEqual(byHuman.getState().mission);
  });
});

describe('layout invariants', () => {
  test('protected sections cannot be hidden', () => {
    applyGoldenMission();
    const result = store.dispatch({
      type: 'set_section_visibility',
      actor: 'agent',
      sectionIds: ['catalog'],
      visible: false,
    });

    expect(result.ok).toBe(false);
    expect(store.getState().layout.hiddenSections).not.toContain('catalog');
  });

  test('a section can only move relative to a section of the same family', () => {
    const result = store.dispatch({
      type: 'move_section',
      actor: 'agent',
      sectionId: 'group:essential',
      relation: 'before',
      anchorSectionId: 'featured',
    });

    expect(result.ok).toBe(false);
  });

  test('moving a group reorders the canvas without touching the cart', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
    const before = store.getState().cart;

    const result = store.dispatch({
      type: 'move_section',
      actor: 'agent',
      sectionId: 'group:optional',
      relation: 'before',
      anchorSectionId: 'group:essential',
    });

    expect(result.ok).toBe(true);
    expect(store.getState().layout.groupOrder[0]).toBe('group:optional');
    expect(store.getState().cart).toEqual(before);
    expect(checkInvariants(store.getState())).toEqual([]);
  });

  test('the seeded state satisfies every invariant', () => {
    expect(checkInvariants(createInitialState())).toEqual([]);
  });
});

describe('comparison', () => {
  test('accepts two to four products and rejects anything else', () => {
    expect(
      store.dispatch({
        type: 'create_comparison',
        actor: 'agent',
        productIds: ['basalt-two-tent'],
      }).ok,
    ).toBe(false);

    const result = store.dispatch({
      type: 'create_comparison',
      actor: 'agent',
      productIds: [
        'thermal-ridge-jacket',
        'highland-fleece-mid',
        'merino-base-layer',
      ],
      referenceProductId: 'thermal-ridge-jacket',
    });

    expect(result.ok).toBe(true);
    expect(store.getState().layout.mode).toBe('compare');
    expect(store.getState().layout.referenceProductId).toBe(
      'thermal-ridge-jacket',
    );
  });

  test('rejects a reference that is not part of the comparison', () => {
    const result = store.dispatch({
      type: 'create_comparison',
      actor: 'agent',
      productIds: ['thermal-ridge-jacket', 'highland-fleece-mid'],
      referenceProductId: 'basalt-two-tent',
    });

    expect(result.ok).toBe(false);
    expect(store.getState().layout.mode).toBe('browse');
  });

  test('returning to mission restores the previous view', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'create_comparison',
      actor: 'agent',
      productIds: ['thermal-ridge-jacket', 'highland-fleece-mid'],
    });
    store.dispatch({ type: 'exit_comparison', actor: 'human' });

    expect(store.getState().layout.mode).toBe('mission');
  });
});

describe('cart and budget', () => {
  test('totals and remaining budget track the mission', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'agent',
      items: [
        { productId: 'basalt-two-tent', quantity: 1 },
        { productId: 'tundra-sleep-pad', quantity: 2 },
      ],
    });

    const state = store.getState();
    expect(cartItemCount(state)).toBe(3);
    expect(cartSubtotalCents(state)).toBe(28900 + 8900 * 2);
    expect(cartSummary(state).budgetRemainingCents).toBe(70000 - 46700);
    expect(cartSummary(state).overBudget).toBe(false);
  });

  test('warns instead of silently exceeding the budget', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'agent',
      items: [
        { productId: 'basalt-two-tent', quantity: 2 },
        { productId: 'aurora-down-quilt', quantity: 1 },
      ],
    });

    expect(cartSummary(store.getState()).overBudget).toBe(true);
    expect(
      checkoutWarnings(store.getState()).some((warning) =>
        warning.includes('over the'),
      ),
    ).toBe(true);
  });

  test('a compound add fails atomically on an unknown product', () => {
    const result = store.dispatch({
      type: 'add_to_cart',
      actor: 'agent',
      items: [
        { productId: 'basalt-two-tent', quantity: 1 },
        { productId: 'not-a-product', quantity: 1 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(store.getState().cart.lines).toEqual([]);
  });

  test('caps quantities at available stock rather than overselling', () => {
    const result = store.dispatch({
      type: 'add_to_cart',
      actor: 'agent',
      items: [{ productId: 'summit-power-bank', quantity: 8 }],
    });

    expect(result.ok).toBe(true);
    expect(store.getState().cart.lines[0].quantity).toBe(3);
    expect(result.warnings[0]).toMatch(/Capped/);
  });

  test('setting a quantity to zero removes the line', () => {
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId: 'fjord-camp-mug', quantity: 2 }],
    });
    store.dispatch({
      type: 'set_cart_quantity',
      actor: 'human',
      productId: 'fjord-camp-mug',
      quantity: 0,
    });

    expect(store.getState().cart.lines).toEqual([]);
  });
});

describe('undo, reset, and staleness', () => {
  test('undo restores the previous layout while keeping the cart', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
    store.dispatch({
      type: 'set_section_visibility',
      actor: 'agent',
      sectionIds: ['group:optional'],
      visible: false,
    });

    expect(store.getState().layout.hiddenSections).toContain('group:optional');
    const undone = store.undo('human');

    expect(undone.ok).toBe(true);
    expect(store.getState().layout.hiddenSections).not.toContain(
      'group:optional',
    );
    expect(store.getState().cart.lines).toHaveLength(1);
  });

  test('undo bottoms out cleanly', () => {
    expect(store.undo('human').ok).toBe(false);
  });

  test('reset clears mission, layout, selection, and cart', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
    store.reset('human');

    const state = store.getState();
    expect(state.mission).toBeNull();
    expect(state.cart.lines).toEqual([]);
    expect(state.selection).toBeNull();
    expect(state.layout.mode).toBe('browse');
    expect(state.checkout.stage).toBe('idle');
  });

  test('a stale expectedStateVersion is refused without mutating anything', () => {
    applyGoldenMission();
    const version = store.getState().stateVersion;

    const result = store.dispatch(
      { type: 'apply_mission_view', actor: 'agent' },
      { expectedStateVersion: version - 1 },
    );

    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/Stale request/);
  });

  test('every successful write advances the state version', () => {
    const before = store.getState().stateVersion;
    applyGoldenMission();
    expect(store.getState().stateVersion).toBe(before + 1);
  });
});

describe('checkout safety', () => {
  function loadCart() {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'agent',
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
  }

  test('preview opens the review surface without creating an order', () => {
    loadCart();
    const result = store.dispatch({ type: 'preview_checkout', actor: 'agent' });

    expect(result.ok).toBe(true);
    expect(store.getState().checkout.stage).toBe('review');
    expect(store.getState().checkout.order).toBeNull();
  });

  test('an agent cannot confirm the demo order', () => {
    loadCart();
    store.dispatch({ type: 'preview_checkout', actor: 'agent' });
    const token = store.getState().checkout.token!;

    const result = store.dispatch({
      type: 'confirm_demo_order',
      actor: 'agent',
      token,
    });

    expect(result.ok).toBe(false);
    expect(store.getState().checkout.stage).not.toBe('placed');
  });

  test('a person confirming with the right token creates the receipt', () => {
    loadCart();
    store.dispatch({ type: 'preview_checkout', actor: 'human' });
    const token = store.getState().checkout.token!;

    const result = store.dispatch({
      type: 'confirm_demo_order',
      actor: 'human',
      token,
    });

    expect(result.ok).toBe(true);
    const order = store.getState().checkout.order!;
    expect(order.subtotalCents).toBe(28900);
    expect(order.lines).toHaveLength(1);
  });

  test('a stale token is refused', () => {
    loadCart();
    store.dispatch({ type: 'preview_checkout', actor: 'human' });

    expect(
      store.dispatch({
        type: 'confirm_demo_order',
        actor: 'human',
        token: 'chk_bogus',
      }).ok,
    ).toBe(false);
  });

  test('editing the cart invalidates an open review', () => {
    loadCart();
    store.dispatch({ type: 'preview_checkout', actor: 'human' });
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId: 'fjord-camp-mug', quantity: 1 }],
    });

    expect(store.getState().checkout.stage).toBe('idle');
    expect(store.getState().checkout.token).toBeNull();
  });
});

describe('page context', () => {
  test('reports the selection an agent needs to resolve "this"', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'select_entity',
      actor: 'human',
      entity: { kind: 'product', id: 'thermal-ridge-jacket' },
    });

    const context = pageContext(store.getState());
    expect(context.selectedEntity).toEqual({
      kind: 'product',
      id: 'thermal-ridge-jacket',
    });
    expect(context.selectedEntityLabel).toBe('Thermal Ridge Jacket');
    expect(context.stateVersion).toBe(store.getState().stateVersion);
    expect(context.visibleGroups.map((group) => group.id)).toEqual([
      'group:essential',
      'group:useful',
      'group:optional',
    ]);
  });

  test('refuses to select something that does not exist', () => {
    const result = store.dispatch({
      type: 'select_entity',
      actor: 'agent',
      entity: { kind: 'product', id: 'ghost-product' },
    });

    expect(result.ok).toBe(false);
    expect(store.getState().selection).toBeNull();
  });
});

describe('focus targets', () => {
  test('setting a mission points at the mission summary', () => {
    applyGoldenMission();
    expect(store.getState().focus).toEqual({
      target: 'mission-summary',
      version: store.getState().stateVersion,
    });
  });

  test('opening a comparison points at the comparison region', () => {
    store.dispatch({
      type: 'create_comparison',
      actor: 'agent',
      productIds: ['thermal-ridge-jacket', 'highland-fleece-mid'],
    });
    expect(store.getState().focus?.target).toBe('comparison');
  });

  test('moving a group points at the group that moved', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'move_section',
      actor: 'agent',
      sectionId: 'group:optional',
      relation: 'before',
      anchorSectionId: 'group:essential',
    });
    expect(store.getState().focus?.target).toBe('group:optional');
  });

  test('restoring a section points at it, hiding one points back at the catalog', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'set_section_visibility',
      actor: 'agent',
      sectionIds: ['group:optional'],
      visible: false,
    });
    expect(store.getState().focus?.target).toBe('catalog');

    store.dispatch({
      type: 'set_section_visibility',
      actor: 'agent',
      sectionIds: ['featured'],
      visible: true,
    });
    expect(store.getState().focus?.target).toBe('featured');
  });

  test('selecting a product points at that product', () => {
    store.dispatch({
      type: 'select_entity',
      actor: 'agent',
      entity: { kind: 'product', id: 'aurora-down-quilt' },
    });
    expect(store.getState().focus?.target).toBe('aurora-down-quilt');
  });

  test('cart edits do not move the viewport', () => {
    applyGoldenMission();
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId: 'basalt-two-tent', quantity: 1 }],
    });
    expect(store.getState().focus).toBeNull();
  });

  test('the focus version advances so a repeated target still scrolls', () => {
    applyGoldenMission();
    const first = store.getState().focus!.version;
    store.dispatch({
      type: 'organize_products',
      actor: 'agent',
      sortBy: 'price-low',
    });
    store.dispatch({
      type: 'organize_products',
      actor: 'agent',
      sortBy: 'delivery',
    });

    const focus = store.getState().focus!;
    expect(focus.target).toBe('catalog');
    expect(focus.version).toBeGreaterThan(first);
  });

  test('undo does not fight the person for the scroll position', () => {
    applyGoldenMission();
    store.undo('human');
    expect(store.getState().focus).toBeNull();
  });

  test('reset returns to the top of the seeded store', () => {
    applyGoldenMission();
    store.reset('human');
    expect(store.getState().focus?.target).toBe('hero');
  });
});
