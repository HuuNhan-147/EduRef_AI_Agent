# Frontend & UI/UX polish — implementation plan

Owner: TRẦN MINH QUANG · Branch: `feature/ui-ux-polish` · Base: `81f8419` (updated main) · 2026-10-13

## Scope agreed for this pass

Build the requested frontend now. The public root opens a short landing inspired by BacA's layered composition and gentle motion, with EduRef's own pearl/graphite/teal identity. Keep Verify immediately visible and preserve `?tab=verify`. No automatic onboarding popup.

Automatic business handoff from landing is deferred by the user. Reuse the current student chat presentation and existing Agent unchanged; provide explicit navigation to the full workspace. Do not describe the landing chat as read-only. Maintain a single mounted student conversation so switching views retains draft, messages, and session without duplicate subscriptions.

Only presentation, navigation, CSS/Tailwind, and UI-specific documentation change. API clients, Socket.IO handlers/events, Agent payloads, authentication, backend, policy, and deployment stay unchanged. Preserve the pre-existing edit in `docs/10_DATABASE.md`. No new UI dependencies, commit, push, merge, or deployment in this pass.

## Work sequence

1. Shared visual foundation: semantic colors, controls, focus, typography, restrained hover, selection and reduced-motion support. Keep current React/Vite/Tailwind/Lucide stack.
2. Landing: floating blurred responsive header; first-fold usable chat; shallow decorative pointer depth with stable controls; short capability/process sections; closing action and footer. Use actual chat state, not a simulated conversation or fabricated metrics. Render the landing even when backend connection fails, while gating live application screens on existing authentication state.
3. Operational shell: clear navigation, manual landing/workspace transition, readable laptop layout, technical detail secondary, non-intrusive connection/error feedback. Preserve existing forms and all data handlers.
4. Competition Mode: five-case full-width results with green PASS/red FAIL, expected/actual decisions, duration in ms, actionableQuestion, truthful 3 AUTO : 2 ESCALATE summary and timestamps. Make the judge's custom case accessible; collapse logs rather than letting them dominate. Skeletons contain no fake result.
5. Verification: production build without warnings; component render checks for initial/loading/pass/fail/long-content states; unchanged-handler and protected-file checks; production preview for local review. Inspect 1366×768, 1920×1080, mobile, keyboard, zoom and reduced motion in a connected browser if available. Report any checks that cannot be performed.

## Team-review evidence and follow-ups

- `docs/sprints_and_meetings/SPRINT_2_ENGINEERING_PLAN.md:15,72` says Verify-first. The latest user decision is landing-first with immediate/direct Verify. Align the document during team review; do not overwrite it as part of presentation work.
- Track A spec §2.A requires five cases (3 routine, 2 escalation), actionable questions, and an unfamiliar judge-supplied case. Fixture pass proportion is not independent accuracy. `VerifyHarnessPage.jsx` currently reports “Đạt chuẩn 100%” regardless of distribution; fix the presentation from actual backend flags.
- `docs/08_VERIFY.md` describes `/agent/verify-general`, absent from current backend source. Do not add a speculative client call; retain the supported Track A and custom-case endpoints.
- Current student resume UI uses a fabricated storage URL rather than uploading bytes. Do not advertise this as real upload or invoke it through a newly polished success path. Surface an honest unavailable state and coordinate the real upload/storage contract with Tài; leave the existing handler unchanged in this UI-only pass.
- Automatic handoff and a bounded quick-chat mode remain deferred. Do not add local intent heuristics or change the Agent pipeline.

## Delivery state

- Plan approved for execution by the latest user request.
- Implemented: short landing, blurred responsive header, shared live student-chat slot, manual workspace navigation, restrained decorative depth/reveals, capability/process/closing/footer sections, independent semantic palette, and optional rather than automatic help.
- Implemented: clearer laptop workspace layout, skeleton waiting state, reading-position-aware chat scrolling, collapsed response details, truthful audit copy, and an unavailable state for the unsupported real-upload path. Removed unused student-view icon imports and noisy JSX section comments.
- Implemented: full-width five-case Verify table, green PASS/red FAIL, per-case ms/timestamps/actionable questions, expected versus observed distribution, failed-case visibility, custom-case input and collapsed technical logs. Secondary pages are lazy loaded; API calls and their handlers are retained.
- Verified: production build succeeds without warnings/errors; nine component/contract tests pass; all protected handlers/effects and cross-screen API/socket calls match main; backend/services/package/Vite config unchanged; scope check preserves the pre-existing database-document edit; `git diff --check` has no whitespace errors.
- Production preview is running at `http://127.0.0.1:4173/`; landing, direct Verify URL, built JS and CSS return HTTP 200. This serves the actual `dist` build, not a separate mock UI.
- Not verified: browser rendering/interaction at 1366×768, 1920×1080 or mobile, keyboard/zoom/motion behavior, and live end-to-end chat/Verify. No connected browser surface was available; local backend health at `127.0.0.1:5000` could not connect. Render tests do not substitute for these checks.
- Next: user/browser review, backend connection for real flow checks, coordinate real upload/storage with Tài, align the older Verify-first Sprint instruction, then team review before any merge. Automatic chat handoff remains deferred. No commit or push was performed.

## Local review commands

Run from `EDUREF_AI/frontend`:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
node --test tests/ui-polish.test.mjs
```

Open `/` for landing, `/?tab=chat` for the main workspace, and `/?tab=verify` for Verify. Backend/API URLs remain controlled by the existing Vite environment and service defaults; do not add a fake authenticated session or simulated response just to preview the UI.

## Motion iteration — stronger landing after user review

The user requested a more expressive BacA-inspired landing: stronger text, scroll, hover, number and background animation. This supersedes the first pass's very restrained landing treatment, not the minimal operational-screen direction.

- Added masked headline line entrances, dark-teal text color flow, accent-line drawing and hover light sweeps.
- Added perspective grid/parallax, glass orbs, orbit rings and layered floating chat decoration. The interactive chat itself stays stationary; decorative movement pauses for chat focus/processing, hidden tabs and off-screen hero content.
- Added staggered section/card entrances, stronger card hover depth, scroll-linked illustration connectors and a page-reading line. Neither connector nor reading line represents live Agent progress.
- Added animated counters for supported forms, three uncertainty groups and five Track A fixtures. Form count is derived from current frontend configuration; fixture count is verified against the existing suite. No throughput, accuracy, savings or user metrics were invented.
- Decorative motion follows device preferences automatically. The visible toggle was removed at the user's request on 2026-10-14. Reduced-motion and coarse-pointer devices retain static, complete content; paused counters finish at their real target. All animation work is CSS/native browser APIs with bounded animation-frame updates and cleanup; no dependency or Agent-flow change.
- Verification: 13 render/contract/motion checks pass; final production build and preview assets are checked before handoff. Connected-browser visual/interaction review remains unavailable, so perceived motion quality, real viewport fit and live Agent flows still need user review.

## Local integration review — 2026-10-14

- Removed the motion-toggle button, its state, icons and unused CSS. Chat stage now fades in for 900ms without moving controls, delaying sends or remounting the conversation. Device reduced-motion/coarse-pointer rules also disable this entrance.
- Fetch confirms `origin/main` still matches the base `81f8419`; no new main commit, merge, commit or push.
- User confirmed the existing Supabase demo may receive test writes. Backend and database stay unchanged; local credentials are still missing. Laragon supplies a terminal/Node.js, not a required MySQL/PostgreSQL proxy to Supabase.
- Instructions are in `local-ui-review.md`, including CORS for preview 4173 via the existing `FRONTEND_URL`, production-build review, no migration/seed/reset and the remaining upload integration with Tài.
- Verified this iteration: 14 UI/render/contract tests pass; production build succeeds without warnings/errors; preview and current JS/CSS return HTTP 200, including the chat entrance and no toggle CSS. Scope check passes, preserving the user's pre-existing database-document change. Backend/services remain identical to main. Browser rendering and live backend/database flows remain unverified until local configuration is supplied.

## Competition chat revision — 2026-10-14

- User approved read-only frontend trace display and demo names. Kept a single mounted conversation; added native sidebar collapse/expand and terminal width expansion. Three columns now start at 1280px; smaller screens keep panel tabs. Removed the 4-gate presentation without removing petition state/processing.
- Chat's 5-case card is a normal `?tab=verify` link with client navigation, not a test request. Removed duplicate report buttons and the unused inline benchmark handler/state. Verify execution remains on the dedicated page.
- Trace snapshots attach to user-turn IDs, accept only exact-session events after START, retain actual returned duration, collapse on completion and preserve reopenable summaries. Labels describe observable actions; raw model text, tool arguments and unscoped logs are excluded. After stop/disconnect/overlapping STARTs, correlation is deliberately limited until a new session rather than combining ambiguous events. Backend has session IDs but no per-run ID; frontend filtering is not server-side access control.
- Terminal is mounted once in the chat sidebar, filters its display by session, hides global-clear control there, collapses technical payloads and caps buffered UI logs at 300. Existing API/Socket.IO calls, backend endpoints and auth remain unchanged.
- Larger chat/composer typography, clearer navy/teal surfaces, semantic outcome cards and secondary placement of reset actions. No animation library or dependency added.
- Renamed `2110002` to Trần Minh Quang and `2110004` to Trần Đức Tài in frontend metadata and the existing approved demo database, inside a transaction verifying all business fields stayed unchanged. Cao Hữu Nhân, the fourth student, account order, codes, roles and statuses remain unchanged. Original names are recorded in `demo-name-changes.json`. No backend source/schema/seed change. A fresh backend seed or a different deployment database will still have the old names until its owner applies the same limited data update; do not reseed merely to rename students.
- Live socket smoke check: one informational greeting completed in 1897ms with START, CONTEXT_RESOLVED, REASONING and DECISION_FINAL, a real reply, and no request ID/code from a business action. Did not run the Verify suite or request a petition. Browser surfaces remain unavailable, so direct viewport, keyboard and visual checks still need user review.
- Final checks: 28 tests pass (render, trace, contract and new text-pair contrast); production build has no warnings/errors; scope and whitespace checks pass. Backend source, socket service, package files and Vite config stay unchanged. No commit/push. Existing messages may contain old demo names; only new replies use the updated database identity.

## Blue emphasis and pointer feedback — 2026-10-14

- User requested stronger but comfortable blue emphasis based on the older UI tone. Added a scoped operational theme: navy navigation, blue actions/chat/trace, cool sidebars and muted form-category accents. Preserved semantic amber/green/red states and independent EduRef branding; landing remains light.
- Replaced the dark-green landing chat header with a pale-blue gradient and dark readable labels/avatar. The existing working chat, draft, session and Agent handlers stay mounted and unchanged.
- Pointer-reactive feedback covers 11 landing surfaces: chat decoration, capability cards, facts, process steps and closing section. A delegated passive pointer listener updates CSS variables with at most one queued animation frame, bounded 1.5-degree card tilt and cached per-entry bounds. Glow/depth resets on exit, focus, scroll, resize, hidden tab, preference change and cleanup. Chat focus/processing/selection block its decorative response; actual chat controls never move. Touch and reduced-motion users get static content.
- Replaced the old chat-only pointer handler rather than adding a competing handler or animation library. Card reveal stagger no longer delays hover feedback after reveal.
- Verified: 33 render/contract/trace/hover/contrast tests pass. No backend/database changes in this iteration; no commit/push. Browser inventory has no enabled surfaces, so visual perception and real laptop/mobile/keyboard checks still need user review. Production build and preview assets are rechecked before handoff.

## Contained 3D motion revision — 2026-10-14

- User rejected cursor-following light. Removed all pointer-position light variables and spotlight overlays; facts, process steps and closing no longer react to pointer position. This supersedes the previous 11-surface light/tilt treatment.
- Added three small code-native layered illustrations for forms, documents and routing, using the existing Lucide icons. Only the illustration rotates up to ±4° and lifts 4px inside a clipped viewport; the card, text and controls stay stationary. No asset downloads, new dependency or fabricated data/status claim.
- Retained localized motion in the hero chat's decorative layers, limited to ±3°. Actual chat controls remain stationary and decoration freezes on focus, processing or text selection. Touch/reduced-motion fallback keeps complete static illustrations.
- The existing passive pointer listener now targets only these four components. Cached bounds refer to stationary parent blocks; animation-frame scheduling and reset/cleanup remain bounded. Existing scroll entrances, ambient decoration, blue workspace theme and pale landing chat header are retained.
- Verified: production build succeeds without warnings/errors and 33 tests pass, including contained motion, no pointer light, unchanged API/Agent/backend contracts, trace and contrast checks. Scope check preserves the pre-existing database-document edit. No backend/database change, commit or push. Browser inventory remains empty, so final visual feel and real viewport/keyboard interaction still need user review. Real upload/storage integration remains a follow-up with Tài.

## Final polish and requested publication — 2026-10-14

- User requested completion, commit and push on the existing feature branch. Fetched origin: main remains `81f8419`; no remote `feature/ui-ux-polish` exists. Publish a new branch without force-push or merging main.
- Replaced the hero's pointer-driven layered rotation with a simple 6px hover lift and 320ms return. The stationary stage owns hover, preventing moving-boundary flicker. Focus, processing, touch and reduced motion suppress the lift. Removed the unused architecture markup, pointer-depth code, sheet/orbit keyframes and their responsive rules. Capability illustrations retain their contained depth.
- Unified landing and working header styling and shared blue action tokens. Retained EduRef branding; added a red `VNG · Track A` badge, yellow optional help and green only for the existing connected socket state. Kept the chat's pale-blue header, white readable surfaces and semantic error/attention/success colors. Boxes/headings have restrained shadow/surface/text-color hover feedback.
- Production build succeeds without warnings/errors; 34 tests pass, including hover limits/fallback, contrast, shared header, fixture truth and protected API/Agent contracts. Scope and whitespace checks pass. The pre-existing `docs/10_DATABASE.md` change remains outside the commit. Credentials, build artifacts, Python cache and machine-local scope baseline are excluded.
- Production preview is rechecked before publication. No enabled browser surface is available: actual viewport, keyboard/zoom and perceived hover remain pending user review. No live AI/Verify run or database write was needed for this visual revision. Coordinate real upload/storage with Tài and request team review before merging the feature branch.
