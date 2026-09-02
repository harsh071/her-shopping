'use client';

import { Check, Pin, Plus, ShoppingBag, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { deliveryLabel, dollars, grams } from '@/lib/format';
import { CARD_ATTRIBUTE_LABELS } from '@/lib/state/presentation';
import type { ProductView } from '@/lib/state/selectors';
import type { CardAttribute, PresentationState } from '@/lib/state/types';

type ProductCardProps = {
  view: ProductView;
  presentation: PresentationState;
  attributes: CardAttribute[];
  missionMode: boolean;
  selected: boolean;
  shortlisted: boolean;
  isReference: boolean;
  onSelect: () => void;
  onToggleShortlist: () => void;
  onAdd: () => void;
  onPin: () => void;
};

function attributeValue(view: ProductView, attribute: CardAttribute): string {
  const { product } = view;
  switch (attribute) {
    case 'warmth':
      return `${product.warmthRating}/10`;
    case 'delivery':
      return deliveryLabel(product.deliveryDays);
    case 'weight':
      return grams(product.weightGrams);
    case 'stock':
      return String(product.inventory);
    case 'mission-fit':
      return `${view.score}`;
  }
}

export function ProductCard({
  view,
  presentation,
  attributes,
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
  const { cardLayout, priceEmphasis, imageScale, showDescriptions } =
    presentation;
  const shown = attributes.filter(
    (attribute) => attribute !== 'mission-fit' || missionMode,
  );

  const price = (
    <span className={`product-price is-${priceEmphasis}`}>
      {dollars(product.priceCents)}
    </span>
  );

  return (
    <article
      className={`product-card layout-${cardLayout} image-${imageScale} ${
        selected ? 'is-selected' : ''
      } ${shortlisted ? 'is-shortlisted' : ''} ${blocked ? 'is-blocked' : ''}`}
      data-product-id={product.id}
    >
      {imageScale === 'hidden' ? null : (
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
          {isReference ? (
            <span className="reference-pill">Reference</span>
          ) : null}
          <button
            type="button"
            className={`select-indicator ${shortlisted ? 'is-selected' : ''}`}
            onClick={onToggleShortlist}
            aria-pressed={shortlisted}
            aria-label={`${shortlisted ? 'Remove' : 'Add'} ${product.name} ${
              shortlisted ? 'from' : 'to'
            } the comparison shortlist`}
          >
            {shortlisted ? <Check /> : <Plus />}
          </button>
          {product.badges[0] && !blocked && cardLayout !== 'gallery' ? (
            <span className="product-badge">{product.badges[0]}</span>
          ) : null}
        </div>
      )}

      <div className="product-body">
        <div className="product-headline">
          <div className="min-w-0">
            <button
              type="button"
              className="block text-left"
              onClick={onSelect}
              aria-pressed={selected}
            >
              {/* In list rows the image is too narrow for the category chip,
                  so the category rides above the name instead. */}
              <span className="product-eyebrow">{product.category}</span>
              <h3 className="font-serif text-[19px] leading-tight">
                {product.name}
              </h3>
            </button>
            {showDescriptions ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">
                {product.description}
              </p>
            ) : null}
          </div>
          {price}
        </div>

        {shown.length > 0 ? (
          <div className="mission-attributes">
            {shown.map((attribute) => (
              <span key={attribute}>
                <strong>{attributeValue(view, attribute)}</strong>{' '}
                {CARD_ATTRIBUTE_LABELS[attribute]}
              </span>
            ))}
          </div>
        ) : null}

        {missionMode && blocked ? (
          <p className="product-violation">
            <TriangleAlert className="size-3.5" /> {violations[0]}
          </p>
        ) : null}
        {missionMode &&
        !blocked &&
        reasons.length > 0 &&
        cardLayout !== 'gallery' ? (
          <p className="product-reason">
            <span className="fit-score">{score}</span>{' '}
            {reasons.slice(0, 2).join(' · ')}
          </p>
        ) : null}

        <div className="product-actions">
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
            className={`rounded-full border-ink/15 bg-transparent ${
              isReference ? 'bg-forest text-cream' : ''
            }`}
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
