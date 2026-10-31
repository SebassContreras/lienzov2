/**
 * The shared rules of a scene (082/D6): each one is a content that breaks it, written once, and
 * the message every writer must give. `writers.ts` says how each writer carries the content;
 * `matrix.test.ts` checks every rule in every writer.
 */

type Fields = Record<string, unknown>;

/** Scene content that breaks one rule: the keys say which kind of content it is. */
export type Violation = {
  /** What is broken, for the test's name. */
  label: string;
  /**
   * What the notice must name (an element or a shot, by the id the content gave): a notice that
   * does not say what it is about leaves the caller searching (084/R4).
   */
  names?: string;
  /** Shots the scene has before the broken content arrives. */
  shots?: Fields[];
  /** The scene's shots, which are the broken content. */
  shotContent?: Fields[];
  /** The elements, in the form a scene stores them (`id` and `kind` given). */
  elements?: Fields[];
  /** The same elements in the compact form, where it differs. */
  compactElements?: Fields[];
  /** Scene fields (`fps`, `width`…) the broken content sets. */
  scene?: Fields;
  /** A background patch. */
  background?: Fields;
  /** Keyframes set on the element's track before the broken one. */
  before?: Fields[];
  /** A keyframe set on an element's track. */
  keyframe?: Fields;
  /** Fields that make the last element valid, for a writer that creates it before updating it. */
  valid?: Fields;
  /** Symbols the scene has before the broken content arrives. */
  symbols?: Fields;
  /** The elements are on the scene itself, not inside a symbol's body: a writer that only fills symbol bodies skips it. */
  onCanvas?: boolean;
  /** Existing elements grouped under an `id`. */
  group?: { members: string[]; id: string };
};

export type Rule = {
  id: string;
  /** Whether the writer refuses the content or accepts it with a notice. */
  outcome: "refused" | "notice";
  /** What every writer's message says. */
  message: RegExp;
  violations: Violation[];
};

const SHOT = { id: "s1", start: 0, end: 2 };
const TOO_BIG = /Demasiado grande/;
const UNKNOWN_EASING = /easing desconocido.*ease-out/;

export const RULES: readonly Rule[] = [
  {
    id: "an element's shot exists",
    outcome: "refused",
    message: /«nope».*«s1»/,
    violations: [
      {
        label: "element",
        shots: [SHOT],
        elements: [{ id: "x", kind: "rect", shot: "nope" }],
      },
    ],
  },
  {
    id: "element ids are unique",
    outcome: "refused",
    message: /ID duplicado «x»/,
    violations: [
      {
        label: "two at the root",
        elements: [
          { id: "x", kind: "rect" },
          { id: "x", kind: "text" },
        ],
      },
      {
        label: "a group child repeats a root id",
        elements: [
          { id: "x", kind: "rect" },
          { id: "g", kind: "group", children: [{ id: "x", kind: "text" }] },
        ],
      },
    ],
  },
  {
    id: "an id can be addressed by a tool",
    outcome: "refused",
    message: /un id no puede/,
    violations: [
      {
        label: "element id with a slash",
        elements: [{ id: "a/b", kind: "rect" }],
      },
      {
        label: "empty element id",
        elements: [{ id: "", kind: "rect" }],
      },
      {
        label: "shot id with a slash",
        shotContent: [{ id: "a/b", start: 0, end: 2 }],
      },
    ],
  },
  {
    id: "a group's id is not taken",
    outcome: "refused",
    message: /«r1»/,
    violations: [
      { label: "grouping", group: { members: ["r1", "r2"], id: "r1" } },
    ],
  },
  {
    id: "an opacity is a fraction",
    outcome: "refused",
    message: TOO_BIG,
    violations: [
      { label: "element", elements: [{ id: "x", kind: "rect", opacity: 2 }] },
    ],
  },
  {
    id: "an icon exists",
    outcome: "refused",
    message: /«Wrenchh».*«Wrench»/,
    violations: [
      {
        label: "element",
        elements: [{ id: "x", kind: "icon", icon: "Wrenchh" }],
      },
    ],
  },
  {
    id: "a line end attaches to an element that exists",
    outcome: "refused",
    message: /«fantasma».*«r»/,
    violations: [
      {
        label: "element",
        elements: [
          { id: "r", kind: "rect" },
          { id: "x", kind: "line", b: { x: 0, y: 0, attach: "fantasma" } },
        ],
        compactElements: [
          { id: "r", kind: "rect" },
          { id: "x", kind: "line", to: "fantasma" },
        ],
      },
    ],
  },
  {
    id: "an easing is one the engine has",
    outcome: "refused",
    message: UNKNOWN_EASING,
    violations: [
      {
        label: "element track",
        elements: [
          { id: "x", kind: "rect", tracks: { x: [[0, 0, "wobbly"]] } },
        ],
      },
      {
        label: "keyframe",
        keyframe: { path: "x", t: 1, value: 5, easing: "wobbly" },
      },
      {
        label: "camera track",
        shotContent: [
          { ...SHOT, camera: { tracks: { zoom: [[0, 1, "wobbly"]] } } },
        ],
      },
    ],
  },
  {
    id: "a shot lasts",
    outcome: "refused",
    message: /no dura/,
    violations: [
      {
        label: "start equals end",
        shotContent: [{ id: "s1", start: 2, end: 2 }],
      },
      {
        label: "end before start",
        shotContent: [{ id: "s1", start: 3, end: 1 }],
      },
    ],
  },
  {
    id: "a shot ends within the scene",
    outcome: "refused",
    message: /después de la escena/,
    violations: [
      {
        label: "end past the duration",
        shotContent: [{ id: "s1", start: 0, end: 500 }],
      },
    ],
  },
  {
    id: "shots do not overlap",
    outcome: "refused",
    message: /se solapa con/,
    violations: [
      {
        label: "two shots",
        shotContent: [SHOT, { id: "s2", start: 1, end: 3 }],
      },
    ],
  },
  {
    id: "shot ids are unique",
    outcome: "refused",
    message: /dos tomas con el id «s1»/,
    violations: [
      {
        label: "two shots",
        shotContent: [SHOT, { id: "s1", start: 3, end: 4 }],
      },
    ],
  },
  {
    id: "fps is at most 60",
    outcome: "refused",
    message: TOO_BIG,
    violations: [{ label: "500", scene: { fps: 500 } }],
  },
  {
    id: "a side is at most 7680 pixels",
    outcome: "refused",
    message: TOO_BIG,
    violations: [{ label: "20000", scene: { width: 20000 } }],
  },
  {
    id: "duration is at most 600 seconds",
    outcome: "refused",
    message: TOO_BIG,
    violations: [{ label: "100000", scene: { duration: 100000 } }],
  },
  {
    id: "a background spotlight is a fraction",
    outcome: "refused",
    message: TOO_BIG,
    violations: [{ label: "7", background: { spotlight: 7 } }],
  },
  {
    id: "a font that is not installed gets a notice",
    outcome: "notice",
    message: /«Nope Sans» no está instalada/,
    violations: [
      {
        label: "text",
        names: "x",
        elements: [{ id: "x", kind: "text", font: "Nope Sans" }],
      },
    ],
  },
  {
    id: "an easing on a track's last keyframe gets a notice",
    outcome: "notice",
    message: /easing «ease-out» en su último keyframe/,
    violations: [
      {
        label: "element track",
        names: "x",
        elements: [
          {
            id: "x",
            kind: "rect",
            tracks: {
              x: [
                [0, 0],
                [1, 5, "ease-out"],
              ],
            },
          },
        ],
      },
      {
        label: "keyframe",
        names: "k",
        before: [{ path: "x", t: 0, value: 0 }],
        keyframe: { path: "x", t: 1, value: 5, easing: "ease-out" },
      },
      {
        label: "camera track",
        names: "s1",
        shotContent: [
          {
            ...SHOT,
            camera: {
              tracks: {
                zoom: [
                  [0, 1],
                  [1, 1.2, "ease-out"],
                ],
              },
            },
          },
        ],
      },
    ],
  },
  {
    // the list after «se puede» proves each writer knows every channel, @scaleX / @scaleY too
    id: "an element track is on a path its kind animates",
    outcome: "refused",
    message:
      /«@scaleZ» no se puede animar en «rect» \(se puede: .*@rotate, @scale, @scaleX, @scaleY\)/,
    violations: [
      {
        label: "unknown channel",
        elements: [{ id: "x", kind: "rect", tracks: { "@scaleZ": [[0, 1]] } }],
      },
      {
        label: "a known channel beside an unknown one",
        elements: [
          {
            id: "x",
            kind: "rect",
            tracks: { "@scaleX": [[0, 2]], "@scaleZ": [[0, 1]] },
          },
        ],
      },
      {
        label: "keyframe",
        keyframe: { path: "@scaleZ", t: 0, value: 1 },
      },
    ],
  },
  {
    id: "a line with no shot between elements of different shots gets a notice",
    outcome: "notice",
    message: /línea «l» une «r1».*«r2».*no tiene toma propia/,
    violations: [
      {
        label: "two shots",
        names: "l",
        onCanvas: true,
        shots: [SHOT, { id: "s2", start: 2, end: 4 }],
        elements: [
          { id: "r1", kind: "rect", shot: "s1" },
          { id: "r2", kind: "rect", shot: "s2" },
          {
            id: "l",
            kind: "line",
            a: { x: 0, y: 0, attach: "r1" },
            b: { x: 0, y: 0, attach: "r2" },
          },
        ],
        compactElements: [
          { id: "r1", kind: "rect", shot: "s1" },
          { id: "r2", kind: "rect", shot: "s2" },
          { id: "l", kind: "line", from: "r1", to: "r2" },
        ],
      },
    ],
  },
  {
    id: "a camera track on a channel the camera lacks gets a notice",
    outcome: "notice",
    message: /no tiene la pista «rotation»/,
    violations: [
      {
        label: "rotation",
        names: "s1",
        shotContent: [
          {
            ...SHOT,
            camera: {
              tracks: {
                rotation: [
                  [0, 0],
                  [1, 1],
                ],
              },
            },
          },
        ],
      },
    ],
  },
  {
    id: "a transition longer than its shot gets a notice",
    outcome: "notice",
    message: /se solapa con las tomas vecinas/,
    violations: [
      {
        label: "five seconds in two",
        names: "s1",
        shotContent: [{ ...SHOT, transition: { kind: "fade", duration: 5 } }],
      },
      {
        // a shot that does not start at 0: its length is end − start, not end
        label: "three seconds in two, from 1 s",
        shotContent: [
          {
            id: "s1",
            start: 1,
            end: 3,
            transition: { kind: "fade", duration: 3 },
          },
        ],
      },
    ],
  },
  {
    id: "a `use` names a symbol that exists",
    outcome: "refused",
    message: /símbolo «nope», que no existe/,
    violations: [
      {
        label: "missing symbol",
        onCanvas: true,
        symbols: {
          chip: {
            w: 10,
            h: 10,
            children: [{ id: "d", kind: "ellipse", w: 5, h: 5 }],
          },
        },
        valid: { symbol: "chip" },
        elements: [{ id: "u", kind: "use", symbol: "nope" }],
      },
    ],
  },
  {
    id: "a `use` override names a child its symbol has",
    outcome: "refused",
    message: /no tiene el elemento «nochild» \(ids: «g», «d»\)/,
    violations: [
      {
        // «d» sits in a group of the body: overriding it is valid, and both are listed
        label: "override",
        onCanvas: true,
        valid: { symbol: "chip" },
        symbols: {
          chip: {
            w: 10,
            h: 10,
            children: [
              {
                id: "g",
                kind: "group",
                children: [{ id: "d", kind: "ellipse", w: 5, h: 5 }],
              },
            ],
          },
        },
        elements: [
          {
            id: "u",
            kind: "use",
            symbol: "chip",
            overrides: { d: { fill: "blue" }, nochild: { fill: "red" } },
          },
        ],
      },
    ],
  },
  {
    id: "a track is on a field the kind can animate",
    outcome: "refused",
    message: /«nofield» no se puede animar en «rect»/,
    violations: [
      {
        label: "element track",
        elements: [
          {
            id: "x",
            kind: "rect",
            tracks: {
              nofield: [
                [0, 0],
                [1, 1],
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: "an animation preset exists",
    outcome: "refused",
    message: /usa la animación «nope», que no está en la biblioteca/,
    violations: [
      {
        label: "element",
        elements: [
          { id: "x", kind: "rect", animPreset: { name: "nope", start: 0 } },
        ],
      },
      {
        label: "element in a group",
        elements: [
          {
            id: "g",
            kind: "group",
            children: [
              { id: "x", kind: "rect", animPreset: { name: "nope", start: 0 } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "an audio file the project lacks gets a notice",
    outcome: "notice",
    message: /Audio «.*falta\.mp3».*no sonará/,
    violations: [
      {
        label: "audio track",
        scene: { audioTracks: [{ id: "t1", assetId: "falta.mp3" }] },
      },
    ],
  },
  {
    id: "an image file the project lacks gets a notice",
    outcome: "notice",
    message: /se dibuja un marcador/,
    violations: [
      {
        label: "image",
        names: "x",
        elements: [
          { id: "x", kind: "image", src: "/projects/p/assets/falta.png" },
        ],
      },
    ],
  },
  {
    id: "an element off the canvas gets a notice",
    outcome: "notice",
    message: /se sale del lienzo/,
    violations: [
      {
        label: "rect",
        names: "x",
        onCanvas: true,
        elements: [{ id: "x", kind: "rect", x: 5000, y: 5000, w: 10, h: 10 }],
      },
    ],
  },
  {
    id: "a key the scene does not know is ignored with a notice",
    outcome: "notice",
    message: /Campo desconocido ignorado: .*nope/,
    violations: [
      {
        label: "element",
        elements: [{ id: "x", kind: "rect", nope: 1 }],
      },
    ],
  },
  {
    id: "a position track wins over `at`, and says so",
    outcome: "notice",
    message: /tiene `at` y una pista en x\/y/,
    violations: [
      {
        label: "x track",
        names: "x",
        onCanvas: true,
        elements: [
          {
            id: "x",
            kind: "rect",
            at: "center",
            tracks: {
              x: [
                [0, 0],
                [1, 5],
              ],
            },
          },
        ],
      },
    ],
  },
];
