'use client';

import {
  CircleDollarSign,
  Package,
  ThermometerSun,
  TriangleAlert,
  Truck,
  Users,
  X,
} from 'lucide-react';

import { humanActions } from '@/lib/actions/ui-actions';
import { dollars, pluralize } from '@/lib/format';
import { uncoveredNeeds } from '@/lib/state/mission';
import { cartSummary } from '@/lib/state/selectors';
import type { ConstraintIcon, HerShoppingState } from '@/lib/state/types';

const CONSTRAINT_ICONS: Record<ConstraintIcon, typeof CircleDollarSign> = {
  budget: CircleDollarSign,
  warmth: ThermometerSun,
  delivery: Truck,
  weight: Package,
  party: Users,
  general: Package,
};

/**
 * The persistent mission header: constraint chips a person edits directly, and
 * the budget meter that stays reachable no matter what the agent rearranges.
 */
export function MissionSummary({ state }: { state: HerShoppingState }) {
  const mission = state.mission;
  if (!mission) return null;

  const summary = cartSummary(state);
  const budget = mission.budgetCents;
  const progress = budget
    ? Math.min(100, (summary.subtotalCents / budget) * 100)
    : 0;
  const selection = state.selection;
  const missing = uncoveredNeeds(
    mission,
    state.cart.lines.map((line) => line.productId),
  );

  return (
    <section
      className="mission-summary border-b border-ink/10 bg-forest text-cream"
      data-section-id="mission-summary"
    >
      <div className="mx-auto grid max-w-[1520px] gap-7 px-5 py-7 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:px-9">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-cream/55">
            Active mission
          </p>
          <h2 className="mt-1 font-serif text-3xl tracking-[-0.03em]">
            {mission.title}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {mission.constraints.map((constraint) => {
              const Icon = CONSTRAINT_ICONS[constraint.icon];
              const isSelected =
                selection?.kind === 'constraint' &&
                selection.id === constraint.id;
              return (
                <span
                  key={constraint.id}
                  data-constraint-id={constraint.id}
                  className={`mission-chip ${constraint.kind === 'hard' ? 'is-hard' : ''} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1.5"
                    onClick={() =>
                      humanActions.select({
                        kind: 'constraint',
                        id: constraint.id,
                      })
                    }
                    aria-label={`Select the ${constraint.label} constraint`}
                  >
                    <Icon />
                    {constraint.label}
                  </button>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => humanActions.removeConstraint(constraint.id)}
                    aria-label={`Remove the ${constraint.label} constraint`}
                  >
                    <X />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <span className="text-xs text-cream/55">Kit budget</span>
            <span className="font-serif text-2xl">
              {dollars(summary.subtotalCents)}
              {budget ? (
                <em className="font-sans text-xs not-italic text-cream/45">
                  {' '}
                  / {dollars(budget)}
                </em>
              ) : null}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.overBudget ? 'bg-[#ff8f6b]' : 'bg-coral'
              }`}
              style={{ width: `${budget ? progress : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-cream/55">
            {budget === null
              ? `${summary.itemCount} ${pluralize(summary.itemCount, 'item')} in the kit`
              : summary.overBudget
                ? `${dollars(summary.subtotalCents - budget)} over the mission budget`
                : `${dollars(budget - summary.subtotalCents)} remains for this mission`}
          </p>

          {missing.length > 0 ? (
            <p className="missing-callout">
              <TriangleAlert className="size-3.5 shrink-0" />
              Missing from your plan: {missing.slice(0, 4).join(', ')}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
