import {
  PRIORITY_GROUP_IDS,
  DEFAULT_SECTION_ORDER,
} from '@/lib/state/sections';
import type { HerShoppingState, LayoutState } from '@/lib/state/types';

export const INITIAL_LAYOUT: LayoutState = {
  mode: 'browse',
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  groupOrder: [...PRIORITY_GROUP_IDS],
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
