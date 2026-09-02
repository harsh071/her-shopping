'use client';

import { useEffect, useRef } from 'react';

import type { FocusRequest } from '@/lib/state/types';

/** Height of the sticky header plus the voice console. */
const STICKY_OFFSET = 152;
const HIGHLIGHT_MS = 1500;
const HIGHLIGHT_CLASS = 'is-arriving';

function findTarget(target: string): HTMLElement | null {
  const id = CSS.escape(target);
  return document.querySelector<HTMLElement>(
    `[data-section-id="${id}"], [data-product-id="${id}"], [data-constraint-id="${id}"]`,
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

      const rect = element.getBoundingClientRect();
      const alreadyVisible =
        rect.top >= STICKY_OFFSET && rect.bottom <= window.innerHeight;

      if (!alreadyVisible) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches;
        const room = window.innerHeight - STICKY_OFFSET;
        // Short things get centred in the space below the sticky chrome; tall
        // sections start just under it so their heading stays readable.
        const padding = rect.height < room ? (room - rect.height) / 2 : 16;
        window.scrollTo({
          top: Math.max(0, rect.top + window.scrollY - STICKY_OFFSET - padding),
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
