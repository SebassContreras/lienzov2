/**
 * The inspector's keyframe controls (015/D7): the button that starts or removes a field's
 * track, and the rotation and scale channels, which have no field of their own.
 */
import { Diamond } from "lucide-react";
import {
  applyTracks,
  keyframeAt,
  toggleTrack,
  writeAt,
} from "../engine/tracks.ts";
import type { Element } from "../model/model.ts";
import { type Channel, trackKeys } from "../model/track.ts";
import { Num, Section } from "./controls.tsx";
import type { Change } from "./field-editor.tsx";

/** ◇ no track; ◆ muted: a track, no keyframe here; ◆ accent: a keyframe at `t`. */
export function KeyButton({
  el,
  path,
  t,
  change,
}: {
  el: Element;
  path: string;
  t: number;
  change: Change;
}) {
  const track = el.tracks?.[path];
  const here = track !== undefined && keyframeAt(trackKeys(track), t) >= 0;
  const state = !track ? "" : here ? "on" : "track";
  return (
    <button
      type="button"
      className={`key-button ${state}`}
      title={track ? "Quitar keyframes" : "Animar con keyframes"}
      onClick={() => change((d) => toggleTrack(d, path, t))}
    >
      <Diamond size={12} fill={track ? "currentColor" : "none"} />
    </button>
  );
}

const CHANNEL_ROWS: readonly {
  path: Channel;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { path: "@rotate", label: "Rotación °", min: -360, max: 360, step: 1 },
  { path: "@scale", label: "Escala", min: 0, max: 4, step: 0.01 },
  { path: "@scaleX", label: "Escala X", min: 0, max: 4, step: 0.01 },
  { path: "@scaleY", label: "Escala Y", min: 0, max: 4, step: 0.01 },
];

/** Rotation and scale (whole and per axis), keyframed only: an edit always sets the keyframe at `t`. */
export function ChannelSection({
  el,
  t,
  change,
}: {
  el: Element;
  t: number;
  change: Change;
}) {
  const { channels } = applyTracks(el, t);
  return (
    <Section title="Transformación" open={el.tracks !== undefined}>
      {CHANNEL_ROWS.map((c) => (
        <div className="keyed" key={c.path}>
          <Num
            label={c.label}
            value={channels[c.path]}
            min={c.min}
            max={c.max}
            step={c.step}
            onChange={(v) => change((d) => writeAt(d, c.path, v, t, () => {}))}
          />
          <KeyButton el={el} path={c.path} t={t} change={change} />
        </div>
      ))}
    </Section>
  );
}
