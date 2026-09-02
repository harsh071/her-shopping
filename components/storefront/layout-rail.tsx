'use client';

import { Eye, RotateCcw, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DisplayControl } from '@/components/storefront/display-control';
import { humanActions } from '@/lib/actions/ui-actions';
import { sectionLabel, type SectionId } from '@/lib/state/sections';
import type {
  HerShoppingState,
  ProductGrouping,
  ProductSort,
} from '@/lib/state/types';

const GROUPINGS: ProductGrouping[] = ['category', 'priority', 'purpose'];
const SORTS: ProductSort[] = [
  'featured',
  'mission-fit',
  'price-low',
  'delivery',
];
const SORT_LABELS: Record<ProductSort, string> = {
  featured: 'Featured',
  'mission-fit': 'Mission fit',
  'price-low': 'Price',
  delivery: 'Delivery',
};

/**
 * The controls that mirror the agent's layout tools one-for-one, so anything an
 * agent can do to the page a person can also do by hand.
 */
export function LayoutRail({ state }: { state: HerShoppingState }) {
  const hidden = state.layout.hiddenSections.filter(
    (sectionId) =>
      sectionId !== 'comparison' && sectionId !== 'mission-summary',
  );
  const missionActive = Boolean(state.mission);

  return (
    <div className="layout-rail">
      <fieldset className="rail-group" aria-label="Group products by">
        <span className="rail-label">Group</span>
        {GROUPINGS.map((grouping) => (
          <button
            key={grouping}
            type="button"
            className={`rail-chip ${state.layout.productGrouping === grouping ? 'is-active' : ''}`}
            onClick={() => humanActions.organize({ groupBy: grouping })}
            aria-pressed={state.layout.productGrouping === grouping}
          >
            {grouping}
          </button>
        ))}
      </fieldset>

      <fieldset className="rail-group" aria-label="Sort products by">
        <span className="rail-label">Sort</span>
        {SORTS.filter((sort) => sort !== 'mission-fit' || missionActive).map(
          (sort) => (
            <button
              key={sort}
              type="button"
              className={`rail-chip ${state.layout.productSort === sort ? 'is-active' : ''}`}
              onClick={() => humanActions.organize({ sortBy: sort })}
              aria-pressed={state.layout.productSort === sort}
            >
              {SORT_LABELS[sort]}
            </button>
          ),
        )}
      </fieldset>

      <div className="ml-auto flex items-center gap-2">
        <DisplayControl state={state} />
        {hidden.length > 0 ? (
          <details className="hidden-sections">
            <summary>
              <Eye className="size-3.5" /> Hidden ({hidden.length})
            </summary>
            <div>
              {hidden.map((sectionId) => (
                <button
                  key={sectionId}
                  type="button"
                  onClick={() =>
                    humanActions.setSectionVisibility(
                      [sectionId as SectionId],
                      true,
                    )
                  }
                >
                  Restore {sectionLabel(sectionId)}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  humanActions.setSectionVisibility(hidden as SectionId[], true)
                }
              >
                Restore all
              </button>
            </div>
          </details>
        ) : null}

        <Button
          variant="outline"
          className="h-9 rounded-full border-ink/15 bg-transparent"
          disabled={state.history.length === 0}
          onClick={() => humanActions.undo()}
        >
          <Undo2 /> Undo
        </Button>
        <Button
          variant="ghost"
          className="h-9 rounded-full"
          onClick={() => humanActions.reset()}
        >
          <RotateCcw /> Reset
        </Button>
      </div>
    </div>
  );
}
