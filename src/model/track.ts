/**
 * Keyframe tracks (015/D5): per element, a list of keyframes for each animated path. A path
 * is an animatable field path from the element's descriptor ("x", "fill.color") or a
 * transform channel, which has no field.
 */
import { z } from "zod";
import { type Easing, EasingSchema } from "../engine/easing.ts";

/** A value at a moment; `easing` shapes the segment from this keyframe to the next one. */
export type Keyframe = { t: number; value: number | string; easing: Easing };

export const TrackRepeatSchema = z.enum(["none", "loop", "pingpong"]);

export type TrackRepeat = z.infer<typeof TrackRepeatSchema>;

export type TrackObject = {
  keys: Keyframe[];
  repeat?: TrackRepeat;
  until?: number;
};

export type Track = Keyframe[] | TrackObject;

export type Tracks = Record<string, Track>;

/** Keyframes of `track` whether stored as a bare array or a `{ keys, repeat, until }` object. */
export const trackKeys = (
  track: Track | readonly Keyframe[] | undefined,
): readonly Keyframe[] =>
  !track ? [] : Array.isArray(track) ? track : (track as TrackObject).keys;

/** Repeat mode of `track` (`"none"` when omitted or stored as a bare array). */
export const trackRepeat = (
  track: Track | readonly Keyframe[] | undefined,
): TrackRepeat =>
  !track || Array.isArray(track)
    ? "none"
    : ((track as TrackObject).repeat ?? "none");

/** Optional `until` timestamp of `track`. */
export const trackUntil = (
  track: Track | readonly Keyframe[] | undefined,
): number | undefined =>
  !track || Array.isArray(track) ? undefined : (track as TrackObject).until;

/**
 * Canonical track representation: returns a bare `Keyframe[]` when `repeat` is omitted/`"none"`
 * and `until` is omitted (preserving byte-for-byte compatibility with pre-052 scenes), or
 * `{ keys, repeat?, until? }` when either loop option is active.
 */
export function trackEntry(
  keys: Keyframe[],
  repeat?: TrackRepeat,
  until?: number,
): Track {
  const activeRepeat = repeat && repeat !== "none" ? repeat : undefined;
  if (!activeRepeat && until === undefined) return keys;
  const out: TrackObject = { keys };
  if (activeRepeat) out.repeat = activeRepeat;
  if (until !== undefined) out.until = until;
  return out;
}

/** Transform channels and the value each has when nothing animates it. */
export const CHANNELS = {
  "@rotate": 0,
  "@scale": 1,
  "@scaleX": 1,
  "@scaleY": 1,
} as const;

export type Channel = keyof typeof CHANNELS;

export const isChannel = (path: string): path is Channel => path in CHANNELS;

const KeyframeObjectSchema = z.object({
  t: z.number().min(0),
  value: z.union([z.number(), z.string()]),
  easing: EasingSchema.default("auto"),
});

/**
 * A keyframe as stored, `{ t, value, easing }`, read from any of the forms a caller writes
 * (080/D1): `[t, value, easing?]` or `{ t, value, easing? }`, easing `auto` when left out.
 * Every writer parses tracks here, so each one takes the short form. The tuple is read as
 * the object it stands for, so a failure names the field (`…0.easing`) in either form.
 */
const KeyframeSchema: z.ZodType<Keyframe> = z.union([
  z
    .tuple([
      z.number().min(0),
      z.union([z.number(), z.string()]),
      z.string().optional(),
    ])
    .transform(
      ([t, value, easing]): Record<string, unknown> => ({
        t,
        value,
        ...(easing === undefined ? {} : { easing }),
      }),
    )
    .pipe(KeyframeObjectSchema),
  KeyframeObjectSchema,
]);

const TrackObjectSchema: z.ZodType<TrackObject> = z.object({
  keys: z.array(KeyframeSchema),
  repeat: TrackRepeatSchema.optional(),
  until: z.number().min(0).optional(),
});

/** A track as stored: an object with no loop option active is its bare keys (`trackEntry`). */
export const TrackSchema: z.ZodType<Track> = z.union(
  [
    z.array(KeyframeSchema),
    TrackObjectSchema.transform((o) => trackEntry(o.keys, o.repeat, o.until)),
  ],
  {
    error: (issue) =>
      issue.code === "invalid_union" &&
      issue.errors.every((e) => e.some((i) => i.path.length === 0))
        ? "Una pista es una lista de keyframes [[t, valor, easing?], …] o { keys: [...], repeat?, until? }"
        : undefined,
  },
);

/** Optional on every element: scenes written before 015 have none. */
export const TracksSchema = z.record(z.string(), TrackSchema);
