import {
  PRODUCTS,
  type Product,
  type PurposeTag,
} from '@/lib/catalog/products';
import type {
  Mission,
  MissionConstraint,
  MissionDeadline,
  MissionFit,
  MissionPriority,
} from '@/lib/state/types';

const WEEKDAYS: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 3,
  saturday: 4,
  sunday: 5,
};

/**
 * Purpose vocabularies. Mission text is matched against these to decide which
 * needs the store should organise around. Everything is a fixed lookup so the
 * same sentence always produces the same interface.
 */
const NEED_TRIGGERS: Array<{ tag: PurposeTag; words: string[] }> = [
  {
    tag: 'shelter',
    words: ['camp', 'camping', 'tent', 'overnight', 'backpack', 'wild'],
  },
  {
    tag: 'sleep',
    words: ['camp', 'camping', 'overnight', 'sleep', 'night', 'nights'],
  },
  {
    tag: 'warmth',
    words: ['warm', 'warmth', 'cold', 'winter', 'iceland', 'alpine', 'freez'],
  },
  {
    tag: 'weather',
    words: ['rain', 'storm', 'wind', 'wet', 'iceland', 'coastal', 'weather'],
  },
  {
    tag: 'cooking',
    words: ['cook', 'food', 'meal', 'coffee', 'camp', 'camping'],
  },
  { tag: 'light', words: ['dark', 'light', 'night', 'camp', 'camping'] },
  { tag: 'hydration', words: ['water', 'hydrat', 'drink', 'hike', 'trek'] },
  {
    tag: 'carry',
    words: ['hike', 'trek', 'carry', 'pack', 'day trip', 'trail'],
  },
  {
    tag: 'navigation',
    words: ['navigat', 'map', 'route', 'trail', 'backcountry'],
  },
  { tag: 'safety', words: ['safe', 'remote', 'backcountry', 'solo'] },
  { tag: 'power', words: ['charge', 'power', 'battery', 'phone'] },
  { tag: 'comfort', words: ['comfort', 'cosy', 'cozy', 'relax'] },
];

const PRIORITY_TRIGGERS: Array<{ priority: MissionPriority; words: string[] }> =
  [
    {
      priority: 'warmth',
      words: ['warm', 'warmth', 'cold', 'insulat', 'freez'],
    },
    {
      priority: 'weight',
      words: ['light', 'packable', 'weight', 'compact', 'minimal'],
    },
    {
      priority: 'price',
      words: ['cheap', 'budget', 'affordab', 'value', 'inexpensive'],
    },
    {
      priority: 'delivery',
      words: [
        'friday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'saturday',
        'sunday',
        'fast',
        'quick',
        'soon',
        'tomorrow',
        'deliver',
        'arrive',
      ],
    },
  ];

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function parseBudgetCents(text: string): number | null {
  const match = text.match(
    /(?:under|below|less than|max(?:imum)?|budget of|keep .{0,24}?under)?\s*\$?\s*(\d{2,6})(?:\s*(?:dollars|usd|bucks))?/i,
  );
  if (!match) return null;
  const explicit = text.match(
    /(?:\$|under\s+|below\s+|less than\s+|max(?:imum)?\s+|budget of\s+)\$?(\d{2,6})/i,
  );
  const raw = Number((explicit ?? match)[1]);
  if (!Number.isFinite(raw) || raw < 20 || raw > 100000) return null;
  return Math.round(raw) * 100;
}

function parseDeadline(text: string): MissionDeadline | null {
  if (/\btomorrow\b/.test(text)) return { label: 'Tomorrow', days: 1 };
  for (const [day, days] of Object.entries(WEEKDAYS)) {
    if (text.includes(day)) {
      return { label: day.charAt(0).toUpperCase() + day.slice(1), days };
    }
  }
  const inDays = text.match(/within (\d{1,2}) days?/);
  if (inDays) {
    const days = Number(inDays[1]);
    if (days >= 1 && days <= 60) return { label: `${days} days`, days };
  }
  return null;
}

function parsePartySize(text: string): number | null {
  const digits = text.match(
    /for (\d{1,2})(?: people| adults| friends| of us)?/,
  );
  if (digits) {
    const size = Number(digits[1]);
    if (size >= 1 && size <= 20) return size;
  }
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  };
  const spelled = text.match(
    /for (one|two|three|four|five|six)(?: people| adults| friends| of us)?/,
  );
  if (
    spelled &&
    !/(days?|nights?)/.test(
      text.slice(
        text.indexOf(spelled[0]) + spelled[0].length,
        text.indexOf(spelled[0]) + spelled[0].length + 8,
      ),
    )
  ) {
    return words[spelled[1]] ?? null;
  }
  return null;
}

function titleFromText(text: string): string {
  const cleaned = text.trim().replace(/[.!?]+$/, '');
  const place = cleaned.match(
    /\b(?:in|to|at)\s+([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)/,
  );
  const duration = cleaned.match(
    /(\d{1,2}|one|two|three|four|five|six|seven)[\s-](day|night|week)/i,
  );
  const activity = [
    'camping',
    'hiking',
    'trekking',
    'climbing',
    'cycling',
    'kayaking',
    'skiing',
  ].find((word) => cleaned.toLowerCase().includes(word));

  if (place && activity) {
    const prefix = duration
      ? `${duration[1]}-${duration[2].toLowerCase()} `
      : '';
    return `${prefix}${place[1]} ${activity}`.replace(/\b\w/, (char) =>
      char.toUpperCase(),
    );
  }
  const short =
    cleaned.length > 62 ? `${cleaned.slice(0, 59).trimEnd()}…` : cleaned;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/**
 * Turn a free-text mission into the structured record the interface renders.
 * Pure and deterministic: the same sentence always yields the same mission.
 */
export function parseMission(text: string): Mission {
  const context = text.trim();
  const lower = context.toLowerCase();

  const budgetCents = parseBudgetCents(lower);
  const deadline = parseDeadline(lower);
  const partySize = parsePartySize(lower);

  const needs = NEED_TRIGGERS.filter(({ words }) =>
    includesAny(lower, words),
  ).map(({ tag }) => tag);
  const priorities = PRIORITY_TRIGGERS.filter(({ words }) =>
    includesAny(lower, words),
  ).map(({ priority }) => priority);

  const constraints: MissionConstraint[] = [];
  if (budgetCents !== null) {
    constraints.push({
      id: 'budget',
      label: `Total under $${Math.round(budgetCents / 100)}`,
      kind: 'hard',
      icon: 'budget',
    });
  }
  if (deadline) {
    constraints.push({
      id: 'delivery',
      label: `Arrives by ${deadline.label}`,
      kind: 'hard',
      icon: 'delivery',
    });
  }
  if (partySize !== null) {
    constraints.push({
      id: 'party',
      label: `Kit for ${partySize}`,
      kind: 'hard',
      icon: 'party',
    });
  }
  if (priorities.includes('warmth')) {
    constraints.push({
      id: 'warmth',
      label: 'Prioritise warmth',
      kind: 'preference',
      icon: 'warmth',
    });
  }
  if (priorities.includes('weight')) {
    constraints.push({
      id: 'weight',
      label: 'Keep it lightweight',
      kind: 'preference',
      icon: 'weight',
    });
  }
  if (priorities.includes('price')) {
    constraints.push({
      id: 'price',
      label: 'Favour value',
      kind: 'preference',
      icon: 'budget',
    });
  }
  if (constraints.length === 0) {
    constraints.push({
      id: 'fit',
      label: 'Mission fit first',
      kind: 'preference',
      icon: 'general',
    });
  }

  return {
    title: titleFromText(context),
    context,
    budgetCents,
    partySize,
    deadline,
    constraints,
    needs: needs.length > 0 ? needs : ['comfort'],
    priorities,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * How central a product is to a trip of this kind, before the mission is known.
 * The mission then adjusts around this prior rather than trying to rediscover
 * that a tent matters more than a mug.
 */
const BASE_SCORE = { essential: 70, useful: 50, optional: 32 } as const;

const ADJUSTMENTS = {
  coversNeed: 8,
  missesEveryNeed: -14,
  warmthPerPoint: 2,
  meetsDeadline: 6,
  fastWithoutDeadline: 3,
  budgetShare: 12,
  valueShare: 10,
  constraintViolation: -25,
} as const;

export const PRIORITY_THRESHOLDS = { essential: 64, useful: 46 } as const;

/**
 * Score one product against the active mission.
 *
 * Deterministic and side-effect free. Grouping, sorting, comparison ordering,
 * and every agent tool that reports "mission fit" read this one function, so the
 * same sentence always produces the same store.
 */
export function scoreProduct(product: Product, mission: Mission): MissionFit {
  const reasons: string[] = [];
  const violations: string[] = [];
  let score: number = BASE_SCORE[product.basePriority];

  const matched = product.purposeTags.filter((tag) =>
    mission.needs.includes(tag),
  );
  if (matched.length > 0) {
    score += ADJUSTMENTS.coversNeed;
    reasons.push(`Covers ${matched.join(' and ')}`);
  } else {
    score += ADJUSTMENTS.missesEveryNeed;
  }

  if (mission.priorities.includes('warmth')) {
    score += (product.warmthRating - 5) * ADJUSTMENTS.warmthPerPoint;
    if (product.warmthRating >= 7)
      reasons.push(`Warmth ${product.warmthRating}/10`);
  }

  if (mission.deadline) {
    if (product.deliveryDays > mission.deadline.days) {
      violations.push(
        `Arrives in ${product.deliveryDays} days — after ${mission.deadline.label}`,
      );
    } else {
      score += ADJUSTMENTS.meetsDeadline;
      reasons.push(`Arrives before ${mission.deadline.label}`);
    }
  } else if (product.deliveryDays <= 2) {
    score += ADJUSTMENTS.fastWithoutDeadline;
  }

  if (mission.priorities.includes('weight')) {
    score += clamp((600 - product.weightGrams) / 100, -6, 6);
    if (product.weightGrams <= 400) reasons.push('Packs light');
  }

  if (mission.budgetCents) {
    score -=
      (product.priceCents / mission.budgetCents) * ADJUSTMENTS.budgetShare;
    if (product.priceCents > mission.budgetCents) {
      violations.push('Costs more than the whole mission budget');
    }
    if (mission.priorities.includes('price')) {
      score -=
        (product.priceCents / mission.budgetCents) * ADJUSTMENTS.valueShare;
      if (product.priceCents <= 6000) reasons.push('Keeps the budget open');
    }
  }

  if (product.inventory <= 0) violations.push('Out of stock');
  if (violations.length > 0) score += ADJUSTMENTS.constraintViolation;

  score = Math.round(clamp(score, 0, 100));

  const priority: MissionFit['priority'] =
    violations.length > 0
      ? 'optional'
      : score >= PRIORITY_THRESHOLDS.essential
        ? 'essential'
        : score >= PRIORITY_THRESHOLDS.useful
          ? 'useful'
          : 'optional';

  return { product, score, priority, reasons, violations };
}

export function scoreCatalog(
  mission: Mission,
  products: Product[] = PRODUCTS,
): MissionFit[] {
  return products.map((product) => scoreProduct(product, mission));
}

/** Purpose tags the mission asked for that no in-stock, non-violating product covers yet. */
export function uncoveredNeeds(
  mission: Mission,
  coveredProductIds: string[],
): PurposeTag[] {
  const covered = new Set<PurposeTag>();
  for (const productId of coveredProductIds) {
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product) continue;
    for (const tag of product.purposeTags) covered.add(tag);
  }
  return mission.needs.filter((need) => !covered.has(need));
}

export const DEMO_MISSION_TEXT =
  'I am going camping in Iceland for five days. Keep the total below $700, prioritise warmth and Friday delivery, and reorganise the store around what I need.';
