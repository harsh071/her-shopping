import type { Product, PurposeTag } from '@/lib/catalog/products';
import type {
  GroupSectionId,
  PageSectionId,
  SectionId,
} from '@/lib/state/sections';

export type Actor = 'human' | 'agent' | 'voice' | 'system';

export type ConstraintKind = 'hard' | 'preference';

export type ConstraintIcon =
  | 'budget'
  | 'warmth'
  | 'delivery'
  | 'weight'
  | 'party'
  | 'general';

export type MissionConstraint = {
  id: string;
  label: string;
  kind: ConstraintKind;
  icon: ConstraintIcon;
};

export type MissionDeadline = {
  /** Human label such as "Friday". */
  label: string;
  /** Whole days from today that the deadline allows for delivery. */
  days: number;
};

export type Mission = {
  title: string;
  context: string;
  budgetCents: number | null;
  partySize: number | null;
  deadline: MissionDeadline | null;
  constraints: MissionConstraint[];
  /** Purpose tags the mission needs covered, derived from the phrasing. */
  needs: PurposeTag[];
  /** Attributes the person said to prioritise. */
  priorities: MissionPriority[];
};

export type MissionPriority = 'warmth' | 'weight' | 'price' | 'delivery';

export type LayoutMode = 'browse' | 'mission' | 'compare';

export type ProductGrouping = 'category' | 'priority' | 'purpose';

export type ProductSort = 'featured' | 'price-low' | 'mission-fit' | 'delivery';

export type ComparisonAttribute = 'warmth' | 'delivery' | 'weight' | 'price';

export type LayoutState = {
  mode: LayoutMode;
  sectionOrder: PageSectionId[];
  groupOrder: GroupSectionId[];
  hiddenSections: SectionId[];
  productGrouping: ProductGrouping;
  productSort: ProductSort;
  /** Products staged for comparison by clicking the select control. */
  focusedProductIds: string[];
  comparisonProductIds: string[];
  referenceProductId: string | null;
  comparisonAttributes: ComparisonAttribute[];
};

export type SelectedEntity =
  | { kind: 'product'; id: string }
  | { kind: 'section'; id: SectionId }
  | { kind: 'constraint'; id: string }
  | { kind: 'panel'; id: 'cart' | 'comparison' };

export type CartLine = {
  productId: string;
  quantity: number;
  addedBy: Actor;
  reason?: string;
};

export type CartState = {
  lines: CartLine[];
};

export type CheckoutStage =
  | 'idle'
  | 'review'
  | 'awaiting-confirmation'
  | 'placed';

export type DemoOrderLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type DemoOrder = {
  id: string;
  placedAt: number;
  lines: DemoOrderLine[];
  itemCount: number;
  subtotalCents: number;
  slowestDeliveryDays: number;
};

export type CheckoutState = {
  stage: CheckoutStage;
  /** Issued by preview_checkout; place_demo_order must echo it back. */
  token: string | null;
  warnings: string[];
  requestedBy: Actor | null;
  order: DemoOrder | null;
};

export type ActivityEntry = {
  id: string;
  at: number;
  actor: Actor;
  action: string;
  title: string;
  detail: string;
  ok: boolean;
  undoToken: string | null;
};

/** Everything an undo snapshot restores. Activity and history are excluded. */
export type ReversibleState = {
  mission: Mission | null;
  layout: LayoutState;
  selection: SelectedEntity | null;
  cart: CartState;
  checkout: CheckoutState;
};

export type ReversibleSnapshot = ReversibleState & {
  undoToken: string;
  label: string;
};

export type CapabilityState = {
  webmcpAvailable: boolean;
  registeredTools: string[];
  registrationError: string | null;
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  lastValidationError: string | null;
};

export type VoiceStatus =
  | 'unsupported'
  | 'idle'
  | 'requesting-microphone'
  | 'connecting'
  | 'live'
  | 'listening'
  | 'speaking'
  | 'error'
  | 'closed';

/**
 * The region the most recent action wants brought into view. `version` lets the
 * interface scroll once per action, even when the same target repeats.
 */
export type FocusRequest = {
  target: string;
  version: number;
};

export type HerShoppingState = ReversibleState & {
  focus: FocusRequest | null;
  activity: ActivityEntry[];
  history: ReversibleSnapshot[];
  stateVersion: number;
  capabilities: CapabilityState;
  lastAction: { name: string; ok: boolean; summary: string } | null;
};

export type ActionResult<T = unknown> = {
  ok: boolean;
  actionId: string;
  summary: string;
  data?: T;
  changedEntityIds: string[];
  warnings: string[];
  undoToken?: string;
  stateVersion: number;
};

export type MissionFit = {
  product: Product;
  score: number;
  priority: 'essential' | 'useful' | 'optional';
  reasons: string[];
  violations: string[];
};
