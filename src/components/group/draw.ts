import type { AnimState } from "../../engine/anim.ts";
import { animState } from "../../engine/anim.ts";
import { withClip } from "../../engine/clip.ts";
import { boxOf, indexElements } from "../../engine/geometry.ts";
import { type Ctx, withTransform } from "../../engine/paint.ts";
import type { Anim } from "../../model/model.ts";
import type { DrawContext } from "../descriptor.ts";
import type { GroupEl } from "./descriptor.ts";
import { barHeight, bezel, bodyBox, frameRadius, hasFrame } from "./frame.ts";

const NONE = { kind: "none" } as const;

/**
 * Draws a group's children inside its box: the group's own animation applies to all of them,
 * and the content space `cw × ch` is stretched onto `w × h`. `drawElements` comes from the
 * renderer so groups can hold any kind, other groups included. With a stagger, the group's
 * entry and exit play on child `i` at `t − i·stagger` instead (018/D9).
 */
export function drawGroup(
  ctx: Ctx,
  el: GroupEl,
  st: AnimState,
  { scene, t, drawElements }: DrawContext,
): void {
  const staggered =
    el.stagger > 0 &&
    (el.anim.in.kind !== "none" || el.anim.out.kind !== "none");
  const own = staggered
    ? animState(withSlots(el.anim, { in: NONE, out: NONE }), t, scene.duration)
    : { ...st };
  if (staggered && typeof el.opacity === "number") {
    own.alpha *= el.opacity;
  }
  const body = bodyBox(el);
  withTransform(ctx, boxOf(el), own, () => {
    if (hasFrame(el)) {
      // the frame's text settings must not reach the children
      ctx.save();
      drawFrame(ctx, el);
      ctx.restore();
    }
    const content = () => {
      ctx.translate(body.x, body.y);
      ctx.scale(body.w / (el.cw || 1), body.h / (el.ch || 1));
      drawChildren();
    };
    if (hasFrame(el)) withClip(ctx, bodyPath(el), content);
    else if (el.clip) withClip(ctx, boxPath(el), content);
    else content();
  });

  function drawChildren() {
    if (!staggered) {
      drawElements(ctx, el.children, scene, t);
      return;
    }
    const byId = indexElements(el.children);
    const motion = withSlots(el.anim, { loop: NONE });
    el.children.forEach((child, i) => {
      const cst = animState(motion, t - i * el.stagger, scene.duration);
      withTransform(ctx, boxOf(child), cst, () =>
        drawElements(ctx, [child], scene, t, byId),
      );
    });
  }
}

/** The group's own box, rounded by `radius`: what `clip` cuts the children to (059/D3). */
function boxPath(el: GroupEl): Path2D {
  const r = Math.max(0, Math.min(el.radius, el.w / 2, el.h / 2));
  const path = new Path2D();
  path.roundRect(el.x, el.y, el.w, el.h, r);
  return path;
}

/** The body's outline: rounded at the bottom like the window around it. */
function bodyPath(el: GroupEl): Path2D {
  const b = bodyBox(el);
  const r = frameRadius(el);
  const path = new Path2D();
  if (el.frame === "phone") path.roundRect(b.x, b.y, b.w, b.h, r * 0.35);
  else path.roundRect(b.x, b.y, b.w, b.h, [0, 0, r, r]);
  return path;
}

/** The window around the body: title bar with dots, or a phone's bezel and notch. */
function drawFrame(ctx: Ctx, el: GroupEl): void {
  const r = frameRadius(el);
  const outer = new Path2D();
  outer.roundRect(el.x, el.y, el.w, el.h, r);
  ctx.fillStyle = el.frameColor;
  ctx.fill(outer);
  ctx.fillStyle = el.bodyColor;
  ctx.fill(bodyPath(el));
  if (el.frame === "phone") {
    const s = bezel(el);
    const nw = el.w * 0.3;
    const notch = new Path2D();
    notch.roundRect(el.x + (el.w - nw) / 2, el.y + s * 1.1, nw, s * 1.1, s);
    ctx.fillStyle = "#000000";
    ctx.fill(notch);
    return;
  }
  const bar = barHeight(el);
  const dot = bar * 0.14;
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(
      el.x + bar * 0.5 + i * dot * 3.2,
      el.y + bar / 2,
      dot,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  const size = bar * 0.38;
  ctx.font = `500 ${size}px ${el.frame === "terminal" ? "monospace" : '"Inter"'}`;
  ctx.letterSpacing = "0px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (el.frame === "browser") {
    // the address field
    const fw = Math.min(el.w * 0.55, el.w - bar * 4);
    const field = new Path2D();
    field.roundRect(
      el.x + (el.w - fw) / 2,
      el.y + bar * 0.2,
      fw,
      bar * 0.6,
      bar * 0.3,
    );
    ctx.fillStyle = el.bodyColor;
    ctx.fill(field);
  }
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(el.title, el.x + el.w / 2, el.y + bar / 2, el.w * 0.5);
}

/** `anim` with some slots switched off. */
function withSlots(
  anim: Anim,
  off: Partial<Record<"in" | "loop" | "out", typeof NONE>>,
): Anim {
  return {
    in: off.in ? { ...anim.in, ...off.in } : anim.in,
    loop: off.loop ? { ...anim.loop, ...off.loop } : anim.loop,
    out: off.out ? { ...anim.out, ...off.out } : anim.out,
  };
}
