'use client';

import { ArrowDown, Compass, Sparkles } from 'lucide-react';

import { ProductCard } from '@/components/storefront/product-card';
import { SectionFrame } from '@/components/storefront/section-frame';
import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import { cardAttributesFor } from '@/lib/state/presentation';
import { cartQuantity } from '@/lib/state/selectors';
import { PRODUCTS } from '@/lib/catalog/products';
import type { HerShoppingState } from '@/lib/state/types';

export function BrowseHero({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <div className="hero-grid mx-auto max-w-[1520px] overflow-hidden rounded-[28px] bg-forest text-cream">
      <div className="relative z-10 flex min-h-[380px] flex-col justify-end p-7 md:p-11 lg:p-14">
        <p className="mb-auto text-[11px] font-bold uppercase tracking-[0.2em] text-cream/65">
          Autumn field guide / 01
        </p>
        <h1 className="max-w-xl font-serif text-[clamp(44px,6vw,78px)] leading-[0.88] tracking-[-0.055em]">
          Pack for the moment,
          <br />
          not the catalog.
        </h1>
        <p className="mt-6 max-w-lg text-sm leading-6 text-cream/70">
          Tell the store the trip, the budget, and what matters. It rebuilds
          itself into a plan you and your agent can edit together.
        </p>
        <Button
          className="mt-6 h-11 w-fit rounded-full bg-coral px-6 text-white hover:bg-coral/85"
          onClick={onTryDemo}
        >
          See it adapt <ArrowDown />
        </Button>
      </div>
      <div
        className="hero-image"
        aria-label="Expedition equipment arranged on a map"
      />
    </div>
  );
}

export function FeaturedSection({ state }: { state: HerShoppingState }) {
  const featured = PRODUCTS.filter((product) => product.featured).slice(0, 3);
  const selection = state.selection;

  return (
    <SectionFrame
      sectionId="featured"
      icon={Sparkles}
      eyebrow="This season"
      title="Featured gear"
      description="Merchandised the way the store wants to sell it"
      selected={selection?.kind === 'section' && selection.id === 'featured'}
      onSelect={() => humanActions.select({ kind: 'section', id: 'featured' })}
      onHide={() => humanActions.setSectionVisibility(['featured'], false)}
    >
      <div className="product-grid">
        {featured.map((product) => (
          <ProductCard
            key={product.id}
            view={{
              product,
              score: 0,
              priority: product.basePriority,
              reasons: [],
              violations: [],
              inCartQuantity: cartQuantity(state, product.id),
            }}
            presentation={state.layout.presentation}
            attributes={cardAttributesFor(state)}
            missionMode={false}
            selected={
              selection?.kind === 'product' && selection.id === product.id
            }
            shortlisted={state.layout.focusedProductIds.includes(product.id)}
            isReference={state.layout.referenceProductId === product.id}
            onSelect={() =>
              humanActions.select({ kind: 'product', id: product.id })
            }
            onToggleShortlist={() => humanActions.toggleShortlist(product.id)}
            onAdd={() => humanActions.addToCart(product.id)}
            onPin={() => humanActions.setReference(product.id)}
          />
        ))}
      </div>
    </SectionFrame>
  );
}

export function EditorialSection({ state }: { state: HerShoppingState }) {
  const selection = state.selection;
  return (
    <SectionFrame
      sectionId="editorial"
      icon={Compass}
      eyebrow="Field notes"
      title="Reading the weather"
      description="Editorial content that a mission usually makes irrelevant"
      selected={selection?.kind === 'section' && selection.id === 'editorial'}
      onSelect={() => humanActions.select({ kind: 'section', id: 'editorial' })}
      onHide={() => humanActions.setSectionVisibility(['editorial'], false)}
    >
      <div className="editorial-grid">
        {[
          {
            title: 'Layering for wind, not temperature',
            body: 'Wind strips heat faster than cold air does. Build the kit around a shell that seals, then add insulation underneath.',
          },
          {
            title: 'What an R-value actually buys you',
            body: 'Ground conducts heat away far quicker than air. Sleep insulation is usually the cheapest warmth you can add.',
          },
          {
            title: 'Packing for a five-day window',
            body: 'Plan for two weather systems, not five days. Repeatable layers beat five separate outfits every time.',
          },
        ].map((entry) => (
          <article key={entry.title} className="editorial-card">
            <h3 className="font-serif text-xl leading-tight">{entry.title}</h3>
            <p className="mt-2 text-xs leading-5 text-ink/55">{entry.body}</p>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}
