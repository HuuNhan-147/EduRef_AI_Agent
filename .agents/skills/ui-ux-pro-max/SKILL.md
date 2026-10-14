---
name: ui-ux-pro-max
description: Design, review, and polish EduRef AI's interactive landing, Competition Mode, Verify Harness, and operational workspaces with restrained visuals, accessible motion, responsive ergonomics, and truthful agent states. Use for frontend experience work; preserve backend policy, API services, Socket.IO, and Agent data flow.
metadata:
  project: EduRef AI
  owner: TRẦN MINH QUANG
---

# EduRef UI/UX Pro Max

Make EduRef welcoming on entry and efficient during real work. The landing may be expressive; Student, Staff, Verify, and Audit screens prioritize legibility, feedback, and reliable controls. Preserve bounded autonomy on the current main branch: policy handles routine outcomes; people handle escalated cases and supported overrides.

## Load the right context

Always read [references/project-context.md](references/project-context.md) and [references/human-centered-ux.md](references/human-centered-ux.md).

- Read [references/landing-and-motion.md](references/landing-and-motion.md) for landing composition, floating chat, scroll reveals, or chat-to-workspace handoff.
- Read [references/visual-direction.md](references/visual-direction.md) for the proposed independent EduRef palette and its contrast checks.
- Read [references/competition-mode.md](references/competition-mode.md) for judge entry, Verify presentation, or rubric review.
- Read [references/reference-research.md](references/reference-research.md) for researched inspirations and their verification limits.
- Read [references/integration-boundaries.md](references/integration-boundaries.md) before presenting forms, uploads, authentication, API results, socket states, audit, or chat handoff.
- Read [references/quality-gates.md](references/quality-gates.md) before implementation review or delivery.
- Use `../ui-styling/SKILL.md` when editing JSX, CSS, or Tailwind.
- Use `../design-system/SKILL.md` only when shared tokens or reusable component contracts change.

## Working method

1. Identify the audience, screen, main action, active contract, and open choices. Treat `UI_UX_info.txt` as historical design input; use the latest brief and main source for current behavior.
2. Before product implementation, update main and create `feature/ui-ux-polish` from main as requested. Preserve local edits and obtain team review before merging. Skill-only preparation does not require app changes or creating that branch.
3. Run `python .agents/skills/ui-ux-pro-max/scripts/check_ui_scope.py --snapshot` before edits. Inspect the existing contract; keep service clients, subscriptions, payload mapping, and Agent processing unchanged.
4. Choose hierarchy and a few visual tokens before decoration. On the landing, chat and direct Verify access are visible immediately; on working screens, results and required actions outrank logs.
5. Cover real idle, loading, streaming, input-required, success, empty, partial, error, retry, disconnected, and disabled states. Animation never decides application state.
6. Implement presentation inside the permitted frontend surfaces. Run the scope checker, frontend build, and appropriate interactive checks. Report contract gaps and unverified conditions with file/rubric evidence.

## Design intelligence database

The existing upstream database and standard-library tools remain under `scripts/` and `data/`. Prefer a design-system query for a new visual direction, a domain query for one UX problem, and a stack query for implementation. Keep one dominant intent per query:

```powershell
python .agents/skills/ui-ux-pro-max/scripts/search.py "service AI assistant restrained" --design-system -p "EduRef AI" --variance 5 --motion 3 --density 3 -f markdown
python .agents/skills/ui-ux-pro-max/scripts/search.py "product demo hero" --domain landing --max-results 3
python .agents/skills/ui-ux-pro-max/scripts/search.py "scroll reveal reduced motion" --domain ux --max-results 3
python .agents/skills/ui-ux-pro-max/scripts/search.py "streaming render" --stack react --max-results 3
```

Inspect the top result's category and fit. Retry once with a narrower query or explicit domain if it is empty or off-topic. If still unsuitable, document the fallback judgment. Education queries can recommend children's apps; AI queries can recommend purple/pink palettes or personalization analytics that this brief does not want.

Recommendations are advisory. The user's brief, real contracts, and accessibility outrank generated palettes, fonts, libraries, and frameworks. Keep the existing stack. Do not persist unreviewed generator output, add analytics, or install GSAP/Motion/Three.js because a search example includes them. Keep student data and credentials out of queries. Upstream attribution is in the research reference and `LICENSE`.

## Non-negotiable outcomes

- Within a few seconds, users can tell what is happening, what already happened, why the agent stopped, what decision is needed, and how to intervene.
- The UI distinguishes proposed, running, completed, failed, and approval-required actions. It never presents a proposal or placeholder as a completed real-world action.
- Human review appears next to its decision context when the real workflow requests it. Do not insert mandatory human approval into routine auto cases to satisfy an obsolete local rule. Separate destructive and positive controls and pair color with text.
- Technical detail is available to advanced users but is not the default experience.
- While processing, show supported progress/reason summaries and observable actions. A skeleton indicates waiting, not percentage completion. Keep final output prominent and technical detail available on demand.
- Streaming and auto-scroll respect reading position. New activity is discoverable without pulling users away from history.
- No raw chain-of-thought is shown. Use short progress summaries and observable reasons.
- Real uploads have validation, progress, cancellation or recovery, and truthful server confirmation. No fake storage URLs or forced document flags.
- Use an independent, restrained EduRef identity, not HUTECH colors or cloned reference assets. The proposed pearl/graphite/muted-teal tokens are in `visual-direction.md`; verify them in real components before treating them as visually approved.

## Stop conditions

When a missing endpoint, policy/schema change, socket event, auth change, or new Agent behavior is necessary, document the exact need for team agreement and continue independent presentation work. Never fake completion. Mention coordination with Tài for real upload/storage when it is part of the work or remains an active blocker.
