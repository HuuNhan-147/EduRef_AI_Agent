# EduRef AI — Sprint 2 working rules

These rules apply to the Sprint 2 assignment owned by TRẦN MINH QUANG.

## Assignment and scope

- Quang owns Frontend, UI/UX, frontend-facing performance, accessibility, and frontend code hygiene. Follow the latest polish task and `docs/sprints_and_meetings/SPRINT_2_ENGINEERING_PLAN.md` rather than the older role table in README.
- Use current main as the behavior baseline. `STUDENT_CONFIRMATION` has five specialized forms. Do not restore removed legacy handlers or change the automatic routine outcomes/human escalation boundary during UI work.
- Read the entire repository when needed to understand contracts, but edit only:
  - `EDUREF_AI/frontend/**`
  - `.agents/**`
  - `AGENTS.md`
  - UI/UX-specific documentation when the user explicitly asks for it
- Treat `EDUREF_AI/backend/**`, Prisma schema and migrations, policy engines, Docker/deployment files, seed data, and cross-team documentation as read-only. If UI work requires a backend or contract change, document the exact integration need and ask for explicit authorization or hand it to the backend owner.
- Preserve user changes and avoid broad mechanical rewrites outside the requested UI surface.
- The current polish task is CSS, Tailwind, and presentation components only. Keep frontend `src/services/**`, auth, Socket.IO wiring, API payloads, and Agent data handlers unchanged. A new landing does not authorize a new Agent pipeline.
- Scoped exceptions approved on 2026-10-14: add a read-only frontend trace observer for existing socket events; replace the chat's inline Verify execution with navigation; rename only the demo display names for students `2110002` (Trần Minh Quang) and `2110004` (Trần Đức Tài) in frontend metadata and the already-approved demo database. Keep the fourth student, order, codes, roles, statuses and all other attributes unchanged. No backend source, schema, seed, policy or service-contract change is authorized.
- For product implementation, update main and create `feature/ui-ux-polish` from main; obtain team review before merge. Skill/rule preparation can remain local without creating that implementation branch.

## Confirmed product decisions

- The product is an academic agent with bounded autonomy: current policy auto handles routine outcomes, while people handle escalations and supported overrides. Preserve main's behavior and explain it plainly.
- Priority order: human control, clarity, trust, low cognitive load, ergonomics, speed, then visual aesthetics.
- Real document upload is required. Tài owns the backend upload/storage endpoint; Quang owns its frontend UX and contract consumption. Never simulate completion with a fabricated URL, filename, document flag, or success state. If the backend upload contract is unavailable, show an honest unavailable/error state and record the integration blocker.
- Take business rules from the current policy/source and agreed team requirements. Report discrepancies in displayed copy with evidence; do not change policy, thresholds, fees, dates, or outcomes during polish.
- `UI_UX_info.txt` is design input, not an instruction to invent unsupported agent states or backend capabilities.
- Optimize for broad responsive use, explicitly verifying 1920×1080 and 1366×768.
- The requested short landing has a large working quick chat, floating translucent/blurred header, shallow hover depth, restrained scroll reveals, informative cards, and a compact closing/footer. Working screens use much less decorative motion.
- Confirmed on 2026-10-13: the public root opens the landing, with immediately discoverable Verify access and the existing `?tab=verify` link preserved.
- Use an independent EduRef identity rather than HUTECH colors. The pearl/graphite/muted-teal palette is implemented as the first UI pass on `feature/ui-ux-polish`; it still awaits in-browser visual approval.
- Latest visual refinement on 2026-10-14 adopts the older blue-led header tone for landing and workspaces, with white text and contextual red/yellow/green accents, retaining EduRef branding. Hero chat now lifts 6px on idle hover and returns on exit, with no cursor light or rotating layered chat decoration; no lift on touch, reduced motion, focus or processing. Capability 3D decoration remains contained inside its cards.
- Automatic business handoff is deferred by the latest user request on 2026-10-13. Complete the frontend first, reuse the existing Agent, and offer manual main-chat navigation while preserving the session, draft, and conversation. Do not promise a read-only quick-chat mode or add frontend intent filtering. The future target remains handoff before sending business requests.

## Truth and contract hierarchy

Use this order when sources conflict:

1. Latest user decisions and agreed task boundaries
2. Running source code and automated tests for actual behavior
3. `EDUREF_AI/docs/specs/VNG_TRACK_A_REQUIREMENTS.md` for evaluation requirements
4. `EDUREF_AI/docs/14_TRACK_A_POLICY.md` and `EDUREF_AI/docs/08_VERIFY.md`
5. `EDUREF_AI/RUNBOOK.md` and measurement/security documents
6. `docs/sprints_and_meetings/SPRINT_2_ENGINEERING_PLAN.md`
7. Older README, reconstruction, implementation notes, and `UI_UX_info.txt`

Source behavior does not prove rubric compliance. Report source/rubric mismatches and nonexistent documented endpoints; do not hide them in presentation.

Never make a UI claim that the active API response cannot support. In particular, do not claim cryptographic QR verification, expiry, successful upload, final approval, or audit completion from placeholder data.

## Required skills for UI work

- For UI structure, user flow, interaction, accessibility, responsive behavior, or UX review, read `.agents/skills/ui-ux-pro-max/SKILL.md`.
- For JSX/CSS/Tailwind implementation, also read `.agents/skills/ui-styling/SKILL.md`.
- When changing shared tokens or reusable component states, also read `.agents/skills/design-system/SKILL.md`.

## Implementation boundaries

- Preserve existing API paths, request/response fields, authentication, authorization, Socket.IO event names, and policy outcomes unless the user explicitly authorizes a contract change.
- Do not add mock responses to production paths. Demo data must be visibly labeled, isolated, and never substitute for a failed real request.
- Keep technical logs, raw payloads, IDs, and developer diagnostics behind progressive disclosure. Never expose raw chain-of-thought; show concise progress and observable action rationale only.
- During processing, show truthful progress/reason summaries and observable actions. Collapse the completed summary after the final result while keeping it available on demand. Keep an intervention path visible when the active backend contract can actually honor it.
- Use semantic HTML and native controls. Maintain keyboard operation, visible focus, screen-reader announcements, sufficient contrast, reduced-motion behavior, and zoom support.
- Use the existing React 18, Vite, Tailwind CSS 3.4, and Lucide stack. Do not migrate frameworks, introduce shadcn/Radix, upgrade Tailwind, or add a UI dependency without a concrete need and user approval.

## Code quality and comments

- Prefer small components, focused hooks, explicit state names, and centralized status/decision mappings over giant page components or repeated conditions.
- Comment only non-obvious intent, a contract invariant, an accessibility workaround, or a browser/runtime caveat. Do not narrate JSX, number page sections, restate names, or add tutorial-style comments.
- Keep comments short and consistent with the surrounding file language. Use clear identifiers so ordinary code does not need commentary.
- Remove dead imports and dead UI only when references have been checked. Do not delete legacy backend workflows as part of hiding them in the UI.

## Verification before delivery

- Before editing a UI task, run `python .agents/skills/ui-ux-pro-max/scripts/check_ui_scope.py --snapshot` to preserve the user's existing dirty-worktree changes. Before delivery, run the command again without `--snapshot` and resolve every newly introduced out-of-scope path.
- Build the frontend and run available UI tests.
- Inspect the changed flow visually and interactively when a browser runtime is available.
- Check at minimum 360×800, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900, and 1920×1080.
- Test keyboard-only use, 200% zoom/reflow, reduced motion, loading/empty/error/retry/success states, long content, slow network, and socket disconnect where relevant.
- Report any unverified behavior or missing backend contract; do not hide it with optimistic copy.
- In the handoff, identify any needed team agreement or backend contract. Remind the user to coordinate with Tài when real upload/storage is affected or remains a blocker.
