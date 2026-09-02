'use client';

import { Check, Pin, Plus, ShoppingBag, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { deliveryLabel, dollars, grams } from '@/lib/format';
import type { ProductView } from '@/lib/state/selectors';

type ProductCardProps = {
  view: ProductView;
  missionMode: boolean;
  selected: boolean;
  shortlisted: boolean;
  isReference: boolean;
  onSelect: () => void;
  onToggleShortlist: () => void;
  onAdd: () => void;
  onPin: () => void;
};

export function ProductCard({
  view,
  missionMode,
  selected,
  shortlisted,
  isReference,
  onSelect,
  onToggleShortlist,
  onAdd,
  onPin,
}: ProductCardProps) {
  const { product, score, reasons, violations, inCartQuantity } = view;
  const blocked = violations.length > 0;

  return (
    <article
      className={`product-card ${selected ? 'is-selected' : ''} ${shortlisted ? 'is-shortlisted' : ''} ${
        blocked ? 'is-blocked' : ''
      }`}
      data-product-id={product.id}
    >
      <div className="product-image">
        <button
          type="button"
          className="product-image-hit"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Select ${product.name}`}
        >
          <span
            className="product-photo"
            style={{ backgroundPosition: product.imagePosition }}
            aria-hidden="true"
          />
        </button>
        <span className="product-chip">{product.category}</span>
        {isReference ? <span className="reference-pill">Reference</span> : null}
        <button
          type="button"
          className={`select-indicator ${shortlisted ? 'is-selected' : ''}`}
          onClick={onToggleShortlist}
          aria-pressed={shortlisted}
          aria-label={`${shortlisted ? 'Remove' : 'Add'} ${product.name} ${shortlisted ? 'from' : 'to'} the comparison shortlist`}
        >
          {shortlisted ? <Check /> : <Plus />}
        </button>
        {product.badges[0] && !blocked ? (
          <span className="product-badge">{product.badges[0]}</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-[19px] leading-tight">
              {product.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">
              {product.description}
            </p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">
            {dollars(product.priceCents)}
          </span>
        </div>

        {missionMode ? (
          <div className="mission-attributes">
            <span>
              <strong>{product.warmthRating}/10</strong> warmth
            </span>
            <span>
              <strong>{deliveryLabel(product.deliveryDays)}</strong> delivery
            </span>
            <span>
              <strong>{grams(product.weightGrams)}</strong> weight
            </span>
          </div>
        ) : (
          <div className="mission-attributes is-quiet">
            <span>
              <strong>{grams(product.weightGrams)}</strong> weight
            </span>
            <span>
              <strong>{deliveryLabel(product.deliveryDays)}</strong> delivery
            </span>
            <span>
              <strong>{product.inventory}</strong> in stock
            </span>
          </div>
        )}

        {missionMode && blocked ? (
          <p className="product-violation">
            <TriangleAlert className="size-3.5" /> {violations[0]}
          </p>
        ) : null}
        {missionMode && !blocked && reasons.length > 0 ? (
          <p className="product-reason">
            <span className="fit-score">{score}</span>{' '}
            {reasons.slice(0, 2).join(' · ')}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            className={`h-9 flex-1 rounded-full ${
              inCartQuantity > 0
                ? 'bg-moss text-white hover:bg-moss/80'
                : 'bg-ink text-cream hover:bg-forest'
            }`}
            onClick={onAdd}
          >
            {inCartQuantity > 0 ? <Check /> : <ShoppingBag />}
            {inCartQuantity > 0
              ? `In your kit (${inCartQuantity})`
              : 'Add to kit'}
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            className={`rounded-full border-ink/15 bg-transparent ${isReference ? 'bg-forest text-cream' : ''}`}
            onClick={onPin}
            aria-label={`Pin ${product.name} as the reference product`}
          >
            <Pin />
          </Button>
        </div>
      </div>
    </article>
  );
}
