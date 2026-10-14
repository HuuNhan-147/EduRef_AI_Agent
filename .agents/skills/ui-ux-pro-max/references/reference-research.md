# Reference research and adaptation

Reviewed 2026-10-13. These sources inform judgment; they do not override the EduRef brief or authorize executing their code. No application UI was changed during this research.

## Upstream UI/UX Pro Max

Sources: [repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [skill entry](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md), [quick reference](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/references/quick-reference.md), [MIT license](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/LICENSE).

Useful method: search for a coherent system, a specific UX outcome, or an implementation stack; inspect relevance, narrow an unsuitable query, and avoid persisting unverified recommendations. Accessibility, interaction, and performance precede decoration. Text must survive wrapping/zoom; animation must preserve final state and accept interruption.

The existing local search data/scripts were retained, not declared a complete synchronization with upstream main. EduRef adds project-specific landing, Competition Mode, and contract rules. Initial education/AI searches returned unrelated playful styles, a purple/pink palette, wellness typography, and analytics personalization. These were rejected for this brief. The `product demo hero` landing query returned a useful product-demo structure, adapted to actual quick chat rather than video or ecommerce configuration.

## BacA

Reference: [live site](https://baca-fe-white.vercel.app/). Live HTML and public CSS/JS assets were read. CSS confirms a translucent sticky header with blur, a perspective wrapper and depth stage, and reduced-motion handling. The deployed bundle references the same hero asset inspected locally.

Local research used `baca-elearning-fe/src/pages/HomepageV2.tsx`, its CSS, and the hero illustration in the separate BacA project. Source shows restrained pointer rotation, small floating layers, section entrances, and disabling touch/reduced-motion movement. Local root routing differs from V2, so it is not treated as an exact checkout of the deployed site.

EduRef adaptation: a shallow floating chat frame, a compact blurred header, and a few section reveals. Reduce movement further because chat contains text selection and precise controls. Do not copy school imagery, the EnglishLearn identity, or its marketing counters.

## MLAI 2026

Reference: [official entry](https://ai-network.hcmut.edu.vn/mlai2026), which currently embeds [the event page](https://hackathon-web-eight.vercel.app/). Public markup/assets expose event/track sections and the OrganizationAI theme of useful AI actions with reliable human control. Their motion catalog includes floats and shine/glow effects.

EduRef adaptation: make Track A context, the direct Verify path, and human boundaries clear. Do not reuse all event-page effects or turn an administrative product into an event advertisement. The local competition spec remains the rubric evidence.

## Mercury and Figma

[Mercury](https://mercury.com/) presents an accessible product-demo route, groups benefits by job, and follows with evidence and trust content. EduRef can similarly make its usable chat the product demonstration and follow it with a short process/trust section. Mercury's financial claims are unrelated to EduRef.

[Figma](https://www.figma.com/) introduces the product, offers a clear starting action, and uses distinct product/evidence sections. EduRef can borrow that hierarchy and continuity without copying its broad product menu, colored illustrations, or long marketing page.

## Observation limit

No browser was available in the connected UI runtime. Content, public CSS/JS, and a local BacA image/source were inspected; scroll feel, hover feel, and final visual balance were not observed interactively. Verify those in-browser before promising visual parity or approving the implementation.
