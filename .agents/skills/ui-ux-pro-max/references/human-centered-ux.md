# Human-centered UX standard

## Priority and mental model

Prioritize clarity, appropriate human control, trust, low cognitive load, ergonomics, and responsive interaction. The landing can introduce the product with a memorable visual; working screens should keep attention on the task. Show automatic routine decisions and human escalation according to the existing contract.

At any point, the interface should answer:

1. What is the agent doing now?
2. What has already happened?
3. Why did it stop or need attention?
4. What decision or information is needed from me?
5. Where can I intervene, retry, or leave safely?

## Information hierarchy

Use progressive disclosure:

- Level 1: current task, conversation, meaningful progress, required human action, final result.
- Level 2: concise reasoning summary, sources, action/tool summary, evidence.
- Level 3: raw logs, payloads, IDs, latency, and developer diagnostics.

Do not give every event equal visual weight. Approval and final results outrank activity logs. Do not expose raw chain-of-thought.

## Interaction and ergonomics

- Keep primary actions near the content they affect.
- Use at least 44×44 CSS pixels for important touch targets and at least 8px separation between adjacent targets.
- Separate positive and destructive actions by at least 16px where practical. Do not autofocus irreversible approval.
- Keep one clear primary action per local decision context.
- Provide immediate press/loading feedback and prevent duplicate submissions.
- Use semantic controls, visible focus, logical tab order, Escape dismissal where safe, and focus restoration after dialogs.
- Preserve browser zoom and support 200% reflow.

## Agent and HITL states

Use a small explicit UI state model derived from real backend states. Recommended presentation states are idle, thinking/checking, acting, waiting for user input, waiting for staff approval, paused/interrupted, completed, failed, disconnected, and retrying.

Each action must be visibly one of: proposed, queued, running, completed, failed, or cancelled. Do not display unsupported pause, steering, modify, or approval behavior merely because a design concept mentions it.

During active processing, show a concise, truthful summary of the current check, visible action, and next user-relevant step. Do not invent fine-grained progress that the backend does not emit. When the final answer or result is available, collapse the completed progress/reasoning group by default, label it clearly, and allow the user to expand it again.

Keep a visible way to steer, correct, retry, or stop only when the current contract supports that effect. A message composer may collect a correction, but it must not claim to cancel an already-running server action without a cancellation contract.

For approval, show in context:

- what the agent proposes;
- why review is required;
- the expected effect;
- evidence or source;
- approve, reject, or edit controls only when the backend supports them.

Use amber for attention/review, red for failure or destructive action, green for confirmed completion, the primary accent for normal interaction, and neutral tones for system detail. Always pair color with text and/or an icon; distinguish teal actions from green success with labels and component shape.

## Conversation and activity

- Keep long-form content within a readable measure, normally about 65–75 characters per line.
- Let users scroll history without being pulled to the bottom. Auto-scroll only while they are already near the newest message.
- When auto-scroll is suspended, show a clear “new activity” control and pending approval count when relevant.
- Collapse completed reasoning/action detail by default while keeping it discoverable.
- Prefer meaningful progress copy such as “Đang kiểm tra trạng thái sinh viên” over indefinite “Loading…”. Do not fake granular steps that the backend does not emit.

## Forms and real document upload

- Use visible labels, helper text, accepted type/size guidance, inline validation, and error recovery.
- Announce validation and upload errors through `role="alert"` or an appropriate live region.
- Show selected filename, size, preview only when safe, upload progress when measurable, and an explicit retry/cancel path.
- Treat file selection, upload transfer, server acceptance, document verification, and petition completion as distinct states.
- Use object URLs for local preview where appropriate and revoke them. Avoid holding large base64 payloads in long-lived component state.
- Never manufacture a storage URL or set document-presence flags before the server confirms the corresponding document.

## Visual language and motion

Aim for professional, calm, modern, and trustworthy. Follow the confirmed theme in `project-context.md`; do not enforce an obsolete dark-first palette. Build hierarchy with typography, spacing, and restrained surface contrast. Use a single memorable depth treatment on the landing rather than repeating effects on every operational surface. See `landing-and-motion.md` for that exception to the restrained workspace language.

- Body text should normally be 14–16px on desktop and at least 16px for mobile form inputs.
- Reserve 10–12px text for nonessential metadata, not instructions or decisions.
- Use a consistent 4/8-based spacing rhythm.
- Use one icon family—Lucide is already installed—and include accessible names for icon-only controls.
- Choose motion timing by purpose: working controls respond promptly; landing reveals can be slower. Use transform/opacity, preserve input, and respect `prefers-reduced-motion`. Do not slow backend processing or streaming to imply intelligence.
- Validate each theme's foreground/background pairs separately. Header blur needs an opaque readable fallback; decoration must not reduce text contrast.

## Natural Vietnamese microcopy

Use short, calm, specific language. State the result and recovery path without technical blame.

Prefer “Cần bạn xác nhận”, “Đang kiểm tra điều kiện”, “Tải lại tài liệu”, or “Kết nối bị gián đoạn — thử lại”. Avoid alarmist or robotic labels unless the situation is genuinely dangerous.
