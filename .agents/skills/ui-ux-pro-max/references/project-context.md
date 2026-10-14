# EduRef product context

## Product and people

EduRef AI is an academic petition agent with bounded autonomy. Current main is the behavior baseline after the 2026-10-13 integration. One workflow, `STUDENT_CONFIRMATION`, includes five specialized forms: general confirmation, tax deduction, bank loan, military deferment, and course debt. The UI polish assignment preserves that policy and workflow.

Primary users:

- Students need plain-language guidance, safe document submission, visible progress, and confidence that a request was actually received.
- Academic staff need evidence provenance, clear escalation reasons, policy-safe decisions, and reliable approve/reject controls.
- Judges need a discoverable end-to-end path, visible deterministic verification, and honest evidence within limited evaluation time.

The interface should communicate “the agent is working for me” and make the boundary visible: deterministic policy can approve/reject routine cases; flagged cases need clarification or human review. Do not restore the earlier human-only decision model through UI changes.

## Current confirmed brief

- TRẦN MINH QUANG owns Frontend, UI/UX, frontend performance, accessibility, and frontend code hygiene.
- Competition Mode must make the live judge path obvious, omit the automatic onboarding popup, and show a concise first-action instruction.
- The requested landing is short: a large working quick-chat hero, a few informative sections/cards, a closing invitation, and a footer, approximately 2–4 desktop viewport scrolls. A floating translucent header and subtle depth/scroll motion belong mainly on the landing.
- Operational screens stay minimal, readable, and fast, with much less decorative motion.
- Responsive targets explicitly include 1920×1080 and 1366×768; touch, smaller screens, keyboard, and zoom still need a usable fallback.
- Only CSS, Tailwind, and presentation components are in scope. Do not edit `services/api.js`, Socket.IO wiring, Agent processing, backend, database, or policy. Contract gaps need team agreement.
- Routine auto handling and escalation are taken from main. Display existing policy, fees, timing, form requirements, and certificate behavior truthfully; do not invent or revise business rules.
- For any upload work, Tài owns the backend contract. File selection, transfer, server acceptance, and verification remain separate states.

## Decisions confirmed on 2026-10-13

- The public root opens the landing. Verify is immediately reachable from the first fold and retains the existing `?tab=verify` direct link.
- A business request transitions to the main chat before it is sent to the Agent, retaining the current session, conversation, and draft.
- Use an independent EduRef identity. HUTECH colors are not required; the user delegates palette selection for the project and its restrained AI effects.

The pearl/graphite/muted-teal palette and light landing baseline are documented in `visual-direction.md` and implemented as the first pass on `feature/ui-ux-polish`. They await in-browser visual review; do not treat implementation as user approval of every token or theme default.

The latest user request authorizes frontend implementation and defers automatic handoff. For this pass, reuse the current Agent and provide manual main-chat navigation, preserving the mounted conversation and draft. Do not label quick chat read-only. The future pre-send handoff target remains; current source does not establish a bounded informational mode or safe pre-send intent signal. Any required Agent/state-ownership change needs team agreement.

## Current frontend stack

- React 18 with JavaScript/JSX
- Vite 6
- Tailwind CSS 3.4
- Axios and Socket.IO client
- Lucide React icons
- No router, TypeScript, shadcn/Radix, form library, or frontend test runner is currently configured

Work with this stack. Adding a dependency or migrating architecture requires an explicit benefit and user approval.

## Current product surfaces

- Student agent workspace and conversation
- Short interactive landing with a shared student conversation and manual main-chat navigation
- Dynamic petition form
- Student petition history
- Staff escalation/review
- Verify Harness
- Audit Explorer
- Live technical activity/terminal
- Demo role switching and authentication bootstrap

Keep the conversation or current task as the center of attention. Technical activity, audit payloads, and logs are secondary inspector content.

## Source of truth

Honor the latest user brief first, then inspect running code/tests. For policy and evaluation evidence, consult:

1. `EDUREF_AI/docs/14_TRACK_A_POLICY.md`
2. `EDUREF_AI/docs/08_VERIFY.md`
3. `EDUREF_AI/RUNBOOK.md`
4. measurement and security documents
5. `EDUREF_AI/docs/specs/VNG_TRACK_A_REQUIREMENTS.md`
6. `docs/sprints_and_meetings/SPRINT_2_ENGINEERING_PLAN.md`

Treat old README, reconstruction notes, `UI_UX_info.txt`, and dark-first/human-only rules as historical where they conflict. Known documentation/source differences are listed in `competition-mode.md`; do not implement nonexistent endpoints from documentation.
