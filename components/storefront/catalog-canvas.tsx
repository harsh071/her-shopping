'use client';

import { Layers } from 'lucide-react';

import { ProductCard } from '@/components/storefront/product-card';
import { SectionFrame } from '@/components/storefront/section-frame';
import { humanActions } from '@/lib/actions/ui-actions';
import { cardAttributesFor, columnCount } from '@/lib/state/presentation';
import type { GroupView } from '@/lib/state/selectors';
import type { HerShoppingState } from '@/lib/state/types';

export function CatalogCanvas({
  state,
  groups,
}: {
  state: HerShoppingState;
  groups: GroupView[];
}) {
  const missionMode = state.layout.mode !== 'browse' && Boolean(state.mission);
  const presentation = state.layout.presentation;
  const attributes = cardAttributesFor(state);
  const columns = columnCount(state);
  const selection = state.selection;
  const visibleIds = groups.map((group) => group.id);

  if (groups.length === 0) {
    return (
      <p className="rounded-[22px] border border-dashed border-ink/20 p-10 text-center text-sm text-ink/50">
        Every product group is hidden. Restore one from the Hidden control, or
        press Undo.
      </p>
    );
  }

  return (
    <div className="catalog-canvas">
      {groups.map((group, index) => (
        <SectionFrame
          key={group.id}
          sectionId={group.id}
          icon={Layers}
          eyebrow={missionMode ? 'Mission group' : 'Category'}
          title={group.label}
          description={group.description}
          selected={selection?.kind === 'section' && selection.id === group.id}
          onSelect={() =>
            humanActions.select({ kind: 'section', id: group.id })
          }
          onHide={() => humanActions.setSectionVisibility([group.id], false)}
          onMoveUp={
            index > 0
              ? () =>
                  humanActions.moveSection(
                    group.id,
                    'before',
                    visibleIds[index - 1],
                  )
              : undefined
          }
          onMoveDown={
            index < groups.length - 1
              ? () =>
                  humanActions.moveSection(
                    group.id,
                    'after',
                    visibleIds[index + 1],
                  )
              : undefined
          }
          actions={
            <span className="text-xs text-ink/40">
              {group.products.length}{' '}
              {group.products.length === 1 ? 'option' : 'options'}
            </span>
          }
        >
          <div
            className={`product-grid layout-${presentation.cardLayout} ${
              columns === null ? 'cols-auto' : ''
            } ${missionMode ? 'is-mission' : ''}`}
          >
            {group.products.map((view) => (
              <ProductCard
                key={view.product.id}
                view={view}
                presentation={presentation}
                attributes={attributes}
                missionMode={missionMode}
                selected={
                  selection?.kind === 'product' &&
                  selection.id === view.product.id
                }
                shortlisted={state.layout.focusedProductIds.includes(
                  view.product.id,
                )}
                isReference={
                  state.layout.referenceProductId === view.product.id
                }
                onSelect={() =>
                  humanActions.select({ kind: 'product', id: view.product.id })
                }
                onToggleShortlist={() =>
                  humanActions.toggleShortlist(view.product.id)
                }
                onAdd={() => humanActions.addToCart(view.product.id)}
                onPin={() => humanActions.setReference(view.product.id)}
              />
            ))}
          </div>
        </SectionFrame>
      ))}
    </div>
  );
}
