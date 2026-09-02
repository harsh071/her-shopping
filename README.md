# Her Shopping

**A storefront that redraws itself around your mission.**

Her Shopping is a fictional outdoor store whose interface reorganises itself around
what the shopper is actually trying to accomplish. You say the goal out loud — the
page regroups, reprioritises, hides what stopped mattering, and surfaces the
tradeoffs — and every one of those changes is something you can also do by hand,
inspect, and undo.

It is built for the WebMCP Challenge. The site exposes 20 typed, bounded site
tools through `document.modelContext.registerTool(...)`, and an in-page realtime
voice agent drives the *same* tools. The page is the artifact; the conversation is
just one way to reach it.

> **Demo mission:** “I am going camping in Iceland for five days. Keep the total
> below $700, prioritise warmth and Friday delivery, and reorganise the store
> around what I need.”

---

## Why this is a strong WebMCP fit

Most agent-in-a-store demos let a model operate the store's existing layout:
search, click, add to cart. Her Shopping exposes the *information architecture
itself* as an agent-manipulable, human-visible medium.

The tools are not simulated clicks. They are semantic operations on a validated
layout model — inspect, group, sort, focus, hide, restore, compare, pin, transact —
that the site already uses for its own human controls. That makes the WebMCP
surface load-bearing rather than decorative:

- **Shared state.** A mouse click, a spoken sentence, and an external agent's tool
  call all go through one action layer, one reducer, one set of invariants.
- **Verifiable results.** Every write returns `{ ok, summary, changedEntityIds,
  warnings, undoToken, stateVersion }`, so an agent checks the result instead of
  assuming it.
- **Legible transformation.** Anything the agent changes is named on screen, listed
  in the activity ledger, and reversible with one press. The page also scrolls to
  whatever just changed and rings it briefly, so a change made while you are
  reading somewhere else is never missed.
- **A real safety boundary.** An agent can raise the checkout confirmation gate. It
  cannot clear it. Only the visible human control creates the fictional order.

## What people and agents can do together

| | |
| --- | --- |
| **Say the mission** | The store leaves Browse View, regroups 22 products into Essential / Useful / Optional by mission fit, promotes warmth and delivery onto every card, and hides the promotional sections. |
| **Point at something** | Clicking a card, a section, or a constraint chip sets `selectedEntity`, so “make this the reference” and “show cheaper alternatives beside this” resolve to a real thing instead of a guess. |
| **Argue with the plan** | Constraint chips are editable. Delete “Arrives by Friday” and blocked products stop being blocked — the same recalculation the agent sees. |
| **Restyle the cards** | Ask for a dense comparison list, a visual gallery, or large prices, and the cards change shape — chosen from designs the store ships, never from generated CSS. |
| **Reorganise by hand** | Group, sort, move, hide, restore, restyle, undo, reset. Every agent tool has a keyboard-accessible human equivalent. |
| **Check out safely** | Simulated order, no payment, no address, no personal data, and an explicit human confirmation gate. |

---

## Quick start

```bash
npm install
cp .env.example .env.local     # add OPENAI_API_KEY for voice (optional)
npm run dev                    # http://localhost:3000
```

The store is fully usable with no API key and no microphone — voice and WebMCP are
progressive enhancements, not requirements.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm test` | Vitest: actions, invariants, schemas, tool registration |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | oxlint |

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Voice only | **Server-only.** Used to mint short-lived realtime credentials. Never sent to the browser. |
| `OPENAI_REALTIME_MODEL` | No | Defaults to `gpt-realtime`. |
| `OPENAI_REALTIME_VOICE` | No | Defaults to `marin`. |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute URLs for page metadata. |

---

## Trying the WebMCP tools

**ChatGPT in-app browser** — open the deployed URL with Site tools enabled. The
header pill reads `Agent-ready · 20/20 tools` when registration succeeded.

**Chrome 149+** — enable `chrome://flags/#enable-webmcp-testing`, restart, then
open the site.

Click the header pill to open the diagnostics panel: it reports whether the API was
detected, which tools registered, the current state version, the selected entity,
the last action and its outcome, the realtime session state, and the last validation
error. There is also a reset-to-seed button for recovering a demo quickly.

If neither environment is available, the pill reads `Human mode` and the entire
store still works — nothing is gated behind an agent.

### Tool contract

Every schema sets `additionalProperties: false`; every string, array, quantity, and
product id is bounded or enumerated. No tool accepts markup, CSS, selectors, URLs,
or filesystem paths — including `set_card_presentation`, which chooses among the
store's own card designs rather than accepting styles.

| Tool | Kind | Purpose |
| --- | --- | --- |
| `get_page_context` | Read | Read the current mission, layout mode, visible sections and product groups, the entity the person has selected, cart totals, and the state version. |
| `search_products` | Read | Find catalog products by text, purpose, price ceiling, delivery ceiling, or minimum warmth, ranked by the current sort. |
| `get_cart` | Read | Read the cart lines, subtotal, item count, remaining mission budget, and any constraint warnings. |
| `set_mission` | Write | Record what the person is trying to accomplish and reorganise the store around it. |
| `apply_mission_view` | Write | Group products into Essential, Useful, and Optional by mission fit and optionally hide promotional sections. |
| `organize_products` | Write | Regroup and re-sort the visible catalog using approved layout modes only. |
| `set_card_presentation` | Write | Restyle the cards: shape, cards per row, price weight, image scale, which facts show, descriptions on or off. |
| `set_section_visibility` | Write | Show or hide known page sections and product groups. |
| `move_section` | Write | Move one known section before or after another. |
| `select_entity` | Write | Set what the word “this” refers to — a product, a section, a constraint, or a panel. |
| `create_comparison` | Write | Open Comparison View for two to four in-stock products, optionally pinning a reference. |
| `set_reference_product` | Write | Pin one product as the reference alternatives are measured against. |
| `exit_comparison` | Write | Leave Comparison View and restore the previous layout. |
| `add_to_cart` | Write | Add one to four products to the fictional cart with bounded quantities. |
| `update_cart_quantity` | Write | Set one cart line's quantity, or remove it with zero. |
| `undo_last_action` | Write | Restore the most recent reversible snapshot, whoever made the change. |
| `reset_experience` | Consequential | Return everything to the seeded Browse View. Requires `confirmed: true`. |
| `open_cart` | Write | Bring the cart drawer on screen, or close it. Changes no contents. |
| `preview_checkout` | Write | Validate the cart and open the visible review surface. Creates no order. |
| `place_demo_order` | Consequential | Raise the confirmation gate. Returns `orderPlaced: false` until a person confirms. |

Writes accept an optional `expectedStateVersion`; a stale value is refused rather
than applied.

---

## How it is built

```text
lib/
  catalog/products.ts          22 fictional products, deterministic fixture
  state/
    types.ts                   mission, layout, selection, cart, checkout, activity
    sections.ts                the closed set of reorderable/hideable section ids
    mission.ts                 mission parsing + mission-fit scoring (pure)
    presentation.ts            card design vocabulary and the automatic defaults
    reducer.ts                 the single mutation path
    invariants.ts              rules that must hold after every mutation
    store.ts                   snapshots, undo, activity ledger, version gating
    selectors.ts               derived groups, cart totals, page-context payload
  capabilities/
    schema.ts                  JSON Schema validator + contract auditor
    registry.ts                the one tool registry
  webmcp/register-tools.ts     imperative top-level registration
  voice/realtime-session.ts    WebRTC realtime session over the same registry
  actions/ui-actions.ts        human wrappers over the same actions
```

### One action layer

```text
Human control ─┐
Voice agent   ─┼─→ capability registry ─→ schema validation ─→ reducer ─→ invariants
WebMCP agent  ─┘                                                            │
                                                                            ▼
                                        state version ++ · undo snapshot · activity entry
```

A rejected action commits nothing: validation and invariant checks run before the
new state is adopted, so a compound `add_to_cart` with one bad id leaves the cart
exactly as it was.

### Determinism

Mission parsing and mission-fit scoring are pure functions over a local fixture.
The Iceland prompt always yields the same seven essentials, the same two
constraint-violating products, and the same budget maths — which is what makes the
demo safe to record.

### Safety

- Fictional catalog, simulated checkout, no payment or personal data, ever.
- The agent may inspect, reorganise, compare, and edit the cart. It may not inject
  markup or styles, browse URLs, read storage or secrets, or complete checkout.
- `reset_experience` and `place_demo_order` both require explicit confirmation.
- The catalog canvas and the mission summary can never be hidden, so an agent
  cannot hide the person out of their own store.
- The `OPENAI_API_KEY` stays on the server; the browser receives only a short-lived
  realtime credential.

### Testing

`npm test` covers mission parsing and scoring determinism, the Iceland golden
grouping, layout invariants, comparison bounds, cart totals and stock caps, atomic
failure, undo, reset, stale-version rejection, the checkout gate, every published
schema's boundedness, input rejection for unknown ids and enums, WebMCP
registration (including late API injection), and that a tool call cannot place an
order.

---

## Credits and licence

Product names, descriptions, copy, and the interaction design are original to this
project. The catalog is fictional and does not represent any real merchant,
product, or inventory. Fonts are DM Sans and Instrument Serif via Google Fonts;
icons are [Lucide](https://lucide.dev) (ISC).

Released under the [MIT License](./LICENSE).
