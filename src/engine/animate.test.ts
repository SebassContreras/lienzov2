import { describe, expect, it } from "vitest";
import {
  type Anim,
  defaultRect,
  defaultScene,
  type Element,
} from "../model/model.ts";
import { type TrackRepeat, TrackSchema } from "../model/track.ts";
import { animState } from "./anim.ts";
import { animate } from "./animate.ts";

const scene = { ...defaultScene(), duration: 4 };
const still = defaultRect().anim;
const entry = (kind: "pop" | "flip", from: "left" | "down"): Anim => ({
  ...still,
  in: { ...still.in, kind, from },
});

const grow: Pairs = [
  [0, 0],
  [1, 2],
];

type Pairs = [number, number][];
type Written = Record<string, Pairs | { keys: Pairs; repeat: TrackRepeat }>;

/** Tracks as a caller writes them, read the way every writer stores them. */
const stored = (tracks: Written): Element["tracks"] =>
  Object.fromEntries(
    Object.entries(tracks).map(([path, track]) => [
      path,
      TrackSchema.parse(track),
    ]),
  );

type Row = {
  case: string;
  tracks: Written;
  t: number;
  anim?: Anim;
  origin?: { x: number; y: number };
  /** What the channels multiply onto the preset state. */
  x: number;
  y: number;
  scale?: number;
  originX?: number;
  originY?: number;
};

const rows: Row[] = [
  {
    case: "only @scaleX, between keys",
    tracks: { "@scaleX": grow },
    t: 0.5,
    x: 1,
    y: 1,
  },
  {
    case: "only @scaleY, between keys",
    tracks: { "@scaleY": grow },
    t: 0.25,
    x: 1,
    y: 0.5,
  },
  {
    case: "both channels",
    tracks: { "@scaleX": [[0, 2]], "@scaleY": [[0, 0.5]] },
    t: 0,
    x: 2,
    y: 0.5,
  },
  {
    case: "before the first key",
    tracks: {
      "@scaleX": [
        [1, 2],
        [2, 0],
      ],
    },
    t: 0,
    x: 2,
    y: 1,
  },
  { case: "after the last key", tracks: { "@scaleX": grow }, t: 3, x: 2, y: 1 },
  { case: "value 0", tracks: { "@scaleX": [[0, 0]] }, t: 0, x: 0, y: 1 },
  {
    case: "value 1 is the rest",
    tracks: { "@scaleY": [[0, 1]] },
    t: 0,
    x: 1,
    y: 1,
  },
  {
    case: "negative mirrors",
    tracks: { "@scaleX": [[0, -1]] },
    t: 0,
    x: -1,
    y: 1,
  },
  {
    case: "with @scale, each kept apart",
    tracks: { "@scale": [[0, 3]], "@scaleX": [[0, 2]] },
    t: 0,
    x: 2,
    y: 1,
    scale: 3,
  },
  {
    case: "loop repeats",
    tracks: { "@scaleX": { keys: grow, repeat: "loop" } },
    t: 1.25,
    x: 0.5,
    y: 1,
  },
  {
    case: "pingpong comes back",
    tracks: { "@scaleX": { keys: grow, repeat: "pingpong" } },
    t: 1.25,
    x: 1.5,
    y: 1,
  },
  {
    case: "on top of pop's scale",
    tracks: { "@scaleX": [[0, 2]] },
    anim: entry("pop", "down"),
    t: 0.3,
    x: 2,
    y: 1,
  },
  {
    case: "on top of flip's scaleX",
    tracks: { "@scaleX": [[0, 2]] },
    anim: entry("flip", "left"),
    t: 0.3,
    x: 2,
    y: 1,
  },
  {
    case: "on top of flip's scaleY",
    tracks: { "@scaleY": [[0, 0.5]] },
    anim: entry("flip", "down"),
    t: 0.3,
    x: 1,
    y: 0.5,
  },
  {
    case: "around the centre",
    tracks: { "@scaleX": [[0, 2]] },
    origin: { x: 0.5, y: 0.5 },
    t: 0,
    x: 2,
    y: 1,
    originX: 0.5,
    originY: 0.5,
  },
  {
    case: "around the bottom",
    tracks: { "@scaleY": [[0, 2]] },
    origin: { x: 0.5, y: 1 },
    t: 0,
    x: 1,
    y: 2,
    originX: 0.5,
    originY: 1,
  },
  {
    case: "around a custom origin",
    tracks: { "@scaleX": [[0, 2]] },
    origin: { x: 0.2, y: 0.7 },
    t: 0,
    x: 2,
    y: 1,
    originX: 0.2,
    originY: 0.7,
  },
];

describe("axis scale channels", () => {
  it.each(rows)("$case", (row) => {
    const el = {
      ...defaultRect(),
      anim: row.anim ?? still,
      tracks: stored(row.tracks),
      origin: row.origin,
    };
    const preset = animState(el.anim, row.t, scene.duration);

    const { transform } = animate(el, row.t, scene);

    expect(transform.scaleX).toBeCloseTo(preset.scaleX * row.x);
    expect(transform.scaleY).toBeCloseTo(preset.scaleY * row.y);
    expect(transform.scale).toBeCloseTo(preset.scale * (row.scale ?? 1));
    expect([transform.originX, transform.originY]).toEqual([
      row.originX ?? preset.originX,
      row.originY ?? preset.originY,
    ]);
  });
});
