import { getProduct } from '@/lib/catalog/products';
import {
  PAGE_SECTION_IDS,
  PROTECTED_SECTION_IDS,
  defaultGroupOrder,
  isGroupSectionId,
  isSectionId,
} from '@/lib/state/sections';
import {
  CARD_ATTRIBUTES,
  CARD_LAYOUTS,
  COLUMN_SETTINGS,
} from '@/lib/state/presentation';
import type { HerShoppingState } from '@/lib/state/types';

export class InvariantError extends Error {}

/**
 * Rules that must hold after every mutation, whether it came from a click, a
 * voice command, or an external WebMCP agent. A violation aborts the whole
 * action, so state never lands in a shape the interface cannot render.
 */
export function checkInvariants(state: HerShoppingState): string[] {
  const problems: string[] = [];
  const { layout, cart, checkout } = state;

  const order = layout.sectionOrder;
  if (new Set(order).size !== order.length) {
    problems.push(
      'A page section appears more than once in the section order.',
    );
  }
  for (const sectionId of PAGE_SECTION_IDS) {
    if (!order.includes(sectionId))
      problems.push(`Section order is missing "${sectionId}".`);
  }
  if (
    order.some(
      (sectionId) =>
        !(PAGE_SECTION_IDS as readonly string[]).includes(sectionId),
    )
  ) {
    problems.push('Section order contains an unknown page section.');
  }

  if (new Set(layout.groupOrder).size !== layout.groupOrder.length) {
    problems.push('A product group appears more than once in the group order.');
  }
  if (layout.groupOrder.some((groupId) => !isGroupSectionId(groupId))) {
    problems.push('Group order contains an unknown group.');
  }

  // The bug this catches renders an empty catalog: a group order left over
  // from a different grouping mode matches none of the buckets.
  const expectedGroups = defaultGroupOrder(layout.productGrouping);
  if (layout.groupOrder.length !== expectedGroups.length) {
    problems.push(
      `Group order does not match "${layout.productGrouping}" grouping.`,
    );
  } else if (
    layout.groupOrder.some((groupId) => !expectedGroups.includes(groupId))
  ) {
    problems.push(
      `Group order contains a group that does not belong to "${layout.productGrouping}" grouping.`,
    );
  }

  if (layout.hiddenSections.some((sectionId) => !isSectionId(sectionId))) {
    problems.push('Hidden sections contain an unknown section id.');
  }
  for (const protectedId of PROTECTED_SECTION_IDS) {
    if (protectedId === 'mission-summary' && !state.mission) continue;
    if (layout.hiddenSections.includes(protectedId)) {
      problems.push(`Section "${protectedId}" must stay visible.`);
    }
  }

  const { presentation } = layout;
  if (presentation.cardAttributes) {
    if (presentation.cardAttributes.length > 4) {
      problems.push('A card can show at most four attributes.');
    }
    if (
      new Set(presentation.cardAttributes).size !==
      presentation.cardAttributes.length
    ) {
      problems.push('Card attributes must be unique.');
    }
    if (
      presentation.cardAttributes.some(
        (attribute) => !CARD_ATTRIBUTES.includes(attribute),
      )
    ) {
      problems.push('Card attributes contain an unknown value.');
    }
  }
  if (!CARD_LAYOUTS.includes(presentation.cardLayout)) {
    problems.push('Unknown card layout.');
  }
  if (!COLUMN_SETTINGS.includes(presentation.columns)) {
    problems.push('Unknown column setting.');
  }

  if (layout.focusedProductIds.length > 4) {
    problems.push('At most four products can be staged for comparison.');
  }
  if (
    new Set(layout.focusedProductIds).size !== layout.focusedProductIds.length
  ) {
    problems.push('Staged comparison products must be unique.');
  }
  if (layout.focusedProductIds.some((id) => !getProduct(id))) {
    problems.push('A staged comparison product is not in the catalog.');
  }

  if (layout.mode === 'compare') {
    const count = layout.comparisonProductIds.length;
    if (count < 2 || count > 4)
      problems.push('Comparison needs two to four products.');
    if (layout.comparisonProductIds.some((id) => !getProduct(id))) {
      problems.push(
        'Comparison references a product that is not in the catalog.',
      );
    }
    if (
      layout.comparisonProductIds.some(
        (id) => (getProduct(id)?.inventory ?? 0) <= 0,
      )
    ) {
      problems.push('Comparison references an out-of-stock product.');
    }
  }
  if (
    layout.referenceProductId &&
    layout.comparisonProductIds.length > 0 &&
    !layout.comparisonProductIds.includes(layout.referenceProductId)
  ) {
    problems.push('The reference product must be part of the comparison.');
  }

  const seen = new Set<string>();
  for (const line of cart.lines) {
    const product = getProduct(line.productId);
    if (!product) {
      problems.push(`Cart references unknown product "${line.productId}".`);
      continue;
    }
    if (seen.has(line.productId))
      problems.push(`Cart has duplicate lines for "${line.productId}".`);
    seen.add(line.productId);
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 8
    ) {
      problems.push(
        `Cart quantity for "${line.productId}" must be an integer from 1 to 8.`,
      );
    }
    if (line.quantity > product.inventory) {
      problems.push(
        `Only ${product.inventory} of "${product.name}" are in stock.`,
      );
    }
  }

  if (checkout.stage === 'placed' && !checkout.order) {
    problems.push('A placed order must carry a receipt.');
  }
  if (checkout.stage !== 'placed' && checkout.order) {
    problems.push('A receipt exists without a placed order.');
  }

  return problems;
}

export function assertInvariants(state: HerShoppingState): void {
  const problems = checkInvariants(state);
  if (problems.length > 0) throw new InvariantError(problems.join(' '));
}
