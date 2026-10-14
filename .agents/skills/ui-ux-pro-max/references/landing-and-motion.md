# EduRef interactive landing and motion brief

The latest user request authorizes frontend implementation with automatic business handoff deferred. Confirmed: short landing at the public root, immediately accessible Verify, large usable quick chat using the current Agent, manual main-chat navigation, independent EduRef colors, floating blurred header, light depth on hover, gentle section reveals, a closing section/footer, and simpler operational screens. See `project-context.md` for decisions and `visual-direction.md` for the palette.

## Composition

Use about four content bands, roughly 2–4 viewport scrolls on desktop; mobile may naturally be longer. Do not impose a fixed page height or wheel count.

1. Hero: short product promise, a large real chat surface, immediate main action, and direct Verify access. Fit a useful composer in the 1366×768 first fold, including the floating header. The chat is the product demonstration, not a decorative screenshot.
2. Capability cards: summarize the five forms without displaying every form field. Use a few grouped cards rather than five equal competing CTAs.
3. Trust/process: show routine automation, clarification, escalation, and audit in plain Vietnamese. A compact visual can explain the boundary; testimonials, timing, savings, PASS, and user counts need real evidence.
4. Closing: a clear route to the full workspace and Verify, plus a compact footer with actual team/repository/documentation links supplied or approved for the project.

Keep the hero readable before optional assets load. Use whitespace and a restrained layered frame as the distinctive feature. Avoid introducing a large photo or elaborate scene merely to fill space: EduRef's usable chat is the central visual.

## Visual treatment

- Use a neutral canvas, one primary accent, and semantic success/attention/error colors. The proposed pearl/graphite/muted-teal palette replaces HUTECH-derived branding; exact values and theme defaults remain subject to visual review.
- Establish type, borders, surface, radius, and shadow tokens shared with working screens. Prefer the existing type system; verify Vietnamese accents before changing fonts.
- Keep illustrative decoration behind the chat, non-interactive, and outside text/controls. Avoid repeated glowing blobs, neon borders, rotating gradients, and unrelated floating symbols.
- A floating header can use translucent background, modest blur, a thin border, and soft shadow. Provide an opaque fallback and a compact mobile menu. Reserve content/anchor offsets and do not obscure focus.
- Adapt principles from reference sites. Create EduRef's own imagery, copy, and composition; do not copy their logos, testimonials, asset files, or source components into this repo.

## Motion starting values

These are design starting points to tune in real viewports, not permanent limits or performance claims.

| Context | Initial direction |
|---|---|
| Working buttons, focus, selection | Approximately 120–200ms color/opacity feedback; no hovering drift |
| Landing hover depth | Approximately 180–280ms settling; 2–4px lift, at most about 1–1.5° tilt |
| Scroll section entrance | Approximately 300–450ms, 8–16px translation, small stagger, once per section |
| Ambient decoration | At most one quiet focal treatment; pause/stop if continuous movement is used |
| Reduced motion or touch | Static depth and complete content; no tilt, float, parallax, or delayed reveal |

The latest refinement on 2026-10-14 keeps the no-spotlight rule and replaces the hero's rotating layered decoration with a simple 6px lift on hover, settling over 320ms and returning on exit. Trigger hover from the stationary stage to avoid edge flicker; freeze the chat at rest while focused or processing. Touch and reduced-motion users get no lift. Capability illustrations may still rotate up to ±4° from their resting angle and lift 4px inside their clipped viewport, settling over 350ms; their parent cards and text must not tilt. These local values supersede earlier whole-card and layered-chat starting points.

Keep input and results immediately available. No artificial backend waits, delayed sends, simulated tool stages, slow typewriter output, or progress percentages without measurement.

## Floating chat ergonomics

Prefer CSS perspective and transform for shallow depth; a real 3D renderer is unnecessary for this brief. Keep decorative frame and interactive content separable so the apparent depth does not compromise input precision.

- Use the simple chat lift only on a fine pointer with hover, not cursor-position tilt. Freeze the chat at rest when focus is inside it or output is processing. Text, caret, scrolling, and the Send button must feel stable during input.
- Restore the resting position on pointer leave, focus, and preference changes. Provide equivalent focus feedback without moving controls.
- Use one bounded animation frame update and CSS variables/refs where necessary; avoid a React state update or repeated layout measurement for every pointer event. Cancel scheduled frames on cleanup.
- Animate transform/opacity, not layout dimensions. Use `will-change` only on the active decorative surface, not all cards forever.
- Keep the main page's native scrolling. Limit internal chat scrolling to conversation overflow; do not capture wheel events or pin whole sections.
- Reveal below-fold sections once with an observer or an existing lightweight mechanism. Content must remain available if animation/observer fails, and keyboard focus must make its target visible.

## Real quick chat and handoff

The current Agent can perform business actions. Calling it on the landing does not create a safe read-only assistant. A knowledge-only mode, automatic intent classification, or a new confirmation gate needs team agreement if it changes existing processing.

For the current pass, keep the existing Agent behavior and provide an explicit main-workspace action. Preserve the session, messages, and composer content across manual navigation. Automatic handoff is deferred; the following assessment applies when that feature is resumed.

Before coding, assess the remaining mechanism:

- What explicit user action or existing pre-send signal can trigger the transition? An explicit “Bắt đầu yêu cầu” action is useful, but alone does not make other landing messages read-only. Do not infer intent with a new frontend heuristic.
- Can quick informational replies safely use an existing contract without executing business actions? If not, document the required bounded-chat or handoff contract for team agreement; do not call the unrestricted Agent and label it informational.
- Can both views share the existing state and handler without moving processing logic or adding subscriptions? Record any necessary state-ownership refactor for review.

A business classification returned after the Agent has executed is too late to satisfy a pre-send handoff. Switching views before every send avoids that timing risk but changes the requested quick-chat experience; do not silently substitute it.

Reuse presentation against the existing state/handlers. Keep one request emission path and one subscription owner. Transition must preserve chat state and must not submit the same message twice, switch identity, reset a run, or hide an error. If this needs moving handlers or changing state ownership, document the refactor for team agreement before implementing it under a CSS/component-only assignment.

Use honest idle, connecting, sending, waiting, streaming, complete, and error feedback from existing states. Show a small skeleton while waiting for content; remove it as real output appears. Do not label a sample conversation as live.

## Review evidence

At 1366×768 and 1920×1080, verify the first fold, useful chat size, Verify visibility, total page length, hover behavior, and footer. Also test a coarse pointer, reduced motion, keyboard, 200% zoom, long Vietnamese output, connection errors, back navigation, and an active handoff. Operational tables/forms retain their restrained motion and readable density.
