# Components

Every element kind Lienzo can draw, in the library's order (`COMPONENTS` in
`src/components/index.ts`). The Spanish name is the label shown in the editor. Each kind's
full field list, with the paths keyframes can animate, comes from the `component_list` tool
(`pnpm lienzo component_list`); this page says what each kind is for.

Shared by every kind: position and size (`x`, `y`, `w`, `h` where the kind has a box),
`opacity`, entry / loop / exit animations (`anim.in`, `anim.loop`, `anim.out`), keyframe
tracks (`tracks`, by field path or the `@rotate` / `@scale` / `@scaleX` / `@scaleY` channels) and
a transform origin. `@scaleX` / `@scaleY` scale one axis around the origin: unlike `w` / `h`, they
change only how the element is drawn, not its layout or text wrapping; a negative value mirrors
it (text reads backwards).
Most kinds also offer glow and shadow; every opacity (`opacity`, `fill.opacity`,
`shadow.opacity`, …) is 0–1. A top-level element may bind to a shot (`shot`): it shows only
during that shot, and its tracks are timed from the shot's start, so they move when the
element changes shot or the shot moves whole (`element_update`, `shot_set`, the editor's
**Toma**); trimming one edge of the shot leaves them in place.

## `rect`

**Rectángulo.** A box with rounded corners (`radius`); fill (color or gradient, linear,
radial or multi-stop), border (solid, dashed, dotted, moving `flow`), border glow,
background glow, shadow and inner text (`label`).

## `ellipse`

**Elipse.** The same styling as `rect` in an ellipse; lines attach to its outline.

## `icon`

**Icono.** Any [Lucide](https://lucide.dev) icon from a searchable picker, with stroke,
color, glow and an optional rounded tile (color or gradient). Tools take the name in any
case or kebab-case (`star` → `Star`); an unknown name fails. The tile is on by default
(`tile.enabled: false` hides it). An icon given a size and no `tile.padding` pads its tile
28/120 of its shorter side, as the default 120 px icon does; `defaults: "flat"` draws the tile
as a flat color.

## `image`

**Imagen.** A PNG, JPG, SVG or WebP from the project's `assets/`: size (aspect kept by
default), corners, border, shadow, and a non-destructive `crop` (manual handles, or
**Recortar transparencia** / `image_trim` to cut the transparent margin). `src` is the
`src` `asset_add` returns, or the path inside `assets/` (`logos/acme.png`), stored with
the project prefix so `asset_rename` keeps it pointing at the file; with no `aspect`, the
picture's own proportion sizes it.

## `group`

**Grupo.** Holds other elements that move, resize, duplicate and animate as one; an optional
frame and body, `stagger` between children's animations, and `clip` to clip the children to
the group's box (with `radius`). `element_group` takes the new group's `id`; a group of
elements of one shot takes that shot.

## `text`

**Texto.** Text with font, size, weight, color or gradient, line height, letter spacing,
alignment inside its box, and glow. With a box width `w` it wraps at word boundaries
and aligns inside that width; with no `w`, a text placed by `at` that would be wider than
the canvas margins gets that width. The text goes in `text` and its size in `size`.

## `line`

**Línea.** A connector whose ends attach to elements so it follows them: curve (`bend`),
arrows, glow, and animated flow (light pulses, marching ants, comet). In compact scenes
`from` / `to` name the elements it joins; an end attached to an id the scene lacks fails,
and removing the element it joins leaves that end loose (with a notice).

## `particles`

**Partículas.** Points drifting inside a box and joined by lines when close (a
"constellation"): count, speed, direction, gravity, twinkle, drift, `seed`, per-particle
variation, point and link style, glow. Their motion loops seamlessly.

## `three`

**Objeto 3D.** A three.js shape rendered offscreen and composited into the canvas: shape,
object rotation, position and scale, `spin`, material, ambient and point light, camera.

## `polygon`

**Polígono.** A regular polygon with `rect`'s styling; `fit: "box"` stretches it to fill its
box.

## `star`

**Estrella.** A star with `rect`'s styling.

## `arrow`

**Flecha.** A block arrow pointing in a chosen direction, with `rect`'s styling.

## `badge`

**Insignia.** A pill with text and an optional icon: size, padding, fill, border and glow.

## `progress`

**Progreso.** A progress indicator (bar or ring styles) for a `value`, with track color,
thickness and an optional number.

## `counter`

**Contador.** A number that counts from `from` to `to` as `progress` goes 0 → 1, with
decimals and a thousands separator. A counter added by `element_add` or `scene_build` with no `progress`
of its own gets a 0 → 1 track over 1.5 s from the start of its shot (or of the scene),
capped by the shot's end; the «Contador animado» preset's own track also starts at its
shot's start. In compact scenes `from` / `to` are its numbers (`to: 1500`). A new counter has
no suffix (`suffix: "+"` adds one); the «Contador animado» preset keeps its «+».

## `bubble`

**Mensaje de chat.** A chat message bubble with author, avatar color, side (left or right)
and a typing effect (`typingSpeed`).

## `steps`

**Pasos.** A row or column of numbered steps joined by a line, with the `active` step
highlighted.

## `list`

**Lista.** A bulleted list whose items appear one by one (`reveal`), with bullet style,
spacing and color.

## `table`

**Tabla.** A table with a header row, striped rows and rows that appear one by one
(`reveal`).

## `code`

**Código.** A code block with syntax highlighting for a chosen language and theme, typed
in over time (`typed`).

## `chart`

**Gráfico.** A data chart (bars and other types, with a palette) that grows in with
`progress`; axis and donut `hole` options. A chart preset's `progress` track starts at its
shot's start.

## `path`

**Trazado libre.** A free-form vector path made of one or more shapes: fill, border, glow,
draw-on (`progress`) and `morph` between its shapes; `mode: "layers"` draws every shape
at once instead (flat illustrations).

## `subtitles`

**Subtítulos.** Captions synced to the scene's speech cues, shown a few words at a time
(`wordsPerWindow`) with the spoken word highlighted, on an optional background box.

## `use`

**Símbolo.** An instance of a reusable symbol defined in the scene's `symbols`; it draws
the symbol's elements in its own box and takes its own animations. A `symbol` the scene
does not define fails; removing a symbol an instance uses leaves a notice.
