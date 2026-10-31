/**
 * Window mockups (017/D4): a group can wear a browser, terminal or phone frame. The frame takes
 * part of the group's box; the children live in what is left, the body, and are clipped to it.
 */
import type { Box } from "../../engine/geometry.ts";

export type Frame = "none" | "browser" | "terminal" | "phone";

export const FRAMES = [
  ["none", "Ninguno"],
  ["browser", "Navegador"],
  ["terminal", "Terminal"],
  ["phone", "Móvil"],
] as const satisfies readonly (readonly [Frame, string])[];

type Framed = Box & { frame: Frame };

/** Whether a group draws a window frame, and so paints its `frameColor` and `bodyColor`. */
export const hasFrame = (g: { frame: Frame }): boolean => g.frame !== "none";

/** Height of the title bar of a browser or terminal window. */
export const barHeight = (b: Box) => Math.max(24, Math.min(56, b.h * 0.09));

/** Side of the phone's bezel. */
export const bezel = (b: Box) => Math.max(8, Math.min(b.w, b.h) * 0.045);

/** Corner radius of the frame. */
export const frameRadius = (g: Framed) =>
  g.frame === "phone" ? Math.min(g.w, g.h) * 0.12 : Math.min(14, g.h / 4);

/** The part of the group's box its children are placed in. */
export function bodyBox(g: Framed): Box {
  if (g.frame === "browser" || g.frame === "terminal") {
    const bar = barHeight(g);
    return { x: g.x, y: g.y + bar, w: g.w, h: Math.max(1, g.h - bar) };
  }
  if (g.frame === "phone") {
    const s = bezel(g);
    const top = s * 3.2;
    return {
      x: g.x + s,
      y: g.y + top,
      w: Math.max(1, g.w - s * 2),
      h: Math.max(1, g.h - top - s * 2.4),
    };
  }
  return { x: g.x, y: g.y, w: g.w, h: g.h };
}
