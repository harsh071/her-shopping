import { describe, expect, test } from 'vitest';

import { PRODUCTS } from '@/lib/catalog/products';
import {
  DEMO_MISSION_TEXT,
  parseMission,
  scoreProduct,
  uncoveredNeeds,
} from '@/lib/state/mission';

describe('mission parsing', () => {
  test('extracts budget, deadline, needs, and priorities from the golden prompt', () => {
    const mission = parseMission(DEMO_MISSION_TEXT);

    expect(mission.budgetCents).toBe(70000);
    expect(mission.deadline).toEqual({ label: 'Friday', days: 3 });
    expect(mission.priorities).toEqual(['warmth', 'delivery']);
    expect(mission.needs).toContain('shelter');
    expect(mission.needs).toContain('warmth');
    expect(mission.title).toBe('Five-day Iceland camping');
  });

  test('marks budget and deadline as hard, warmth as a preference', () => {
    const { constraints } = parseMission(DEMO_MISSION_TEXT);
    const byId = Object.fromEntries(
      constraints.map((item) => [item.id, item.kind]),
    );

    expect(byId.budget).toBe('hard');
    expect(byId.delivery).toBe('hard');
    expect(byId.warmth).toBe('preference');
  });

  test('is deterministic', () => {
    expect(parseMission(DEMO_MISSION_TEXT)).toEqual(
      parseMission(DEMO_MISSION_TEXT),
    );
  });

  test('always produces at least one constraint', () => {
    expect(
      parseMission('I need something for the weekend').constraints.length,
    ).toBeGreaterThan(0);
  });
});

describe('mission scoring', () => {
  const mission = parseMission(DEMO_MISSION_TEXT);
  const fits = PRODUCTS.map((product) => scoreProduct(product, mission));
  const byPriority = (priority: string) =>
    fits.filter((fit) => fit.priority === priority);

  test('fills every group', () => {
    expect(byPriority('essential').length).toBeGreaterThan(0);
    expect(byPriority('useful').length).toBeGreaterThan(0);
    expect(byPriority('optional').length).toBeGreaterThan(0);
  });

  test('no essential item misses the Friday delivery constraint', () => {
    for (const fit of byPriority('essential')) {
      expect(fit.product.deliveryDays).toBeLessThanOrEqual(3);
      expect(fit.violations).toEqual([]);
    }
  });

  test('shelter, sleep, warmth, and weather all lead the plan', () => {
    const essentialTags = new Set(
      byPriority('essential').flatMap((fit) => fit.product.purposeTags),
    );
    for (const tag of ['shelter', 'sleep', 'warmth', 'weather']) {
      expect(essentialTags.has(tag as never)).toBe(true);
    }
  });

  test('every mission need is covered by some non-violating product', () => {
    const usable = fits.filter((fit) => fit.violations.length === 0);
    const covered = new Set(usable.flatMap((fit) => fit.product.purposeTags));
    for (const need of mission.needs) expect(covered.has(need)).toBe(true);
  });

  test('slow-shipping products are demoted with a stated reason', () => {
    const slow = fits.filter((fit) => fit.product.deliveryDays > 3);
    expect(slow.length).toBeGreaterThan(0);
    for (const fit of slow) {
      expect(fit.priority).toBe('optional');
      expect(fit.violations[0]).toMatch(/after Friday/);
    }
  });

  test('relaxing the deadline promotes a previously blocked product', () => {
    const withoutDeadline = { ...mission, deadline: null };
    const vest = PRODUCTS.find(
      (product) => product.id === 'drift-insulated-vest',
    )!;

    expect(scoreProduct(vest, mission).violations.length).toBe(1);
    expect(scoreProduct(vest, withoutDeadline).violations).toEqual([]);
  });

  test('reports needs the cart does not cover yet', () => {
    expect(uncoveredNeeds(mission, [])).toEqual(mission.needs);
    expect(uncoveredNeeds(mission, ['basalt-two-tent'])).not.toContain(
      'shelter',
    );
  });
});
