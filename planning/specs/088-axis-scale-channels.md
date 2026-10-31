# 088 — axis-scale-channels

## Goal
A track can scale an element along one axis: `@scaleX` and `@scaleY` channels, next to `@rotate`
and `@scale`, around the element's `origin`. Verification: a pill with
`"@scaleX": [[0, 0], [1, 1]]` and `origin: "center"` grows from its centre in width only in
`scene_preview` at 0.5 s; `component_list` lists both channels for every kind; `pnpm test` and
`pnpm typecheck` pass.

## Context (Animator video `ringana-skin-perfection`, 2026-10-31)
- Growing a piece in one direction (a bar filling a gap, a stem growing up) needs `w`/`h` and
  `x`/`y` keyframes kept in step by hand; the video's ceramide "mortar" did that for 12 pieces.
  Paths and groups do not even scale their content when `w`/`h` change the same way.
- The painter already supports it: `AnimState` has `scaleX` / `scaleY`, and
  `src/engine/paint.ts:201` draws `ctx.scale(st.scale * st.scaleX, st.scale * st.scaleY)`. Only
  the track channels are missing: `CHANNELS = { "@rotate": 0, "@scale": 1 }`
  (`src/model/track.ts:65`), applied in `src/engine/animate.ts:32–33`.

## Principles applied
| Principle | How it shows here |
|---|---|
| 1 KISS / YAGNI | Two more entries in the existing channel table; no new transform code. |
| 3 DRY by composition | The channels multiply into the `scaleX` / `scaleY` the presets already use. |
| 6, 7 Tests | Partitions below, table-driven. |
| 8 Stack standards | Docs travel with the behaviour (README, `docs/components.md`, `lienzo-usage`, tool descriptions). |

## Requirements
- R1: Every kind accepts `@scaleX` and `@scaleY` tracks (default 1). At time t the drawn scale is
  `scale × @scale × scaleX × @scaleX` horizontally and the same with Y vertically, around `origin`;
  a preset animation that scales (`pop`, `zoom`, `breathe`…) still multiplies on top.
  Partitions: only `@scaleX`; only `@scaleY`; both; with `@scale`; with a preset scale; value 0,
  1, 2, negative (mirror); `repeat: "loop"` / `"pingpong"`; `origin` centre / bottom / custom.
  Invariant: with `@scaleX` and `@scaleY` absent, every existing scene renders byte for byte as
  before (golden renders).
- R2: `component_list`, `keyframe_set`, the compact schema and `scene_validate` know both
  channels like `@scale` (an unknown-key notice never fires for them).
- R3: README, `docs/components.md`, the `lienzo-usage` skill and the tool descriptions that list
  `@rotate` / `@scale` list the new channels.

### Who it serves
Agents building grow, fill and squash motions; Animator's `lienzo-animate` gotcha "no per-axis
scale" goes away.

### Out of scope
- Skew channels.

### Dependencies
- None.

### Owner split
Agent tasks.

## Design
- D1 (R1): `CHANNELS` gains `"@scaleX": 1, "@scaleY": 1`; `animate` multiplies
  `transform.scaleX *= channels["@scaleX"]` and the same for Y, after the preset state, like
  `@scale`.
- D2 (R2): `component_list` and the schema derive channel names from `CHANNELS`
  (verify in T001; where a list is hard-coded, read `CHANNELS` instead).
- D3 (R1): A negative value mirrors the element (Canvas `scale(-1, 1)`); allowed, documented.

### Trade-offs
- D1. Pros: the feature costs two table entries and two lines. Cons: one more way to size
  things (`w` vs `@scaleX`). Mitigation: docs say `w`/`h` change layout and text wrapping, the
  channels only how it is drawn.

## Tasks
- [ ] 088/T001 [agent] Verify: every place that lists channel names (`component_list`, compact schema, `keyframe_set`, validation, notices); record `verified:` with the list — covers R2, D2
- [ ] 088/T002 [agent] Tests on the R1 partitions (drawn transform at t), and the golden-render invariant — covers R1
- [ ] 088/T003 [agent] Add the channels (D1) and wire every place T001 found (D2) — covers R1, R2, D1, D2
- [ ] 088/T004 [agent] Docs: README, `docs/components.md`, `lienzo-usage`, tool descriptions — covers R3
- [ ] 088/T005 [agent] Verify: `pnpm build:cli`, restart the MCP server, preview the pill of the Goal at 0, 0.5, 1 s; record `verified:` — covers R1
