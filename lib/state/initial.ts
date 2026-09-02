import { DEFAULT_SECTION_ORDER, defaultGroupOrder } from '@/lib/state/sections';
import type {
  HerShoppingState,
  LayoutState,
  PresentationState,
} from '@/lib/state/types';

export const INITIAL_PRESENTATION: PresentationState = {
  cardLayout: 'grid',
  columns: 'auto',
  priceEmphasis: 'standard',
  imageScale: 'standard',
  cardAttributes: null,
  showDescriptions: true,
};

export const INITIAL_LAYOUT: LayoutState = {
  presentation: INITIAL_PRESENTATION,
  mode: 'browse',
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  // Must match `productGrouping` below, or the canvas renders nothing.
  groupOrder: defaultGroupOrder('category'),
  hiddenSections: ['mission-summary', 'comparison'],
  productGrouping: 'category',
  productSort: 'featured',
  focusedProductIds: [],
  comparisonProductIds: [],
  referenceProductId: null,
  comparisonAttributes: ['price', 'warmth', 'delivery', 'weight'],
};

export function createInitialState(): HerShoppingState {
  return {
    mission: null,
    layout: {
      ...INITIAL_LAYOUT,
      presentation: { ...INITIAL_PRESENTATION },
      groupOrder: [...INITIAL_LAYOUT.groupOrder],
      hiddenSections: [...INITIAL_LAYOUT.hiddenSections],
    },
    selection: null,
    cart: { lines: [] },
    checkout: {
      stage: 'idle',
      token: null,
      warnings: [],
      requestedBy: null,
      order: null,
    },
    focus: null,
    activity: [
      {
        id: 'seed',
        at: 0,
        actor: 'system',
        action: 'store_ready',
        title: 'Store ready',
        detail:
          'Browse normally, or describe a mission to reorganise the page around it.',
        ok: true,
        undoToken: null,
      },
    ],
    history: [],
    stateVersion: 1,
    capabilities: {
      webmcpAvailable: false,
      registeredTools: [],
      registrationError: null,
      voiceStatus: 'idle',
      voiceError: null,
      lastValidationError: null,
    },
    lastAction: null,
  };
}
