'use client';

import { useEffect, useRef } from 'react';

import type { FocusRequest } from '@/lib/state/types';

/** Used only if the sticky chrome cannot be measured. */
const FALLBACK_OFFSET = 152;
const BREATHING_ROOM = 12;
const HIGHLIGHT_MS = 1500;
const HIGHLIGHT_CLASS = 'is-arriving';

/**
 * How much of the viewport the sticky header and voice console cover right now.
 *
 * Measured rather than hardcoded: the console grows when a caption wraps and
 * again on narrow screens, and a stale constant would scroll the target under
 * it.
 */
function stickyOffset(): number {
  if (typeof document === 'undefined') return FALLBACK_OFFSET;
  let total = 0;
  for (const selector of ['header', '.voice-console']) {
    const element = document.querySelector(selector);
    if (!element) continue;
    if (getComputedStyle(element).position !== 'sticky') continue;
    total += element.getBoundingClientRect().height;
  }
  return total > 0 ? total + BREATHING_ROOM : FALLBACK_OFFSET;
}

function findTarget(target: string): HTMLElement | null {
  const id = CSS.escape(target);
  return document.querySelector<HTMLElement>(
    `[data-section-id="${id}"], [data-product-id="${id}"], [data-constraint-id="${id}"]`,
  );
}

/**
 * True when the target is close enough to where the eye already is that moving
 * the page would be more disruptive than helpful: it starts below the sticky
 * chrome, begins in the upper part of the viewport, and either fits on screen
 * or is simply taller than the screen.
 */
function alreadyInView(
  rect: DOMRect,
  offset: number,
  viewport: number,
): boolean {
  const startsBelowChrome = rect.top >= offset - 4;
  const startsHighEnough = rect.top <= viewport * 0.55;
  const fitsOnScreen = rect.bottom <= viewport;
  const tallerThanScreen = rect.height > viewport - offset;
  return (
    startsBelowChrome && startsHighEnough && (fitsOnScreen || tallerThanScreen)
  );
}

/**
 * Brings whatever just changed into view.
 *
 * When the agent regroups the catalog, opens a comparison, or pins a product,
 * the person may be looking somewhere else entirely — so the page follows the
 * change rather than leaving them to hunt for it. Anything already comfortably
 * on screen is left alone, so ordinary clicking never yanks the viewport.
 */
export function useFocusScroll(focus: FocusRequest | null) {
  const handled = useRef(0);
  const highlighted = useRef<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!focus || focus.version === handled.current) return;
    handled.current = focus.version;

    // A change arriving mid-highlight retires the previous ring immediately,
    // so a fast sequence of actions never leaves one stuck on the page.
    const clearHighlight = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = undefined;
      highlighted.current?.classList.remove(HIGHLIGHT_CLASS);
      highlighted.current = null;
    };
    clearHighlight();

    const frame = requestAnimationFrame(() => {
      const element = findTarget(focus.target);
      if (!element) return;

      const viewport = window.innerHeight;
      const offset = stickyOffset();
      const rect = element.getBoundingClientRect();

      if (!alreadyInView(rect, offset, viewport)) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches;
        const room = viewport - offset;
        // Short things get centred in the space below the sticky chrome; tall
        // sections start just under it so their heading stays readable.
        const padding =
          rect.height < room ? (room - rect.height) / 2 : BREATHING_ROOM;
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - viewport,
        );
        const top = rect.top + window.scrollY - offset - padding;
        window.scrollTo({
          top: Math.min(Math.max(0, top), maxScroll),
          behavior: smooth ? 'smooth' : 'auto',
        });
      }

      element.classList.add(HIGHLIGHT_CLASS);
      highlighted.current = element;
      timer.current = window.setTimeout(clearHighlight, HIGHLIGHT_MS);
    });

    return () => cancelAnimationFrame(frame);
  }, [focus]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      highlighted.current?.classList.remove(HIGHLIGHT_CLASS);
    };
  }, []);
}
