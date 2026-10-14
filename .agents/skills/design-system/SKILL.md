---
name: design-system
description: Define or evolve EduRef AI semantic design tokens and reusable component state contracts for the existing Tailwind 3 frontend. Use when multiple screens need consistent color, typography, spacing, elevation, status, or component variants; skip for a one-off local adjustment and never change business logic.
metadata:
  project: EduRef AI
---

# EduRef Design System

Create the smallest shared visual contract that removes inconsistency without turning a UI task into a framework migration. Read [references/token-contract.md](references/token-contract.md) before changing shared tokens or variants.

## Rules

- Start from the current `frontend/src/index.css`, `frontend/tailwind.config.js`, and repeated real component patterns.
- Use primitive values only in the token definition layer, semantic tokens for meaning, and component tokens only when a stable reusable component needs them.
- Keep status meaning stable across Student, Staff, Verify, and Audit surfaces.
- Do not hardcode a generated palette from `ui-ux-pro-max`; validate it against EduRef context and WCAG first.
- Do not build slide, marketing, logo, or brand-asset systems under this skill.
- Do not add a component library, theme engine, or dark mode unless the requested work benefits from it and the user approves the scope.
- Preserve the existing Tailwind 3 build. Prefer CSS variables exposed through Tailwind theme values when they materially improve consistency.

## Deliverable shape

For a shared change, document or implement only the tokens and variants needed by the affected UI, including default, hover, active, focus-visible, disabled, loading, error, and selected states as applicable. Validate the tokens in real components at small and large viewports before broad rollout.
