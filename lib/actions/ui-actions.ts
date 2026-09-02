import { store } from '@/lib/state/store';
import type {
  ComparisonAttribute,
  ProductGrouping,
  ProductSort,
  SelectedEntity,
} from '@/lib/state/types';
import type { SectionId } from '@/lib/state/sections';

/**
 * Human-facing wrappers over the shared action layer.
 *
 * Components never build raw actions and never touch state directly — a click
 * takes exactly the path an agent tool call takes, which is what keeps the two
 * interfaces from drifting.
 */
export const humanActions = {
  setMission: (missionText: string) =>
    store.dispatch({ type: 'set_mission', actor: 'human', missionText }),
  clearMission: () => store.dispatch({ type: 'clear_mission', actor: 'human' }),
  removeConstraint: (constraintId: string) =>
    store.dispatch({
      type: 'update_constraint',
      actor: 'human',
      constraintId,
      operation: 'remove',
    }),
  promoteConstraint: (constraintId: string) =>
    store.dispatch({
      type: 'update_constraint',
      actor: 'human',
      constraintId,
      operation: 'promote',
    }),
  relaxConstraint: (constraintId: string) =>
    store.dispatch({
      type: 'update_constraint',
      actor: 'human',
      constraintId,
      operation: 'relax',
    }),

  applyMissionView: () =>
    store.dispatch({ type: 'apply_mission_view', actor: 'human' }),
  exitToBrowse: () =>
    store.dispatch({ type: 'exit_to_browse', actor: 'human' }),
  organize: (patch: { groupBy?: ProductGrouping; sortBy?: ProductSort }) =>
    store.dispatch({ type: 'organize_products', actor: 'human', ...patch }),
  setSectionVisibility: (sectionIds: SectionId[], visible: boolean) =>
    store.dispatch({
      type: 'set_section_visibility',
      actor: 'human',
      sectionIds,
      visible,
      reason: 'user-request',
    }),
  moveSection: (
    sectionId: SectionId,
    relation: 'before' | 'after',
    anchorSectionId: SectionId,
  ) =>
    store.dispatch({
      type: 'move_section',
      actor: 'human',
      sectionId,
      relation,
      anchorSectionId,
    }),

  select: (entity: SelectedEntity | null) =>
    store.dispatch({ type: 'select_entity', actor: 'human', entity }),
  toggleShortlist: (productId: string) =>
    store.dispatch({ type: 'toggle_focus_product', actor: 'human', productId }),
  compare: (
    productIds: string[],
    referenceProductId?: string,
    prioritizeAttributes?: ComparisonAttribute[],
  ) =>
    store.dispatch({
      type: 'create_comparison',
      actor: 'human',
      productIds,
      referenceProductId,
      prioritizeAttributes,
    }),
  exitComparison: () =>
    store.dispatch({ type: 'exit_comparison', actor: 'human' }),
  setReference: (productId: string) =>
    store.dispatch({
      type: 'set_reference_product',
      actor: 'human',
      productId,
    }),

  addToCart: (productId: string, quantity = 1, reason?: string) =>
    store.dispatch({
      type: 'add_to_cart',
      actor: 'human',
      items: [{ productId, quantity, reason }],
    }),
  setQuantity: (productId: string, quantity: number) =>
    store.dispatch({
      type: 'set_cart_quantity',
      actor: 'human',
      productId,
      quantity,
    }),

  previewCheckout: () =>
    store.dispatch({ type: 'preview_checkout', actor: 'human' }),
  requestConfirmation: () =>
    store.dispatch({ type: 'request_order_confirmation', actor: 'human' }),
  confirmOrder: (token: string) =>
    store.dispatch({ type: 'confirm_demo_order', actor: 'human', token }),
  cancelCheckout: () =>
    store.dispatch({ type: 'cancel_checkout', actor: 'human' }),

  undo: () => store.undo('human'),
  reset: () => store.reset('human'),
};
