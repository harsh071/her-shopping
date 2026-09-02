'use client';

import { ArrowRight, Layers } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ActivityLedger } from '@/components/agent/activity-ledger';
import { ChangeToast } from '@/components/agent/change-toast';
import { DiagnosticsPanel } from '@/components/agent/diagnostics-panel';
import { useFocusScroll } from '@/components/agent/use-focus-scroll';
import { useVoice } from '@/components/agent/use-voice';
import { VoiceConsole } from '@/components/agent/voice-console';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { MissionSummary } from '@/components/mission/mission-summary';
import {
  BrowseHero,
  EditorialSection,
  FeaturedSection,
} from '@/components/storefront/browse-sections';
import { CatalogCanvas } from '@/components/storefront/catalog-canvas';
import { ComparisonView } from '@/components/storefront/comparison-view';
import { LayoutRail } from '@/components/storefront/layout-rail';
import { StoreHeader } from '@/components/storefront/store-header';
import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import { DEMO_MISSION_TEXT } from '@/lib/state/mission';
import { store } from '@/lib/state/store';
import {
  cartSummary,
  visibleGroups,
  visibleSections,
} from '@/lib/state/selectors';
import { useStoreState } from '@/lib/state/use-store';
import { registerWebMcpToolsWhenReady } from '@/lib/webmcp/register-tools';

export default function Page() {
  const state = useStoreState();
  const voice = useVoice();
  const [cartRequested, setCartRequested] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Whatever the last action changed is brought into view, so a change made
  // while the person is reading somewhere else is never missed.
  useFocusScroll(state.focus);

  // Registration happens once, in the top-level document — the only shape the
  // current site-tools implementations discover.
  useEffect(() => registerWebMcpToolsWhenReady(store), []);

  // Whenever either side opens checkout, the review surface is on screen by
  // construction — it is derived from state rather than pushed into it.
  const checkoutOpen =
    state.checkout.stage === 'review' ||
    state.checkout.stage === 'awaiting-confirmation';
  const cartOpen = cartRequested || checkoutOpen;

  const closeCart = () => {
    if (checkoutOpen) humanActions.cancelCheckout();
    setCartRequested(false);
  };

  const groups = useMemo(() => visibleGroups(state), [state]);
  const sections = useMemo(() => visibleSections(state), [state]);
  const summary = cartSummary(state);
  const shortlist = state.layout.focusedProductIds;
  const missionMode = state.layout.mode !== 'browse' && Boolean(state.mission);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <StoreHeader
        state={state}
        cartCount={summary.itemCount}
        onOpenCart={() => setCartRequested(true)}
        onOpenLedger={() => setLedgerOpen(true)}
        onToggleDiagnostics={() => setDiagnosticsOpen((open) => !open)}
      />

      <VoiceConsole
        state={state}
        live={voice.live}
        captions={voice.captions}
        toolEvents={voice.toolEvents}
        note={voice.note}
        onStart={() => void voice.start()}
        onStop={voice.stop}
      />

      {sections.map((sectionId) => {
        switch (sectionId) {
          case 'hero':
            return (
              <section
                key={sectionId}
                data-section-id={sectionId}
                className="px-5 py-5 lg:px-9 lg:py-7"
              >
                <BrowseHero
                  onTryDemo={() => humanActions.setMission(DEMO_MISSION_TEXT)}
                />
              </section>
            );

          case 'mission-summary':
            return <MissionSummary key={sectionId} state={state} />;

          case 'comparison':
            return (
              <section
                key={sectionId}
                data-section-id={sectionId}
                className="mx-auto max-w-[1520px] px-5 pt-8 lg:px-9"
              >
                <ComparisonView state={state} />
              </section>
            );

          case 'featured':
            return (
              <section
                key={sectionId}
                data-section-id={sectionId}
                className="mx-auto max-w-[1520px] px-5 pt-8 lg:px-9"
              >
                <FeaturedSection state={state} />
              </section>
            );

          case 'editorial':
            return (
              <section
                key={sectionId}
                data-section-id={sectionId}
                className="mx-auto max-w-[1520px] px-5 pt-8 lg:px-9"
              >
                <EditorialSection state={state} />
              </section>
            );

          case 'catalog':
            return (
              <section
                key={sectionId}
                data-section-id={sectionId}
                className="mx-auto max-w-[1520px] px-5 py-8 lg:px-9"
              >
                <div className="mb-6">
                  <p className="eyebrow">
                    {missionMode ? 'Mission view' : 'Field-tested collection'}
                  </p>
                  <h1 className="mt-1 font-serif text-3xl tracking-[-0.03em] md:text-4xl">
                    {missionMode
                      ? 'Your kit, organised'
                      : 'Ready for the weather to turn'}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
                    {missionMode
                      ? 'Essentials lead. Warmth and delivery are promoted onto every card, and anything that breaks a hard constraint is called out rather than hidden.'
                      : 'Quietly capable layers, camp tools, and sleep systems for shoulder-season travel.'}
                  </p>
                </div>

                <LayoutRail state={state} />
                <CatalogCanvas state={state} groups={groups} />
              </section>
            );

          default:
            return null;
        }
      })}

      {shortlist.length >= 2 && state.layout.mode !== 'compare' ? (
        <output className="comparison-dock">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral text-white">
              {shortlist.length}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                Shortlisted for comparison
              </p>
              <p className="truncate text-xs text-ink/55">
                Mission-relevant attributes move to the top.
              </p>
            </div>
          </div>
          <Button
            className="rounded-full bg-ink px-5 text-cream"
            onClick={() => humanActions.compare(shortlist.slice(0, 4))}
          >
            <Layers /> Compare now <ArrowRight />
          </Button>
        </output>
      ) : null}

      <footer className="border-t border-ink/10 bg-cream px-5 py-7 lg:px-9">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-3 text-xs text-ink/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong className="text-ink">Her Shopping</strong> — a fictional,
            agent-ready storefront.
          </p>
          <p>Demo checkout only · No payment or personal data is collected</p>
        </div>
      </footer>

      <ChangeToast entry={state.activity[0]} />
      <CartDrawer open={cartOpen} state={state} onClose={closeCart} />
      <ActivityLedger
        open={ledgerOpen}
        activity={state.activity}
        canUndo={state.history.length > 0}
        onClose={() => setLedgerOpen(false)}
      />
      <DiagnosticsPanel
        open={diagnosticsOpen}
        state={state}
        onClose={() => setDiagnosticsOpen(false)}
      />
    </main>
  );
}
