/**
 * Her Shopping catalog.
 *
 * A deterministic fictional fixture. Every product, name, and description is
 * original to this project; nothing here maps to a real merchant or SKU.
 */

export const PRODUCT_CATEGORIES = [
  'shelter',
  'warmth',
  'sleep',
  'cooking',
  'lighting',
  'carry',
  'utility',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PURPOSE_TAGS = [
  'shelter',
  'warmth',
  'weather',
  'sleep',
  'cooking',
  'hydration',
  'light',
  'navigation',
  'carry',
  'power',
  'safety',
  'comfort',
] as const;

export type PurposeTag = (typeof PURPOSE_TAGS)[number];

export type BasePriority = 'essential' | 'useful' | 'optional';

export type Product = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  purposeTags: PurposeTag[];
  priceCents: number;
  weightGrams: number;
  /** 0–10 cold-weather score used by mission fit. */
  warmthRating: number;
  deliveryDays: number;
  inventory: number;
  badges: string[];
  /** Fallback grouping when no mission is active. */
  basePriority: BasePriority;
  /** Crop of the shared flat-lay illustration used as product art. */
  imagePosition: string;
  featured?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: 'thermal-ridge-jacket',
    name: 'Thermal Ridge Jacket',
    description:
      'Packable synthetic insulation that holds warmth through wind-cut ridgelines.',
    category: 'warmth',
    purposeTags: ['warmth', 'weather'],
    priceCents: 16800,
    weightGrams: 410,
    warmthRating: 9,
    deliveryDays: 2,
    inventory: 12,
    badges: ['Cold-weather pick'],
    basePriority: 'essential',
    imagePosition: '32% 28%',
    featured: true,
  },
  {
    id: 'aurora-down-quilt',
    name: 'Aurora Down Quilt',
    description:
      'A compressible sleep system rated to −8°C for shoulder-season camps.',
    category: 'sleep',
    purposeTags: ['sleep', 'warmth'],
    priceCents: 18400,
    weightGrams: 780,
    warmthRating: 10,
    deliveryDays: 3,
    inventory: 7,
    badges: ['Warmest'],
    basePriority: 'essential',
    imagePosition: '70% 92%',
  },
  {
    id: 'tundra-sleep-pad',
    name: 'Tundra Sleep Pad',
    description:
      'Insulated ground comfort at an R-value of 5.4 without the usual pack bulk.',
    category: 'sleep',
    purposeTags: ['sleep', 'comfort'],
    priceCents: 8900,
    weightGrams: 520,
    warmthRating: 8,
    deliveryDays: 2,
    inventory: 15,
    badges: ['R-value 5.4'],
    basePriority: 'essential',
    imagePosition: '100% 60%',
  },
  {
    id: 'stormproof-shell',
    name: 'Stormproof Shell',
    description:
      'Three-layer waterproof protection for sudden coastal weather.',
    category: 'warmth',
    purposeTags: ['weather', 'warmth'],
    priceCents: 14900,
    weightGrams: 330,
    warmthRating: 6,
    deliveryDays: 1,
    inventory: 9,
    badges: ['Arrives tomorrow'],
    basePriority: 'essential',
    imagePosition: '45% 22%',
  },
  {
    id: 'basalt-two-tent',
    name: 'Basalt Two Tent',
    description:
      'A low-profile two-person tent braced for sustained crosswind.',
    category: 'shelter',
    purposeTags: ['shelter', 'weather'],
    priceCents: 28900,
    weightGrams: 2100,
    warmthRating: 5,
    deliveryDays: 3,
    inventory: 5,
    badges: ['Four-season frame'],
    basePriority: 'essential',
    imagePosition: '80% 30%',
    featured: true,
  },
  {
    id: 'windward-bivy',
    name: 'Windward Bivy',
    description:
      'A minimal one-person shelter for fast, light overnight pushes.',
    category: 'shelter',
    purposeTags: ['shelter'],
    priceCents: 13200,
    weightGrams: 980,
    warmthRating: 4,
    deliveryDays: 2,
    inventory: 8,
    badges: [],
    basePriority: 'useful',
    imagePosition: '88% 55%',
  },
  {
    id: 'merino-base-layer',
    name: 'Merino 200 Base',
    description:
      'Breathable temperature control that stays fresh across repeat wear.',
    category: 'warmth',
    purposeTags: ['warmth', 'comfort'],
    priceCents: 7200,
    weightGrams: 210,
    warmthRating: 8,
    deliveryDays: 2,
    inventory: 20,
    badges: ['Odor resistant'],
    basePriority: 'useful',
    imagePosition: '68% 100%',
  },
  {
    id: 'highland-fleece-mid',
    name: 'Highland Fleece Mid',
    description:
      'A grid-fleece mid layer that works as a lighter, cheaper insulation option.',
    category: 'warmth',
    purposeTags: ['warmth'],
    priceCents: 9800,
    weightGrams: 380,
    warmthRating: 7,
    deliveryDays: 2,
    inventory: 14,
    badges: ['Value pick'],
    basePriority: 'useful',
    imagePosition: '75% 84%',
  },
  {
    id: 'drift-insulated-vest',
    name: 'Drift Insulated Vest',
    description:
      'Core warmth with free arms — made to order, so it ships slower.',
    category: 'warmth',
    purposeTags: ['warmth'],
    priceCents: 8400,
    weightGrams: 260,
    warmthRating: 6,
    deliveryDays: 6,
    inventory: 4,
    badges: ['Made to order'],
    basePriority: 'optional',
    imagePosition: '25% 20%',
  },
  {
    id: 'saga-daypack',
    name: 'Saga 28L Daypack',
    description:
      'Balanced trail carry with a weatherproof roll top and hip transfer.',
    category: 'carry',
    purposeTags: ['carry'],
    priceCents: 9600,
    weightGrams: 890,
    warmthRating: 2,
    deliveryDays: 2,
    inventory: 11,
    badges: [],
    basePriority: 'useful',
    imagePosition: '95% 5%',
  },
  {
    id: 'ember-cookset',
    name: 'Ember Nest Cookset',
    description: 'A two-person nesting set in hard-anodized aluminum.',
    category: 'cooking',
    purposeTags: ['cooking'],
    priceCents: 6400,
    weightGrams: 420,
    warmthRating: 1,
    deliveryDays: 2,
    inventory: 13,
    badges: [],
    basePriority: 'useful',
    imagePosition: '40% 98%',
  },
  {
    id: 'gust-camp-stove',
    name: 'Gust Camp Stove',
    description: 'A shielded burner that still lights in a steady side wind.',
    category: 'cooking',
    purposeTags: ['cooking'],
    priceCents: 7800,
    weightGrams: 340,
    warmthRating: 1,
    deliveryDays: 1,
    inventory: 10,
    badges: ['Wind shielded'],
    basePriority: 'useful',
    imagePosition: '44% 100%',
  },
  {
    id: 'northstar-lantern',
    name: 'Northstar Lantern',
    description: 'Warm dimmable camp light with a two-night battery.',
    category: 'lighting',
    purposeTags: ['light'],
    priceCents: 4200,
    weightGrams: 290,
    warmthRating: 1,
    deliveryDays: 1,
    inventory: 18,
    badges: [],
    basePriority: 'useful',
    imagePosition: '8% 81%',
  },
  {
    id: 'beacon-headlamp',
    name: 'Beacon Headlamp',
    description: 'Hands-free light with a red night mode for shared tents.',
    category: 'lighting',
    purposeTags: ['light', 'safety'],
    priceCents: 3800,
    weightGrams: 92,
    warmthRating: 0,
    deliveryDays: 1,
    inventory: 22,
    badges: [],
    basePriority: 'useful',
    imagePosition: '12% 90%',
  },
  {
    id: 'pocket-water-filter',
    name: 'Pocket Water Filter',
    description: 'Fast trail filtration in a palm-sized form.',
    category: 'utility',
    purposeTags: ['hydration'],
    priceCents: 3600,
    weightGrams: 85,
    warmthRating: 0,
    deliveryDays: 3,
    inventory: 16,
    badges: [],
    basePriority: 'useful',
    imagePosition: '30% 95%',
  },
  {
    id: 'glacier-flask',
    name: 'Glacier Flask',
    description:
      'A vacuum flask that keeps a litre hot from breakfast to the ridge.',
    category: 'utility',
    purposeTags: ['hydration', 'comfort'],
    priceCents: 3400,
    weightGrams: 310,
    warmthRating: 2,
    deliveryDays: 2,
    inventory: 19,
    badges: [],
    basePriority: 'optional',
    imagePosition: '42% 92%',
  },
  {
    id: 'trail-merino-socks',
    name: 'Trail Merino Socks',
    description: 'Cushioned crew socks for cold, long-mile days.',
    category: 'warmth',
    purposeTags: ['warmth', 'comfort'],
    priceCents: 2800,
    weightGrams: 95,
    warmthRating: 7,
    deliveryDays: 1,
    inventory: 30,
    badges: [],
    basePriority: 'optional',
    imagePosition: '100% 100%',
  },
  {
    id: 'thermal-glove-liners',
    name: 'Thermal Glove Liners',
    description:
      'Thin liners that keep dexterity while pitching camp in the cold.',
    category: 'warmth',
    purposeTags: ['warmth'],
    priceCents: 3200,
    weightGrams: 78,
    warmthRating: 6,
    deliveryDays: 2,
    inventory: 24,
    badges: [],
    basePriority: 'optional',
    imagePosition: '92% 96%',
  },
  {
    id: 'weatherproof-map-case',
    name: 'Weatherproof Map Case',
    description: 'A clear, low-profile home for paper navigation.',
    category: 'utility',
    purposeTags: ['navigation'],
    priceCents: 1800,
    weightGrams: 120,
    warmthRating: 0,
    deliveryDays: 2,
    inventory: 26,
    badges: [],
    basePriority: 'optional',
    imagePosition: '5% 30%',
  },
  {
    id: 'fjord-camp-mug',
    name: 'Fjord Camp Mug',
    description: 'A double-wall mug that keeps morning coffee hot in the wind.',
    category: 'cooking',
    purposeTags: ['comfort', 'cooking'],
    priceCents: 2400,
    weightGrams: 160,
    warmthRating: 1,
    deliveryDays: 2,
    inventory: 28,
    badges: [],
    basePriority: 'optional',
    imagePosition: '47% 100%',
  },
  {
    id: 'summit-power-bank',
    name: 'Summit Power Bank',
    description:
      'Cold-tolerant cells for three phone charges — restocking, so it ships late.',
    category: 'utility',
    purposeTags: ['power'],
    priceCents: 5600,
    weightGrams: 240,
    warmthRating: 0,
    deliveryDays: 8,
    inventory: 3,
    badges: ['Backordered'],
    basePriority: 'optional',
    imagePosition: '38% 88%',
  },
  {
    id: 'field-repair-kit',
    name: 'Field Repair Kit',
    description:
      'Patches, cord, and a needle for the failure you did not plan for.',
    category: 'utility',
    purposeTags: ['safety'],
    priceCents: 2600,
    weightGrams: 140,
    warmthRating: 0,
    deliveryDays: 3,
    inventory: 21,
    badges: [],
    basePriority: 'optional',
    imagePosition: '85% 42%',
  },
];

export const PRODUCT_IDS = PRODUCTS.map((product) => product.id);

const PRODUCTS_BY_ID = new Map(
  PRODUCTS.map((product) => [product.id, product]),
);

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS_BY_ID.get(productId);
}

export function requireProduct(productId: string): Product {
  const product = PRODUCTS_BY_ID.get(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  return product;
}

export function isProductId(value: unknown): value is string {
  return typeof value === 'string' && PRODUCTS_BY_ID.has(value);
}
