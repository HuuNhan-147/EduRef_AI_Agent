# Proposed EduRef visual direction

The user confirmed an independent identity and delegated palette selection on 2026-10-13. The first pass is implemented on `feature/ui-ux-polish`: a light pearl landing, graphite typography, and one muted-teal action accent. Component render checks passed; connected-browser visual review is still pending. Tune values against real content, and do not infer that dark mode has been removed or approved for new implementation.

The 2026-10-14 workspace iteration responds to feedback about small text and faint colors: primary action is now `#16716B`, canvas `#F1F5F7`, border `#D5E0E5`, with navy ink `#172D3C`. Chat text/input use 16px, sidebar controls 13–15px and terminal body 12px. New opaque text pairs are tested for contrast; browser approval remains pending. The table below records the earlier palette, not the current values for these changed tokens.

Latest color review on 2026-10-14: the user wants the older interface's calm blue emphasis, not a return to HUTECH branding. Operational screens now scope a navy header (`#183F73` → `#214E82`), blue actions (`#225A9F`, hover `#19477F`), pale-blue surfaces and distinct muted category accents. Do not recolor attention/error/success as blue. The light landing remains independent; its chat header uses `#F0F6FC` → `#E8F1FA` with dark blue text instead of the old dark-green bar.

Latest motion review on 2026-10-14 rejects pointer-following light/glow and then simplifies the hero: lift the chat 6px on idle hover and return on exit, with no layered/rotating chat decoration. Keep it stationary during focus/processing. Contained 3D illustration motion remains inside individual capability cards. Other boxes/headings get modest shadow, surface or text-color feedback, not cursor light. Touch and reduced-motion users retain complete static content.

The final header review adopts the older interface's friendly blue-led tone across landing and working screens while retaining the EduRef identity. Shared primary is `#225A9F`; header runs `#153F7C` → `#1D4F8B` with white/inverse text. The `VNG · Track A` label is red (`#B72B47`), optional help is warm yellow (`#FFDA74`), and connection green is conditional on the existing live socket state. The landing chat's own header remains pale blue. Preserve actual error/attention/success semantics; do not use color as the only state signal.

## Palette and pairings

| Semantic role | Proposed value | Pairing or purpose |
|---|---|---|
| Canvas | `#F6F8F8` | Soft pearl, not pure-white glare everywhere |
| Surface | `#FFFFFF` | Chat, form, table, and elevated header fallback |
| Primary text | `#20272E` | Graphite on canvas: 14.16:1 |
| Secondary text | `#5C6770` | On canvas: 5.43:1; usable instructions, not faint labels |
| Primary action / focus | `#276D68` | White button text: 6.05:1; hover `#1D5551`: 8.50:1 |
| Accent tint | `#EDF5F3` | Quiet AI/progress surface, not a success claim |
| Decorative border | `#DDE5E3` | Surface separation only; not the sole control/focus indicator |
| Success | `#26734D` on `#EDF6F0` | Confirmed completion or observed PASS: 5.23:1 |
| Attention | `#936015` on `#FBF4E6` | Missing input or escalation: 4.89:1 |
| Danger | `#B33F50` on `#FFF0F1` | Failure or destructive action: 5.07:1 |

Ratios were calculated from opaque sRGB values using relative luminance. These text pairs exceed the 4.5:1 normal-text threshold in [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); that is not whole-page accessibility certification. Check actual computed colors, disabled states, opacity, blur, overlays, and dark variants in-browser. Required control/state indicators need sufficient contrast against adjacent colors; see [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Identity through composition

- Keep most of the view neutral; concentrate the accent on the primary action, active navigation, and focus. Status colors describe data, not decoration.
- Make the large usable chat the hero. A quiet layered frame, soft shadow, and restrained depth supply the memorable feature; no multicolor neon, repeated glow blobs, or unrelated school imagery.
- Use one coherent type system with tested Vietnamese diacritics. Prefer existing fonts before adding downloads or a new family.
- Keep text and controls stable while the outer decorative layer moves. Use `landing-and-motion.md` for the motion and reduced-motion contract.
- Reuse semantic colors across landing, Student, Staff, Verify, and Audit; operational screens use flatter surfaces and much less decoration.
- Give actions and success different labels, icons, and component treatment even though teal and green are related hues. Never imply PASS from an accent-colored card.

Keep these tokens separate from confirmed product choices and the main branch baseline until team review. Apply them only inside the approved UI task, without changing policy or Agent behavior.
