'use client';

import { ArrowLeft, Check, Pin, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import { getProduct, type Product } from '@/lib/catalog/products';
import { deliveryLabel, dollars, grams } from '@/lib/format';
import { cartQuantity } from '@/lib/state/selectors';
import type { ComparisonAttribute, HerShoppingState } from '@/lib/state/types';

const ATTRIBUTE_LABELS: Record<ComparisonAttribute, string> = {
  price: 'Price',
  warmth: 'Warmth',
  delivery: 'Delivery',
  weight: 'Pack weight',
};

function attributeValue(
  product: Product,
  attribute: ComparisonAttribute,
): string {
  switch (attribute) {
    case 'price':
      return dollars(product.priceCents);
    case 'warmth':
      return `${product.warmthRating}/10`;
    case 'delivery':
      return deliveryLabel(product.deliveryDays);
    case 'weight':
      return grams(product.weightGrams);
  }
}

/** How this column differs from the pinned reference, in the person's favour or not. */
function attributeDelta(
  product: Product,
  reference: Product,
  attribute: ComparisonAttribute,
): { text: string; good: boolean } | null {
  if (product.id === reference.id) return null;
  switch (attribute) {
    case 'price': {
      const diff = product.priceCents - reference.priceCents;
      if (diff === 0) return null;
      return diff < 0
        ? { text: `Saves ${dollars(-diff)}`, good: true }
        : { text: `${dollars(diff)} more`, good: false };
    }
    case 'warmth': {
      const diff = product.warmthRating - reference.warmthRating;
      if (diff === 0) return null;
      return { text: `${diff > 0 ? '+' : ''}${diff} warmth`, good: diff > 0 };
    }
    case 'delivery': {
      const diff = product.deliveryDays - reference.deliveryDays;
      if (diff === 0) return null;
      return diff < 0
        ? {
            text: `${-diff} ${-diff === 1 ? 'day' : 'days'} sooner`,
            good: true,
          }
        : { text: `${diff} ${diff === 1 ? 'day' : 'days'} later`, good: false };
    }
    case 'weight': {
      const diff = product.weightGrams - reference.weightGrams;
      if (diff === 0) return null;
      return diff < 0
        ? { text: `${grams(-diff)} lighter`, good: true }
        : { text: `${grams(diff)} heavier`, good: false };
    }
  }
}

export function ComparisonView({ state }: { state: HerShoppingState }) {
  const products = state.layout.comparisonProductIds
    .map((id) => getProduct(id))
    .filter((product): product is Product => Boolean(product));
  const reference =
    products.find(
      (product) => product.id === state.layout.referenceProductId,
    ) ?? products[0];
  const attributes = state.layout.comparisonAttributes;

  if (products.length < 2 || !reference) return null;

  return (
    <div className="comparison-view">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={() => humanActions.exitComparison()}
        >
          <ArrowLeft /> Return to {state.mission ? 'mission' : 'browse'}
        </Button>
        <p className="text-xs text-ink/50">
          Attributes ordered by{' '}
          {attributes
            .map((attribute) => ATTRIBUTE_LABELS[attribute])
            .join(' → ')}
        </p>
      </div>

      <div
        className="comparison-grid"
        style={{ '--comparison-count': products.length } as React.CSSProperties}
      >
        <div className="comparison-labels" aria-hidden="true">
          <span>Product</span>
          <span>Details</span>
          {attributes.map((attribute) => (
            <span key={attribute}>{ATTRIBUTE_LABELS[attribute]}</span>
          ))}
          <span />
        </div>

        {products.map((product) => {
          const isReference = product.id === reference.id;
          return (
            <article
              key={product.id}
              className={`comparison-column ${isReference ? 'is-reference' : ''}`}
              data-product-id={product.id}
            >
              <div className="comparison-photo">
                <span
                  className="product-photo"
                  style={{ backgroundPosition: product.imagePosition }}
                  aria-hidden="true"
                />
                {isReference ? (
                  <span className="reference-pill">Reference</span>
                ) : null}
              </div>

              <div className="comparison-cell is-name">
                <p className="text-xs text-ink/45">{product.category}</p>
                <h3 className="font-serif text-xl leading-tight">
                  {product.name}
                </h3>
              </div>

              {attributes.map((attribute) => {
                const delta = attributeDelta(product, reference, attribute);
                return (
                  <div key={attribute} className="comparison-cell">
                    <strong>{attributeValue(product, attribute)}</strong>
                    {delta ? (
                      <span className={delta.good ? 'good-note' : 'warn-note'}>
                        {delta.text}
                      </span>
                    ) : (
                      <span>
                        {isReference ? 'Reference value' : 'Same as reference'}
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="comparison-cell gap-2">
                <Button
                  className={`w-full rounded-full ${cartQuantity(state, product.id) ? 'bg-moss' : 'bg-ink'}`}
                  onClick={() => humanActions.addToCart(product.id)}
                >
                  {cartQuantity(state, product.id) ? (
                    <Check />
                  ) : (
                    <ShoppingBag />
                  )}
                  {cartQuantity(state, product.id)
                    ? 'In your kit'
                    : 'Add to kit'}
                </Button>
                {!isReference ? (
                  <Button
                    variant="ghost"
                    className="h-8 w-full rounded-full text-xs"
                    onClick={() => humanActions.setReference(product.id)}
                  >
                    <Pin /> Pin as reference
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
