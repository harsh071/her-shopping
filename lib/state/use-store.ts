'use client';

import { useSyncExternalStore } from 'react';

import { store } from '@/lib/state/store';
import type { HerShoppingState } from '@/lib/state/types';

/** Subscribe a component to the single shared store. */
export function useStoreState(): HerShoppingState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
