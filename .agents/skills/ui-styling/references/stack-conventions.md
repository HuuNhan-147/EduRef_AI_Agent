# EduRef frontend stack conventions

## Existing stack

- React 18 functional components and hooks
- JavaScript/JSX
- Vite 6
- Tailwind CSS 3.4 with PostCSS
- Lucide React icons
- Axios and Socket.IO client
- `clsx` and `tailwind-merge` are available

Do not copy examples that require Tailwind 4 directives, shadcn/Radix, Next.js routing, TypeScript-only APIs, or unavailable plugins.

## Tailwind and CSS

- Confirm a utility exists in Tailwind 3.4 or the local config before using it. Classes such as custom z-index, spacing, blur, outline, or shadow values may silently generate no CSS when not configured.
- Prefer semantic class composition and shared variants over long duplicated class strings.
- Use arbitrary values only for a real layout constraint that does not deserve a shared token.
- Avoid runtime-generated Tailwind class names that the scanner cannot discover.
- Add base CSS cautiously; global rules must not disable selection, focus, scrolling, or zoom across the app.
- Use `100dvh`/`min-h-dvh` fallbacks appropriately for mobile viewport chrome, and account for sticky/fixed element offsets.

## React structure

- Keep hook calls unconditional and before early returns.
- Keep subscriptions and timers paired with cleanup.
- Avoid derived state when it can be calculated safely during render.
- Centralize status-to-label/color/icon mappings.
- Separate high-frequency streaming state from stable page chrome to limit rerenders; batch or throttle visual updates where useful.
- Lazy-load secondary screens when doing so reduces the initial bundle without degrading navigation.
- Persist only non-sensitive UI state. Never put auth secrets or private document content in local storage.

## Dialogs and overlays

- Use `role="dialog"`, `aria-modal="true"`, an accessible name, initial focus, focus containment, Escape handling where safe, and focus restoration.
- Prevent background interaction and scrolling while open without trapping the user.
- Confirm before dismissing unsaved or uploading form data.
- Keep the primary action visible but do not separate it from the content that explains its effect.

## Forms and files

- Use a real `<form onSubmit>` and associated labels.
- Validate after meaningful interaction rather than on every keystroke.
- Focus the first invalid field and announce errors.
- Keep selected, uploading, uploaded, rejected, and verified file states distinct.
- Revoke local object URLs on replacement/unmount.
- Disable duplicate submit while a request is active, but provide cancellation or retry when supported.

## Icons and motion

- Use Lucide consistently; do not use emoji as structural controls.
- Icon-only buttons need accessible names and an adequate hit area.
- Motion should use transform/opacity, normally 150–300ms, and have a reduced-motion variant.
- Avoid permanent pulse, decorative shimmer, slow typewriter effects, and layout-shifting scale changes.
