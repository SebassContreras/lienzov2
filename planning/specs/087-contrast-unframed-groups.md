# 087 — contrast-unframed-groups

## Goal
`scene_inspect_layout` judges a text's contrast against what is really drawn behind it: a group
with no frame paints nothing of its own, so it is never the text's background. Verification: the
Animator scene `skin-perfection` (project `ringana`) gives no `low_contrast` at 1.5, 6.4 and 9.2 s;
a framed group behind a text still counts; `pnpm test` and `pnpm typecheck` pass.

## Context (Animator video `ringana-skin-perfection`, 2026-10-31)
- `scene_inspect_layout` reported `low_contrast` for black text "sobre fondo #0b1220" (1.12:1) in
  shots 1–3 of `skin-perfection`, a white scene whose texts sit on light blobs.
- Cause: `fillColors` in `src/service/layout/contrast.ts` (≈ line 99, "Groups with bodyColor")
  returns `bodyColor` for every group that has the field. Every group has it, with the default
  `#0b1220` (`src/components/group/descriptor.ts`), but a group paints it only when it has a frame:
  `framed = (p) => p.frame !== "none"` (`descriptor.ts:24`) and `drawFrame` in
  `src/components/group/draw.ts:39`. Shots 1–3 had full-frame groups with no frame ("Skin cells",
  "Escaping moisture", 1080×1920) under the text; shots 4–6 had none, and gave no notice.
- Animator tracks this finding as an `Engine` learning (`videos/ringana-skin-perfection/learnings.md`).

## Principles applied
| Principle | How it shows here |
|---|---|
| 1 KISS / YAGNI | One condition where the colour is chosen; no new option. |
| 2 SRP | `contrast.ts` keeps deciding what an element paints; the group's rule (`frame !== "none"`) is read, not copied. |
| 3 DRY by composition | The check uses the descriptor's own `framed` predicate (exported), so draw and contrast cannot disagree again. |
| 6, 7 Tests | Table of partitions below; regression test written first. |
| 10 Trade-offs | Listed in Design. |

## Requirements
- R1: A group counts as a background fill in the contrast check only when it draws a frame
  (`frame` other than `"none"`), and then with its `bodyColor`. A group with `frame: "none"` (the
  default) contributes no fill: the check looks further back (the elements drawn before it, then
  the scene background).
  Partitions: group with no `frame` field (old scenes), `frame: "none"`, each framed kind
  (`browser`, `terminal`, `phone`); text over the group's box / outside it; a light element
  between the text and an unframed group. Invariant: for every partition, the colour the check
  reports is one that a `scene_preview` of the same instant shows behind the text.
- R2: The fix keeps every other `fillColors` path as it is (fill, gradient, badge, bubble), and
  the replay corpus (`pnpm replay`) gives the same verdicts except the cases R1 changes.

### Who it serves
Anyone reading `scene_inspect_layout`: a false `low_contrast` teaches agents to ignore the check.

### Out of scope
- How the check treats a group's children (T001 records it; a gap found there becomes an idea).

### Dependencies
- None.

### Owner split
Agent tasks.

## Design
- D1 (R1): Export `framed` (or a `drawsFrame(el)` helper) from `src/components/group/descriptor.ts`
  and guard the `bodyColor` branch of `fillColors` with it. `frame` missing means `"none"`, as the
  descriptor's default.
- D2 (R1, R2): Regression test first, in the contrast test file: a white scene, a full-frame
  unframed group, a black text on top → no `low_contrast`; the same group with
  `frame: "browser"` and its dark `bodyColor` → `low_contrast` stays.

### Trade-offs
- D1. Pros: the check follows the draw rule from one predicate. Cons: a scene that relied on the
  false notice to find dark groups loses it. Mitigation: the notice was wrong in that case; a
  framed group still reports.

## Tasks
- [ ] 087/T001 [agent] Verify: how the contrast check treats a group's children (does a text over a coloured child see that child?); record `verified:` and, if a gap shows, add it to `## Ideas` — covers R1
- [ ] 087/T002 [agent] Regression test (D2) on the R1 partitions; it fails on `HEAD` — covers R1, D2
- [ ] 087/T003 [agent] Guard the `bodyColor` branch with the group's frame predicate (D1); tests pass — covers R1, D1
- [ ] 087/T004 [agent] `pnpm replay` and `pnpm test`; record any verdict that changed and why — covers R2
- [ ] 087/T005 [agent] Verify: `pnpm build:cli`, restart the MCP server, `scene_inspect_layout` on `ringana` / `skin-perfection` at 1.5, 6.4, 9.2 s has no `low_contrast`; record `verified:` — covers R1
