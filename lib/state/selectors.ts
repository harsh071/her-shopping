import { PRODUCTS, getProduct, type Product } from '@/lib/catalog/products';
import { scoreProduct, uncoveredNeeds } from '@/lib/state/mission';
import {
  cartItemCount,
  cartSubtotalCents,
  checkoutWarnings,
} from '@/lib/state/reducer';
import {
  sectionLabel,
  type GroupSectionId,
  type PageSectionId,
} from '@/lib/state/sections';
import type { HerShoppingState, MissionFit } from '@/lib/state/types';

export type ProductView = MissionFit & { inCartQuantity: number };

export type GroupView = {
  id: GroupSectionId;
  label: string;
  description: string;
  products: ProductView[];
};

const PRIORITY_DESCRIPTIONS: Record<string, string> = {
  'group:essential': 'Needed to make the mission work',
  'group:useful': 'Improves the plan if the budget allows',
  'group:optional': 'Nice to have, or blocked by a constraint',
};

function groupIdFor(state: HerShoppingState, fit: MissionFit): GroupSectionId {
  const { productGrouping } = state.layout;
  if (productGrouping === 'category')
    return `group:${fit.product.category}` as GroupSectionId;
  if (productGrouping === 'purpose') {
    return `group:${fit.product.purposeTags[0]}-purpose` as GroupSectionId;
  }
  return `group:${state.mission ? fit.priority : fit.product.basePriority}` as GroupSectionId;
}

function compareProducts(state: HerShoppingState) {
  return (a: MissionFit, b: MissionFit): number => {
    switch (state.layout.productSort) {
      case 'price-low':
        return a.product.priceCents - b.product.priceCents;
      case 'delivery':
        return (
          a.product.deliveryDays - b.product.deliveryDays ||
          a.product.priceCents - b.product.priceCents
        );
      case 'mission-fit':
        return b.score - a.score || a.product.priceCents - b.product.priceCents;
      case 'featured':
      default:
        return (
          Number(Boolean(b.product.featured)) -
            Number(Boolean(a.product.featured)) ||
          PRODUCTS.indexOf(a.product) - PRODUCTS.indexOf(b.product)
        );
    }
  };
}

export function cartQuantity(
  state: HerShoppingState,
  productId: string,
): number {
  return (
    state.cart.lines.find((line) => line.productId === productId)?.quantity ?? 0
  );
}

export function scoredCatalog(state: HerShoppingState): MissionFit[] {
  if (!state.mission) {
    return PRODUCTS.map((product) => ({
      product,
      score: 0,
      priority: product.basePriority,
      reasons: [],
      violations: [],
    }));
  }
  const mission = state.mission;
  return PRODUCTS.map((product) => scoreProduct(product, mission));
}

/** The product groups the page actually renders, in their current order. */
export function visibleGroups(state: HerShoppingState): GroupView[] {
  const hidden = new Set(state.layout.hiddenSections);
  const buckets = new Map<GroupSectionId, ProductView[]>();

  for (const fit of scoredCatalog(state)) {
    const groupId = groupIdFor(state, fit);
    if (!buckets.has(groupId)) buckets.set(groupId, []);
    buckets
      .get(groupId)!
      .push({ ...fit, inCartQuantity: cartQuantity(state, fit.product.id) });
  }

  const sorter = compareProducts(state);
  return state.layout.groupOrder
    .filter(
      (groupId) =>
        !hidden.has(groupId) && (buckets.get(groupId)?.length ?? 0) > 0,
    )
    .map((groupId) => ({
      id: groupId,
      label: sectionLabel(groupId),
      // Only the mission groups need explaining; the count already shows in the
      // section header, so a category name repeats nothing.
      description: PRIORITY_DESCRIPTIONS[groupId] ?? '',
      products: buckets.get(groupId)!.slice().sort(sorter),
    }));
}

export function visibleProductIds(state: HerShoppingState): string[] {
  if (state.layout.mode === 'compare') return state.layout.comparisonProductIds;
  return visibleGroups(state).flatMap((group) =>
    group.products.map((item) => item.product.id),
  );
}

export function visibleSections(state: HerShoppingState): PageSectionId[] {
  const hidden = new Set<string>(state.layout.hiddenSections);
  return state.layout.sectionOrder.filter((sectionId) => {
    if (hidden.has(sectionId)) return false;
    if (sectionId === 'comparison') return state.layout.mode === 'compare';
    if (sectionId === 'mission-summary') return Boolean(state.mission);
    if (sectionId === 'hero') return state.layout.mode === 'browse';
    return true;
  });
}

export type CartLineView = {
  product: Product;
  quantity: number;
  lineTotalCents: number;
};

export function cartLines(state: HerShoppingState): CartLineView[] {
  return state.cart.lines.flatMap((line) => {
    const product = getProduct(line.productId);
    if (!product) return [];
    return [
      {
        product,
        quantity: line.quantity,
        lineTotalCents: product.priceCents * line.quantity,
      },
    ];
  });
}

export function cartSummary(state: HerShoppingState) {
  const subtotalCents = cartSubtotalCents(state);
  const budgetCents = state.mission?.budgetCents ?? null;
  return {
    itemCount: cartItemCount(state),
    lineCount: state.cart.lines.length,
    subtotalCents,
    budgetCents,
    budgetRemainingCents:
      budgetCents === null ? null : budgetCents - subtotalCents,
    overBudget: budgetCents !== null && subtotalCents > budgetCents,
  };
}

export function selectionLabel(state: HerShoppingState): string {
  const selection = state.selection;
  if (!selection) return 'Nothing selected';
  if (selection.kind === 'product')
    return getProduct(selection.id)?.name ?? selection.id;
  if (selection.kind === 'constraint') {
    return (
      state.mission?.constraints.find((item) => item.id === selection.id)
        ?.label ?? selection.id
    );
  }
  return sectionLabel(selection.id);
}

/**
 * The payload `get_page_context` returns. Deliberately small: enough for an
 * agent to resolve "this", verify a layout change, and avoid guessing.
 */
export function pageContext(state: HerShoppingState) {
  const summary = cartSummary(state);
  const groups = visibleGroups(state);
  return {
    stateVersion: state.stateVersion,
    mode: state.layout.mode,
    mission: state.mission
      ? {
          title: state.mission.title,
          budgetCents: state.mission.budgetCents,
          partySize: state.mission.partySize,
          deadline: state.mission.deadline,
          constraints: state.mission.constraints,
          needs: state.mission.needs,
          priorities: state.mission.priorities,
        }
      : null,
    selectedEntity: state.selection,
    selectedEntityLabel: selectionLabel(state),
    shortlistedProductIds: state.layout.focusedProductIds,
    layout: {
      grouping: state.layout.productGrouping,
      sort: state.layout.productSort,
      sectionOrder: state.layout.sectionOrder,
      groupOrder: state.layout.groupOrder,
    },
    visibleSections: visibleSections(state),
    hiddenSections: state.layout.hiddenSections,
    visibleGroups: groups.map((group) => ({
      id: group.id,
      label: group.label,
      productIds: group.products.map((item) => item.product.id),
    })),
    comparison:
      state.layout.mode === 'compare'
        ? {
            productIds: state.layout.comparisonProductIds,
            referenceProductId: state.layout.referenceProductId,
            attributes: state.layout.comparisonAttributes,
          }
        : null,
    cart: summary,
    checkout: {
      stage: state.checkout.stage,
      requiresHumanConfirmation: state.checkout.stage !== 'placed',
      orderId: state.checkout.order?.id ?? null,
    },
    uncoveredNeeds: state.mission
      ? uncoveredNeeds(
          state.mission,
          state.cart.lines.map((line) => line.productId),
        )
      : [],
    warnings: state.cart.lines.length > 0 ? checkoutWarnings(state) : [],
  };
}

export type ProductSearchInput = {
  query?: string;
  purpose?: string;
  maxPriceCents?: number;
  maxDeliveryDays?: number;
  minWarmth?: number;
  limit?: number;
};

/** Bounded catalog search so an agent never has to guess a product id. */
export function searchProducts(
  state: HerShoppingState,
  input: ProductSearchInput,
) {
  const query = input.query?.trim().toLowerCase();
  const scored = scoredCatalog(state);

  const matches = scored.filter(({ product }) => {
    if (
      query &&
      !`${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }
    if (input.purpose && !product.purposeTags.includes(input.purpose as never))
      return false;
    if (
      input.maxPriceCents !== undefined &&
      product.priceCents > input.maxPriceCents
    )
      return false;
    if (
      input.maxDeliveryDays !== undefined &&
      product.deliveryDays > input.maxDeliveryDays
    )
      return false;
    if (input.minWarmth !== undefined && product.warmthRating < input.minWarmth)
      return false;
    return true;
  });

  matches.sort(compareProducts(state));

  return matches.slice(0, Math.min(input.limit ?? 8, 12)).map((fit) => ({
    id: fit.product.id,
    name: fit.product.name,
    category: fit.product.category,
    priceCents: fit.product.priceCents,
    deliveryDays: fit.product.deliveryDays,
    warmthRating: fit.product.warmthRating,
    weightGrams: fit.product.weightGrams,
    inventory: fit.product.inventory,
    missionScore: fit.score,
    priority: fit.priority,
    violations: fit.violations,
  }));
}
