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
      <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-7 md:p-11 lg:p-14">
        <h1 className="max-w-xl font-serif text-[clamp(40px,5.4vw,68px)] leading-[0.92] tracking-[-0.045em]">
          The expedition store
          <br />
          that packs with you.
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button
            className="h-12 w-fit rounded-full bg-coral px-7 text-[15px] text-white hover:bg-coral/85"
            onClick={onTryDemo}
          >
            See it adapt <ArrowDown />
          </Button>
          <span className="text-[13px] text-cream/60">
            Shoulder-season layers, shelter &amp; sleep systems
          </span>
        </div>
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
