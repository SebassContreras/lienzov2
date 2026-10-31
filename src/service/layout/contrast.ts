/**
 * Pure backdrop and contrast inspection for text elements (023/D4, R5, R7, R8).
 * Walks elements drawn below a text element in draw order, checks for overlaps,
 * composites fills with effective opacities over the scene background, handles
 * gradients (worst point against text), and marks backdrops as unverifiable
 * if images, 3D or particles are present.
 */

import { type Frame, hasFrame } from "../../components/group/frame.ts";
import {
  compositeRgba,
  contrastRatio,
  parseColor,
  type Rgba,
  relativeLuminance,
  toHex,
} from "../../engine/color.ts";
import { type Box, boxesTouch } from "../../engine/geometry.ts";
import type { Background, Scene } from "../../model/model.ts";
import type { PlacedElement } from "./layout.ts";

export type BackdropColorResult =
  | { kind: "color"; rgb: [number, number, number]; hex: string }
  | { kind: "unverifiable"; reason: string };

/**
 * Checks if an element kind is impossible to reduce to a flat/gradient color backdrop.
 */
function isUnverifiableKind(el: { kind: string }): boolean {
  if (el.kind === "particles") return dotColorOf(el) === undefined;
  return el.kind === "image" || el.kind === "three";
}

/**
 * The one color a particles element's dots have: no template and no hue variation. Other
 * particles have no single color, so they stay unverifiable (080/D14).
 */
function dotColorOf(el: object): Rgba | undefined {
  const p = el as {
    kind: string;
    template?: unknown;
    variation?: { hueShift?: number };
    dot?: { color?: string; opacity?: number };
  };
  if (p.kind !== "particles" || p.template != null) return undefined;
  if ((p.variation?.hueShift ?? 0) !== 0 || !p.dot?.color) return undefined;
  const c = parseColor(p.dot.color);
  c[3] *= p.dot.opacity ?? 1;
  return c;
}

/**
 * Extracts the base scene background as one or two RGBA colors.
 */
function sceneBackgroundColors(bg: Background): {
  color1: Rgba;
  color2: Rgba;
  isGradient: boolean;
} {
  const c1 = parseColor(bg.color);
  const c2 = bg.gradient ? parseColor(bg.color2) : c1;
  return {
    color1: c1,
    color2: c2,
    isGradient: Boolean(bg.gradient),
  };
}

/**
 * Evaluates the effective fill of an element (as RGBA, or gradient stops).
 */
function getElementFills(el: Record<string, unknown>): {
  fills: Rgba[];
  hasFill: boolean;
} {
  // Elements with fill object (rect, ellipse, polygon, star, path)
  if (el.fill && typeof el.fill === "object") {
    const fill = el.fill as {
      color?: string;
      color2?: string;
      gradient?: boolean;
      opacity?: number;
    };
    const opacity = typeof fill.opacity === "number" ? fill.opacity : 1;
    if (fill.gradient && fill.color && fill.color2) {
      const c1 = parseColor(fill.color);
      const c2 = parseColor(fill.color2);
      c1[3] *= opacity;
      c2[3] *= opacity;
      return { fills: [c1, c2], hasFill: true };
    }
    if (fill.color) {
      const c = parseColor(fill.color);
      c[3] *= opacity;
      return { fills: [c], hasFill: true };
    }
  }

  // A group paints its bodyColor only inside a window frame (087/D1)
  if (
    el.kind === "group" &&
    hasFrame(el as { frame: Frame }) &&
    typeof el.bodyColor === "string"
  ) {
    const c = parseColor(el.bodyColor);
    return { fills: [c], hasFill: true };
  }

  // Elements with direct color (badge, bubble, icon background, etc.)
  if (el.kind === "badge" && typeof el.color === "string") {
    return { fills: [parseColor(el.color)], hasFill: true };
  }
  if (el.kind === "bubble" && typeof el.color === "string") {
    return { fills: [parseColor(el.color)], hasFill: true };
  }

  return { fills: [], hasFill: false };
}

/**
 * Resolves the effective backdrop color(s) under a text box at time `t`.
 * Walks elements in draw order up to the target text element.
 * For each intersecting element below:
 * - If image, 3D or particles with no single dot color: returns { kind: "unverifiable" }
 * - One-color particles: the backdrop with and without a dot both count.
 * - Otherwise: composites its fill over the accumulated background.
 * If gradients exist (in background or elements), evaluates worst contrast against `fgLum`.
 */
export function resolveBackdropUnder(
  textBox: Box,
  targetIndex: number,
  placedBelow: PlacedElement[],
  scene: Scene,
  fgLum: number,
): BackdropColorResult {
  // 1. Check if any element below that overlaps the text box is unverifiable
  for (let i = 0; i < targetIndex; i++) {
    const item = placedBelow[i];
    if (!item) continue;
    if (boxesTouch(textBox, item.box) && isUnverifiableKind(item.el)) {
      return {
        kind: "unverifiable",
        reason: `El fondo contiene un elemento «${item.el.kind}» (${item.el.id}) que no se reduce a un color plano`,
      };
    }
  }

  // 2. Start with scene background
  const bg = sceneBackgroundColors(scene.background);
  let candidateBgs: Rgba[] = bg.isGradient
    ? [bg.color1, bg.color2]
    : [bg.color1];

  // 3. For each element below in draw order:
  for (let i = 0; i < targetIndex; i++) {
    const item = placedBelow[i];
    if (!item) continue;
    if (!boxesTouch(textBox, item.box)) continue;

    const dot = dotColorOf(item.el);
    if (dot) {
      candidateBgs = [
        ...candidateBgs,
        ...candidateBgs.map((curBg) => compositeRgba(dot, curBg)),
      ].slice(0, 8);
      continue;
    }

    // Element has effective opacity from itself and its anim / group
    const { fills, hasFill } = getElementFills(
      item.el as Record<string, unknown>,
    );
    if (!hasFill || fills.length === 0) continue;

    const newCandidates: Rgba[] = [];
    for (const curBg of candidateBgs) {
      for (const fill of fills) {
        newCandidates.push(compositeRgba(fill, curBg));
      }
    }
    // Limit exponential growth of candidates if nested gradients
    candidateBgs = newCandidates.slice(0, 8);
  }

  // 4. Find worst background stop (the one giving the lowest contrast ratio against fgLum)
  let worstRatio = Infinity;
  let worstRgb: [number, number, number] = [0, 0, 0];

  for (const c of candidateBgs) {
    const rgb: [number, number, number] = [
      Math.round(c[0]),
      Math.round(c[1]),
      Math.round(c[2]),
    ];
    const lum = relativeLuminance(rgb[0], rgb[1], rgb[2]);
    const ratio = contrastRatio(fgLum, lum);
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worstRgb = rgb;
    }
  }

  return {
    kind: "color",
    rgb: worstRgb,
    hex: toHex(worstRgb[0], worstRgb[1], worstRgb[2]),
  };
}
