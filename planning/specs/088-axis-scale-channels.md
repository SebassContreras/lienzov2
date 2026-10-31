# 088 — axis-scale-channels

## Goal
A track can scale an element along one axis: `@scaleX` and `@scaleY` channels, next to `@rotate`
and `@scale`, around the element's `origin`. Verification: a `Pill` preset (`rect`) with
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
| 3 DRY by composition | The channels multiply into the `scaleX` / `scaleY` the presets already use; track paths keep coming from `CHANNELS` through `trackPaths`. |
| 5 Stack standards | Docs travel with the behaviour (README, `docs/components.md`, `lienzo-usage`, tool descriptions); editor labels in Spanish. |
| 6 Trade-offs | Listed in Design. |
| TESTING.md | Partitions and table shape in T002 and T006; the golden renders hold the invariant. |

## Requirements
- R1: Every kind accepts `@scaleX` and `@scaleY` tracks (default 1). At time t the drawn scale is
  `scale × @scale × scaleX × @scaleX` horizontally and the same with Y vertically, around `origin`;
  a preset animation that scales (`pop`, `zoom`, `breathe`…) still multiplies on top.
  Partitions: only `@scaleX`; only `@scaleY`; both; with `@scale`; with a preset scale (`pop`,
  and `flip`, which sets `scaleX` / `scaleY` itself); value 0, 1, 2, negative (mirror); `t` before
  the first key, between keys, after the last; `repeat: "loop"` / `"pingpong"`; `origin` centre /
  bottom / custom.
  Invariant: with `@scaleX` and `@scaleY` absent, every existing scene renders byte for byte as
  before (the golden renders, `src/test/render.test.ts`, pass without `UPDATE_GOLDEN`).
- R2: `component_list`, `keyframe_set`, the compact schema and `scene_validate` know both
  channels like `@scale` (an unknown-key notice never fires for them).
  Partitions: each of the four channels, in every writer that takes tracks; boundary: an unknown
  `@scaleZ` still gets the notice; compound: `@scaleX` and `@scaleZ` on one element give one
  notice, naming only «@scaleZ».
- R3: Where the channels are listed today (`docs/components.md`, the `lienzo-usage` skill, the
  `keyframe_set` description) the new ones are listed too, and README's keyframe-tracks sentence
  names the channels (README lists none today).
- R4: The editor's inspector sets both channels like «Escala»: the «Transformación» section has
  «Escala X» and «Escala Y» rows (slider 0–4, step 0.01, and the number box beside it) that set a
  keyframe at the playhead, and the timeline names their tracks «Escala X» / «Escala Y».
  Partitions: each new row writes the same scene JSON as `keyframe_set` on that channel; a value
  typed in the number box outside the slider range (−1, 5) is kept, not clamped.

### Who it serves
Agents building grow, fill and squash motions; Animator's `lienzo-animate` gotcha "no per-axis
scale" goes away. Editor users get the same channels from the inspector (R4).

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
- D2 (R2, R4): `component_list`, the schema and the unknown-path notice already derive channel
  names from `CHANNELS` through `trackPaths` (`src/components/descriptor.ts:112`); nothing to
  wire there. The hand-written lists carry what `CHANNELS` cannot (Spanish labels, slider ranges):
  the timeline's `CHANNEL_LABELS` (`src/editor/timeline/tracks-panel.tsx:26`) gains
  «Escala X» / «Escala Y» and is typed `Record<Channel, string>` so a missing label fails
  `pnpm typecheck`; the inspector rows are D4.
- D3 (R1): A negative value mirrors the element (Canvas `scale(-1, 1)`); allowed, documented.
- D4 (R4): `CHANNEL_ROWS` (`src/editor/keyframe-controls.tsx:45`) gains
  `{ path: "@scaleX", label: "Escala X", min: 0, max: 4, step: 0.01 }` and the same for Y, after
  «Escala». The rows reuse `Num` and `writeAt`, the path «Escala» already takes; no new control.
  `Num`'s number box has no `min`, so a negative value (D3) is typed there; the slider stops at 0.

### Trade-offs & Mitigations
- D1. Pros: the feature costs two table entries and two lines. Cons: one more way to size
  things (`w` vs `@scaleX`). Mitigation: docs say `w`/`h` change layout and text wrapping, the
  channels only how it is drawn.
- D2. Pros: the derived lists need no change; one typed map catches a missing label. Cons: the
  editor's labels stay a second list beside `CHANNELS`. Mitigation: `Record<Channel, string>`
  makes `pnpm typecheck` fail when a channel has no label.
- D3. Pros: a mirror with no extra field. Cons: mirrored text reads backwards. Mitigation: the
  docs say so next to the channels.
- D4. Pros: two rows, same range and behaviour as «Escala»; editor and tools stay at parity.
  Cons: the slider cannot reach a mirror, and with a negative value it rests at 0 while the
  number box shows the value. Mitigation: same as «Escala» today; the number box takes any value.

## Tasks
- [ ] 088/T001 [agent] Verify: `rg -n '@rotate|@scale|CHANNELS' src docs README.md .agents` finds only the derived uses (`trackPaths` in `component_list`, the schema, `scene-references`) and the hand-written places D2 and R3 name; record `verified:` with the list, and amend D2 if a place is missing — covers R2, D2
- [ ] 088/T002 [agent] Tests, written first, beside `src/engine/animate.ts`: `test.each` over the R1 partitions, one row `{ case, tracks, anim, origin, t, scaleX, scaleY, originX, originY }` asserting `animate(el, t, scene).transform`; the golden-render invariant is the existing `src/test/render.test.ts`, run unchanged — covers R1, D1, D3
- [ ] 088/T006 [agent] Contract test: a `RULES` entry (`src/service/contract/rules.ts`) "a channel track is kept with no notice", run by the matrix in every writer that takes tracks, with the R2 rows (each channel; `@scaleZ` boundary; `@scaleX` + `@scaleZ` compound) — covers R2, D2
- [ ] 088/T007 [agent] Parity test in `src/service/contract/editor-parity.test.ts`: `it.each` over `@rotate`, `@scale`, `@scaleX`, `@scaleY` with rows `{ channel, t, value }` (values 0.5, −1, 5), a keyframe set by `writeAt` as the «Transformación» row does matches `keyframe_set` on the same channel — covers R4, D4
- [ ] 088/T003 [agent] Add the channels to `CHANNELS` and `animate` (D1), and the timeline labels (D2) — covers R1, R2, D1, D2
- [ ] 088/T008 [agent] Inspector rows «Escala X» / «Escala Y» in `CHANNEL_ROWS` — covers R4, D4
- [ ] 088/T004 [agent] Docs: `docs/components.md`, `lienzo-usage`, the `keyframe_set` description and README's keyframe-tracks sentence; say `w`/`h` change layout, the channels only the drawing, and a negative value mirrors (text reads backwards) — covers R3, D1, D3
- [ ] 088/T005 [agent] Verify: `pnpm build:cli`, restart the MCP server (or `pnpm lienzo` at `HEAD`); `scene_preview` of the Goal's pill at 0 s (not drawn), 0.5 s (half width, same centre, full height), 1 s (full size); `component_list` lists `@scaleX` / `@scaleY` for every kind; record `verified:` — covers R1, R2
- [ ] 088/T009 [agent] Verify in the editor (`pnpm dev`, playwright-core with Edge): on a `Pill`, the «Transformación» section shows «Escala X» / «Escala Y»; moving «Escala X» to 0.5 at 0 s sets a keyframe and the pill draws half as wide around its origin, height unchanged; typing −1 mirrors it; the timeline row reads «Escala X»; record `verified:` — covers R4, D4

## Changes
- 2026-10-31: R4 and D4 added before any task ran. Why: the editor is the product; without
  inspector rows an `@scaleX` track could be seen but neither started nor given a value there.
  Work: T007, T008, T009.
