'use client';

import { useEffect } from 'react';

/** Scrollable regions that stay live while the page behind is locked. */
const SCROLLABLE_WITHIN_OVERLAY = '.drawer, .diagnostics';

/**
 * Stops the page scrolling behind an open drawer.
 *
 * Without this, a wheel gesture over the scrim moves the catalog underneath, so
 * closing the cart drops the person somewhere they never navigated to.
 *
 * `overflow: hidden` on the scrolling element is not enough on its own here, so
 * wheel and touch gestures that land outside the overlay are cancelled too.
 * Gestures inside the drawer still scroll it normally.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    const previousRootOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    // Replace the scrollbar's width so hiding it does not shift the layout.
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const blockOutsideOverlay = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.(SCROLLABLE_WITHIN_OVERLAY)) return;
      event.preventDefault();
    };

    // `passive: false` is required for preventDefault to take effect on wheel
    // and touchmove.
    document.addEventListener('wheel', blockOutsideOverlay, { passive: false });
    document.addEventListener('touchmove', blockOutsideOverlay, {
      passive: false,
    });

    return () => {
      document.removeEventListener('wheel', blockOutsideOverlay);
      document.removeEventListener('touchmove', blockOutsideOverlay);
      documentElement.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [locked]);
}
