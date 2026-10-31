# Lienzo

A free-form canvas editor for animated social media posts. Drag pre-made components onto
the canvas, edit them live, and export PNG, GIF or MP4.

- **Components:** shapes (rectangle, ellipse, polygon, star, arrow), text, icons,
  images, connecting lines, particles, 3D objects, groups and symbols, plus ready-made pieces
  (badge, progress, counter, chat bubble, steps, list, table, code, chart, free path,
  subtitles). Every kind is described in [docs/components.md](docs/components.md).
- **Groups:** select several elements (Shift+click or drag a box), move them together,
  and group them; a group moves, resizes, duplicates and animates as one.
- **Animations:** entry, loop and exit animations per element (fades, slides, pops, float,
  pulse, glow, draw-on and more) plus keyframe tracks. Loops are seamless in GIF and MP4.
- **Presets:** the library's presets are JSON recipes in `presets/built-in/` that combine
  reusable traits (glow, glass, border, float…), grouped by category (Tarjetas, Texto,
  Conexiones, Iconos e imágenes, Partículas) and filterable by name. Save any element or
  group as your own preset in `presets/`; each of your presets can be renamed, given a
  category, overwritten with the selected element, exported as `.json` or deleted.
  "Importar preset" adds one from a `.json` file.
- **Animation presets:** the "Animaciones" library section saves the selected element's
  animation (entry, loop, exit and keyframes) under a name, in `presets/animations/`, and
  applies it to the selection from a chosen start, with an optional stagger between
  elements. Times are relative to the start and movements to each element's position;
  what an element cannot take is skipped and listed. Applying copies the animation, so
  editing a preset later changes nothing already applied. Presets can be renamed, given a
  category, overwritten, exported, imported and deleted. A scene can name one
  (`"animPreset": "mi-entrada"`), and it is copied in when the scene opens.
- **Backgrounds:** the "Fondo" button (or a click on an empty part of the canvas) opens the
  background settings: color or gradient, dots, spotlight. The "Fondos" library section
  applies a background preset (undoable); "Guardar fondo como preset" saves yours.
- **Scenes & Workspaces:** scenes are JSON files residing inside project workspaces (`projects/<project>/scenes/`).
  The "Escenas" sidebar tab shows each saved scene of the active project with a thumbnail to
  open, rename, duplicate, export or delete it, and imports scenes from `.json` files.
- **Validation:** an imported preset or scene is checked before anything is written; an
  invalid file is rejected with the exact path that is wrong (e.g. `elements.1.fill.color`).
- **Files:** presets and project workspaces (`projects/<project>/` containing scenes, local assets and exports)
  are plain files you can version with the repo. `projects/mi-proyecto/` serves as the committed default project.
- **Export:** PNG (current frame), looping GIF, and MP4 (WebM when the browser cannot
  encode H.264).

## Run

Requires Node 24 (`.nvmrc`) and pnpm.

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Use from Claude Code & Other MCP Clients (MCP)

`pnpm lienzo mcp` starts an MCP server over stdio that exposes every Lienzo tool (the same
ones `pnpm lienzo --help` lists) with the same names, descriptions and input schemas.

### Claude Code

From the repo root:

```sh
claude mcp add lienzo -- pnpm lienzo mcp
```

Add `--scope project` to share it through `.mcp.json`. Check it with `claude mcp list` or
`/mcp` inside Claude Code.

### OpenCode & Generic Stdio Clients

In OpenCode (`opencode.json`) or other MCP clients, configure the server with explicit `command`, `args`, and `cwd`:

```json
{
  "mcpServers": {
    "lienzo": {
      "command": "pnpm",
      "args": ["lienzo", "mcp"],
      "cwd": "/path/to/lienzo"
    }
  }
}
```

Or with the compiled bundle (`pnpm build:cli` writes `dist/cli.js`; `dist/` is not committed,
so rerun it after every pull or the server lists an older set of tools). The bundle finds the
app from its own folder, so `scene_preview` and `scene_export` render from it as they do
under `pnpm lienzo mcp`:

```json
{
  "mcpServers": {
    "lienzo": {
      "command": "node",
      "args": ["dist/cli.js", "mcp"],
      "cwd": "/path/to/lienzo"
    }
  }
}
```

Tools read and write the files of this repo (`projects/<project>/`, `presets/`, `fonts/`), so always set `cwd` to the Lienzo root directory. Every tool that touches scenes, assets or exports requires `project` (the `project` of an entry in `project_list`, e.g. `mi-proyecto`); there is no default project. A failed call comes back as an MCP error result with the same JSON `{ code, message, path }` the CLI prints (plus `errors` when there are several problems); a key the tool does not take is named, with where it belongs (`elements` at the top of `scene_build` → inside `compact`); an object argument a client sends as a JSON string (`patch: "{…}"`) is read as that object. `project_create` needs only `name`: the `project` id is made from it (`Café Norte` → `cafe-norte`).

The server runs the code it started with: after a pull, restart it (and rerun `pnpm build:cli`
for `dist/cli.js`). Its MCP `instructions` name the build: `commit ef608b8+dirty, built
2026-10-29 13:50` for `dist/cli.js` (stamped by `pnpm build:cli`) or `commit …, source started
…` when run from source; `+dirty` means uncommitted changes. If the commit differs from
`git rev-parse --short HEAD`, or the build is older than your last change, the server is stale
and may report fixed bugs as open.
They also state, once for every tool, how arguments and failures work (JSON values,
`project`, `errors`, Spanish messages, notices, coordinates), so each tool's description
only says what is its own.
Before reporting a bug as still open, check that commit or replay the call with `pnpm lienzo`.
`pnpm replay` reruns every finding of past QA rounds; how a QA run works, what it checks and
what it found are in `docs/qa-log.md`.

How the tools behave, in short:

- **One registry:** the CLI and MCP run the same tools; a call checks its input, then the
  whole scene before anything is written. A failed write changes nothing.
- **Same rules everywhere:** `w`/`h` ≥ 0, colors are CSS colors and keyframes stay in their
  field's range (`opacity` 0–1) in `scene_build`, `element_update` and `keyframe_set` alike.
  A shot must end within the scene and not overlap another in `shot_set`, `scene_update`
  (a shorter `duration`), `scene_build` and `scene_validate`.
- **Wrong input fails:** an unknown `size`, `shot`, icon, line target, symbol or easing
  fails in every tool, and the message lists the valid options; every opacity is 0–1, as a
  value and as a keyframe; `scene_validate` returns every problem in `errors`. Messages are
  Spanish, and a failure about what `element_add` adds points at `patch.…`.
- **Notices:** a write answers `notices` about what it ignored or could not draw yet (an
  asset not in the project), each said once: a write gives only the notices the scene did not
  already have, so one that leaves an element, a track or a shot as it was repeats nothing
  (`silence.test.ts` checks it for every notice). A notice names the element it is about
  (`«x»`, by the id you gave); `scene_validate` lists them all. A key `scene_create` or
  `scene_update` does not know (`at` in `data`) is noticed, as `scene_build` does.
  A line with no `shot` between elements of different shots gets one: it is drawn all
  through the scene, with an end loose while its element is away.
- **Defaults:** `scene_create` and `scene_build` start from the project's canvas;
  `scene_get` returns each element's non-default fields (`full: true` for all).
- **Times:** keyframe `t` is scene time, also for elements bound to a shot and for the
  shot camera. A new counter, and a preset's own tracks, start at its shot's start, and
  tracks move with the shot when an element changes shot, a shot moves (`start` and `end`
  shifted together) or is removed, in the tools and the editor alike; trimming one edge
  of a shot leaves them in place.
- **Shot windows:** a shot shows its elements over `[start, end)`. At a cut the instant
  belongs to the shot that starts there, in `scene_preview`, export and
  `scene_inspect_layout` alike; the scene's last instant stays with the shot ending there.
  Shots need not touch: a gap gets no notice.
- **Error paths:** a failed scene or recipe check lists every problem in `errors` (schema
  and rules together) and names an element by the id you gave (`elements.a.w`,
  `elements.g/child.w`), else by its index (`compact.elements.0.shot`); a failure about
  what `element_add` adds points at its `patch` (`patch.w`).
- **Layout check:** `scene_inspect_layout` reports text and shape overlaps (two shapes of
  about the same size count, a card holding smaller content does not), out-of-canvas boxes
  (a group's box includes children animated out of it, unless the group clips), contrast
  and loose references. It also reports `text_overflow` for text a component draws outside
  its own box (chat bubble text past its height, code past its right edge, a steps label
  outside the box), measured from the text the component draws. A text is compared only with
  other texts, and an element's box is `0 x 0` at an instant where its `in` animation has it
  at scale 0 (ask for a later time).

To remove the transparent margin of a PNG, call `image_trim` on an image element, or pass `trim: true` to `element_add`; the asset file is not changed, only the element's `crop`. In the editor, the same trim is the **Recortar transparencia** button of an image, and double-clicking an image opens its manual crop handles.

## Compact Scenes (Spec 011)

Lienzo supports writing posts in a concise, human- and LLM-friendly format. The compact format
allows declaring a complete post with minimal syntax: partial presets, layout anchors (`at`),
automatic canvas fitting (`fit`), readable IDs, line connections (`from`/`to`), and shorthand
animations and keyframe tracks (`[t, value, easing?]`) on a field path or a channel (`@rotate`,
`@scale`, and `@scaleX` / `@scaleY` to scale one axis around the element's origin).

You can build and preview or save any compact post with the `scene_build` tool:

```sh
pnpm lienzo scene_build --json '{
  "compact": {
    "size": "Story",
    "duration": 4,
    "background": { "color": "#050b1a", "spotlight": 0.5 },
    "elements": [
      {
        "id": "bg-particles",
        "kind": "particles",
        "fit": "canvas",
        "count": 40
      },
      {
        "id": "card",
        "preset": "01-tarjeta-neon",
        "at": "center",
        "w": 600,
        "h": 320,
        "anim": "float"
      },
      {
        "id": "heading",
        "kind": "text",
        "text": "Lienzo 0.1",
        "at": { "anchor": "top", "offset": [0, 200] },
        "size": 56,
        "weight": 700,
        "anim": "pop"
      },
      {
        "id": "conn",
        "kind": "line",
        "from": "heading",
        "to": "card"
      }
    ]
  },
  "project": "mi-proyecto",
  "save": "anuncio-lienzo"
}'
```

The schema is defined in `schemas/compact-scene.json`.

### What a scene can also hold

The same options work in compact scenes (`scene_build`) and through the element tools:

- **Nested elements:** element and keyframe tools find an element at any depth by its `id`
  or by a `group/child` path; `element_add` takes a `parent` group.
- **Keyframe loops:** a track takes `repeat: "loop" | "pingpong"` and an optional `until`
  (seconds); compact keyframes accept `[t, value, easing?]` or an object form. An easing shapes the
  segment to the next keyframe, so one on a track's last keyframe does nothing: `scene_build`,
  `scene_validate`, `keyframe_set` and the editor's "Revisión" give a notice.
- **Pivot:** `origin` (`{ x, y }` box fractions, `[x, y]` or an anchor like `"bottom"`)
  is where rotation and scale pivot; `opacity` works on every kind.
- **Text box:** `w` on a `text` wraps it at word boundaries and aligns it inside the box.
- **Shots and camera:** `shots: [{ id, start, end, transition?, camera? }]` splits a video
  into cuts (`cut`, `fade`, `slide`, `zoom`) with a camera (`x`, `y`, `zoom`, keyframe
  tracks); top-level elements bind with `shot: "<id>"`. `shot_set` edits one shot.
- **Symbols:** `symbols: { car: { w, h, children } }` defines a piece once; a `use`
  element (`symbol: "car"`, `overrides` by child id) draws an instance. `scene_update` refuses
  to remove a symbol a `use` still names, or to drop a child an `override` names.
- **Shapes:** `polygon` `fit: "box"`; `path` `mode: "layers"` draws every shape at once;
  group `clip`; radial and multi-stop fills (`fill.type`, `fill.stops`); a radial fill reaches
  the edge of an ellipse, polygon or star. A fill given only a `color` is flat (add `gradient: true`,
  `color2` or `stops` for a gradient), and a group given `w`/`h` lays its children out in those
  pixels (`cw`/`ch` default to them).
- **Particles:** direction and gravity for falling particles, fractional or `0` speed.
- **Effects and flat style:** partial `effects` (blur, blend, mask…) on any element;
  `defaults: "flat"` turns off the default gradient, shadow, border and border glow of shapes and paths.
- **Background:** a background preset name, a color (`"#111827"`, solid) or an object that
  starts solid and adds only what it turns on (`{ "color": "#050b1a", "spotlight": 0.5 }`).
- **Voice and audio:** `scene_generate_speech` saves each clip in `assets/voice/<scene>/`; with `asTrack: true` and `startOffset` it
  appends one voice track per shot instead of replacing `scene.audio`; `scene_build` keeps
  existing `audioTracks` on overwrite (or takes them). A notice names fonts that are not
  installed (`font_install`, which stores Google fonts as ttf so their text is measured);
  until then they draw in Inter. A weight an installed family lacks (Poppins 900) gets a
  notice naming the weight drawn (800), picked by the CSS weight rule in the editor, in
  exports and in measurement alike. Speech cues fill the clip, from `startOffset` to
  `startOffset` plus the audio's length, and cue ids stay unique when clips are added with
  `asTrack: true`; audio references are stored like element assets, with the project
  prefix, so `asset_delete` refuses a file a scene plays.
- **Size:** `size` is `"WxH"`, `[w, h]`, a ratio (`"9:16"`, `"4:5"`, `"1:1"`, `"16:9"`) or a
  format (`"Story"`); what a compact scene leaves out comes from the project's canvas.
- **Checking a scene:** `scene_validate` (every problem in `errors`, as a verdict even for `data` and `compact` together or neither; unknown keys name the
  field they likely meant),
  `scene_inspect_layout` (overlaps, out of canvas, contrast, drawn boxes as the shot camera
  shows them) and `scene_preview` (`out` also saves the PNG in `exports/`).

In the editor: the scene inspector's **Tomas** section adds and edits shots (times,
transition, camera) and a top-level element picks its shot under **Toma**; **Crear símbolo
desde el grupo** turns a group into a symbol, and **Símbolos → Editar** opens it on the stage
(**Volver** updates every instance); each keyframe track has **Bucle / Ida y vuelta** and a
**hasta** time; **Pivote** sets `origin`. They write the same JSON as the tools.

## Tools

`pnpm lienzo --help` (or the MCP tool list) shows each one with its input. By area:

- Projects: `project_list`, `project_create`, `project_inspect` (manifest, brand guide, assets,
  scenes, presets, animation presets, fonts, and brand font notices), `project_update`,
  `project_delete`, `asset_add`, `asset_rename`, `asset_delete`
- Scenes: `scene_list`, `scene_get`, `scene_create`, `scene_build`, `scene_update`,
  `scene_rename`, `scene_delete`, `scene_validate`,
  `scene_inspect_layout`, `scene_preview`, `scene_export`, `scene_generate_speech`
- Elements: `element_add`, `element_update`, `element_move`, `element_remove`,
  `element_group`, `element_ungroup`,
  `image_trim`, `keyframe_set`, `keyframe_remove`, `background_set`, `shot_set`
- Catalog: `component_list`, `preset_list`, `preset_get`, `preset_validate`, `preset_save`,
  `preset_rename`, `preset_delete`, `animation_list`, `animation_save`, `animation_delete`,
  `font_list`,
  `font_install` (a Google family, or a local `file`, which is one weight)

Rules every writer applies (spec 081): element ids are unique in a scene and a shot or element id is not empty, not padded with spaces and has no `/` or control character (only ids a write adds or changes are checked, so a stored scene still opens); a shot lasts (`end` is
after `start`) and its id is unique; a scene is at most 7680 px a side, 60 fps and 600 s; an
asset keeps its type on `asset_rename`, and `asset_add` takes audio only with an audio header;
a user preset cannot take a built-in preset's name; a failing call lists every problem it finds,
in Spanish, each at the path of what you sent. `project_inspect` names scenes and presets the
way the other tools take them (no `.json`). A project's written brand guide (tone, audience,
mandatory text, claim rules, preferred style) is `brand.md`, Markdown up to 20 000 characters:
`project_create` and `project_update` take it as `guide` (`""` or `null` deletes it, left out it
is kept) and `project_inspect` returns it. `project_inspect` and `project_update` give the same
`notices` about brand fonts: a declared family or weight not installed, and a family installed
in the project but not declared. Asset folders: `brand/` for the brand's own files (logos,
images, jingles), `voice/<scene>/` for generated speech, `<scene>/` for any other file one scene
uses; a clip lives in the folder of one scene that uses it and other scenes may reference it
there. `scene_generate_speech` saves its clips in `assets/voice/<scene>/` (the scene's stored
name) and needs a TTS service: a
Kokoro-compatible server at `http://localhost:8880` (provider `local`) or an OpenRouter key
(`OPENROUTER_API_KEY` or `apiKey`).

Everything the editor saves has a tool, and the editor's "Revisión" section runs the same
layout check as `scene_inspect_layout`.

## Shortcuts

| Key | Action |
|---|---|
| Space | Play / pause |
| Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) | Undo / redo |
| Ctrl+D | Duplicate |
| Ctrl+A | Select all |
| Shift+click, drag on empty canvas | Add to selection, selection box |
| Ctrl+G / Ctrl+Shift+G | Group / ungroup |
| Delete | Remove |
| Arrows (Shift = ×10) | Nudge |
| Esc | Deselect |

## License

MIT
