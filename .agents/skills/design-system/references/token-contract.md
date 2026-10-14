# EduRef token and component contract

## Token layers

Use three layers only when each layer provides value:

1. Primitive: raw color, spacing, radius, duration, and type values.
2. Semantic: purpose such as background, surface, text, border, primary, attention, danger, success, focus, or AI metadata.
3. Component: a stable mapping for a repeated component such as button, input, dialog, approval card, or status badge.

Components should consume semantic or component tokens, not infer meaning from a raw color name.

## Required semantic roles

When the affected UI needs them, prefer roles equivalent to:

- canvas/background, surface, elevated surface;
- text primary, secondary, muted, inverse;
- border subtle, border strong, focus ring;
- action primary, action secondary;
- success/completed, attention/review, danger/failure;
- AI/reasoning metadata;
- disabled foreground/background.

Exact values are a design decision, not a permanent rule in this reference. Validate all foreground/background pairs and both themes independently if dark mode exists.

The user confirmed an independent EduRef identity without requiring HUTECH colors. See [the proposed visual direction](../../ui-ux-pro-max/references/visual-direction.md) for pearl/graphite/muted-teal values; exact values and theme defaults require visual review before rollout. Landing and operational screens share semantic tokens, but only the landing gets the expressive depth/scroll treatment. Validate each supported theme independently instead of inverting colors.

## Status semantics

- Primary accent: normal interaction or navigation; muted teal is currently proposed.
- Green: confirmed safe completion, never an optimistic promise.
- Amber: attention, missing input, or human review.
- Red: failure, destructive action, or a genuinely dangerous condition.
- AI/reasoning metadata: neutral or primary-tinted surface with explicit text; no mandatory violet accent.
- Slate/neutral: system detail and inactive states.

Never communicate state by color alone. Pair it with text and an icon or shape where useful.

## Scales

- Spacing follows a 4/8 rhythm, commonly 4, 8, 12, 16, 24, 32, and 48.
- Important targets are at least 44px; icon-only controls are at least 36px with a larger hit area when needed.
- Body text generally uses 14–16px on desktop and at least 16px for mobile inputs.
- Radius should distinguish surfaces and controls without turning all elements into pills.
- Motion timings depend on context: controls respond promptly; landing reveals may settle more slowly. Use the ranges in `ui-ux-pro-max/references/landing-and-motion.md` as starting points and include a static reduced-motion path.
- Define a small z-index scale for base content, sticky UI, dropdown/popover, overlay, modal, and toast rather than arbitrary values.

## Component-state contract

For each reusable interactive component, define only applicable states:

- default;
- hover and pressed;
- focus-visible;
- disabled;
- loading;
- selected/expanded;
- validation error;
- success or completion.

State changes must not shift surrounding layout. Disabled appearance must also use native disabled semantics. Loading must prevent duplicate action while leaving a recovery route when the operation can fail.
