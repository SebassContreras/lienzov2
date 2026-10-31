/**
 * The keyframe panel under the scrub bar (015/D8): the selected element's tracks, one row
 * each, on the same clock. A mark is selected (and the clock seeks to it) with a click,
 * moved by dragging, removed with Delete, and its easing set below.
 */
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { descriptorOf } from "../../components/index.ts";
import { EASING_NAMES } from "../../engine/easing.ts";
import {
  fieldAt,
  movedKeyframe,
  withoutKeyframe,
} from "../../engine/tracks.ts";
import type { Element } from "../../model/model.ts";
import {
  type Channel,
  isChannel,
  type Keyframe,
  type TrackRepeat,
  trackEntry,
  trackKeys,
  trackRepeat,
  trackUntil,
} from "../../model/track.ts";
import type { Change } from "../field-editor.tsx";
import type { Clock } from "../stage.tsx";

const CHANNEL_LABELS: Record<Channel, string> = {
  "@rotate": "Rotación",
  "@scale": "Escala",
  "@scaleX": "Escala X",
  "@scaleY": "Escala Y",
};

/** The name a row shows: the field's label, or its path when the label depends on state. */
function labelOf(el: Element, path: string): string {
  const f = fieldAt(descriptorOf(el.kind)?.fields ?? {}, path);
  const label = f && typeof f.label === "string" ? f.label : undefined;
  return (isChannel(path) ? CHANNEL_LABELS[path] : undefined) ?? label ?? path;
}

type Picked = { path: string; i: number };

const REPEATS: [TrackRepeat, string][] = [
  ["none", "Una vez"],
  ["loop", "Bucle"],
  ["pingpong", "Ida y vuelta"],
];

export function TracksPanel({
  el,
  duration,
  clock,
  seek,
  change,
  checkpoint,
}: {
  el: Element;
  duration: number;
  clock: MutableRefObject<Clock>;
  seek: (t: number) => void;
  change: Change;
  checkpoint: () => void;
}) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const dragging = useRef<{ path: string; i: number; lane: DOMRect } | null>(
    null,
  );
  const playheads = useRef<HTMLDivElement[]>([]);
  const panel = useRef<HTMLDivElement>(null);

  // the playhead line in every lane follows the clock
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const left = `${(clock.current.t / duration) * 100}%`;
      for (const line of playheads.current) if (line) line.style.left = left;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clock, duration]);

  const tracks = Object.entries(el.tracks ?? {});
  if (tracks.length === 0) return null;

  const setKeys = (path: string, keys: Keyframe[]) =>
    change((d) => {
      const prev = d.tracks?.[path];
      d.tracks = {
        ...d.tracks,
        [path]: trackEntry(keys, trackRepeat(prev), trackUntil(prev)),
      };
    });

  /** Sets a track's repeat and `until` (062/D5), as `keyframe_set` does. */
  const setLoop = (path: string, repeat: TrackRepeat, until?: number) => {
    checkpoint();
    change((d) => {
      const keys = [...trackKeys(d.tracks?.[path])];
      d.tracks = { ...d.tracks, [path]: trackEntry(keys, repeat, until) };
    });
  };

  const timeAt = (lane: DOMRect, clientX: number) =>
    Math.min(
      duration,
      Math.max(0, ((clientX - lane.left) / lane.width) * duration),
    );

  const pickedKey = picked && trackKeys(el.tracks?.[picked.path])[picked.i];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Delete acts on the picked keyframe
    <div
      className="tracks-panel"
      ref={panel}
      tabIndex={-1}
      onKeyDown={(e) => {
        if ((e.key === "Delete" || e.key === "Backspace") && picked) {
          e.preventDefault();
          e.stopPropagation(); // the editor would delete the element
          checkpoint();
          const keys = trackKeys(el.tracks?.[picked.path]);
          setKeys(picked.path, withoutKeyframe(keys, picked.i));
          setPicked(null);
        }
      }}
      onPointerMove={(e) => {
        const d = dragging.current;
        if (!d) return;
        const keys = trackKeys(el.tracks?.[d.path]);
        const t = timeAt(d.lane, e.clientX);
        const moved = movedKeyframe(keys, d.i, t);
        const i = moved.findIndex((k) => k.t === Math.max(0, t));
        setKeys(d.path, moved);
        dragging.current = { ...d, i };
        setPicked({ path: d.path, i });
        seek(t);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
    >
      {tracks.map(([path, track], row) => (
        <div className="track-row" key={path}>
          <span className="track-label" title={path}>
            {labelOf(el, path)}
          </span>
          <span className="track-loop">
            <select
              aria-label="Repetición"
              value={trackRepeat(track)}
              onChange={(e) =>
                setLoop(path, e.target.value as TrackRepeat, trackUntil(track))
              }
            >
              {REPEATS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="track-until"
              aria-label="Hasta (s)"
              title="Hasta (s): después mantiene el valor"
              placeholder="hasta"
              min={0}
              max={duration}
              step={0.1}
              value={trackUntil(track) ?? ""}
              onChange={(e) =>
                setLoop(
                  path,
                  trackRepeat(track),
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
            />
          </span>
          <div className="track-lane">
            <div
              className="track-playhead"
              ref={(r) => {
                if (r) playheads.current[row] = r;
              }}
            />
            {trackKeys(track).map((k, i) => (
              <button
                type="button"
                key={k.t}
                className={
                  picked?.path === path && picked.i === i
                    ? "keyframe picked"
                    : "keyframe"
                }
                style={{ left: `${(k.t / duration) * 100}%` }}
                title={`${k.t.toFixed(2)} s · ${k.value}`}
                onPointerDown={(e) => {
                  // keep focus on the panel (the mark re-renders while dragged), so Delete
                  // reaches the panel and not the editor, which would delete the element
                  e.preventDefault();
                  const lane = (
                    e.currentTarget.parentElement as HTMLElement
                  ).getBoundingClientRect();
                  checkpoint();
                  dragging.current = { path, i, lane };
                  panel.current?.focus();
                  panel.current?.setPointerCapture(e.pointerId);
                  setPicked({ path, i });
                  seek(k.t);
                }}
              />
            ))}
          </div>
        </div>
      ))}
      {picked && pickedKey && (
        <label className="track-easing">
          <span>
            Curva desde {pickedKey.t.toFixed(2)} s ({labelOf(el, picked.path)})
          </span>
          <select
            value={pickedKey.easing}
            onChange={(e) => {
              checkpoint();
              const keys = [...trackKeys(el.tracks?.[picked.path])];
              keys[picked.i] = {
                ...pickedKey,
                easing: e.target.value as Keyframe["easing"],
              };
              setKeys(picked.path, keys);
            }}
          >
            <option value="auto">lineal</option>
            {EASING_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
