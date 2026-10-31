---
name: lienzo-usage
description: >-
  How to make an animated post or video with Lienzo's tools (MCP `lienzo` server or
  `pnpm lienzo <tool>`): pick a project, write a compact scene, check it, preview it and
  export PNG/GIF/MP4, with shots and camera, reusable symbols, keyframe loops, voice-over
  tracks and fonts. Use when asked to create, edit, check or export a Lienzo scene,
  post, reel, story or video ("haz un post", "arma un video", "exporta la escena").
---

# lienzo-usage

The MCP tools and the CLI are the same registry: `mcp__lienzo__scene_build` is
`pnpm lienzo scene_build --json '…'`. Each tool's description and input schema is the
reference; this skill is the workflow. The server runs the code it started with. Its MCP `instructions` name that build (commit, `+dirty`, build time): if the commit is
not `git rev-parse --short HEAD`, the build is older than your last change, or a tool or input named here is missing, the server is
stale: run `pnpm build:cli` (for `dist/cli.js`) and restart it before trusting a result.
A failed scene or recipe check lists every problem in `errors`; paths name an element by
the id you gave (`elements.a.w`, `elements.g/child.w`), else by its index
(`compact.elements.0.shot`); a failure about what `element_add` adds points at `patch.…`.
Messages are Spanish; the server's `instructions` repeat these rules for every tool.

## Rules

- Every scene, asset and export tool needs `project` (the `project` of an entry in `project_list`); there
  is no default. Never use an asset from another project.
- Files go only inside `projects/<project>/` (scenes, assets, exports).
- One name means one thing in every tool: `project` is a project (the `project_*` tools
  too), `scene` is a saved scene's name, `data` is a whole scene object (`scene_create`,
  `scene_validate`, `scene_inspect_layout`), `recipe` a preset object, `patch` the values
  merged onto an element, scene or background, `id` an element, `at` a placement.
- Element ids are unique in a scene (a repeat fails); a shot must last (`end` after `start`); a
  scene is at most 7680 px a side, 60 fps and 600 s. `element_group` keeps the members' draw
  order and puts the group where its topmost member was.
- Write scenes in compact form with `scene_build`; use the element tools for small edits
  to a saved scene.

## Workflow

1. **Project:** `project_list`, or `project_create` with a `name` (the `project` id is made
   from it, `Café Norte` → `cafe-norte`, or give one) (`project_delete` removes one). `project_inspect` lists its assets,
   scenes, presets, animation presets, fonts and brand, with the written brand guide (`guide`, `brand.md`: tone,
   audience, mandatory text, claim rules, preferred style; `null` when none) and `notices` about brand fonts (a declared
   family or weight not installed, a project font not declared); `project_update` changes the brand (`guide` replaces the
   guide, `""` or `null` deletes it, up to 20 000 characters) and gives the same font notices, `asset_add` copies a local
   file into `assets/`, `asset_rename` moves one (scenes follow) and `asset_delete` removes
   one (refused while a scene uses it, unless `force`).
2. **Catalog:** `component_list` (kinds, fields and animatable paths), `preset_list` /
   `preset_get`, `preset_validate` (checks a recipe before `preset_save`), `font_list` (then `font_install` for a Google font you need).
3. **Build:** `scene_build` takes the scene inside `compact` (`{ compact: { size, elements,
   … }, project, save? }`; scene keys at the top level fail, saying they go in `compact`);
   texts use `text` and `size`, not `content` or `fontSize` (notices suggest the field).
   With no `save` it returns the expanded scene and
   `notices` without writing anything. What `compact` leaves out (size, duration, fps,
   background) comes from the project's canvas, as in `scene_create`; `size` is `"WxH"`,
   `[w, h]`, a ratio (`"9:16"`, `"4:5"`, `"1:1"`, `"16:9"`) or a format (`"Story"`), and
   anything else fails. Read the notices (ignored keys, with the field they
   likely meant, missing fonts, which draw in Inter, text widths estimated for a font with no
   metrics: check those with `scene_preview`; a weight the family lacks, with the one drawn; an easing on a
   track's last keyframe, which shapes nothing).
4. **Check:** `scene_inspect_layout` (text overlaps, `shape_overlap` for shapes stacked on
   each other, `text_overflow` for text a component draws outside its box, out of canvas, contrast, drawn boxes as the shot camera shows them; a group's
   box holds children animated out of it unless it clips) at the times that matter; `scene_preview` at a time `t` to look at a frame (`out` saves the
   PNG in `exports/`).
5. **Save:** `scene_build` with `save: "<name>"` (`overwrite: true` to replace; the stored
   audio is kept unless you pass `audioTracks`). `saved` is the scene name and every notice,
   build and save, is in the one `notices` list. A saving build answers short: `saved`,
   `notices` and the `id`/`kind` of each top-level element; pass `response_format:
   "detailed"` (or call `scene_get`) when you need the expanded scene. `scene_get` returns
   each element as `id`, `kind` and its non-default fields (`full: true` for all of them);
   that form goes back into `scene_create` / `scene_validate` `data` as is.
6. **Edit:** `element_update` / `element_add` (`parent` to insert in a group) /
   `element_move` / `element_remove`, `keyframe_set` / `keyframe_remove`, `background_set`,
   `shot_set`, `image_trim`, `element_group` / `element_ungroup`. Targets are an `id` or a
   `group/child` path. Scene settings (size, duration, fps, mode, audio tracks, symbols) go
   through `scene_update`; `scene_list` lists them, `scene_rename` / `scene_delete` manage the files.
   `element_add` takes `patch.id` as the new id (fails if taken) and returns a notice when
   the element leaves the canvas; a text with no `w` placed by `at` that would be wider
   than the canvas margins wraps at them. `element_group` takes `id` to name the group.
   Reusables: `preset_save` / `preset_rename` / `preset_delete` (a built-in preset is not
   the project's: renaming or deleting it fails with `built_in`), `animation_list` /
   `animation_save` / `animation_delete` (with `project`, the project's own; without it, the
   global library). `preset_list` / `preset_get` take `project` to see the project's presets;
   a recipe may omit `traits`, and an animation's `anim.in`/`loop`/`out` may be partial.
   Patches with a key the kind lacks, or an `id`/`kind` (they never change), come back as
   notices. Removing a shot unbinds its elements (named in `notices`) and moves their
   tracks back to the scene's start; removing an element leaves a line attached to it
   loose (named in `notices`). A shot must end
   within the scene and not overlap another, and the same rule rejects a `scene_update` that
   shortens `duration` past a shot, a `scene_build` and a `scene_validate`.
   - **Duplicate** (no tool of its own): `scene_get`, copy the element (its sparse form is
     enough), then `element_add` with its `kind` and fields in `patch`, a new `id` and the
     position shifted (`x`/`y`).
   - **Align** (no tool of its own): `scene_inspect_layout` gives each drawn box; compute the
     shared edge or center and set `x`/`y` on each element with `element_update`.
7. **Voice:** `scene_generate_speech` saves each clip in `assets/voice/<scene>/` (the scene's stored name); for one clip per shot use `asTrack: true` and
   `startOffset` (the shot's start) so each call appends a track. Subtitles follow the cues.
8. **Export:** `scene_export` (`png`, `gif`, `mp4`) into `projects/<project>/exports/`.

## Compact scene, by example

```json
{
  "size": "Story",
  "duration": 8,
  "defaults": "flat",
  "background": "#0b1020",
  "symbols": {
    "sun": { "w": 120, "h": 120, "children": [
      { "id": "disc", "kind": "ellipse", "w": 120, "h": 120, "fill": { "color": "#ffcc33" } }
    ] }
  },
  "shots": [
    { "id": "s1", "start": 0, "end": 4 },
    { "id": "s2", "start": 4, "end": 8, "transition": { "kind": "fade", "duration": 0.5 },
      "camera": { "zoom": 1.2 } }
  ],
  "elements": [
    { "id": "title", "kind": "text", "shot": "s1", "text": "Hola", "w": 800,
      "at": "center", "size": 72, "anim": "pop" },
    { "id": "sun", "kind": "use", "symbol": "sun", "shot": "s2", "at": "center",
      "w": 120, "h": 120, "origin": "center",
      "tracks": { "@rotate": { "keys": [[4, 0], [6, 180]], "repeat": "loop" } } }
  ]
}
```

- `at` places an element the same way in every tool (`scene_build`, `element_add`,
  `element_update`): `"center"` or another anchor, `{ anchor, offset: [dx, dy] }`, or a
  point `{ x, y }` it is centred on; `fit: "canvas"` fills the canvas; lines join elements with `from` / `to`.
  Edge anchors (`"top"`, `"bottom-left"`, …) keep 5% of the shorter side from the edge
  (54 px on 1080); `offset` moves from there. A top-level element with no `at`, `x`, `y`
  or `fit` is centred. `at` with a track on `x`/`y` comes back as a notice: the track's
  absolute values win.
- Values are checked where they are written: colors are CSS colors (`#rrggbb`, `rgb()`,
  `hsl()`, a name such as `red`), `w`/`h` are ≥ 0 and keyframes stay in their field's range
  (`opacity` 0–1). A still (`scene_export` png, `scene_preview`) at `t` past the duration fails.
- Wrong references fail, listing the valid ones: a `shot` the scene lacks, an icon lucide
  lacks (names in any case: `star`, `arrow-right` become `Star`, `ArrowRight`), a line
  `from`/`to` naming no element, a `use` of a symbol the scene lacks, an unknown easing, an
  opacity outside 0–1, an `element_move` index past the last sibling. Pass `patch` and
  `data` as objects (a JSON string is read too). A failure about what `element_add` adds
  points at `patch.…`. `scene_validate` returns every problem in `errors`, always as a verdict; paths name an element by the
  `id` you gave, else by its index. Notices name what is valid but draws a placeholder: an
  image `src` that is not a project asset yet, a line end whose element a write removed.
  Asset folders (convention, not enforced): `brand/` for the brand's own files (logos, images, jingles),
  `voice/<scene>/` for generated speech, `<scene>/` for any other file one scene uses; a clip lives in the
  folder of one scene that uses it, other scenes may reference it there; `asset_rename` moves a misplaced file.
  A bare asset path (`logos/x.png`, `asset_add`'s `filename`) is stored as
  `/projects/<project>/assets/logos/x.png`, so `asset_rename` follows it. `asset_add` refuses a
  file that is not the image its extension says. An image given `src` and no `aspect`
  takes the picture's proportion; a new `counter` (no `progress` given) counts up over 1.5 s
  from its shot's `start` (scene time; the track is written once, when it is added); a
  preset's own tracks (counter, charts, progress) also start at its shot's `start`, and a
  counter's `from`/`to` in compact are its numbers (on a line they are target ids); `list.items` takes `"a\nb"` or `["a", "b"]`.
- Italic text is `italic: true` (`fontStyle` is not a field and comes back as ignored).
- Only `scene_build` and `scene_validate` (with `compact`) take the compact form;
  `scene_create` and `scene_validate` `data` take scenes whose elements may be partial
  (filled from their kind's defaults) and a partial `background`; `scene_update` takes scene
  settings.
- Two animation models: `anim` is the kind's motion (`{ in, loop, out }`; `anim: "fade"` is
  short for `{ in: { kind: "fade" } }`, a looping kind such as `"float"` for `loop`), timed
  from the element's shot; `tracks` are keyframes `[t, value, easing?]` by field path or
  `@rotate` / `@scale` / `@scaleX` / `@scaleY`, with `repeat: "loop" | "pingpong"` and `until`,
  in scene time. `@scaleX` / `@scaleY` grow or squash one axis around `origin` (a bar filling,
  a stem growing up: `"@scaleX": [[0, 0], [1, 1]]` with `origin: "left"`); unlike `w` / `h` they
  change only the drawing, not layout or text wrapping, and a negative value mirrors. Every
  `t` is scene time, camera keys included (`shot_set` takes the same short form and notes
  keys outside the shot). `keyframe_remove` with no key at `t` lists the track's times.
  A shot-bound element's tracks are timed from its shot's `start`: changing its `shot`
  (`element_update`), moving a shot (`shot_set` with `start` and `end` shifted by the same
  amount) or removing the shot moves them (and the camera keys) by the difference, with a
  notice; trimming one edge (`start` or `end` alone, or a new length) leaves them in place,
  and tracks given in the same patch are kept as given. `scene_validate` and every write list schema and rule problems
  together in `errors`.
- Preset recipes are `{ name, kind, category?, traits?, set? }` (no other keys; `set` values
  are checked as the element's fields); `preset_get` shows real ones. Names become file
  names with accents folded (`Caja Ámbar` → `caja-ambar`).
- `origin` is the pivot for rotation and scale; `w` on `text` wraps it.
- `background` is a background preset name, a color (`"#0b1020"`: solid, no gradient,
  dots or light) or an object that starts solid and adds only what it turns on
  (`{ "color": …, "dots": true }`); any other string comes back as a notice.
- Shots: an element with `shot` only shows during that shot (`[start, end)`: at a cut the
  next shot owns the instant, and the scene's last instant stays with the last shot), and only it moves with that
  shot's camera (groups included, applied once); elements with no `shot` (subtitles, logos)
  never move. `transition` `fade` / `slide` / `zoom` plays over `duration` before the
  shot's `start` and after its `end`; consecutive shots overlap there.
- Defaults: shapes fill at `fill.opacity: 1`; a `path` has no stroke unless you set
  `border.width` (a `"draw"` entrance gives it 3). Unknown keys come back as notices,
  named by path, with the field they likely meant (`fontSize` → `size`, `content` →
  `text`); an element field given under `effects` (`glow`) names the element field to use.
- Shapes: `polygon` `fit: "box"`, `path` `mode: "layers"`, group `clip`, fills with
  `fill.type: "radial"` (it reaches the edge of an ellipse, polygon or star, the farthest
  corner of a rect) or `fill.stops` (ordered by `at`). A fill given only `color` is flat;
  a group given `w`/`h` places its children in those pixels (`cw`/`ch` follow them).
  Partial `effects` merge with the defaults.
- `audioTracks: [{ assetId, startOffset?, volume? }]` sets the audio.

The full schema is `schemas/compact-scene.json`; component fields are in
`docs/components.md` and `component_list`.

## In the editor

`pnpm dev` (http://localhost:5173) opens the same scenes. The editor edits shots, symbols, track
`repeat`/`until` and `origin` too, writing the same JSON as the tools: its **Toma** picker
moves an element's tracks with its shot as `element_update` does, and its **Tomas** section
edits and removes shots through the same rules as `shot_set`; its **Inicio** and **Fin**
fields trim (tracks stay), so moving a shot with its animation is `shot_set` with both.
