import { PRODUCT_CATEGORIES, PURPOSE_TAGS } from '@/lib/catalog/products';
import type { ProductGrouping } from '@/lib/state/types';

/** Regions of the page an agent or person may reorder or hide. */
export const PAGE_SECTION_IDS = [
  'hero',
  'featured',
  'editorial',
  'mission-summary',
  'catalog',
  'comparison',
] as const;

export type PageSectionId = (typeof PAGE_SECTION_IDS)[number];

export const PRIORITY_GROUP_IDS = [
  'group:essential',
  'group:useful',
  'group:optional',
] as const;

export const CATEGORY_GROUP_IDS = PRODUCT_CATEGORIES.map(
  (category) => `group:${category}` as const,
);

export const PURPOSE_GROUP_IDS = [
  'group:shelter-purpose',
  'group:warmth-purpose',
  'group:weather-purpose',
  'group:sleep-purpose',
  'group:cooking-purpose',
  'group:hydration-purpose',
  'group:light-purpose',
  'group:navigation-purpose',
  'group:carry-purpose',
  'group:power-purpose',
  'group:safety-purpose',
  'group:comfort-purpose',
] as const;

export const GROUP_SECTION_IDS = [
  ...PRIORITY_GROUP_IDS,
  ...CATEGORY_GROUP_IDS,
  ...PURPOSE_GROUP_IDS,
] as const;

export type GroupSectionId = (typeof GROUP_SECTION_IDS)[number];

export type SectionId = PageSectionId | GroupSectionId;

export const ALL_SECTION_IDS: readonly SectionId[] = [
  ...PAGE_SECTION_IDS,
  ...GROUP_SECTION_IDS,
];

/**
 * Sections that must always stay on the page. The catalog canvas and the
 * mission summary carry the budget meter and the products themselves, so an
 * agent is never allowed to hide the user out of their own store.
 */
export const PROTECTED_SECTION_IDS: readonly SectionId[] = [
  'catalog',
  'mission-summary',
];

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Seasonal hero',
  featured: 'Featured gear',
  editorial: 'Field notes',
  'mission-summary': 'Mission summary',
  catalog: 'Catalog canvas',
  comparison: 'Comparison',
  'group:essential': 'Essential',
  'group:useful': 'Useful',
  'group:optional': 'Optional',
};

export function isPageSectionId(value: unknown): value is PageSectionId {
  return (
    typeof value === 'string' &&
    (PAGE_SECTION_IDS as readonly string[]).includes(value)
  );
}

export function isGroupSectionId(value: unknown): value is GroupSectionId {
  return (
    typeof value === 'string' &&
    (GROUP_SECTION_IDS as readonly string[]).includes(value)
  );
}

export function isSectionId(value: unknown): value is SectionId {
  return isPageSectionId(value) || isGroupSectionId(value);
}

export function sectionLabel(sectionId: string): string {
  if (SECTION_LABELS[sectionId]) return SECTION_LABELS[sectionId];
  const bare = sectionId.replace(/^group:/, '').replace(/-purpose$/, '');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/**
 * Comparison sits directly under the mission summary: when it opens it is the
 * decision surface, and the rest of the catalog stays reachable below it.
 */
export const DEFAULT_SECTION_ORDER: PageSectionId[] = [
  'hero',
  'mission-summary',
  'comparison',
  'featured',
  'catalog',
  'editorial',
];

/** The canonical group order for a grouping mode. */
export function defaultGroupOrder(grouping: ProductGrouping): GroupSectionId[] {
  if (grouping === 'priority') return [...PRIORITY_GROUP_IDS];
  if (grouping === 'category') {
    return PRODUCT_CATEGORIES.map(
      (category) => `group:${category}` as GroupSectionId,
    );
  }
  return PURPOSE_TAGS.map((tag) => `group:${tag}-purpose` as GroupSectionId);
}
