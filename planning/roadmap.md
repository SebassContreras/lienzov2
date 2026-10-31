# Roadmap

Specs in order. `Status` is edited by hand (`todo`, `in progress`, `done`). Specs 001–064 not listed were finished under an older spectrace format (one folder per spec); they live in git history.

Specs 050 and 065–084 are **retired**: they were all `done` under the previous governance and stay in `planning/specs/` as history, not to be edited or executed. Paths named inside them predate the migration: `planning/product.md` → `PRODUCT.md`, `planning/architecture.md` → `ARCHITECTURE.md`, `planning/changes.md` → `CHANGES.md`, `planning/qa-log.md` → `docs/qa-log.md` (see [CHANGES.md](../CHANGES.md)).

| ID  | Spec | Status | Depends on |
|-----|------|--------|------------|
| 050 | joint-mode | done (retired) | — |
| 065 | defaults-and-easing-notices | done (retired) | — |
| 066 | lazy-vendor-chunks | done (retired) | — |
| 067 | tool-feedback-fixes | done (retired) | — |
| 068 | qa-feedback-fixes | done (retired) | — |
| 069 | qa-suite-fixes | done (retired) | — |
| 070 | qa-suite-audit | done (retired) | 069 |
| 071 | qa-round-3-fixes | done (retired) | 069 |
| 072 | qa-round-4-fixes | done (retired) | 071 |
| 073 | qa-round-5-fixes | done (retired) | 072 |
| 074 | qa-round-6-root-causes | done (retired) | 073 |
| 075 | shot-timing-and-full-validation | done (retired) | 074 |
| 076 | bundle-root-and-input-hints | done (retired) | 075 |
| 077 | docs-and-descriptions-audit | done (retired) | 076 |
| 078 | qa-round-7-fixes | done (retired) | 077 |
| 079 | descriptions-after-078 | done (retired) | 078 |
| 080 | qa-round-8-every-writer | done (retired) | 079 |
| 081 | qa-round-9-input-gaps | done (retired) | 080 |
| 082 | test-suite-rewrite | done (retired) | 081 |
| 083 | one-validate-verdict | done (retired) | 082 |
| 084 | id-charset | done (retired) | 082 |
| 085 | engineering-principles-alignment | done | 084 |
| 086 | brand-guide | done | 085 |
| 087 | contrast-unframed-groups | done | — |
| 088 | axis-scale-channels | todo | — |
| 089 | speech-voiced-span | todo | — |
| 090 | build-from-file | todo | — |

## Ideas

Anything worth doing later. (The two earlier ideas are specs 083 and 084.)

- Brand data is not versioned: `projects/*` is git-ignored except `mi-proyecto` (A7), so a
  project's brand guide, palette and assets live only on this disk. Decide whether the projects
  root can point at another folder (a private brands repo) or a project can be exported/imported.
  (Brand audit 2026-10-31, spec 086)
- `shape_overlap` fires only when two boxes cover half of the smaller one (`shapesStack`), so
  two composites (chart, table, steps, list) that overlap by a third pass clean though their
  text collides. Decide whether a composite kind gets a lower threshold, or the check also
  compares what each draws (`text-extents.ts`). (QA 2026-10-29)
- `scene_inspect_layout` boxes at t=0 are `w: 0` / `h: 0` for an `in` animation that starts at
  scale 0, which reads as a layout fault. Mark the box as animating, or also return its resting
  box. (QA 2026-10-29)
- A gap between two shots (a part of the scene no shot owns) gives no notice; it may be wanted
  (a still background) or a slip. Decide whether it is noticed, or only listed by
  `scene_inspect_layout`. (QA 2026-10-29)
- The notice about a shot's tracks that `shot_set remove` moves names the group, not the
  child whose keys were cut at the scene's start (a key placed before its shot's start).
  (QA 2026-10-29)
- An `animPreset` whose animation the library no longer has must not block edits: a write that did
  not set it ignores the name, and `animPreset: null` clears it (`checkAnimPresets` fails any
  changed element today, so after `animation_delete` the element cannot be edited). (QA 2026-10-29)
- An `animPreset` on an element that already animates copies nothing and says nothing: give it
  a notice (`expandAnimPresets` skips it by design, 019/D10). (QA 2026-10-29)
- `lineShotNotices` reports a line with no shot only when its ends sit in different shots; a line
  between two elements of the same shot is also drawn, with loose ends, in every other one.
  (QA 2026-10-29)
- `keyframe_set`, `element_group` and `font_install` stop at the first semantic problem of an
  input; the closed list asks for every one, as the schema-level checks give. (QA 2026-10-29)
- Smaller: `scene_update` with an invalid `duration` also lists each shot as ending after it; and
  `scene_generate_speech` with `provider: "custom"` and no `baseUrl` should ask for it instead of
  trying `localhost:8880`. (QA 2026-10-29)
