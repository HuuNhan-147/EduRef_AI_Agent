# Competition Mode and Verify presentation

Read the actual rubric at `EDUREF_AI/docs/specs/VNG_TRACK_A_REQUIREMENTS.md`. Track A requires one-click execution of five cases: three routine automatic outcomes and two escalation outcomes, followed by a judge-supplied unfamiliar case. The Track A score separates correct escalation (8), no excess escalation (6), and actionable questions (6). Submission requirements also call for a one-line first-action instruction, PASS/FAIL with timestamps, public access, and reviewable commit history.

## Judge path

- Remove the automatic onboarding interruption. Optional help may remain on demand.
- The confirmed root entry is the landing. Give it an immediately visible Verify action and preserve current `?tab=verify` direct access; do not bury judge access behind marketing sections, profile creation, or role switching.
- Suggested instruction: “Bấm Chạy 5 ca Track A để kiểm tra phân bố 3 AUTO / 2 ESCALATE, sau đó nhập một tình huống mới.”
- Keep the free-form case entry discoverable near the result table, with classification, reason/question, duration, and timestamp after execution.
- Keep technical logs secondary. Audit and human review must remain reachable, not replaced by a visual success summary.

## Result contract already available

`backend/modules/ai-agent/tools/actions/verifyTools.js` returns suite `results`, `autoCount`, `escalationCount`, `distributionPassed`, `allPassed`, `passedCases`, `totalCases`, `policyVersion`, total duration, and timestamps. Each result has expected/actual decisions, classification, `passed`, `durationMs`, `actionableQuestion`, message, timestamps, and optional audit proof.

Present that response without changing `services/api.js`, requests, Socket.IO, or backend logic:

- Each row shows PASS/FAIL as an accessible badge, case, expected/actual outcome, classification, duration in ms, and the question where applicable. Routine rows may show “Không cần chuyển tiếp” when supported by their result.
- Keep decision badges separate from test badges: ESCALATE can be the correct result and therefore PASS.
- Initial cases show expected values only, with actual/duration/question unexecuted. A loading skeleton contains no green PASS or fabricated numeric data.
- Show actual counts, then whether distribution is valid using backend flags. A 3/2 split alone is insufficient when individual cases fail.
- Label the fixture pass proportion “Ca khớp kỳ vọng”, not independent accuracy or missed/false escalation rate. Show only observed timing, with correct units; case time and suite elapsed time are different measures.
- Retain timestamps and long questions. Make row details operable by keyboard and keep full values available at narrow widths.

## Baseline findings — main `81f8419`, reviewed on 2026-10-13

- `App.jsx` starts on Student unless `?tab=verify`; the Sprint plan says Verify-first. The user has now chosen landing-first with immediate/direct Verify access. Implement that entry only after plan approval and flag the older Sprint instruction for team alignment.
- `VerifyHarnessPage.jsx` always appends “Đạt chuẩn 100%” once `run` exists. This is a presentation defect even if the backend reports failure.
- Duration/question currently appear only for the selected row; the polish task requests a readable table for all five cases.
- A fixture pass proportion is labeled Accuracy. It does not prove independent test accuracy.
- The quick-test debt tooltip still claims tuition debt causes rejection; the latest policy does not use that restriction. Update copy from the current contract, not policy logic.
- `docs/08_VERIFY.md`, API docs, and RUNBOOK describe `/agent/verify-general`; that endpoint and suite are absent from current source. Track A's five cases remain the primary requested suite. Ask the team to align documentation or supply the endpoint rather than inventing a client call.
- The displayed fallback policy version is old. Before a run, prefer “Phiên bản được trả khi chạy”; afterward use the backend value.

Report rubric mismatches with exact file/section evidence in a team-review note. This skill does not itself authorize sending messages to an external group. Keep app implementation on `feature/ui-ux-polish` created from updated main; no merge, squash, force push, or deployment before the agreed team review workflow.

The frontend first pass addresses the presentation findings above; see `.agents/ui-ux-polish-plan.md` for verification and open integration needs. Recheck current code before treating baseline findings as unresolved defects.
