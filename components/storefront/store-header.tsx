'use client';

import { Activity, ChevronDown, Gauge, Heart, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import { CAPABILITIES } from '@/lib/capabilities/registry';
import type { HerShoppingState } from '@/lib/state/types';

export function StoreHeader({
  state,
  cartCount,
  onOpenCart,
  onOpenLedger,
  onToggleDiagnostics,
}: {
  state: HerShoppingState;
  cartCount: number;
  onOpenCart: () => void;
  onOpenLedger: () => void;
  onToggleDiagnostics: () => void;
}) {
  const { webmcpAvailable, registeredTools } = state.capabilities;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1520px] items-center gap-5 px-5 lg:px-9">
        <button
          type="button"
          className="group flex items-center gap-3"
          onClick={() => humanActions.reset()}
          aria-label="Reset Her Shopping to its seeded state"
        >
          <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-cream shadow-sm transition-transform group-hover:-rotate-6">
            H
          </span>
          <span className="font-serif text-[22px] tracking-[-0.03em]">
            Her Shopping
          </span>
        </button>

        <nav
          className="ml-5 hidden items-center gap-7 text-[13px] font-medium lg:flex"
          aria-label="Store navigation"
        >
          <button type="button" className="flex items-center gap-1">
            Shop <ChevronDown className="size-3.5" />
          </button>
          <button type="button">Collections</button>
          <button type="button">Field notes</button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="agent-pill"
            onClick={onToggleDiagnostics}
            title="Open agent diagnostics"
          >
            <span
              className={`size-1.5 rounded-full ${webmcpAvailable ? 'animate-pulse bg-moss' : 'bg-clay'}`}
            />
            {webmcpAvailable
              ? `Agent-ready · ${registeredTools.length}/${CAPABILITIES.length} tools`
              : 'Human mode · WebMCP not detected'}
            <Gauge className="size-3.5 opacity-60" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Saved items"
            className="hidden sm:inline-flex"
          >
            <Heart />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open the agent ledger"
            onClick={onOpenLedger}
          >
            <Activity />
          </Button>
          <Button
            variant="outline"
            className="relative h-10 rounded-full border-ink/15 bg-transparent px-4"
            onClick={onOpenCart}
          >
            <ShoppingBag />
            <span className="hidden sm:inline">Kit</span>
            {cartCount > 0 ? (
              <span className="grid size-5 place-items-center rounded-full bg-coral text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>
    </header>
  );
}
