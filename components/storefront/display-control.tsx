'use client';

import { LayoutGrid } from 'lucide-react';

import { humanActions } from '@/lib/actions/ui-actions';
import {
  CARD_ATTRIBUTES,
  CARD_ATTRIBUTE_LABELS,
  CARD_LAYOUTS,
  COLUMN_SETTINGS,
  IMAGE_SCALES,
  PRESENTATION_PRESET_NAMES,
  PRICE_EMPHASES,
} from '@/lib/state/presentation';
import type { CardAttribute, HerShoppingState } from '@/lib/state/types';

const PRESET_LABELS: Record<string, string> = {
  default: 'Standard',
  'dense-decision': 'Dense',
  'visual-browse': 'Visual',
  'price-first': 'Price-led',
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="display-row">
      <span className="rail-label">{label}</span>
      <div className="display-options">{children}</div>
    </div>
  );
}

/**
 * The human half of `set_card_presentation`. Every option an agent can choose
 * is here as a control, so the two audiences are working the same surface.
 */
export function DisplayControl({ state }: { state: HerShoppingState }) {
  const presentation = state.layout.presentation;
  const attributes = presentation.cardAttributes;

  const toggleAttribute = (attribute: CardAttribute) => {
    const current = attributes ?? [];
    const next = current.includes(attribute)
      ? current.filter((item) => item !== attribute)
      : [...current, attribute].slice(0, 4);
    humanActions.setPresentation({ cardAttributes: next });
  };

  return (
    <details className="hidden-sections display-control">
      <summary>
        <LayoutGrid className="size-3.5" /> Display
      </summary>
      <div>
        <Row label="Preset">
          {PRESENTATION_PRESET_NAMES.map((preset) => (
            <button
              key={preset}
              type="button"
              className="rail-chip"
              onClick={() => humanActions.setPresentation({ preset })}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </Row>

        <Row label="Cards">
          {CARD_LAYOUTS.map((layout) => (
            <button
              key={layout}
              type="button"
              className={`rail-chip ${presentation.cardLayout === layout ? 'is-active' : ''}`}
              aria-pressed={presentation.cardLayout === layout}
              onClick={() =>
                humanActions.setPresentation({ cardLayout: layout })
              }
            >
              {layout}
            </button>
          ))}
        </Row>

        <Row label="Per row">
          {COLUMN_SETTINGS.map((columns) => (
            <button
              key={columns}
              type="button"
              className={`rail-chip ${presentation.columns === columns ? 'is-active' : ''}`}
              aria-pressed={presentation.columns === columns}
              onClick={() => humanActions.setPresentation({ columns })}
            >
              {columns}
            </button>
          ))}
        </Row>

        <Row label="Price">
          {PRICE_EMPHASES.map((emphasis) => (
            <button
              key={emphasis}
              type="button"
              className={`rail-chip ${presentation.priceEmphasis === emphasis ? 'is-active' : ''}`}
              aria-pressed={presentation.priceEmphasis === emphasis}
              onClick={() =>
                humanActions.setPresentation({ priceEmphasis: emphasis })
              }
            >
              {emphasis}
            </button>
          ))}
        </Row>

        <Row label="Images">
          {IMAGE_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              className={`rail-chip ${presentation.imageScale === scale ? 'is-active' : ''}`}
              aria-pressed={presentation.imageScale === scale}
              onClick={() =>
                humanActions.setPresentation({ imageScale: scale })
              }
            >
              {scale}
            </button>
          ))}
        </Row>

        <Row label="On cards">
          <button
            type="button"
            className={`rail-chip ${attributes === null ? 'is-active' : ''}`}
            aria-pressed={attributes === null}
            onClick={() =>
              humanActions.setPresentation({ automaticAttributes: true })
            }
          >
            auto
          </button>
          {CARD_ATTRIBUTES.map((attribute) => (
            <button
              key={attribute}
              type="button"
              className={`rail-chip ${attributes?.includes(attribute) ? 'is-active' : ''}`}
              aria-pressed={Boolean(attributes?.includes(attribute))}
              onClick={() => toggleAttribute(attribute)}
            >
              {CARD_ATTRIBUTE_LABELS[attribute]}
            </button>
          ))}
        </Row>

        <Row label="Text">
          <button
            type="button"
            className={`rail-chip ${presentation.showDescriptions ? 'is-active' : ''}`}
            aria-pressed={presentation.showDescriptions}
            onClick={() =>
              humanActions.setPresentation({
                showDescriptions: !presentation.showDescriptions,
              })
            }
          >
            descriptions
          </button>
        </Row>
      </div>
    </details>
  );
}
