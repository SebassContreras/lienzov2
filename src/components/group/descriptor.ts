import { z } from "zod";
import { ElementSchema } from "../../model/element-schema.ts";
import type { Element } from "../../model/model.ts";
import { defineComponent, type ElementOf } from "../descriptor.ts";
import {
  anim,
  BOX_ANIMS,
  box,
  check,
  color,
  custom,
  elementOpacity,
  length,
  num,
  type Parent,
  select,
  text,
  widget,
} from "../fields/index.ts";
import { drawGroup } from "./draw.ts";
import { FRAMES, type Frame, hasFrame } from "./frame.ts";

const V = { section: "Ventana" };
const framed = (p: Parent) => hasFrame(p as { frame: Frame });

/** A field scenes from before 017 lack: parsed as its default. */
const later = <F extends { default: unknown; schema: z.ZodType }>(f: F): F => ({
  ...f,
  schema: (f.schema as z.ZodType).default(f.default as never) as F["schema"],
});

const { x, y, w, h } = box(100, 100, {
  section: "Grupo",
  min: 10,
  max: 4000,
});

/** Annotated so the element types do not depend on themselves through the schema. */
const childrenSchema: z.ZodType<unknown[]> = z.array(
  z.lazy(() => ElementSchema),
);

/**
 * Elements moved, resized, duplicated and animated as one. Children live in their own
 * coordinate space, `cw` × `ch`, which is stretched onto the group's box `x, y, w, h`.
 */
const fields = {
  x,
  y,
  info: widget("group-info", { section: "Grupo" }),
  w,
  h,
  opacity: elementOpacity("Grupo"),
  ungroup: widget("ungroup", { section: "Grupo" }),
  /** Clips the children to the group's box when no window frame does (059/D3). */
  clip: later(check(false, { label: "Recortar contenido", section: "Grupo" })),
  radius: later(
    num(0, {
      label: "Radio",
      section: "Grupo",
      max: 400,
      bounds: [0, Infinity],
      visible: (p) => p.clip === true && p.frame === "none",
    }),
  ),
  cw: length(100, { label: "Ancho interior", inspector: false }),
  ch: length(100, { label: "Alto interior", inspector: false }),
  children: custom("children", [] as unknown[], childrenSchema, {
    label: "Elementos",
    inspector: false,
  }),
  /** A window mockup around the content (017/D4): the children sit in its body. */
  frame: later(select(FRAMES, "none" as Frame, { label: "Marco", ...V })),
  title: later(
    text("lienzo.app", {
      label: "Título",
      ...V,
      visible: (p) => p.frame === "browser" || p.frame === "terminal",
    }),
  ),
  frameColor: later(
    color("#1e293b", { label: "Color del marco", ...V, visible: framed }),
  ),
  bodyColor: later(
    color("#0b1220", { label: "Color del contenido", ...V, visible: framed }),
  ),
  anim: anim(BOX_ANIMS),
  /**
   * Seconds between children: when set, the group's entry and exit play on each child in
   * turn instead of on the group as a whole (018/D9). Scenes from before 018 have none.
   */
  stagger: {
    ...num(0, {
      label: "Escalonar hijos (s)",
      section: "Animación",
      max: 2,
      step: 0.05,
      bounds: [0, Infinity],
    }),
    schema: z.number().min(0).default(0) as unknown as z.ZodType<number>,
  },
};

export type GroupEl = Omit<ElementOf<"group", typeof fields>, "children"> & {
  children: Element[];
};

export const group = defineComponent<GroupEl>({
  kind: "group",
  label: "Grupo",
  icon: "Group",
  fields,
  sections: [{ title: "Grupo" }, { title: "Ventana" }, { title: "Animación" }],
  anims: BOX_ANIMS,
  // a group is made from a selection (Ctrl+G), not dragged from the library
  basic: false,
  draw: drawGroup,
});
