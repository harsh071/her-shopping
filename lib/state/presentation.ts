import type {
  CardAttribute,
  CardLayout,
  ColumnSetting,
  HerShoppingState,
  ImageScale,
  PresentationPreset,
  PriceEmphasis,
} from '@/lib/state/types';

export const CARD_LAYOUTS: CardLayout[] = ['grid', 'list', 'gallery'];
export const COLUMN_SETTINGS: ColumnSetting[] = ['auto', '2', '3', '4', '5'];
export const PRICE_EMPHASES: PriceEmphasis[] = [
  'subtle',
  'standard',
  'prominent',
];
export const IMAGE_SCALES: ImageScale[] = [
  'hidden',
  'small',
  'standard',
  'large',
];
export const CARD_ATTRIBUTES: CardAttribute[] = [
  'warmth',
  'delivery',
  'weight',
  'stock',
  'mission-fit',
];
export const PRESENTATION_PRESET_NAMES: PresentationPreset[] = [
  'default',
  'dense-decision',
  'visual-browse',
  'price-first',
];

export const CARD_ATTRIBUTE_LABELS: Record<CardAttribute, string> = {
  warmth: 'warmth',
  delivery: 'delivery',
  weight: 'weight',
  stock: 'in stock',
  'mission-fit': 'mission fit',
};

/**
 * The attribute row a card shows.
 *
 * With no explicit choice the store picks for itself: under a mission it leads
 * with the things the mission is judged on, and while browsing it shows the
 * ordinary product facts. An explicit list from a person or an agent overrides
 * that; an empty list means show none.
 */
export function cardAttributesFor(state: HerShoppingState): CardAttribute[] {
  const explicit = state.layout.presentation.cardAttributes;
  if (explicit) return explicit;
  return state.mission
    ? ['warmth', 'delivery', 'weight']
    : ['weight', 'delivery', 'stock'];
}

export function columnCount(state: HerShoppingState): number | null {
  const { columns, cardLayout } = state.layout.presentation;
  if (cardLayout === 'list') return 1;
  if (columns === 'auto') return null;
  return Number(columns);
}
