import { PRODUCT_IDS, PURPOSE_TAGS, getProduct } from '@/lib/catalog/products';
import { dollars, pluralize } from '@/lib/format';
import {
  auditSchema,
  validateInput,
  type JsonSchema,
} from '@/lib/capabilities/schema';
import {
  CARD_ATTRIBUTES,
  CARD_LAYOUTS,
  COLUMN_SETTINGS,
  IMAGE_SCALES,
  PRESENTATION_PRESET_NAMES,
  PRICE_EMPHASES,
} from '@/lib/state/presentation';
import { ALL_SECTION_IDS } from '@/lib/state/sections';
import {
  cartLines,
  cartSummary,
  pageContext,
  searchProducts,
} from '@/lib/state/selectors';
import type { HerShoppingStore } from '@/lib/state/store';
import type {
  ActionResult,
  Actor,
  CardAttribute,
  CardLayout,
  ColumnSetting,
  ComparisonAttribute,
  ImageScale,
  PresentationPreset,
  PriceEmphasis,
} from '@/lib/state/types';

export type CapabilitySafety =
  | 'read'
  | 'reversible-layout'
  | 'reversible-commerce'
  | 'consequential';

export type Capability = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  readOnly: boolean;
  safety: CapabilitySafety;
  run: (store: HerShoppingStore, input: unknown, actor: Actor) => ActionResult;
};

const STATE_VERSION_PROPERTY: JsonSchema = {
  type: 'integer',
  minimum: 1,
  maximum: 100000,
  description:
    'Optional. The state version the caller believes the page is at. The action is refused if the page has moved on.',
};

function objectSchema(
  properties: Record<string, JsonSchema>,
  required: string[] = [],
  includeStateVersion = true,
): JsonSchema {
  return {
    type: 'object',
    properties: includeStateVersion
      ? { ...properties, expectedStateVersion: STATE_VERSION_PROPERTY }
      : properties,
    required,
    additionalProperties: false,
  };
}

function readResult(
  store: HerShoppingStore,
  summary: string,
  data: unknown,
): ActionResult {
  return {
    ok: true,
    actionId: `read_${store.getState().stateVersion}`,
    summary,
    data,
    changedEntityIds: [],
    warnings: [],
    stateVersion: store.getState().stateVersion,
  };
}

const productIdSchema: JsonSchema = {
  type: 'string',
  enum: PRODUCT_IDS,
  description: 'A catalog product id.',
};

const sectionIdSchema: JsonSchema = {
  type: 'string',
  enum: [...ALL_SECTION_IDS],
  description:
    'A known page section or product group id. Free-form selectors are not accepted.',
};

/**
 * The single capability registry.
 *
 * WebMCP registration, the realtime voice agent, the diagnostics panel, and the
 * tests all read this one list, so the site cannot advertise a tool it does not
 * implement or implement one it does not advertise.
 */
export const CAPABILITIES: Capability[] = [
  {
    name: 'get_page_context',
    title: 'Get page context',
    description:
      'Read the current mission, layout mode, visible sections and product groups, the entity the person has selected, cart totals, and the state version. Read-only: nothing on the page changes.',
    inputSchema: objectSchema({}, [], false),
    readOnly: true,
    safety: 'read',
    run: (store) => {
      const context = pageContext(store.getState());
      return readResult(
        store,
        `Mode ${context.mode}, ${context.visibleGroups.length} visible groups, cart ${dollars(context.cart.subtotalCents)}.`,
        context,
      );
    },
  },

  {
    name: 'search_products',
    title: 'Search the catalog',
    description:
      'Find catalog products by text, purpose, price ceiling, delivery ceiling, or minimum warmth, ranked by the current sort. Read-only: use it to obtain product ids before calling a write tool.',
    inputSchema: objectSchema(
      {
        query: {
          type: 'string',
          maxLength: 80,
          description:
            'Free text matched against name, description, and category.',
        },
        purpose: { type: 'string', enum: [...PURPOSE_TAGS] },
        maxPriceCents: { type: 'integer', minimum: 100, maximum: 1000000 },
        maxDeliveryDays: { type: 'integer', minimum: 1, maximum: 30 },
        minWarmth: { type: 'integer', minimum: 0, maximum: 10 },
        limit: { type: 'integer', minimum: 1, maximum: 12, default: 8 },
      },
      [],
      false,
    ),
    readOnly: true,
    safety: 'read',
    run: (store, input) => {
      const args = validateInput<{
        query?: string;
        purpose?: string;
        maxPriceCents?: number;
        maxDeliveryDays?: number;
        minWarmth?: number;
        limit?: number;
      }>(CAPABILITY_SCHEMAS.search_products, input);
      const results = searchProducts(store.getState(), args);
      return readResult(
        store,
        `${results.length} matching ${pluralize(results.length, 'product')}.`,
        {
          results,
        },
      );
    },
  },

  {
    name: 'get_cart',
    title: 'Get cart',
    description:
      'Read the cart lines, subtotal, item count, remaining mission budget, and any constraint warnings. Read-only.',
    inputSchema: objectSchema({}, [], false),
    readOnly: true,
    safety: 'read',
    run: (store) => {
      const state = store.getState();
      const summary = cartSummary(state);
      const lines = cartLines(state).map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        unitPriceCents: line.product.priceCents,
        lineTotalCents: line.lineTotalCents,
        deliveryDays: line.product.deliveryDays,
      }));
      return readResult(
        store,
        `${summary.itemCount} ${pluralize(summary.itemCount, 'item')}, ${dollars(summary.subtotalCents)}.`,
        { lines, ...summary, warnings: pageContext(state).warnings },
      );
    },
  },

  {
    name: 'set_mission',
    title: 'Set the shopping mission',
    description:
      'Record what the person is trying to accomplish and reorganise the store around it. Budget, deadline, party size, and priorities are parsed into visible, editable chips. Reversible page state changes; no order is placed.',
    inputSchema: objectSchema(
      {
        mission: {
          type: 'string',
          minLength: 8,
          maxLength: 320,
          description:
            "The outcome in the person's own words, including any budget and deadline.",
        },
        applyMissionView: {
          type: 'boolean',
          default: true,
          description:
            'Whether to switch the page into Mission View immediately.',
        },
      },
      ['mission'],
    ),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        mission: string;
        applyMissionView?: boolean;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.set_mission, input);
      return store.dispatch(
        {
          type: 'set_mission',
          actor,
          missionText: args.mission,
          applyView: args.applyMissionView,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'apply_mission_view',
    title: 'Apply Mission View',
    description:
      'Switch the page to Mission View: group products into Essential, Useful, and Optional by mission fit and optionally hide promotional sections. Reversible.',
    inputSchema: objectSchema({
      hideIrrelevantSections: { type: 'boolean', default: true },
    }),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        hideIrrelevantSections?: boolean;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.apply_mission_view, input);
      return store.dispatch(
        {
          type: 'apply_mission_view',
          actor,
          hideIrrelevantSections: args.hideIrrelevantSections,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'organize_products',
    title: 'Regroup and sort the catalog',
    description:
      'Regroup and re-sort the visible catalog using approved layout modes only. Does not change catalog or cart data. Reversible.',
    inputSchema: objectSchema({
      groupBy: { type: 'string', enum: ['category', 'priority', 'purpose'] },
      sortBy: {
        type: 'string',
        enum: ['featured', 'price-low', 'mission-fit', 'delivery'],
      },
    }),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        groupBy?: 'category' | 'priority' | 'purpose';
        sortBy?: 'featured' | 'price-low' | 'mission-fit' | 'delivery';
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.organize_products, input);
      return store.dispatch(
        { type: 'organize_products', actor, ...args },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'set_card_presentation',
    title: 'Restyle the product cards',
    description:
      "Change how product cards are presented: their shape, how many sit per row, how loudly the price reads, how large the imagery is, which facts appear on the card face, and whether descriptions show. Choose a named preset, individual settings, or both. Only the store's own designs are available — no markup, styles, or sizes can be supplied. Reversible layout-only change.",
    inputSchema: objectSchema({
      preset: {
        type: 'string',
        enum: [...PRESENTATION_PRESET_NAMES],
        description:
          'A coherent starting design. "dense-decision" for comparing many options, "visual-browse" for imagery, "price-first" when budget is the question, "default" to return to the standard cards.',
      },
      cardLayout: { type: 'string', enum: [...CARD_LAYOUTS] },
      columns: {
        type: 'string',
        enum: [...COLUMN_SETTINGS],
        description:
          'Cards per row. "auto" follows the responsive default; list layout is always one.',
      },
      priceEmphasis: { type: 'string', enum: [...PRICE_EMPHASES] },
      imageScale: { type: 'string', enum: [...IMAGE_SCALES] },
      cardAttributes: {
        type: 'array',
        minItems: 0,
        maxItems: 4,
        uniqueItems: true,
        items: { type: 'string', enum: [...CARD_ATTRIBUTES] },
        description:
          'Facts shown on the card face, in order. An empty array shows none. Supplying this turns off the automatic mission-aware choice.',
      },
      automaticAttributes: {
        type: 'boolean',
        description:
          'Set true to return to the automatic, mission-aware attribute row. Cannot be combined with cardAttributes.',
      },
      showDescriptions: { type: 'boolean' },
    }),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        preset?: PresentationPreset;
        cardLayout?: CardLayout;
        columns?: ColumnSetting;
        priceEmphasis?: PriceEmphasis;
        imageScale?: ImageScale;
        cardAttributes?: CardAttribute[];
        automaticAttributes?: boolean;
        showDescriptions?: boolean;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.set_card_presentation, input);
      const { expectedStateVersion, ...presentation } = args;
      return store.dispatch(
        { type: 'set_card_presentation', actor, ...presentation },
        { expectedStateVersion },
      );
    },
  },

  {
    name: 'set_section_visibility',
    title: 'Show or hide page sections',
    description:
      'Show or hide known page sections and product groups. Protected regions stay visible and hidden sections remain recoverable. Reversible layout-only change.',
    inputSchema: objectSchema(
      {
        sectionIds: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          uniqueItems: true,
          items: sectionIdSchema,
        },
        visible: { type: 'boolean' },
        reason: {
          type: 'string',
          enum: ['irrelevant', 'focus', 'user-request'],
        },
      },
      ['sectionIds', 'visible'],
    ),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        sectionIds: string[];
        visible: boolean;
        reason?: 'irrelevant' | 'focus' | 'user-request';
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.set_section_visibility, input);
      return store.dispatch(
        {
          type: 'set_section_visibility',
          actor,
          sectionIds: args.sectionIds as never,
          visible: args.visible,
          reason: args.reason,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'move_section',
    title: 'Move a section',
    description:
      'Move one known section before or after another. Page sections move among page sections; product groups move among product groups. Reversible.',
    inputSchema: objectSchema(
      {
        sectionId: sectionIdSchema,
        relation: { type: 'string', enum: ['before', 'after'] },
        anchorSectionId: sectionIdSchema,
      },
      ['sectionId', 'relation', 'anchorSectionId'],
    ),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        sectionId: string;
        relation: 'before' | 'after';
        anchorSectionId: string;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.move_section, input);
      return store.dispatch(
        {
          type: 'move_section',
          actor,
          sectionId: args.sectionId as never,
          relation: args.relation,
          anchorSectionId: args.anchorSectionId as never,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'select_entity',
    title: 'Select an entity',
    description:
      'Set what the word "this" refers to on the page — a product, a section, a mission constraint, or a panel. Draws the same visible selection outline a click would.',
    inputSchema: objectSchema(
      {
        kind: {
          type: 'string',
          enum: ['product', 'section', 'constraint', 'panel', 'none'],
        },
        id: { type: 'string', maxLength: 64 },
      },
      ['kind'],
    ),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        kind: 'product' | 'section' | 'constraint' | 'panel' | 'none';
        id?: string;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.select_entity, input);
      if (args.kind === 'none') {
        return store.dispatch(
          { type: 'select_entity', actor, entity: null },
          { expectedStateVersion: args.expectedStateVersion },
        );
      }
      if (!args.id) {
        return store.dispatch(
          { type: 'select_entity', actor, entity: null },
          { expectedStateVersion: args.expectedStateVersion },
        );
      }
      return store.dispatch(
        {
          type: 'select_entity',
          actor,
          entity: { kind: args.kind, id: args.id } as never,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'create_comparison',
    title: 'Compare products',
    description:
      'Open Comparison View for two to four in-stock catalog products, optionally pinning a reference product and ordering the attributes that matter for this mission. Reversible.',
    inputSchema: objectSchema(
      {
        productIds: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          uniqueItems: true,
          items: productIdSchema,
        },
        referenceProductId: productIdSchema,
        prioritizeAttributes: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          uniqueItems: true,
          items: {
            type: 'string',
            enum: ['warmth', 'delivery', 'weight', 'price'],
          },
        },
      },
      ['productIds'],
    ),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        productIds: string[];
        referenceProductId?: string;
        prioritizeAttributes?: ComparisonAttribute[];
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.create_comparison, input);
      return store.dispatch(
        {
          type: 'create_comparison',
          actor,
          productIds: args.productIds,
          referenceProductId: args.referenceProductId,
          prioritizeAttributes: args.prioritizeAttributes,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'set_reference_product',
    title: 'Pin a reference product',
    description:
      'Pin one product as the reference that alternatives are measured against. Reversible.',
    inputSchema: objectSchema({ productId: productIdSchema }, ['productId']),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        productId: string;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.set_reference_product, input);
      return store.dispatch(
        { type: 'set_reference_product', actor, productId: args.productId },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'exit_comparison',
    title: 'Close the comparison',
    description:
      'Leave Comparison View and restore the previous layout. Reversible.',
    inputSchema: objectSchema({}),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{ expectedStateVersion?: number }>(
        CAPABILITY_SCHEMAS.exit_comparison,
        input,
      );
      return store.dispatch(
        { type: 'exit_comparison', actor },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'add_to_cart',
    title: 'Add products to the cart',
    description:
      'Add one to four known catalog products to the visible fictional cart, with bounded quantities and an optional short reason. This changes cart state and is reversible. It does not place an order.',
    inputSchema: objectSchema(
      {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              productId: productIdSchema,
              quantity: { type: 'integer', minimum: 1, maximum: 8 },
              reason: { type: 'string', maxLength: 120 },
            },
            required: ['productId', 'quantity'],
            additionalProperties: false,
          },
        },
      },
      ['items'],
    ),
    readOnly: false,
    safety: 'reversible-commerce',
    run: (store, input, actor) => {
      const args = validateInput<{
        items: Array<{ productId: string; quantity: number; reason?: string }>;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.add_to_cart, input);
      return store.dispatch(
        { type: 'add_to_cart', actor, items: args.items },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'update_cart_quantity',
    title: 'Update a cart quantity',
    description:
      'Set the quantity of one cart line, or remove it by setting the quantity to zero. Reversible; does not place an order.',
    inputSchema: objectSchema(
      {
        productId: productIdSchema,
        quantity: { type: 'integer', minimum: 0, maximum: 8 },
      },
      ['productId', 'quantity'],
    ),
    readOnly: false,
    safety: 'reversible-commerce',
    run: (store, input, actor) => {
      const args = validateInput<{
        productId: string;
        quantity: number;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.update_cart_quantity, input);
      return store.dispatch(
        {
          type: 'set_cart_quantity',
          actor,
          productId: args.productId,
          quantity: args.quantity,
        },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'undo_last_action',
    title: 'Undo the last action',
    description:
      'Restore the most recent reversible layout, comparison, or cart snapshot. Whoever made the change, human or agent, it is undone the same way.',
    inputSchema: objectSchema({}, [], false),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, _input, actor) => store.undo(actor),
  },

  {
    name: 'reset_experience',
    title: 'Reset the experience',
    description:
      'Return mission, layout, selection, comparison, cart, and checkout to the seeded Browse View. Ask the person before calling this: it discards their work.',
    inputSchema: objectSchema(
      {
        confirmed: {
          type: 'boolean',
          description:
            'Set to true only after the person has agreed to discard the current session.',
        },
      },
      ['confirmed'],
      false,
    ),
    readOnly: false,
    safety: 'consequential',
    run: (store, input, actor) => {
      const args = validateInput<{ confirmed: boolean }>(
        CAPABILITY_SCHEMAS.reset_experience,
        input,
      );
      if (!args.confirmed) {
        return {
          ok: false,
          actionId: `reset_blocked_${store.getState().stateVersion}`,
          summary:
            'Reset was not performed. Ask the person to confirm, then call again with confirmed: true.',
          changedEntityIds: [],
          warnings: ['Reset discards the mission, layout, and cart.'],
          stateVersion: store.getState().stateVersion,
        };
      }
      return store.reset(actor);
    },
  },

  {
    name: 'open_cart',
    title: 'Open or close the cart',
    description:
      'Bring the cart drawer on screen so the person can see the kit, its line items, and the running total — or close it again. This only moves the drawer: it changes no cart contents and places no order.',
    inputSchema: objectSchema({
      open: {
        type: 'boolean',
        default: true,
        description: 'True to show the cart, false to close it.',
      },
    }),
    readOnly: false,
    safety: 'reversible-layout',
    run: (store, input, actor) => {
      const args = validateInput<{
        open?: boolean;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.open_cart, input);
      return store.dispatch(
        { type: 'set_cart_open', actor, open: args.open ?? true },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'preview_checkout',
    title: 'Open the checkout review',
    description:
      'Validate the cart against stock, budget, and delivery constraints and open the visible review surface. Returns a confirmation token. No order is created.',
    inputSchema: objectSchema({}),
    readOnly: false,
    safety: 'reversible-commerce',
    run: (store, input, actor) => {
      const args = validateInput<{ expectedStateVersion?: number }>(
        CAPABILITY_SCHEMAS.preview_checkout,
        input,
      );
      return store.dispatch(
        { type: 'preview_checkout', actor },
        { expectedStateVersion: args.expectedStateVersion },
      );
    },
  },

  {
    name: 'place_demo_order',
    title: 'Request the demo order',
    description:
      'Ask for the fictional order to be placed. An agent can only raise the confirmation gate: the order is created solely when a person presses the visible Confirm control. Check data.orderPlaced before telling anyone the order exists.',
    inputSchema: objectSchema(
      {
        token: {
          type: 'string',
          maxLength: 64,
          description: 'The token returned by preview_checkout.',
        },
      },
      [],
    ),
    readOnly: false,
    safety: 'consequential',
    run: (store, input, actor) => {
      const args = validateInput<{
        token?: string;
        expectedStateVersion?: number;
      }>(CAPABILITY_SCHEMAS.place_demo_order, input);
      const state = store.getState();

      if (state.checkout.stage === 'placed' && state.checkout.order) {
        return {
          ok: true,
          actionId: `order_${state.checkout.order.id}`,
          summary: `Demo order ${state.checkout.order.id} was already confirmed by the person for ${dollars(state.checkout.order.subtotalCents)}.`,
          data: { orderPlaced: true, order: state.checkout.order },
          changedEntityIds: ['checkout'],
          warnings: [],
          stateVersion: state.stateVersion,
        };
      }

      if (
        args.token &&
        state.checkout.token &&
        args.token !== state.checkout.token
      ) {
        return {
          ok: false,
          actionId: `order_stale_${state.stateVersion}`,
          summary: 'That checkout token is stale. Call preview_checkout again.',
          changedEntityIds: [],
          warnings: [],
          stateVersion: state.stateVersion,
        };
      }

      const result = store.dispatch(
        { type: 'request_order_confirmation', actor },
        { expectedStateVersion: args.expectedStateVersion },
      );
      if (!result.ok) return result;

      const after = store.getState();
      const summaryLines = cartLines(after)
        .map((line) => `${line.quantity} × ${line.product.name}`)
        .join(', ');

      return {
        ...result,
        summary: `Waiting for the person to confirm. ${summaryLines} — ${dollars(cartSummary(after).subtotalCents)}. No order exists yet.`,
        data: {
          orderPlaced: false,
          awaitingHumanConfirmation: true,
          token: after.checkout.token,
          itemCount: cartSummary(after).itemCount,
          subtotalCents: cartSummary(after).subtotalCents,
          warnings: after.checkout.warnings,
        },
      };
    },
  },
];

export const CAPABILITY_SCHEMAS: Record<string, JsonSchema> =
  Object.fromEntries(
    CAPABILITIES.map((capability) => [capability.name, capability.inputSchema]),
  );

export const CAPABILITIES_BY_NAME: Record<string, Capability> =
  Object.fromEntries(
    CAPABILITIES.map((capability) => [capability.name, capability]),
  );

export const CAPABILITY_NAMES = CAPABILITIES.map(
  (capability) => capability.name,
);

/** Every published schema must be closed and bounded. Exercised by the tests. */
export function auditCapabilities(): string[] {
  return CAPABILITIES.flatMap((capability) =>
    auditSchema(capability.inputSchema, capability.name).map(
      (problem) => problem,
    ),
  );
}

export function describeProductForAgent(productId: string) {
  const product = getProduct(productId);
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    priceCents: product.priceCents,
    deliveryDays: product.deliveryDays,
    warmthRating: product.warmthRating,
    weightGrams: product.weightGrams,
  };
}
