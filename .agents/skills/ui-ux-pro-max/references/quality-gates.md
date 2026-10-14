# UI quality gates

Apply gates proportionally to the changed surface. A delivery is not complete merely because it builds.

## Contract truth

- Every displayed status and claim maps to a real API field, socket event, or clearly labeled fixture.
- No fabricated upload URL, evidence, policy, audit success, QR guarantee, or fallback identity appears in a production flow.
- Form and chat entry paths converge on compatible petition outcomes.
- The UI reflects main's single workflow and five forms; no legacy backend is restored or removed by this task.
- Competition results never imply PASS, measured accuracy, a valid 3/2 distribution, or an audit proof before the backend response supports it. See `competition-mode.md`.

## State coverage

Exercise relevant states: initial, loading, empty, partial, validation error, network error, unauthorized/forbidden, disconnected, retry, success, long content, and duplicate action prevention.

For async actions, users can tell whether the action has not started, is running, completed, failed, or needs their input. No indefinite spinner is allowed without timeout/recovery.

## Responsive matrix

Check at minimum:

- 360×800 small phone
- 768×1024 tablet portrait
- 1024×768 tablet/compact landscape
- 1280×720 compact laptop
- 1366×768 common laptop
- 1440×900 desktop/laptop
- 1920×1080 primary presentation target

Give 1366×768 and 1920×1080 explicit visual evidence. On the landing, a usable chat composer and direct Verify entry must be visible near the first fold. Judge cases and their questions must remain readable on the short laptop viewport. Other matrix sizes are proportional checks, not a reason to delay a narrow change indefinitely.

Verify no page-level horizontal overflow, clipped primary actions, inaccessible fixed content, or unreadable full-width paragraphs. Conversation remains primary; side panels collapse into drawers/sheets as space narrows.

## Accessibility

- Semantic landmarks and heading order are logical.
- All controls are reachable and operable by keyboard.
- Focus is visible; dialogs trap focus, close appropriately, and restore focus.
- Inputs have labels; errors are associated and announced.
- Dynamic status uses a suitable live region without excessive announcements.
- Color is not the only signal; text contrast meets WCAG AA.
- Meaningful icons/images have accessible names or alternative text; decorative assets are hidden from assistive technology.
- 200% zoom, text growth, and reduced motion do not break the flow.

## Ergonomics and comprehension

- Primary targets are approximately 44×44px or larger, with adequate separation.
- The current task, agent state, pending human decision, and recovery action are discoverable within a few seconds.
- Approval is next to its explanation and expected impact.
- Technical logs do not compete with the task or expose private data.
- Vietnamese copy is calm, concise, and specific about what happened and what to do next.
- The confirmed theme remains readable without excessive glow, gradients, blur, or card noise. Landing and operational screens share colors/type/components while differing in decorative motion.
- Active progress/reason summaries are understandable, completed summaries collapse after the final result, and users can reopen them. No raw chain-of-thought is exposed.

## Performance and stability

- Avoid eager-loading secondary pages or heavy assets when route/feature splitting is practical.
- Streaming updates do not rerender the entire application tree per tiny chunk.
- Long lists/logs are capped, paginated, or virtualized where needed.
- Scroll/resize/input handlers are throttled or deferred when they perform meaningful work.
- Images reserve layout space and use suitable formats/sizes.
- External fonts or third-party visual services are not added without evaluating cold-start, privacy, and failure behavior.
- Landing input remains usable while reveals play. Disable chat lift/tilt/float on touch, reduced motion, focus within chat, and processing. The user-approved idle chat lift is triggered by its stationary stage, avoiding hover-boundary flicker; controls stay stable during input.
- Verify native page scrolling, anchor offsets below the floating header, back navigation, and preservation of chat state during handoff. Do not depend on an animation-end callback for correctness.

## Code quality

- Components and hooks have one clear responsibility.
- Shared state labels and visual mappings are centralized.
- No dead import, unreachable UI, unsupported Tailwind utility, personal path, or tutorial-style comment is introduced.
- Comments explain only non-obvious intent or invariants.

## Verification evidence

Run the frontend build and available tests. When a browser is available, inspect and interact with each changed flow rather than relying on source review alone. Report any device, browser, network, accessibility, or backend integration condition that was not verified.

Record verified and pending decisions separately. When upload is affected or blocked, include the precise contract to coordinate with Tài. When only preparation files change, validate the skill and scope; no app build is required solely for prose edits.
