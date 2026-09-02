# Hackathon delta

**What existed before the submission window, and what was built during it.**

Submission window: August 25 – September 3, 2026.

## Summary

Her Shopping is a new project created inside the submission window. There is no
pre-existing application code, no prior product, and no reused private codebase.
The repository's first commit is dated within the window and the full history is
preserved.

## What existed before any code was written

Two planning documents, both written for this hackathon:

- `docs/HACKATHON_VISION.md` — rules research, eligibility and compliance review,
  and the concept decision.
- `docs/HER_SHOPPING_ADAPTIVE_STOREFRONT_PLAN.md` — the implementation
  specification this build follows.

Nothing else. No application source predates the window.

## What was built during the window

| Area | Work |
| --- | --- |
| Catalog | 22 original fictional products with names, descriptions, prices, weights, warmth ratings, delivery windows, stock, and purpose tags |
| State core | Typed mission/layout/selection/cart/checkout model, deterministic mission parsing, mission-fit scoring, layout invariants, snapshot history, activity ledger |
| Action layer | A single validated reducer shared by human controls, voice, and WebMCP |
| Capabilities | 19 bounded tools with JSON Schemas, a runtime validator, and a contract auditor |
| WebMCP | Imperative top-level registration with structured failures, status reporting, and retry for late API injection |
| Voice | Realtime speech-to-speech over WebRTC, driving the same capability registry, with a server-side ephemeral-credential route |
| Presentation | A closed card-design vocabulary — layout, columns, price weight, image scale, card attributes, descriptions — with four named presets, driven by people and agents through the same action |
| Interface | Browse, Mission, and Comparison views; editable constraint chips; section frames with move/hide controls; activity ledger; change toast; diagnostics panel; cart, checkout review, confirmation gate, and demo receipt |
| Tests | 95 Vitest cases across parsing, scoring, invariants, schemas, tool behaviour, and WebMCP registration |
| Docs | This file, `README.md`, `LICENSE`, `.env.example` |

## Third-party material

| Item | Source | Licence |
| --- | --- | --- |
| React, Next-style app router via `vinext`, Tailwind CSS, Base UI | npm | MIT |
| Lucide icons | lucide.dev | ISC |
| DM Sans, Instrument Serif | Google Fonts | SIL Open Font License 1.1 |
| Product photography (`public/expedition-flatlay.png`, `public/og.png`) | Generated for this project | Original to this submission |

No sponsor trademarks, third-party product names, licensed music, or third-party
personal data appear in the application, the repository, or the demo video.

## Safety posture

- The catalog is fictional and checkout is simulated.
- No payment details, addresses, identity data, or accounts are collected at any
  point, by any interface, including the voice agent.
- The `OPENAI_API_KEY` never reaches the browser; the client receives only a
  short-lived realtime credential minted server-side.
- The demo order requires an explicit human confirmation that no agent can supply.
