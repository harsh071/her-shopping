import { PRODUCTS, getProduct, type Product } from '@/lib/catalog/products';
import { dollars, pluralize } from '@/lib/format';
import {
  parseMission,
  scoreProduct,
  uncoveredNeeds,
} from '@/lib/state/mission';
import {
  PRIORITY_GROUP_IDS,
  PROTECTED_SECTION_IDS,
  defaultGroupOrder,
  isGroupSectionId,
  isPageSectionId,
  sectionLabel,
  type PageSectionId,
  type SectionId,
} from '@/lib/state/sections';
import type {
  Actor,
  CardAttribute,
  CardLayout,
  ColumnSetting,
  ComparisonAttribute,
  ConstraintKind,
  HerShoppingState,
  ImageScale,
  PresentationPreset,
  PresentationState,
  PriceEmphasis,
  LayoutState,
  ProductGrouping,
  ProductSort,
  SelectedEntity,
} from '@/lib/state/types';

export type StoreAction =
  | {
      type: 'set_mission';
      actor: Actor;
      missionText: string;
      applyView?: boolean;
    }
  | { type: 'clear_mission'; actor: Actor }
  | {
      type: 'update_constraint';
      actor: Actor;
      constraintId: string;
      operation: 'remove' | 'promote' | 'relax';
    }
  | {
      type: 'apply_mission_view';
      actor: Actor;
      hideIrrelevantSections?: boolean;
    }
  | { type: 'exit_to_browse'; actor: Actor }
  | {
      type: 'organize_products';
      actor: Actor;
      groupBy?: ProductGrouping;
      sortBy?: ProductSort;
    }
  | {
      type: 'set_card_presentation';
      actor: Actor;
      preset?: PresentationPreset;
      cardLayout?: CardLayout;
      columns?: ColumnSetting;
      priceEmphasis?: PriceEmphasis;
      imageScale?: ImageScale;
      cardAttributes?: CardAttribute[];
      automaticAttributes?: boolean;
      showDescriptions?: boolean;
    }
  | {
      type: 'set_section_visibility';
      actor: Actor;
      sectionIds: SectionId[];
      visible: boolean;
      reason?: 'irrelevant' | 'focus' | 'user-request';
    }
  | {
      type: 'move_section';
      actor: Actor;
      sectionId: SectionId;
      relation: 'before' | 'after';
      anchorSectionId: SectionId;
    }
  | { type: 'select_entity'; actor: Actor; entity: SelectedEntity | null }
  | { type: 'toggle_focus_product'; actor: Actor; productId: string }
  | {
      type: 'create_comparison';
      actor: Actor;
      productIds: string[];
      referenceProductId?: string;
      prioritizeAttributes?: ComparisonAttribute[];
    }
  | { type: 'exit_comparison'; actor: Actor }
  | { type: 'set_reference_product'; actor: Actor; productId: string }
  | {
      type: 'add_to_cart';
      actor: Actor;
      items: Array<{ productId: string; quantity: number; reason?: string }>;
    }
  | {
      type: 'set_cart_quantity';
      actor: Actor;
      productId: string;
      quantity: number;
    }
  | { type: 'preview_checkout'; actor: Actor }
  | { type: 'request_order_confirmation'; actor: Actor }
  | { type: 'confirm_demo_order'; actor: Actor; token: string }
  | { type: 'cancel_checkout'; actor: Actor };

export type ReduceOutcome =
  | {
      ok: true;
      state: HerShoppingState;
      summary: string;
      detail: string;
      title: string;
      changedEntityIds: string[];
      warnings: string[];
      undoable: boolean;
      data?: unknown;
      /** Section, group, or product id the interface should bring into view. */
      focus?: string | null;
    }
  | { ok: false; error: string; warnings?: string[] };

function fail(error: string, warnings: string[] = []): ReduceOutcome {
  return { ok: false, error, warnings };
}

/**
 * Named card designs the store already ships. A preset is a coherent starting
 * point; individual fields passed alongside it are applied on top.
 */
export const PRESENTATION_PRESETS: Record<
  PresentationPreset,
  PresentationState
> = {
  default: {
    cardLayout: 'grid',
    columns: 'auto',
    priceEmphasis: 'standard',
    imageScale: 'standard',
    cardAttributes: null,
    showDescriptions: true,
  },
  // Many options, scanned quickly: full-width rows, small images, every
  // decision attribute on the face of the card.
  'dense-decision': {
    cardLayout: 'list',
    columns: 'auto',
    priceEmphasis: 'standard',
    imageScale: 'small',
    cardAttributes: ['warmth', 'delivery', 'weight', 'mission-fit'],
    showDescriptions: false,
  },
  // Browsing for feel rather than specification.
  'visual-browse': {
    cardLayout: 'gallery',
    columns: '3',
    priceEmphasis: 'subtle',
    imageScale: 'large',
    cardAttributes: [],
    showDescriptions: false,
  },
  // Budget is the question: prices large, everything else out of the way.
  'price-first': {
    cardLayout: 'grid',
    columns: '4',
    priceEmphasis: 'prominent',
    imageScale: 'small',
    cardAttributes: ['delivery', 'stock'],
    showDescriptions: false,
  },
};

const PRESENTATION_LABELS: Record<PresentationPreset, string> = {
  default: 'the standard card design',
  'dense-decision': 'a dense decision list',
  'visual-browse': 'a visual browsing gallery',
  'price-first': 'a price-led grid',
};

function withHidden(
  layout: LayoutState,
  hide: SectionId[],
  show: SectionId[],
): SectionId[] {
  const next = new Set(layout.hiddenSections);
  for (const id of hide) next.add(id);
  for (const id of show) next.delete(id);
  return [...next];
}

function moveWithin<T extends string>(
  order: T[],
  sectionId: T,
  relation: 'before' | 'after',
  anchorSectionId: T,
): T[] | null {
  if (sectionId === anchorSectionId) return null;
  if (!order.includes(sectionId) || !order.includes(anchorSectionId))
    return null;
  const without = order.filter((id) => id !== sectionId);
  const anchorIndex = without.indexOf(anchorSectionId);
  const insertAt = relation === 'before' ? anchorIndex : anchorIndex + 1;
  return [...without.slice(0, insertAt), sectionId, ...without.slice(insertAt)];
}

export function cartSubtotalCents(state: HerShoppingState): number {
  return state.cart.lines.reduce((total, line) => {
    const product = getProduct(line.productId);
    return total + (product?.priceCents ?? 0) * line.quantity;
  }, 0);
}

export function cartItemCount(state: HerShoppingState): number {
  return state.cart.lines.reduce((total, line) => total + line.quantity, 0);
}

/** Warnings a human or an agent should see before a demo order is placed. */
export function checkoutWarnings(state: HerShoppingState): string[] {
  const warnings: string[] = [];
  const subtotal = cartSubtotalCents(state);
  const mission = state.mission;

  if (state.cart.lines.length === 0) warnings.push('The cart is empty.');

  if (mission?.budgetCents && subtotal > mission.budgetCents) {
    warnings.push(
      `Cart total ${dollars(subtotal)} is over the ${dollars(mission.budgetCents)} mission budget.`,
    );
  }

  for (const line of state.cart.lines) {
    const product = getProduct(line.productId);
    if (!product) continue;
    if (line.quantity > product.inventory) {
      warnings.push(`Only ${product.inventory} ${product.name} left in stock.`);
    }
    if (mission?.deadline && product.deliveryDays > mission.deadline.days) {
      warnings.push(
        `${product.name} arrives in ${product.deliveryDays} days — after ${mission.deadline.label}.`,
      );
    }
  }

  if (mission) {
    const missing = uncoveredNeeds(
      mission,
      state.cart.lines.map((line) => line.productId),
    );
    if (missing.length > 0) {
      warnings.push(`Nothing in the cart covers ${missing.join(', ')}.`);
    }
  }

  return warnings;
}

function makeToken(seedVersion: number): string {
  return `chk_${seedVersion.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The single mutation path. Every human control, voice command, and WebMCP tool
 * funnels through here, so the two audiences can never drift apart.
 */
export function reduce(
  state: HerShoppingState,
  action: StoreAction,
): ReduceOutcome {
  switch (action.type) {
    case 'set_mission': {
      const text = action.missionText.trim();
      if (text.length < 8)
        return fail('A mission needs at least eight characters.');
      const mission = parseMission(text);
      const applyView = action.applyView !== false;
      const layout: LayoutState = applyView
        ? {
            ...state.layout,
            mode: 'mission',
            productGrouping: 'priority',
            productSort: 'mission-fit',
            groupOrder: defaultGroupOrder('priority'),
            comparisonProductIds: [],
            referenceProductId: null,
            focusedProductIds: [],
            hiddenSections: withHidden(
              state.layout,
              ['hero', 'featured', 'editorial', 'comparison'],
              ['mission-summary', 'catalog', ...PRIORITY_GROUP_IDS],
            ),
          }
        : {
            ...state.layout,
            hiddenSections: withHidden(state.layout, [], ['mission-summary']),
          };

      const fits = PRODUCTS.map((product) => scoreProduct(product, mission));
      const essential = fits.filter(
        (fit) => fit.priority === 'essential',
      ).length;
      const blocked = fits.filter((fit) => fit.violations.length > 0).length;
      const warnings =
        blocked > 0
          ? [`${blocked} products cannot meet the hard constraints.`]
          : [];

      return {
        ok: true,
        state: { ...state, mission, layout, selection: null },
        focus: 'mission-summary',
        title: applyView
          ? 'Reorganised the store around your mission'
          : 'Mission updated',
        summary: applyView
          ? `Mission View applied. ${essential} essentials, ${mission.constraints.length} constraints.`
          : 'Mission recorded without changing the layout.',
        detail: applyView
          ? `Grouped ${PRODUCTS.length} products by mission priority and surfaced ${mission.constraints.length} ${pluralize(mission.constraints.length, 'constraint')}.`
          : 'The mission chips updated; the layout was left as it was.',
        changedEntityIds: ['mission', 'layout'],
        warnings,
        undoable: true,
        data: { mission, essentialCount: essential },
      };
    }

    case 'clear_mission': {
      if (!state.mission) return fail('There is no active mission to clear.');
      return {
        ok: true,
        state: {
          ...state,
          mission: null,
          layout: {
            ...state.layout,
            mode: 'browse',
            productGrouping: 'category',
            productSort: 'featured',
            groupOrder: defaultGroupOrder('category'),
            hiddenSections: withHidden(
              state.layout,
              ['mission-summary', 'comparison'],
              ['hero', 'featured', 'editorial', 'catalog'],
            ),
            comparisonProductIds: [],
            referenceProductId: null,
          },
          selection: null,
        },
        focus: 'hero',
        title: 'Cleared the mission',
        summary: 'The store returned to its normal browse layout.',
        detail:
          'Mission chips were removed and the standard catalog order was restored.',
        changedEntityIds: ['mission', 'layout'],
        warnings: [],
        undoable: true,
      };
    }

    case 'update_constraint': {
      const mission = state.mission;
      if (!mission) return fail('There is no active mission.');
      const existing = mission.constraints.find(
        (item) => item.id === action.constraintId,
      );
      if (!existing)
        return fail(`Unknown constraint "${action.constraintId}".`);

      let constraints = mission.constraints;
      let title = '';
      if (action.operation === 'remove') {
        constraints = mission.constraints.filter(
          (item) => item.id !== action.constraintId,
        );
        title = `Removed the "${existing.label}" constraint`;
      } else {
        const kind: ConstraintKind =
          action.operation === 'promote' ? 'hard' : 'preference';
        if (existing.kind === kind)
          return fail(`"${existing.label}" is already a ${kind} constraint.`);
        constraints = mission.constraints.map((item) =>
          item.id === action.constraintId ? { ...item, kind } : item,
        );
        title = `${action.operation === 'promote' ? 'Promoted' : 'Relaxed'} "${existing.label}"`;
      }

      const nextMission = { ...mission, constraints };
      if (action.operation === 'remove') {
        if (action.constraintId === 'budget') nextMission.budgetCents = null;
        if (action.constraintId === 'delivery') nextMission.deadline = null;
        if (action.constraintId === 'party') nextMission.partySize = null;
        if (action.constraintId === 'warmth') {
          nextMission.priorities = mission.priorities.filter(
            (item) => item !== 'warmth',
          );
        }
        if (action.constraintId === 'weight') {
          nextMission.priorities = mission.priorities.filter(
            (item) => item !== 'weight',
          );
        }
      }

      return {
        ok: true,
        state: { ...state, mission: nextMission },
        focus: 'mission-summary',
        title,
        summary: `${constraints.length} ${pluralize(constraints.length, 'constraint')} remain active.`,
        detail:
          'Mission fit, grouping, and warnings were recalculated from the edited constraints.',
        changedEntityIds: ['mission', `constraint:${action.constraintId}`],
        warnings: [],
        undoable: true,
        data: { constraints },
      };
    }

    case 'apply_mission_view': {
      if (!state.mission)
        return fail('Set a mission before applying Mission View.');
      const hideIrrelevant = action.hideIrrelevantSections !== false;
      return {
        ok: true,
        state: {
          ...state,
          layout: {
            ...state.layout,
            mode: 'mission',
            productGrouping: 'priority',
            productSort: 'mission-fit',
            groupOrder: defaultGroupOrder('priority'),
            hiddenSections: withHidden(
              state.layout,
              hideIrrelevant
                ? ['hero', 'featured', 'editorial', 'comparison']
                : ['comparison'],
              ['mission-summary', 'catalog', ...PRIORITY_GROUP_IDS],
            ),
          },
        },
        focus: 'catalog',
        title: 'Applied Mission View',
        summary: 'Products regrouped into Essential, Useful, and Optional.',
        detail: hideIrrelevant
          ? 'Promotional sections were hidden and mission attributes were promoted onto every card.'
          : 'Products regrouped by mission fit with the promotional sections left in place.',
        changedEntityIds: ['layout'],
        warnings: [],
        undoable: true,
      };
    }

    case 'exit_to_browse': {
      if (state.layout.mode === 'browse')
        return fail('The store is already in Browse View.');
      return {
        ok: true,
        state: {
          ...state,
          layout: {
            ...state.layout,
            mode: 'browse',
            productGrouping: 'category',
            productSort: 'featured',
            groupOrder: defaultGroupOrder('category'),
            hiddenSections: withHidden(
              state.layout,
              ['comparison'],
              ['hero', 'featured', 'editorial', 'catalog'],
            ),
          },
        },
        focus: 'hero',
        title: 'Returned to Browse View',
        summary: 'The conventional store layout is back.',
        detail: 'Sections were restored to the seller-designed arrangement.',
        changedEntityIds: ['layout'],
        warnings: [],
        undoable: true,
      };
    }

    case 'organize_products': {
      const groupBy = action.groupBy ?? state.layout.productGrouping;
      const sortBy = action.sortBy ?? state.layout.productSort;
      if (sortBy === 'mission-fit' && !state.mission) {
        return fail('Mission-fit sorting needs an active mission.');
      }
      const groupOrder =
        groupBy === state.layout.productGrouping
          ? state.layout.groupOrder
          : defaultGroupOrder(groupBy);

      return {
        ok: true,
        state: {
          ...state,
          layout: {
            ...state.layout,
            productGrouping: groupBy,
            productSort: sortBy,
            groupOrder,
            mode:
              state.layout.mode === 'compare' ? 'compare' : state.layout.mode,
          },
        },
        focus: 'catalog',
        title: 'Reorganised the catalog',
        summary: `Grouped by ${groupBy}, sorted by ${sortBy}.`,
        detail: `The visible catalog now groups by ${groupBy} and sorts by ${sortBy}.`,
        changedEntityIds: ['layout', 'catalog'],
        warnings: [],
        undoable: true,
        data: { groupBy, sortBy },
      };
    }

    case 'set_card_presentation': {
      const base = action.preset
        ? PRESENTATION_PRESETS[action.preset]
        : state.layout.presentation;
      if (action.preset && !base) return fail(`Unknown presentation preset.`);

      if (
        action.cardAttributes &&
        new Set(action.cardAttributes).size !== action.cardAttributes.length
      ) {
        return fail('Card attributes must be unique.');
      }
      if (action.automaticAttributes && action.cardAttributes) {
        return fail(
          'Choose either automatic attributes or an explicit list, not both.',
        );
      }

      const presentation: PresentationState = {
        ...base,
        cardLayout: action.cardLayout ?? base.cardLayout,
        columns: action.columns ?? base.columns,
        priceEmphasis: action.priceEmphasis ?? base.priceEmphasis,
        imageScale: action.imageScale ?? base.imageScale,
        showDescriptions: action.showDescriptions ?? base.showDescriptions,
        cardAttributes: action.automaticAttributes
          ? null
          : (action.cardAttributes ?? base.cardAttributes),
      };

      const unchanged =
        presentation.cardLayout === state.layout.presentation.cardLayout &&
        presentation.columns === state.layout.presentation.columns &&
        presentation.priceEmphasis ===
          state.layout.presentation.priceEmphasis &&
        presentation.imageScale === state.layout.presentation.imageScale &&
        presentation.showDescriptions ===
          state.layout.presentation.showDescriptions &&
        JSON.stringify(presentation.cardAttributes) ===
          JSON.stringify(state.layout.presentation.cardAttributes);
      if (unchanged) return fail('The cards already look like that.');

      const warnings: string[] = [];
      if (
        presentation.cardAttributes?.includes('mission-fit') &&
        !state.mission
      ) {
        warnings.push('Mission fit only has a value once a mission is set.');
      }
      if (
        presentation.imageScale === 'hidden' &&
        presentation.cardLayout === 'gallery'
      ) {
        warnings.push('A gallery with hidden images shows very little.');
      }

      const described = action.preset
        ? `Switched the cards to ${PRESENTATION_LABELS[action.preset]}.`
        : `Cards are now a ${presentation.cardLayout} with ${presentation.priceEmphasis} pricing.`;

      return {
        ok: true,
        state: { ...state, layout: { ...state.layout, presentation } },
        focus: 'catalog',
        title: 'Restyled the product cards',
        summary: described,
        detail: `${presentation.cardLayout} layout, ${presentation.columns} columns, ${presentation.imageScale} images, ${
          presentation.cardAttributes === null
            ? 'automatic'
            : presentation.cardAttributes.length === 0
              ? 'no'
              : presentation.cardAttributes.join(' / ')
        } attributes.`,
        changedEntityIds: ['catalog', 'presentation'],
        warnings,
        undoable: true,
        data: { presentation },
      };
    }

    case 'set_section_visibility': {
      if (action.sectionIds.length === 0)
        return fail('Name at least one section.');
      const blocked = action.sectionIds.filter(
        (sectionId) =>
          !action.visible && PROTECTED_SECTION_IDS.includes(sectionId),
      );
      if (blocked.length > 0) {
        return fail(
          `These sections must stay visible: ${blocked.map(sectionLabel).join(', ')}.`,
        );
      }
      const hiddenSections = withHidden(
        state.layout,
        action.visible ? [] : action.sectionIds,
        action.visible ? action.sectionIds : [],
      );
      const labels = action.sectionIds.map(sectionLabel).join(', ');
      return {
        ok: true,
        state: { ...state, layout: { ...state.layout, hiddenSections } },
        focus: action.visible ? action.sectionIds[0] : 'catalog',
        title: action.visible ? `Restored ${labels}` : `Hid ${labels}`,
        summary: `${action.sectionIds.length} ${pluralize(action.sectionIds.length, 'section')} ${action.visible ? 'restored' : 'hidden'}.`,
        detail: action.visible
          ? 'The sections are back in their previous positions.'
          : 'Hidden sections stay recoverable from the Hidden control and from Undo.',
        changedEntityIds: action.sectionIds,
        warnings: [],
        undoable: true,
        data: { hiddenSections },
      };
    }

    case 'move_section': {
      const { sectionId, anchorSectionId, relation } = action;
      if (isPageSectionId(sectionId) && isPageSectionId(anchorSectionId)) {
        const sectionOrder = moveWithin(
          state.layout.sectionOrder as PageSectionId[],
          sectionId,
          relation,
          anchorSectionId,
        );
        if (!sectionOrder)
          return fail('That section cannot be moved relative to that anchor.');
        return {
          ok: true,
          state: { ...state, layout: { ...state.layout, sectionOrder } },
          focus: sectionId,
          title: `Moved ${sectionLabel(sectionId)} ${relation} ${sectionLabel(anchorSectionId)}`,
          summary: 'Page section order updated.',
          detail: `The page now renders ${sectionOrder.map(sectionLabel).join(' → ')}.`,
          changedEntityIds: [sectionId, anchorSectionId],
          warnings: [],
          undoable: true,
          data: { sectionOrder },
        };
      }
      if (isGroupSectionId(sectionId) && isGroupSectionId(anchorSectionId)) {
        const groupOrder = moveWithin(
          state.layout.groupOrder,
          sectionId,
          relation,
          anchorSectionId,
        );
        if (!groupOrder)
          return fail('That group cannot be moved relative to that anchor.');
        return {
          ok: true,
          state: { ...state, layout: { ...state.layout, groupOrder } },
          focus: sectionId,
          title: `Moved ${sectionLabel(sectionId)} ${relation} ${sectionLabel(anchorSectionId)}`,
          summary: 'Product group order updated.',
          detail: `Groups now render ${groupOrder.map(sectionLabel).join(' → ')}.`,
          changedEntityIds: [sectionId, anchorSectionId],
          warnings: [],
          undoable: true,
          data: { groupOrder },
        };
      }
      return fail(
        'A page section can only be moved relative to another page section.',
      );
    }

    case 'select_entity': {
      const entity = action.entity;
      if (entity?.kind === 'product' && !getProduct(entity.id)) {
        return fail(`Unknown product "${entity.id}".`);
      }
      if (entity?.kind === 'constraint') {
        const known = state.mission?.constraints.some(
          (item) => item.id === entity.id,
        );
        if (!known) return fail(`Unknown constraint "${entity.id}".`);
      }
      const label =
        entity === null
          ? 'nothing'
          : entity.kind === 'product'
            ? (getProduct(entity.id)?.name ?? entity.id)
            : sectionLabel(entity.id);
      return {
        ok: true,
        state: { ...state, selection: entity },
        focus: entity ? entity.id : null,
        title: entity === null ? 'Cleared the selection' : `Selected ${label}`,
        summary: `"this" now refers to ${label}.`,
        detail:
          'The selection is shared with every agent through get_page_context.',
        changedEntityIds: entity ? [entity.id] : [],
        warnings: [],
        undoable: false,
      };
    }

    case 'toggle_focus_product': {
      const product = getProduct(action.productId);
      if (!product) return fail(`Unknown product "${action.productId}".`);
      const staged = state.layout.focusedProductIds.includes(action.productId)
        ? state.layout.focusedProductIds.filter((id) => id !== action.productId)
        : [...state.layout.focusedProductIds, action.productId].slice(-4);
      return {
        ok: true,
        state: {
          ...state,
          layout: { ...state.layout, focusedProductIds: staged },
        },
        title: 'Updated the comparison shortlist',
        summary: `${staged.length} ${pluralize(staged.length, 'product')} staged for comparison.`,
        detail:
          'The shortlist is visible on the page and readable by the agent.',
        changedEntityIds: [action.productId],
        warnings: [],
        undoable: false,
        data: { focusedProductIds: staged },
      };
    }

    case 'create_comparison': {
      const ids = action.productIds;
      if (ids.length < 2 || ids.length > 4)
        return fail('Compare two to four products.');
      if (new Set(ids).size !== ids.length)
        return fail('Comparison product ids must be unique.');
      const products: Product[] = [];
      for (const id of ids) {
        const product = getProduct(id);
        if (!product) return fail(`Unknown product "${id}".`);
        if (product.inventory <= 0)
          return fail(`"${product.name}" is out of stock.`);
        products.push(product);
      }
      const reference =
        action.referenceProductId ?? state.layout.referenceProductId ?? ids[0];
      if (!ids.includes(reference))
        return fail(
          'The reference product must be one of the compared products.',
        );

      const attributes = action.prioritizeAttributes?.length
        ? [
            ...action.prioritizeAttributes,
            ...state.layout.comparisonAttributes.filter(
              (attribute) => !action.prioritizeAttributes!.includes(attribute),
            ),
          ]
        : state.layout.comparisonAttributes;

      return {
        ok: true,
        state: {
          ...state,
          layout: {
            ...state.layout,
            mode: 'compare',
            comparisonProductIds: ids,
            referenceProductId: reference,
            focusedProductIds: ids,
            comparisonAttributes: attributes as ComparisonAttribute[],
            hiddenSections: withHidden(state.layout, [], ['comparison']),
          },
          selection: { kind: 'panel', id: 'comparison' },
        },
        focus: 'comparison',
        title: `Compared ${ids.length} products`,
        summary: `Comparison View opened on ${products.map((product) => product.name).join(', ')}.`,
        detail: `Attributes ordered by ${attributes.join(', ')}, with ${getProduct(reference)?.name} pinned as the reference.`,
        changedEntityIds: ids,
        warnings: [],
        undoable: true,
        data: {
          comparisonProductIds: ids,
          referenceProductId: reference,
          attributes,
        },
      };
    }

    case 'exit_comparison': {
      if (state.layout.mode !== 'compare')
        return fail('Comparison View is not open.');
      return {
        ok: true,
        state: {
          ...state,
          layout: {
            ...state.layout,
            mode: state.mission ? 'mission' : 'browse',
            hiddenSections: withHidden(state.layout, ['comparison'], []),
          },
          selection: null,
        },
        focus: 'catalog',
        title: 'Closed the comparison',
        summary: `Returned to ${state.mission ? 'Mission View' : 'Browse View'}.`,
        detail: 'The previous layout was restored and the shortlist was kept.',
        changedEntityIds: ['comparison'],
        warnings: [],
        undoable: true,
      };
    }

    case 'set_reference_product': {
      const product = getProduct(action.productId);
      if (!product) return fail(`Unknown product "${action.productId}".`);
      const comparisonProductIds = state.layout.comparisonProductIds.includes(
        action.productId,
      )
        ? state.layout.comparisonProductIds
        : state.layout.comparisonProductIds.length > 0
          ? [action.productId, ...state.layout.comparisonProductIds].slice(0, 4)
          : [];
      return {
        ok: true,
        state: {
          ...state,
          layout: {
            ...state.layout,
            referenceProductId: action.productId,
            comparisonProductIds,
          },
          selection: { kind: 'product', id: action.productId },
        },
        focus: action.productId,
        title: `Pinned ${product.name} as the reference`,
        summary: 'Alternatives are now measured against this product.',
        detail:
          'The reference card is highlighted and every comparison column is diffed against it.',
        changedEntityIds: [action.productId],
        warnings: [],
        undoable: true,
        data: { referenceProductId: action.productId, comparisonProductIds },
      };
    }

    case 'add_to_cart': {
      if (state.checkout.stage === 'placed') {
        return fail(
          'The demo order is already placed. Reset the experience to shop again.',
        );
      }
      if (action.items.length === 0) return fail('Add at least one product.');
      const lines = [...state.cart.lines];
      const warnings: string[] = [];
      const changed: string[] = [];

      for (const item of action.items) {
        const product = getProduct(item.productId);
        if (!product) return fail(`Unknown product "${item.productId}".`);
        if (
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 8
        ) {
          return fail(
            `Quantity for "${product.name}" must be an integer from 1 to 8.`,
          );
        }
        const index = lines.findIndex(
          (line) => line.productId === item.productId,
        );
        const current = index >= 0 ? lines[index].quantity : 0;
        const requested = current + item.quantity;
        const quantity = Math.min(requested, product.inventory, 8);
        if (quantity < requested) {
          warnings.push(
            `Capped ${product.name} at ${quantity} (stock ${product.inventory}).`,
          );
        }
        const line = {
          productId: item.productId,
          quantity,
          addedBy: action.actor,
          reason: item.reason,
        };
        if (index >= 0) lines[index] = { ...lines[index], ...line };
        else lines.push(line);
        changed.push(item.productId);
      }

      const nextState: HerShoppingState = {
        ...state,
        cart: { lines },
        checkout: {
          stage: 'idle',
          token: null,
          warnings: [],
          requestedBy: null,
          order: null,
        },
      };
      const subtotal = cartSubtotalCents(nextState);
      if (state.mission?.budgetCents && subtotal > state.mission.budgetCents) {
        warnings.push(
          `Cart total ${dollars(subtotal)} exceeds the ${dollars(state.mission.budgetCents)} budget.`,
        );
      }

      const names = action.items
        .map((item) => getProduct(item.productId)?.name)
        .filter(Boolean)
        .join(', ');

      return {
        ok: true,
        state: nextState,
        title: `Added ${action.items.length} ${pluralize(action.items.length, 'item')} to the kit`,
        summary: `${names}. Cart total ${dollars(subtotal)}.`,
        detail: `The cart now holds ${cartItemCount(nextState)} ${pluralize(cartItemCount(nextState), 'item')} at ${dollars(subtotal)}.`,
        changedEntityIds: changed,
        warnings,
        undoable: true,
        data: { subtotalCents: subtotal, itemCount: cartItemCount(nextState) },
      };
    }

    case 'set_cart_quantity': {
      if (state.checkout.stage === 'placed') {
        return fail(
          'The demo order is already placed. Reset the experience to shop again.',
        );
      }
      const product = getProduct(action.productId);
      if (!product) return fail(`Unknown product "${action.productId}".`);
      if (
        !Number.isInteger(action.quantity) ||
        action.quantity < 0 ||
        action.quantity > 8
      ) {
        return fail('Quantity must be an integer from 0 to 8.');
      }
      if (action.quantity > product.inventory) {
        return fail(`Only ${product.inventory} ${product.name} are in stock.`);
      }
      const exists = state.cart.lines.some(
        (line) => line.productId === action.productId,
      );
      if (!exists && action.quantity === 0)
        return fail(`"${product.name}" is not in the cart.`);

      const lines =
        action.quantity === 0
          ? state.cart.lines.filter(
              (line) => line.productId !== action.productId,
            )
          : exists
            ? state.cart.lines.map((line) =>
                line.productId === action.productId
                  ? {
                      ...line,
                      quantity: action.quantity,
                      addedBy: action.actor,
                    }
                  : line,
              )
            : [
                ...state.cart.lines,
                {
                  productId: action.productId,
                  quantity: action.quantity,
                  addedBy: action.actor,
                },
              ];

      const nextState: HerShoppingState = {
        ...state,
        cart: { lines },
        checkout: {
          stage: 'idle',
          token: null,
          warnings: [],
          requestedBy: null,
          order: null,
        },
      };
      const subtotal = cartSubtotalCents(nextState);

      return {
        ok: true,
        state: nextState,
        title:
          action.quantity === 0
            ? `Removed ${product.name}`
            : `Set ${product.name} to ${action.quantity}`,
        summary: `Cart total ${dollars(subtotal)}.`,
        detail: `The cart now holds ${cartItemCount(nextState)} ${pluralize(cartItemCount(nextState), 'item')}.`,
        changedEntityIds: [action.productId],
        warnings: [],
        undoable: true,
        data: { subtotalCents: subtotal, itemCount: cartItemCount(nextState) },
      };
    }

    case 'preview_checkout': {
      if (state.cart.lines.length === 0)
        return fail('The cart is empty — nothing to review.');
      if (state.checkout.stage === 'placed')
        return fail('The demo order is already placed.');
      const warnings = checkoutWarnings(state);
      const token = makeToken(state.stateVersion);
      const subtotal = cartSubtotalCents(state);
      return {
        ok: true,
        state: {
          ...state,
          checkout: {
            stage: 'review',
            token,
            warnings,
            requestedBy: action.actor,
            order: null,
          },
        },
        title: 'Opened the checkout review',
        summary: `${cartItemCount(state)} ${pluralize(cartItemCount(state), 'item')}, ${dollars(subtotal)}. ${warnings.length} ${pluralize(warnings.length, 'warning')}.`,
        detail:
          'No order exists yet. A person must confirm before anything is placed.',
        changedEntityIds: ['checkout'],
        warnings,
        undoable: true,
        data: {
          token,
          itemCents: subtotal,
          itemCount: cartItemCount(state),
          requiresHumanConfirmation: true,
        },
      };
    }

    case 'request_order_confirmation': {
      if (state.cart.lines.length === 0)
        return fail('The cart is empty — nothing to confirm.');
      if (state.checkout.stage === 'placed')
        return fail('The demo order is already placed.');
      const warnings = checkoutWarnings(state);
      const token = state.checkout.token ?? makeToken(state.stateVersion);
      return {
        ok: true,
        state: {
          ...state,
          checkout: {
            stage: 'awaiting-confirmation',
            token,
            warnings,
            requestedBy: action.actor,
            order: null,
          },
        },
        title: 'Asked for confirmation of the demo order',
        summary:
          'A confirmation gate is now on screen. Only a person can clear it.',
        detail:
          'No order is created until the visible Confirm control is pressed by a human.',
        changedEntityIds: ['checkout'],
        warnings,
        undoable: true,
        data: { token, requiresHumanConfirmation: true },
      };
    }

    case 'confirm_demo_order': {
      if (action.actor !== 'human') {
        return fail(
          'Only a person using the visible control can confirm a demo order.',
        );
      }
      if (state.cart.lines.length === 0) return fail('The cart is empty.');
      if (state.checkout.stage === 'placed')
        return fail('The demo order is already placed.');
      if (!state.checkout.token || state.checkout.token !== action.token) {
        return fail('The confirmation token does not match the open review.');
      }

      const lines = state.cart.lines.map((line) => {
        const product = getProduct(line.productId)!;
        return {
          productId: line.productId,
          name: product.name,
          quantity: line.quantity,
          unitPriceCents: product.priceCents,
          lineTotalCents: product.priceCents * line.quantity,
        };
      });
      const subtotal = lines.reduce(
        (total, line) => total + line.lineTotalCents,
        0,
      );
      const slowest = state.cart.lines.reduce(
        (days, line) =>
          Math.max(days, getProduct(line.productId)?.deliveryDays ?? 0),
        0,
      );

      return {
        ok: true,
        state: {
          ...state,
          checkout: {
            stage: 'placed',
            token: state.checkout.token,
            warnings: state.checkout.warnings,
            requestedBy: state.checkout.requestedBy,
            order: {
              id: `HS-${String(state.stateVersion).padStart(4, '0')}`,
              placedAt: Date.now(),
              lines,
              itemCount: cartItemCount(state),
              subtotalCents: subtotal,
              slowestDeliveryDays: slowest,
            },
          },
        },
        title: 'Placed the demo order',
        summary: `Fictional order for ${cartItemCount(state)} ${pluralize(cartItemCount(state), 'item')} at ${dollars(subtotal)}.`,
        detail:
          'Simulated only. No payment, address, or personal data was collected.',
        changedEntityIds: ['checkout'],
        warnings: [],
        undoable: true,
        data: { subtotalCents: subtotal },
      };
    }

    case 'cancel_checkout': {
      if (state.checkout.stage === 'idle')
        return fail('Checkout review is not open.');
      if (state.checkout.stage === 'placed')
        return fail('A placed demo order cannot be cancelled.');
      return {
        ok: true,
        state: {
          ...state,
          checkout: {
            stage: 'idle',
            token: null,
            warnings: [],
            requestedBy: null,
            order: null,
          },
        },
        title: 'Closed the checkout review',
        summary: 'No order was created.',
        detail: 'The cart is unchanged and still editable.',
        changedEntityIds: ['checkout'],
        warnings: [],
        undoable: true,
      };
    }

    default: {
      const exhaustive: never = action;
      return fail(`Unsupported action: ${JSON.stringify(exhaustive)}`);
    }
  }
}
