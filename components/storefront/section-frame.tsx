'use client';

import { ArrowDown, ArrowUp, EyeOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { SectionId } from '@/lib/state/sections';

type SectionFrameProps = {
  sectionId: SectionId;
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * The wrapper every reorganisable region shares. It carries the section's
 * heading, its selection outline, and the keyboard-accessible move and hide
 * controls that mirror the agent's layout tools.
 */
export function SectionFrame({
  sectionId,
  eyebrow,
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  onHide,
  onMoveUp,
  onMoveDown,
  actions,
  children,
}: SectionFrameProps) {
  return (
    <section
      className={`section-frame ${selected ? 'is-selected' : ''}`}
      data-section-id={sectionId}
      aria-label={title}
    >
      <header className="section-frame-head">
        <button
          type="button"
          className="section-frame-title"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Select the ${title} section`}
        >
          {Icon ? <Icon className="size-4 text-ink/40" /> : null}
          <span>
            {eyebrow ? <span className="eyebrow block">{eyebrow}</span> : null}
            <span className="font-serif text-2xl tracking-[-0.02em]">
              {title}
            </span>
          </span>
        </button>

        <div className="section-frame-tools">
          {description ? (
            <p className="hidden text-xs text-ink/45 md:block">{description}</p>
          ) : null}
          {actions}
          {onMoveUp ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={onMoveUp}
              aria-label={`Move ${title} earlier`}
            >
              <ArrowUp />
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={onMoveDown}
              aria-label={`Move ${title} later`}
            >
              <ArrowDown />
            </Button>
          ) : null}
          {onHide ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={onHide}
              aria-label={`Hide ${title}`}
            >
              <EyeOff />
            </Button>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}
