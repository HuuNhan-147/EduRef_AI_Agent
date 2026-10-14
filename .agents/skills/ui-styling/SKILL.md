---
name: ui-styling
description: Implement EduRef AI UI changes in the existing React 18 JSX, Vite 6, Tailwind CSS 3.4, and Lucide stack. Use for component styling, responsive layout, dialogs, forms, navigation, visual states, or frontend refactoring; do not install a new UI framework or modify backend contracts.
metadata:
  project: EduRef AI
  stack: React 18 + Vite 6 + Tailwind CSS 3.4
---

# EduRef UI Styling

Build polished, accessible UI with the existing stack and conventions. Read [references/stack-conventions.md](references/stack-conventions.md) before implementation.

Also use `../ui-ux-pro-max/SKILL.md` for user-flow and experience decisions. Use `../design-system/SKILL.md` when shared tokens or component variants change.

## Implementation rules

- Keep JavaScript/JSX unless the user explicitly requests a TypeScript migration.
- Reuse React, Tailwind 3.4, Axios, Socket.IO client, `clsx`, `tailwind-merge`, and Lucide already in the project.
- Do not initialize shadcn, install Radix, add CSS-in-JS, upgrade Tailwind, or add an animation library by default.
- Use semantic HTML and native elements before custom interaction primitives.
- Prefer mobile-first layout, fluid sizing, `minmax`, `clamp`, grid/flex, and consistent max widths over fixed page columns.
- Use only utilities supported by the installed Tailwind version/config. Put truly shared values in tokens or the Tailwind theme; avoid scattering arbitrary values.
- Preserve current data flow and service contracts. Styling work must not silently change permissions, decisions, API payloads, or socket semantics.
- Split components when doing so isolates a stateful interaction or reusable visual contract; do not fragment simple markup merely to reduce line count.
- Keep comments sparse: explain why, not what.

## Delivery checks

- Build with the project script.
- Check focus, keyboard, labels, live feedback, reduced motion, zoom/reflow, long content, and all responsive sizes listed by `ui-ux-pro-max`.
- Visually inspect real states in a browser when available. Do not approve the result from code shape alone.
