import type { Element, Scene } from "../model/model.ts";
import { type AnimState, animState } from "./anim.ts";
import { applyTracks } from "./tracks.ts";

/** An element as it stands at one moment, and the transform to draw it with. */
export type Animated<E extends Element = Element> = {
  el: E;
  transform: AnimState;
};

/**
 * Applies time to an element before it is drawn (A24): its keyframe tracks set its fields
 * and its rotation and scale channels (`@scale`, and `@scaleX` / `@scaleY` per axis) first, then its preset animation becomes a transform
 * on top (015/D6). Components draw what this returns and never animate from `t`
 * themselves, so every kind gets every animation.
 */
export function animate<E extends Element>(
  el: E,
  t: number,
  scene: Scene,
): Animated<E> {
  if (!el.tracks) {
    const transform = animState(el.anim, t, scene.duration);
    if (el.origin) {
      transform.originX = el.origin.x;
      transform.originY = el.origin.y;
    }
    return { el, transform };
  }
  const { el: now, channels } = applyTracks(el, t);
  const transform = animState(now.anim, t, scene.duration);
  transform.rotate += channels["@rotate"];
  transform.scale *= channels["@scale"];
  transform.scaleX *= channels["@scaleX"];
  transform.scaleY *= channels["@scaleY"];
  if (now.origin) {
    transform.originX = now.origin.x;
    transform.originY = now.origin.y;
  }
  return { el: now, transform };
}
