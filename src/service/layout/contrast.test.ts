import { describe, expect, it } from "vitest";
import type { Frame } from "../../components/group/frame.ts";
import { createElement } from "../../components/index.ts";
import {
  contrastRatio,
  parseColor,
  relativeLuminance,
} from "../../engine/color.ts";
import { ElementSchema } from "../../model/element-schema.ts";
import {
  defaultImage,
  defaultParticles,
  defaultRect,
  defaultScene,
  defaultText,
} from "../../model/model.ts";
import { installCanvasFakes } from "../../test/recording-ctx.ts";
import { resolveBackdropUnder } from "./contrast.ts";
import {
  inspectLayout,
  type PlacedElement,
  requiredContrastRatio,
} from "./layout.ts";

installCanvasFakes();

describe("comprehensive contrast and WCAG verification", () => {
  it("verifies WCAG ratios against known color pairs and thresholds", () => {
    // Pure black on white: ~21:1
    const whiteLum = relativeLuminance(255, 255, 255);
    const blackLum = relativeLuminance(0, 0, 0);
    expect(contrastRatio(whiteLum, blackLum)).toBeCloseTo(21, 1);

    // Normal text threshold: 4.5:1
    expect(requiredContrastRatio(16, 400)).toBe(4.5);
    // Large text thresholds: 3.0:1 for size >= 24, or size >= 18.66 and bold (weight >= 700)
    expect(requiredContrastRatio(24, 400)).toBe(3.0);
    expect(requiredContrastRatio(19, 700)).toBe(3.0);
    expect(requiredContrastRatio(19, 400)).toBe(4.5);
  });

  it("checks text on a card on a contrasting background", () => {
    // White background, black card on top, dark text on card -> low contrast against card
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#ffffff",
      gradient: false,
    };
    const card = {
      ...defaultRect(),
      id: "black-card",
      x: 50,
      y: 50,
      w: 400,
      h: 200,
      fill: {
        color: "#000000",
        color2: "#000000",
        gradient: false,
        type: "linear" as const,
        angle: 0,
        opacity: 1,
      },
    };
    const textEl = {
      ...defaultText(),
      id: "dark-text",
      x: 100,
      y: 100,
      text: "Texto oscuro",
      color: "#222222", // Low contrast against #000000 card
      size: 16,
      weight: 400,
    };
    scene.elements = [card, textEl];

    const diags = inspectLayout(scene, [0]);
    const low = diags.find((d) => d.code === "low_contrast");
    expect(low).toBeDefined();
    expect(low?.bg).toBe("#000000");
    expect(low?.required).toBe(4.5);
    expect(low?.suggestion).toBeDefined();
  });

  it("accounts for effective opacity when compositing layers", () => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#ffffff",
      gradient: false,
    };
    // 50% opacity black card over white produces grey #808080 (128, 128, 128)
    const card = {
      ...defaultRect(),
      id: "semi-card",
      x: 50,
      y: 50,
      w: 400,
      h: 200,
      fill: {
        color: "#000000",
        color2: "#000000",
        gradient: false,
        type: "linear" as const,
        angle: 0,
        opacity: 0.5,
      },
    };
    const placedBelow: PlacedElement[] = [
      { el: card, box: { x: 50, y: 50, w: 400, h: 200 }, alpha: 1 },
    ];
    const textBox = { x: 100, y: 100, w: 100, h: 30 };
    const res = resolveBackdropUnder(textBox, 1, placedBelow, scene, 0);
    expect(res.kind).toBe("color");
    if (res.kind === "color") {
      expect(res.rgb[0]).toBeCloseTo(128, 0);
      expect(res.rgb[1]).toBeCloseTo(128, 0);
      expect(res.rgb[2]).toBeCloseTo(128, 0);
    }
  });

  it("evaluates gradient worst point over the text box", () => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#000000",
      color2: "#ffffff",
      gradient: true,
    };
    const textEl = {
      ...defaultText(),
      id: "text-grad",
      x: 100,
      y: 100,
      text: "Texto blanco",
      color: "#ffffff", // Fails against the white stop of gradient
      size: 16,
      weight: 400,
    };
    scene.elements = [textEl];

    const diags = inspectLayout(scene, [0]);
    const low = diags.find((d) => d.code === "low_contrast");
    expect(low).toBeDefined();
    expect(low?.bg).toBe("#ffffff");
  });

  it("reports unverifiable contrast under an image", () => {
    const scene = defaultScene();
    const img = {
      ...defaultImage(),
      id: "bg-image",
      x: 0,
      y: 0,
      w: 800,
      h: 600,
    };
    const textEl = {
      ...defaultText(),
      id: "text-over-img",
      x: 100,
      y: 100,
      text: "Sobre imagen",
      color: "#ffffff",
      size: 16,
      weight: 400,
    };
    scene.elements = [img, textEl];

    const diags = inspectLayout(scene, [0]);
    const unv = diags.find((d) => d.code === "unverifiable_contrast");
    expect(unv).toBeDefined();
    expect(unv?.elementId).toBe("text-over-img");
  });

  it("uses the better of fill and stroke contrast when stroke is present", () => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#ffffff",
      gradient: false,
    };
    // Text fill is white (1:1 contrast on white), but stroke is black (21:1 contrast)
    const textEl = {
      ...defaultText(),
      id: "stroked-text",
      x: 100,
      y: 100,
      text: "Texto con borde",
      color: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      size: 16,
      weight: 400,
    };
    scene.elements = [textEl];

    const diags = inspectLayout(scene, [0]);
    // Since stroke provides 21:1, it passes and is NOT flagged as low_contrast
    expect(diags.filter((d) => d.code === "low_contrast")).toHaveLength(0);
  });

  it("reports fade-in text only at times when it is unreadable", () => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#000000",
      gradient: false,
    };
    scene.duration = 2;

    // Text fading in: at t=0, delay=1 so it is hidden (alpha=0).
    // At t=2, it is fully visible with color #222222 on black background (fails).
    const textEl = {
      ...defaultText(),
      id: "fading-text",
      x: 100,
      y: 100,
      text: "Texto fade",
      color: "#222222",
      size: 16,
      weight: 400,
      anim: {
        ...defaultText().anim,
        in: {
          kind: "fade" as const,
          delay: 1,
          duration: 0.5,
          amount: 0,
          from: "down" as const,
          easing: "linear" as const,
        },
      },
    };
    scene.elements = [textEl];

    const diagsT0 = inspectLayout(scene, [0]);
    const diagsT2 = inspectLayout(scene, [2]);

    // At t=0, text is invisible: no contrast diagnostic
    expect(diagsT0.some((d) => d.code === "low_contrast")).toBe(false);
    // At t=2, text is visible: flagged as low contrast
    expect(diagsT2.some((d) => d.code === "low_contrast")).toBe(true);
  });

  it("suggested color meets the required threshold", () => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#ffffff",
      gradient: false,
    };
    const textEl = {
      ...defaultText(),
      id: "grey-text",
      x: 100,
      y: 100,
      text: "Gris",
      color: "#cccccc",
      size: 16,
      weight: 400,
    };
    scene.elements = [textEl];

    const diags = inspectLayout(scene, [0]);
    const diag = diags.find((d) => d.code === "low_contrast");
    expect(diag).toBeDefined();
    expect(diag?.suggestion).toBeDefined();

    const sugRgb = parseColor(diag?.suggestion as string);
    const bgRgb = parseColor(diag?.bg as string);
    const sugLum = relativeLuminance(sugRgb[0], sugRgb[1], sugRgb[2]);
    const bgLum = relativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    expect(contrastRatio(sugLum, bgLum)).toBeGreaterThanOrEqual(
      diag?.required as number,
    );
  });
});

describe("text over one-color particles", () => {
  const sceneWith = (particles: ReturnType<typeof defaultParticles>) => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#000000",
      gradient: false,
    };
    const text = {
      ...defaultText(),
      id: "over-dots",
      x: 100,
      y: 100,
      text: "Sobre puntos",
      color: "#202020",
      size: 16,
      weight: 400,
    };
    scene.elements = [
      { ...particles, id: "dots", x: 0, y: 0, w: 800, h: 600 },
      text,
    ];
    return scene;
  };

  it("counts the dot color when it is the worse backdrop", () => {
    const particles = defaultParticles();
    particles.dot = { ...particles.dot, color: "#303030", opacity: 1 };

    const diags = inspectLayout(sceneWith(particles), [0]);

    expect(diags.find((d) => d.code === "low_contrast")?.elementId).toBe(
      "over-dots",
    );
    expect(diags.some((d) => d.code === "unverifiable_contrast")).toBe(false);
  });

  it("stays unverifiable when the dots vary in hue", () => {
    const particles = defaultParticles();
    particles.variation = { ...particles.variation, hueShift: 90 };

    const diags = inspectLayout(sceneWith(particles), [0]);

    expect(diags.some((d) => d.code === "unverifiable_contrast")).toBe(true);
  });
});

describe("what a group adds to a text's backdrop", () => {
  const white = () => {
    const scene = defaultScene();
    scene.background = {
      ...scene.background,
      color: "#ffffff",
      gradient: false,
    };
    return scene;
  };
  const group = (frame: Frame) => ({
    ...createElement("group"),
    id: "g",
    x: 0,
    y: 0,
    w: 1080,
    h: 1920,
    frame,
    bodyColor: "#0b1220",
  });
  const lightRect = {
    ...defaultRect(),
    id: "light",
    x: 0,
    y: 0,
    w: 600,
    h: 600,
    fill: {
      ...defaultRect().fill,
      color: "#e0f0ff",
      gradient: false,
      opacity: 1,
    },
  };
  const textBox = { x: 100, y: 100, w: 100, h: 30 };
  const box = (el: { x: number; y: number; w: number; h: number }) => ({
    x: el.x,
    y: el.y,
    w: el.w,
    h: el.h,
  });

  it.each([
    ["an unframed group under a text adds no fill", "none", false, "#ffffff"],
    [
      "an unframed group under a light rect leaves the rect",
      "none",
      true,
      "#e0f0ff",
    ],
    [
      "a browser frame under a text adds its bodyColor",
      "browser",
      false,
      "#0b1220",
    ],
    [
      "a terminal frame under a text adds its bodyColor",
      "terminal",
      false,
      "#0b1220",
    ],
    [
      "a phone frame under a text adds its bodyColor",
      "phone",
      false,
      "#0b1220",
    ],
  ] as const)("%s", (_name, frame, withRect, hex) => {
    const g = group(frame);
    const placed: PlacedElement[] = [
      { el: g, box: box(g), alpha: 1 },
      ...(withRect ? [{ el: lightRect, box: box(lightRect), alpha: 1 }] : []),
    ];
    const res = resolveBackdropUnder(
      textBox,
      placed.length,
      placed,
      white(),
      0,
    );
    expect(res).toMatchObject({ kind: "color", hex });
  });

  it.each([
    ["none", []],
    ["browser", ["#0b1220"]],
  ] as const)(
    "a text inside a group with frame %s sees what the group draws",
    (frame, bgs) => {
      const scene = white();
      const text = {
        ...defaultText(),
        id: "t",
        x: 100,
        y: 300,
        color: "#000000",
      };
      scene.elements = [
        { ...group(frame), cw: 1080, ch: 1920, children: [text] },
      ];
      const low = inspectLayout(scene, [0]).filter(
        (d) => d.code === "low_contrast",
      );
      expect(low.map((d) => d.bg)).toEqual(bgs);
    },
  );

  it("a group saved before frames existed is parsed as unframed", () => {
    const scene = white();
    const { frame: _omit, ...old } = group("none");
    const text = {
      ...defaultText(),
      id: "t",
      x: 100,
      y: 100,
      color: "#000000",
    };
    scene.elements = [ElementSchema.parse(old), text];
    const low = inspectLayout(scene, [0]).filter(
      (d) => d.code === "low_contrast",
    );
    expect(low).toEqual([]);
  });

  it.each([
    ["solid fill", { ...lightRect }, "#e0f0ff"],
    [
      "gradient fill",
      {
        ...lightRect,
        fill: { ...lightRect.fill, gradient: true, color2: "#e0f0ff" },
      },
      "#e0f0ff",
    ],
    [
      "badge",
      {
        ...createElement("badge"),
        id: "b",
        x: 0,
        y: 0,
        w: 600,
        h: 600,
        fill: { ...lightRect.fill, color: "#123456" },
      },
      "#123456",
    ],
    [
      "bubble",
      {
        ...createElement("bubble"),
        id: "u",
        x: 0,
        y: 0,
        w: 600,
        h: 600,
        color: "#654321",
      },
      "#654321",
    ],
  ] as const)("a %s keeps adding its colour", (_name, el, hex) => {
    const placed: PlacedElement[] = [
      { el: el as never, box: box(el), alpha: 1 },
    ];
    const res = resolveBackdropUnder(textBox, 1, placed, white(), 0);
    expect(res).toMatchObject({ kind: "color", hex });
  });
});
