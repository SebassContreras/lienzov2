# 087 — contrast-unframed-groups

## Goal
`scene_inspect_layout` judges a text's contrast against what is really drawn behind it: a group
with no frame paints nothing of its own, so it is never the text's background. Verification: the
Animator scene `skin-perfection` (project `ringana`) gives no `low_contrast` at 1.5, 6.4 and 9.2 s;
a framed group behind a text still counts; `pnpm test` and `pnpm typecheck` pass.

## Context (Animator video `ringana-skin-perfection`, 2026-10-31)
- `scene_inspect_layout` reported `low_contrast` for black text "sobre fondo #0b1220" (1.12:1) in
  shots 1–3 of `skin-perfection`, a white scene whose texts sit on light blobs.
- Cause: `getElementFills` in `src/service/layout/contrast.ts` (≈ line 99, "Groups with bodyColor")
  returns `bodyColor` for every group that has the field. Every group has it, with the default
  `#0b1220` (`src/components/group/descriptor.ts`), but a group paints it only when it has a frame:
  `framed = (p) => p.frame !== "none"` (`descriptor.ts:24`) and `drawFrame` in
  `src/components/group/draw.ts:39`. Shots 1–3 had full-frame groups with no frame ("Skin cells",
  "Escaping moisture", 1080×1920) under the text; shots 4–6 had none, and gave no notice.
- A group's children are placed right after the group, in draw order (`collect` in
  `src/service/layout/layout.ts`, ≈ line 171), so a text over a coloured child already sees
  that child, and a text inside a group sees the group first. The fix changes only the
  group's own fill.
- Animator tracks this finding as an `Engine` learning (`videos/ringana-skin-perfection/learnings.md`).

## Principles applied
| Principle | How it shows here |
|---|---|
| 1 KISS / YAGNI | One condition where the colour is chosen; no new option. |
| 2 SRP | `contrast.ts` keeps deciding what an element paints; the group's rule (`frame !== "none"`) is read, not copied. |
| 3 DRY by composition | `hasFrame` in `frame.ts` is the one rule `drawGroup`, the descriptor and the contrast check call. |
| 6, 7 Tests | Table of partitions below; regression test written first. |
| 10 Trade-offs | Listed in Design. |

## Requirements
- R1: A group counts as a background fill in the contrast check only when it draws a frame
  (`frame` other than `"none"`), and then with its `bodyColor`. A group with `frame: "none"` (the
  default) contributes no fill: the check looks further back (the elements drawn before it, then
  the scene background).
  Partitions: each value of `FRAMES` (`none`, `browser`, `terminal`, `phone`); text inside the
  group (a child) / text above it in the scene / text outside its box; a light element between
  the text and an unframed group; a group saved before 017 (no `frame` key), through
  `scene_inspect_layout`, where the defaults make it `"none"`.
  Invariant: an unframed group never changes the reported backdrop — the result equals the
  same scene without that group; a framed group under the text contributes its `bodyColor`.
- R2: `getElementFills` returns the same fills for every other element: solid `fill`,
  gradient `fill`, `badge`, `bubble`. Partitions: one row per path, each asserting the
  reported backdrop hex; the existing cases in `src/service/layout/contrast.test.ts` pass
  unchanged.

### Who it serves
Anyone reading `scene_inspect_layout`: a false `low_contrast` teaches agents to ignore the check.

### Out of scope
- How the check treats a group's children (see Context: already seen in draw order).
- Text over a framed group's title bar or bezel, drawn in `frameColor` (`drawFrame` in
  `src/components/group/draw.ts`): the check still reports `bodyColor` there; becomes an idea.

### Dependencies
- None.

### Owner split
Agent tasks.

## Design
- D1 (R1): Add `hasFrame(g: { frame: Frame }): boolean` to `src/components/group/frame.ts`
  (the window-mockup module: pure, already imported by `draw.ts` and `descriptor.ts`).
  `drawGroup` (both `frame !== "none"` tests), the descriptor's `framed` visibility predicate
  and the `bodyColor` branch of `getElementFills` call it, so drawing and the contrast check
  read one rule. Not in `descriptor.ts`: it imports `drawGroup`, so `draw.ts` importing from
  it would close a runtime cycle. The predicate reads a parsed group (`frame` always present);
  it does not default `frame` itself — element defaults are applied once, where the tool
  parses the scene.
- D2 (R1, R2): Regression first, in `src/service/layout/contrast.test.ts`. Equivalence class:
  a group whose `frame` is `"none"` adds no fill to the backdrop, whatever its size,
  `bodyColor` or place relative to the text. One `it.each` over the R1 partitions asserts
  `resolveBackdropUnder(...).hex`: for `none`, the hex the same scene gives without the group;
  for each framed kind, the group's `bodyColor`. One row through `scene_inspect_layout` covers
  the group without a `frame` key. Rows are named by behaviour ("an unframed group under a
  text adds no fill"). R2 adds one row per other fill path.
- Docs: no change. README, the `lienzo-usage` skill and the tool description name the
  contrast check without saying what counts as a backdrop.

### Trade-offs
- D1. Pros: drawing and the check read one predicate. Cons: `src/service/layout` imports
  from `src/components/group`; the check still reports `bodyColor` over a framed group's
  bar or bezel. Mitigation: `frame.ts` is pure and has no imports from the descriptor, and
  the service already reads component modules (`layout.ts` imports `components/use`); the
  bar and bezel case is out of scope and recorded as an idea.

## Tasks
- [x] 087/T001 [agent] Regression test (D2): one `it.each` over the R1 and R2 partitions,
  asserting the backdrop hex; the `none` rows fail on `HEAD`, the rest pass — covers R1, R2, D2
- [x] 087/T002 [agent] Refactor: `hasFrame` in `frame.ts`, called by `drawGroup` and the
  descriptor's `framed`; no behaviour change, existing tests pass — covers D1
- [x] 087/T003 [agent] Guard the `bodyColor` branch of `getElementFills` with `hasFrame`; T001
  passes — covers R1, D1
- [x] 087/T004 [agent] `pnpm test`, `pnpm typecheck`, Biome on the touched files — covers R2
- [x] 087/T005 [agent] Verify: `pnpm build:cli`, restart the MCP server (or `pnpm lienzo` at
  `HEAD`), `scene_inspect_layout` on `ringana` / `skin-perfection` at 1.5, 6.4, 9.2 s has no
  `low_contrast`; record `verified:` — covers R1
  verified: 2026-10-31, `pnpm lienzo scene_inspect_layout` at `HEAD` gives 0 `low_contrast` at
  1.5, 6.4 and 9.2 s (other diagnostics still reported); `pnpm test` 2436 passed, typecheck clean.
