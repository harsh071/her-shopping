'use client';

import {
  ArrowRight,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { humanActions } from '@/lib/actions/ui-actions';
import { deliveryLabel, dollars, pluralize } from '@/lib/format';
import { cartLines, cartSummary } from '@/lib/state/selectors';
import type { HerShoppingState } from '@/lib/state/types';

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <p className="checkout-note is-good">
        <ShieldCheck className="size-4 shrink-0" />
        Everything in the kit meets the mission constraints.
      </p>
    );
  }
  return (
    <ul className="checkout-warnings">
      {warnings.map((warning) => (
        <li key={warning}>
          <TriangleAlert className="size-3.5 shrink-0" />
          {warning}
        </li>
      ))}
    </ul>
  );
}

/**
 * The cart, the checkout review, the confirmation gate, and the fictional
 * receipt. The gate is the point: an agent can raise it, but only a person can
 * clear it.
 */
export function CartDrawer({
  open,
  state,
  onClose,
}: {
  open: boolean;
  state: HerShoppingState;
  onClose: () => void;
}) {
  if (!open) return null;

  const lines = cartLines(state);
  const summary = cartSummary(state);
  const { checkout } = state;

  return (
    <>
      <button
        type="button"
        className="drawer-scrim"
        onClick={onClose}
        aria-label="Close the cart"
      />
      <aside className="drawer bg-cream" aria-label="Your expedition kit">
        <div className="flex items-center justify-between border-b border-ink/10 p-5">
          <div>
            <p className="eyebrow">Shared cart</p>
            <h2 className="font-serif text-2xl">
              {checkout.stage === 'placed'
                ? 'Demo receipt'
                : checkout.stage === 'idle'
                  ? 'Your expedition kit'
                  : 'Review your demo order'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        {checkout.stage === 'placed' && checkout.order ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-moss text-white">
                <PackageCheck className="size-7" />
              </span>
              <h3 className="mt-5 font-serif text-3xl">
                Demo order {checkout.order.id}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/55">
                Simulated only. No payment was taken and no personal data was
                collected.
              </p>
            </div>
            <div className="mt-6 rounded-[20px] border border-ink/10 bg-white p-5">
              {checkout.order.lines.map((line) => (
                <div
                  key={line.productId}
                  className="flex justify-between border-b border-ink/8 py-2 text-sm last:border-0"
                >
                  <span>
                    {line.quantity} × {line.name}
                  </span>
                  <strong className="tabular-nums">
                    {dollars(line.lineTotalCents)}
                  </strong>
                </div>
              ))}
              <div className="mt-3 flex justify-between border-t border-ink/10 pt-3">
                <span className="text-sm text-ink/55">Total</span>
                <strong className="font-serif text-2xl">
                  {dollars(checkout.order.subtotalCents)}
                </strong>
              </div>
              <p className="mt-3 text-xs text-ink/45">
                Everything arrives within {checkout.order.slowestDeliveryDays}{' '}
                {pluralize(checkout.order.slowestDeliveryDays, 'day')}.
              </p>
            </div>
            <Button
              className="mt-6 h-11 w-full rounded-full bg-ink text-cream"
              onClick={() => {
                humanActions.reset();
                onClose();
              }}
            >
              Reset the store
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-5">
              {lines.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ShoppingBag className="mx-auto size-7 text-ink/30" />
                    <p className="mt-3 font-serif text-2xl">
                      Your kit is empty
                    </p>
                    <p className="mt-1 text-sm text-ink/50">
                      Add mission-fit products to see the plan here.
                    </p>
                  </div>
                </div>
              ) : (
                lines.map(({ product, quantity, lineTotalCents }) => (
                  <div
                    key={product.id}
                    className="flex gap-3 border-b border-ink/10 py-4"
                  >
                    <span
                      className="product-photo size-20 shrink-0 rounded-xl"
                      style={{
                        backgroundPosition: product.imagePosition,
                        position: 'static',
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <h3 className="font-serif text-lg leading-tight">
                          {product.name}
                        </h3>
                        <strong className="tabular-nums">
                          {dollars(lineTotalCents)}
                        </strong>
                      </div>
                      <p className="mt-1 text-xs text-ink/45">
                        Arrives{' '}
                        {deliveryLabel(product.deliveryDays).toLowerCase()}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="rounded-full"
                          onClick={() =>
                            humanActions.setQuantity(product.id, quantity - 1)
                          }
                          aria-label={`Reduce ${product.name}`}
                        >
                          <Minus />
                        </Button>
                        <span className="w-5 text-center text-xs font-semibold">
                          {quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="rounded-full"
                          onClick={() =>
                            humanActions.setQuantity(product.id, quantity + 1)
                          }
                          aria-label={`Add another ${product.name}`}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-ink/10 bg-white p-5">
              <div className="flex justify-between">
                <span className="text-sm text-ink/55">Subtotal</span>
                <strong className="font-serif text-2xl">
                  {dollars(summary.subtotalCents)}
                </strong>
              </div>
              {summary.budgetCents !== null ? (
                <div className="mt-2 flex justify-between text-xs text-ink/45">
                  <span>Mission budget</span>
                  <span
                    className={
                      summary.overBudget ? 'font-semibold text-destructive' : ''
                    }
                  >
                    {dollars(summary.budgetCents)}
                  </span>
                </div>
              ) : null}

              {checkout.stage === 'idle' ? (
                <p className="mt-4 rounded-xl bg-moss/10 p-3 text-xs leading-5 text-forest">
                  <strong>Demo checkout.</strong> No card, address, or personal
                  data is ever requested.
                </p>
              ) : (
                <div className="mt-4">
                  <WarningList warnings={checkout.warnings} />
                </div>
              )}

              {checkout.stage === 'idle' ? (
                <Button
                  className="mt-4 h-11 w-full rounded-full bg-ink text-cream hover:bg-forest"
                  disabled={lines.length === 0}
                  onClick={() => humanActions.previewCheckout()}
                >
                  Review demo order <ArrowRight />
                </Button>
              ) : checkout.stage === 'review' ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-full border-ink/15 bg-transparent"
                    onClick={() => humanActions.cancelCheckout()}
                  >
                    Keep editing
                  </Button>
                  <Button
                    className="h-11 flex-1 rounded-full bg-coral text-white hover:bg-coral/85"
                    onClick={() => humanActions.requestConfirmation()}
                  >
                    Place demo order
                  </Button>
                </div>
              ) : (
                <div className="confirmation-gate mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">
                    Confirmation required
                  </p>
                  <p className="mt-1 text-sm leading-5 text-ink/70">
                    {checkout.requestedBy === 'human'
                      ? 'Confirm to create the fictional order.'
                      : 'The agent asked to place this order. Only you can confirm it.'}
                  </p>
                  <p className="mt-2 text-sm">
                    <strong>{summary.itemCount}</strong>{' '}
                    {pluralize(summary.itemCount, 'item')} ·{' '}
                    <strong>{dollars(summary.subtotalCents)}</strong>
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-full border-ink/15 bg-transparent"
                      onClick={() => humanActions.cancelCheckout()}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-10 flex-1 rounded-full bg-coral text-white hover:bg-coral/85"
                      onClick={() => {
                        const token = state.checkout.token;
                        if (token) humanActions.confirmOrder(token);
                      }}
                    >
                      Confirm demo order
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
